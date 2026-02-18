"""AWS Infrastructure Discovery — scans resources and relationships across 17 services.

Uses a scanner registry pattern with boto3 paginators. Each scanner populates an InfraGraph
with DiscoveredResource nodes and ResourceEdge connections.
"""

import time
import logging
from dataclasses import dataclass, field
from typing import Callable

from botocore.exceptions import ClientError

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class DiscoveredResource:
    id: str
    arn: str
    resource_type: str
    service: str
    name: str
    region: str
    properties: dict = field(default_factory=dict)
    tags: dict = field(default_factory=dict)


@dataclass
class ResourceEdge:
    source_id: str
    target_id: str
    edge_type: str  # contains, routes_to, triggers, attached_to, targets
    label: str = ""


@dataclass
class InfraGraph:
    resources: dict[str, DiscoveredResource] = field(default_factory=dict)
    edges: list[ResourceEdge] = field(default_factory=list)
    scan_errors: list[dict] = field(default_factory=list)
    profile: str = ""
    region: str = ""
    account_id: str = ""

    def add_resource(self, r: DiscoveredResource):
        self.resources[r.id] = r

    def add_edge(self, source_id: str, target_id: str, edge_type: str, label: str = ""):
        self.edges.append(ResourceEdge(source_id, target_id, edge_type, label))

    def to_dict(self) -> dict:
        return {
            "resources": {
                rid: {
                    "id": r.id, "arn": r.arn, "resource_type": r.resource_type,
                    "service": r.service, "name": r.name, "region": r.region,
                    "properties": r.properties, "tags": r.tags,
                }
                for rid, r in self.resources.items()
            },
            "edges": [
                {"source_id": e.source_id, "target_id": e.target_id,
                 "edge_type": e.edge_type, "label": e.label}
                for e in self.edges
            ],
            "scan_errors": self.scan_errors,
            "profile": self.profile,
            "region": self.region,
            "account_id": self.account_id,
        }


# ---------------------------------------------------------------------------
# Scanner registry
# ---------------------------------------------------------------------------

_SCANNERS: dict[str, Callable] = {}


def register_scanner(service_name: str):
    """Decorator to register an infrastructure scanner for a service."""
    def decorator(fn: Callable):
        _SCANNERS[service_name] = fn
        return fn
    return decorator


MAX_RESOURCES_PER_TYPE = 500


def _extract_tags(tag_list: list[dict] | None) -> dict:
    """Convert AWS Tags list ([{Key:…, Value:…}]) to a flat dict."""
    if not tag_list:
        return {}
    return {t.get("Key", ""): t.get("Value", "") for t in tag_list if "Key" in t}


def _tag_name(tags: dict) -> str:
    return tags.get("Name", "")


def _paginate(client, method: str, key: str, **kwargs) -> list:
    """Paginate a boto3 API call, returning up to MAX_RESOURCES_PER_TYPE items."""
    results = []
    try:
        paginator = client.get_paginator(method)
        for page in paginator.paginate(**kwargs):
            results.extend(page.get(key, []))
            if len(results) >= MAX_RESOURCES_PER_TYPE:
                results = results[:MAX_RESOURCES_PER_TYPE]
                break
    except ClientError as e:
        if e.response["Error"]["Code"] == "Throttling":
            time.sleep(2)
            # Retry once
            try:
                paginator = client.get_paginator(method)
                for page in paginator.paginate(**kwargs):
                    results.extend(page.get(key, []))
                    if len(results) >= MAX_RESOURCES_PER_TYPE:
                        results = results[:MAX_RESOURCES_PER_TYPE]
                        break
            except Exception:
                raise
        else:
            raise
    return results


# ---------------------------------------------------------------------------
# Scanners (17 total)
# ---------------------------------------------------------------------------

@register_scanner("VPC")
def scan_vpc(svc: "InfraDiscoveryService"):
    ec2 = svc.session.client("ec2", region_name=svc.region)
    region = svc.region

    # VPCs
    vpcs = _paginate(ec2, "describe_vpcs", "Vpcs")
    for v in vpcs:
        vid = v["VpcId"]
        tags = _extract_tags(v.get("Tags"))
        svc.graph.add_resource(DiscoveredResource(
            id=vid, arn=f"arn:aws:ec2:{region}::vpc/{vid}",
            resource_type="vpc", service="VPC",
            name=_tag_name(tags) or vid, region=region,
            properties={"cidr": v.get("CidrBlock", ""), "state": v.get("State", "")},
            tags=tags,
        ))

    # Subnets
    subnets = _paginate(ec2, "describe_subnets", "Subnets")
    for s in subnets:
        sid = s["SubnetId"]
        tags = _extract_tags(s.get("Tags"))
        svc.graph.add_resource(DiscoveredResource(
            id=sid, arn=f"arn:aws:ec2:{region}::subnet/{sid}",
            resource_type="subnet", service="VPC",
            name=_tag_name(tags) or sid, region=region,
            properties={"cidr": s.get("CidrBlock", ""), "az": s.get("AvailabilityZone", ""),
                        "vpc_id": s.get("VpcId", "")},
            tags=tags,
        ))
        if s.get("VpcId") in svc.graph.resources:
            svc.graph.add_edge(s["VpcId"], sid, "contains", "subnet")

    # Route Tables
    rts = _paginate(ec2, "describe_route_tables", "RouteTables")
    for rt in rts:
        rtid = rt["RouteTableId"]
        tags = _extract_tags(rt.get("Tags"))
        svc.graph.add_resource(DiscoveredResource(
            id=rtid, arn=f"arn:aws:ec2:{region}::route-table/{rtid}",
            resource_type="route_table", service="VPC",
            name=_tag_name(tags) or rtid, region=region,
            properties={"vpc_id": rt.get("VpcId", "")},
            tags=tags,
        ))
        for assoc in rt.get("Associations", []):
            subnet_id = assoc.get("SubnetId")
            if subnet_id and subnet_id in svc.graph.resources:
                svc.graph.add_edge(subnet_id, rtid, "attached_to", "route table")

    # Internet Gateways
    igws = _paginate(ec2, "describe_internet_gateways", "InternetGateways")
    for igw in igws:
        igw_id = igw["InternetGatewayId"]
        tags = _extract_tags(igw.get("Tags"))
        svc.graph.add_resource(DiscoveredResource(
            id=igw_id, arn=f"arn:aws:ec2:{region}::internet-gateway/{igw_id}",
            resource_type="internet_gateway", service="VPC",
            name=_tag_name(tags) or igw_id, region=region,
            properties={}, tags=tags,
        ))
        for att in igw.get("Attachments", []):
            vpc_id = att.get("VpcId")
            if vpc_id and vpc_id in svc.graph.resources:
                svc.graph.add_edge(vpc_id, igw_id, "attached_to", "IGW")

    # NAT Gateways
    nats = _paginate(ec2, "describe_nat_gateways", "NatGateways")
    for nat in nats:
        nid = nat["NatGatewayId"]
        tags = _extract_tags(nat.get("Tags"))
        subnet_id = nat.get("SubnetId", "")
        svc.graph.add_resource(DiscoveredResource(
            id=nid, arn=f"arn:aws:ec2:{region}::natgateway/{nid}",
            resource_type="nat_gateway", service="VPC",
            name=_tag_name(tags) or nid, region=region,
            properties={"subnet_id": subnet_id, "state": nat.get("State", "")},
            tags=tags,
        ))
        if subnet_id and subnet_id in svc.graph.resources:
            svc.graph.add_edge(subnet_id, nid, "contains", "NAT GW")


@register_scanner("EC2")
def scan_ec2(svc: "InfraDiscoveryService"):
    ec2 = svc.session.client("ec2", region_name=svc.region)
    region = svc.region

    # Instances
    reservations = _paginate(ec2, "describe_instances", "Reservations")
    for res in reservations:
        for inst in res.get("Instances", []):
            iid = inst["InstanceId"]
            tags = _extract_tags(inst.get("Tags"))
            vpc_id = inst.get("VpcId", "")
            subnet_id = inst.get("SubnetId", "")
            sg_ids = [sg["GroupId"] for sg in inst.get("SecurityGroups", [])]
            svc.graph.add_resource(DiscoveredResource(
                id=iid, arn=f"arn:aws:ec2:{region}::instance/{iid}",
                resource_type="ec2_instance", service="EC2",
                name=_tag_name(tags) or iid, region=region,
                properties={
                    "instance_type": inst.get("InstanceType", ""),
                    "state": inst.get("State", {}).get("Name", ""),
                    "vpc_id": vpc_id, "subnet_id": subnet_id,
                    "private_ip": inst.get("PrivateIpAddress", ""),
                    "public_ip": inst.get("PublicIpAddress", ""),
                    "security_groups": sg_ids,
                    "iam_profile": inst.get("IamInstanceProfile", {}).get("Arn", ""),
                },
                tags=tags,
            ))
            if subnet_id and subnet_id in svc.graph.resources:
                svc.graph.add_edge(subnet_id, iid, "contains", "instance")
            elif vpc_id and vpc_id in svc.graph.resources:
                svc.graph.add_edge(vpc_id, iid, "contains", "instance")

    # Security Groups
    sgs = _paginate(ec2, "describe_security_groups", "SecurityGroups")
    for sg in sgs:
        sgid = sg["GroupId"]
        vpc_id = sg.get("VpcId", "")
        svc.graph.add_resource(DiscoveredResource(
            id=sgid, arn=f"arn:aws:ec2:{region}::security-group/{sgid}",
            resource_type="security_group", service="EC2",
            name=sg.get("GroupName", sgid), region=region,
            properties={"vpc_id": vpc_id, "description": sg.get("Description", "")},
            tags=_extract_tags(sg.get("Tags")),
        ))

    # Link instances to security groups
    for rid, r in list(svc.graph.resources.items()):
        if r.resource_type == "ec2_instance":
            for sgid in r.properties.get("security_groups", []):
                if sgid in svc.graph.resources:
                    svc.graph.add_edge(rid, sgid, "attached_to", "SG")

    # EBS Volumes
    volumes = _paginate(ec2, "describe_volumes", "Volumes")
    for vol in volumes:
        vid = vol["VolumeId"]
        tags = _extract_tags(vol.get("Tags"))
        svc.graph.add_resource(DiscoveredResource(
            id=vid, arn=f"arn:aws:ec2:{region}::volume/{vid}",
            resource_type="ebs_volume", service="EC2",
            name=_tag_name(tags) or vid, region=region,
            properties={"size_gb": vol.get("Size", 0), "volume_type": vol.get("VolumeType", ""),
                        "state": vol.get("State", "")},
            tags=tags,
        ))
        for att in vol.get("Attachments", []):
            iid = att.get("InstanceId")
            if iid and iid in svc.graph.resources:
                svc.graph.add_edge(iid, vid, "attached_to", "EBS")


@register_scanner("RDS")
def scan_rds(svc: "InfraDiscoveryService"):
    rds = svc.session.client("rds", region_name=svc.region)
    region = svc.region

    # DB Instances
    instances = _paginate(rds, "describe_db_instances", "DBInstances")
    for db in instances:
        dbid = db["DBInstanceIdentifier"]
        arn = db.get("DBInstanceArn", "")
        vpc_id = db.get("DBSubnetGroup", {}).get("VpcId", "")
        sg_ids = [sg["VpcSecurityGroupId"] for sg in db.get("VpcSecurityGroups", [])]
        svc.graph.add_resource(DiscoveredResource(
            id=dbid, arn=arn,
            resource_type="rds_instance", service="RDS",
            name=dbid, region=region,
            properties={
                "engine": db.get("Engine", ""), "engine_version": db.get("EngineVersion", ""),
                "instance_class": db.get("DBInstanceClass", ""),
                "status": db.get("DBInstanceStatus", ""),
                "vpc_id": vpc_id, "multi_az": db.get("MultiAZ", False),
                "security_groups": sg_ids,
            },
            tags={},
        ))
        if vpc_id and vpc_id in svc.graph.resources:
            svc.graph.add_edge(vpc_id, dbid, "contains", "RDS")
        for sgid in sg_ids:
            if sgid in svc.graph.resources:
                svc.graph.add_edge(dbid, sgid, "attached_to", "SG")

    # DB Clusters
    clusters = _paginate(rds, "describe_db_clusters", "DBClusters")
    for cl in clusters:
        cid = cl["DBClusterIdentifier"]
        arn = cl.get("DBClusterArn", "")
        svc.graph.add_resource(DiscoveredResource(
            id=cid, arn=arn,
            resource_type="rds_cluster", service="RDS",
            name=cid, region=region,
            properties={"engine": cl.get("Engine", ""), "status": cl.get("Status", "")},
            tags={},
        ))


@register_scanner("S3")
def scan_s3(svc: "InfraDiscoveryService"):
    s3 = svc.session.client("s3", region_name=svc.region)
    try:
        resp = s3.list_buckets()
        for b in resp.get("Buckets", [])[:MAX_RESOURCES_PER_TYPE]:
            name = b["Name"]
            svc.graph.add_resource(DiscoveredResource(
                id=f"s3-{name}", arn=f"arn:aws:s3:::{name}",
                resource_type="s3_bucket", service="S3",
                name=name, region="global",
                properties={"creation_date": str(b.get("CreationDate", ""))},
                tags={},
            ))
    except ClientError:
        raise


@register_scanner("Lambda")
def scan_lambda(svc: "InfraDiscoveryService"):
    lam = svc.session.client("lambda", region_name=svc.region)
    region = svc.region

    functions = _paginate(lam, "list_functions", "Functions")
    for fn in functions:
        fname = fn["FunctionName"]
        arn = fn.get("FunctionArn", "")
        role_arn = fn.get("Role", "")
        vpc_cfg = fn.get("VpcConfig", {})
        subnet_ids = vpc_cfg.get("SubnetIds", [])
        sg_ids = vpc_cfg.get("SecurityGroupIds", [])
        svc.graph.add_resource(DiscoveredResource(
            id=fname, arn=arn,
            resource_type="lambda_function", service="Lambda",
            name=fname, region=region,
            properties={
                "runtime": fn.get("Runtime", ""),
                "memory": fn.get("MemorySize", 0),
                "timeout": fn.get("Timeout", 0),
                "handler": fn.get("Handler", ""),
                "role_arn": role_arn,
                "vpc_subnet_ids": subnet_ids,
                "vpc_sg_ids": sg_ids,
            },
            tags={},
        ))
        # Link to IAM role
        if role_arn:
            role_name = role_arn.split("/")[-1] if "/" in role_arn else role_arn
            if role_name in svc.graph.resources:
                svc.graph.add_edge(fname, role_name, "attached_to", "IAM Role")
        # Link to VPC subnets
        for sid in subnet_ids:
            if sid in svc.graph.resources:
                svc.graph.add_edge(sid, fname, "contains", "Lambda")

    # Event source mappings
    mappings = _paginate(lam, "list_event_source_mappings", "EventSourceMappings")
    for m in mappings:
        fn_arn = m.get("FunctionArn", "")
        fn_name = fn_arn.split(":")[-1] if ":" in fn_arn else fn_arn
        source_arn = m.get("EventSourceArn", "")
        if "dynamodb" in source_arn.lower():
            table_name = source_arn.split("/")[1] if "/" in source_arn else source_arn
            if table_name in svc.graph.resources and fn_name in svc.graph.resources:
                svc.graph.add_edge(table_name, fn_name, "triggers", "DynamoDB Stream")
        elif "sqs" in source_arn.lower():
            # Extract queue name from ARN
            queue_parts = source_arn.split(":")
            queue_name = queue_parts[-1] if queue_parts else source_arn
            queue_id = f"sqs-{queue_name}"
            if queue_id in svc.graph.resources and fn_name in svc.graph.resources:
                svc.graph.add_edge(queue_id, fn_name, "triggers", "SQS")
        elif "kinesis" in source_arn.lower():
            stream_name = source_arn.split("/")[-1] if "/" in source_arn else source_arn
            if stream_name in svc.graph.resources and fn_name in svc.graph.resources:
                svc.graph.add_edge(stream_name, fn_name, "triggers", "Kinesis")


@register_scanner("ELB")
def scan_elb(svc: "InfraDiscoveryService"):
    elbv2 = svc.session.client("elbv2", region_name=svc.region)
    region = svc.region

    lbs = _paginate(elbv2, "describe_load_balancers", "LoadBalancers")
    for lb in lbs:
        lb_arn = lb["LoadBalancerArn"]
        lb_name = lb["LoadBalancerName"]
        lb_type = lb.get("Type", "application")
        vpc_id = lb.get("VpcId", "")
        azs = lb.get("AvailabilityZones", [])
        subnet_ids = [az.get("SubnetId", "") for az in azs if az.get("SubnetId")]
        svc.graph.add_resource(DiscoveredResource(
            id=lb_arn, arn=lb_arn,
            resource_type=f"{'alb' if lb_type == 'application' else 'nlb'}",
            service="ELB", name=lb_name, region=region,
            properties={"type": lb_type, "dns": lb.get("DNSName", ""),
                        "scheme": lb.get("Scheme", ""), "vpc_id": vpc_id,
                        "subnet_ids": subnet_ids},
            tags={},
        ))
        if vpc_id and vpc_id in svc.graph.resources:
            svc.graph.add_edge(vpc_id, lb_arn, "contains", "ELB")

    # Target Groups
    tgs = _paginate(elbv2, "describe_target_groups", "TargetGroups")
    for tg in tgs:
        tg_arn = tg["TargetGroupArn"]
        tg_name = tg["TargetGroupName"]
        svc.graph.add_resource(DiscoveredResource(
            id=tg_arn, arn=tg_arn,
            resource_type="target_group", service="ELB",
            name=tg_name, region=region,
            properties={"target_type": tg.get("TargetType", ""),
                        "protocol": tg.get("Protocol", ""),
                        "port": tg.get("Port", 0)},
            tags={},
        ))
        for lb_arn_ref in tg.get("LoadBalancerArns", []):
            if lb_arn_ref in svc.graph.resources:
                svc.graph.add_edge(lb_arn_ref, tg_arn, "routes_to", "target group")

        # If target type is lambda, try to link
        if tg.get("TargetType") == "lambda":
            try:
                health = elbv2.describe_target_health(TargetGroupArn=tg_arn)
                for desc in health.get("TargetHealthDescriptions", []):
                    target_id = desc.get("Target", {}).get("Id", "")
                    # Lambda ARN — extract function name
                    if ":function:" in target_id:
                        fn_name = target_id.split(":")[-1]
                        if fn_name in svc.graph.resources:
                            svc.graph.add_edge(tg_arn, fn_name, "targets", "Lambda")
            except ClientError:
                pass

    # Listeners
    for lb in lbs:
        try:
            listeners = _paginate(elbv2, "describe_listeners", "Listeners",
                                  LoadBalancerArn=lb["LoadBalancerArn"])
            for _listener in listeners:
                pass  # Listeners captured implicitly through target groups
        except ClientError:
            pass


@register_scanner("ECS")
def scan_ecs(svc: "InfraDiscoveryService"):
    ecs = svc.session.client("ecs", region_name=svc.region)
    region = svc.region

    cluster_arns = _paginate(ecs, "list_clusters", "clusterArns")
    if not cluster_arns:
        return

    # Describe clusters in batches of 100
    for i in range(0, len(cluster_arns), 100):
        batch = cluster_arns[i:i + 100]
        resp = ecs.describe_clusters(clusters=batch)
        for cl in resp.get("clusters", []):
            c_arn = cl["clusterArn"]
            c_name = cl["clusterName"]
            svc.graph.add_resource(DiscoveredResource(
                id=c_arn, arn=c_arn,
                resource_type="ecs_cluster", service="ECS",
                name=c_name, region=region,
                properties={
                    "status": cl.get("status", ""),
                    "running_tasks": cl.get("runningTasksCount", 0),
                    "services_count": cl.get("activeServicesCount", 0),
                },
                tags={},
            ))

            # Services in cluster
            try:
                svc_arns = _paginate(ecs, "list_services", "serviceArns", cluster=c_arn)
                if svc_arns:
                    for j in range(0, len(svc_arns), 10):
                        svc_batch = svc_arns[j:j + 10]
                        svc_resp = ecs.describe_services(cluster=c_arn, services=svc_batch)
                        for es in svc_resp.get("services", []):
                            s_arn = es["serviceArn"]
                            s_name = es["serviceName"]
                            lb_list = es.get("loadBalancers", [])
                            svc.graph.add_resource(DiscoveredResource(
                                id=s_arn, arn=s_arn,
                                resource_type="ecs_service", service="ECS",
                                name=s_name, region=region,
                                properties={
                                    "status": es.get("status", ""),
                                    "desired_count": es.get("desiredCount", 0),
                                    "running_count": es.get("runningCount", 0),
                                    "launch_type": es.get("launchType", ""),
                                },
                                tags={},
                            ))
                            svc.graph.add_edge(c_arn, s_arn, "contains", "service")
                            # Link to ELB target groups
                            for lb_cfg in lb_list:
                                tg_arn = lb_cfg.get("targetGroupArn", "")
                                if tg_arn and tg_arn in svc.graph.resources:
                                    svc.graph.add_edge(tg_arn, s_arn, "targets", "ECS service")
            except ClientError:
                pass


@register_scanner("DynamoDB")
def scan_dynamodb(svc: "InfraDiscoveryService"):
    ddb = svc.session.client("dynamodb", region_name=svc.region)
    region = svc.region

    table_names = _paginate(ddb, "list_tables", "TableNames")
    for tname in table_names:
        try:
            desc = ddb.describe_table(TableName=tname)["Table"]
            arn = desc.get("TableArn", "")
            has_stream = bool(desc.get("StreamSpecification", {}).get("StreamEnabled"))
            svc.graph.add_resource(DiscoveredResource(
                id=tname, arn=arn,
                resource_type="dynamodb_table", service="DynamoDB",
                name=tname, region=region,
                properties={
                    "status": desc.get("TableStatus", ""),
                    "item_count": desc.get("ItemCount", 0),
                    "size_bytes": desc.get("TableSizeBytes", 0),
                    "billing_mode": desc.get("BillingModeSummary", {}).get("BillingMode", ""),
                    "has_stream": has_stream,
                },
                tags={},
            ))
        except ClientError:
            pass


@register_scanner("SQS")
def scan_sqs(svc: "InfraDiscoveryService"):
    sqsc = svc.session.client("sqs", region_name=svc.region)
    region = svc.region

    try:
        resp = sqsc.list_queues()
        queue_urls = resp.get("QueueUrls", [])
    except ClientError:
        return

    for url in queue_urls[:MAX_RESOURCES_PER_TYPE]:
        try:
            attrs = sqsc.get_queue_attributes(
                QueueUrl=url,
                AttributeNames=["QueueArn", "ApproximateNumberOfMessages"]
            ).get("Attributes", {})
            arn = attrs.get("QueueArn", "")
            qname = url.split("/")[-1]
            svc.graph.add_resource(DiscoveredResource(
                id=f"sqs-{qname}", arn=arn,
                resource_type="sqs_queue", service="SQS",
                name=qname, region=region,
                properties={
                    "url": url,
                    "approx_messages": int(attrs.get("ApproximateNumberOfMessages", 0)),
                },
                tags={},
            ))
        except ClientError:
            pass


@register_scanner("SNS")
def scan_sns(svc: "InfraDiscoveryService"):
    sns = svc.session.client("sns", region_name=svc.region)
    region = svc.region

    topics = _paginate(sns, "list_topics", "Topics")
    for t in topics:
        arn = t["TopicArn"]
        name = arn.split(":")[-1]
        svc.graph.add_resource(DiscoveredResource(
            id=f"sns-{name}", arn=arn,
            resource_type="sns_topic", service="SNS",
            name=name, region=region,
            properties={}, tags={},
        ))

    # Subscriptions
    subs = _paginate(sns, "list_subscriptions", "Subscriptions")
    for sub in subs:
        topic_arn = sub.get("TopicArn", "")
        endpoint = sub.get("Endpoint", "")
        protocol = sub.get("Protocol", "")
        topic_name = topic_arn.split(":")[-1]
        topic_id = f"sns-{topic_name}"

        if protocol == "lambda" and topic_id in svc.graph.resources:
            fn_name = endpoint.split(":")[-1] if ":" in endpoint else endpoint
            if fn_name in svc.graph.resources:
                svc.graph.add_edge(topic_id, fn_name, "triggers", "SNS→Lambda")
        elif protocol == "sqs" and topic_id in svc.graph.resources:
            queue_name = endpoint.split(":")[-1] if ":" in endpoint else endpoint
            queue_id = f"sqs-{queue_name}"
            if queue_id in svc.graph.resources:
                svc.graph.add_edge(topic_id, queue_id, "targets", "SNS→SQS")


@register_scanner("CloudFront")
def scan_cloudfront(svc: "InfraDiscoveryService"):
    cf = svc.session.client("cloudfront", region_name="us-east-1")

    try:
        items = _paginate(cf, "list_distributions", "DistributionList")
        # list_distributions returns nested structure
        if isinstance(items, dict):
            items = items.get("Items", [])
    except ClientError:
        try:
            resp = cf.list_distributions()
            items = resp.get("DistributionList", {}).get("Items", []) or []
        except ClientError:
            return

    for dist in (items or []):
        dist_id = dist["Id"]
        arn = dist.get("ARN", "")
        domain = dist.get("DomainName", "")
        svc.graph.add_resource(DiscoveredResource(
            id=dist_id, arn=arn,
            resource_type="cloudfront_distribution", service="CloudFront",
            name=domain or dist_id, region="global",
            properties={"domain": domain, "status": dist.get("Status", ""),
                        "enabled": dist.get("Enabled", False)},
            tags={},
        ))
        # Link origins
        for origin in dist.get("Origins", {}).get("Items", []):
            domain_name = origin.get("DomainName", "")
            if ".s3." in domain_name or domain_name.endswith(".s3.amazonaws.com"):
                bucket_name = domain_name.split(".")[0]
                bucket_id = f"s3-{bucket_name}"
                if bucket_id in svc.graph.resources:
                    svc.graph.add_edge(dist_id, bucket_id, "routes_to", "S3 origin")
            elif "elb" in domain_name.lower() or "loadbalancer" in domain_name.lower():
                for rid, r in svc.graph.resources.items():
                    if r.resource_type in ("alb", "nlb") and r.properties.get("dns") == domain_name:
                        svc.graph.add_edge(dist_id, rid, "routes_to", "ELB origin")
                        break


@register_scanner("Route53")
def scan_route53(svc: "InfraDiscoveryService"):
    r53 = svc.session.client("route53", region_name="us-east-1")

    try:
        zones = _paginate(r53, "list_hosted_zones", "HostedZones")
    except ClientError:
        return

    for zone in zones:
        zone_id = zone["Id"].split("/")[-1]
        zone_name = zone["Name"].rstrip(".")
        svc.graph.add_resource(DiscoveredResource(
            id=f"r53-{zone_id}", arn=f"arn:aws:route53:::hostedzone/{zone_id}",
            resource_type="hosted_zone", service="Route53",
            name=zone_name, region="global",
            properties={"record_count": zone.get("ResourceRecordSetCount", 0),
                        "private": zone.get("Config", {}).get("PrivateZone", False)},
            tags={},
        ))

        # Record sets
        try:
            records = _paginate(r53, "list_resource_record_sets", "ResourceRecordSets",
                                HostedZoneId=zone_id)
            for rec in records:
                alias = rec.get("AliasTarget", {})
                if alias:
                    dns_name = alias.get("DNSName", "").rstrip(".")
                    rec_name = rec.get("Name", "").rstrip(".")
                    # Link to CloudFront
                    if "cloudfront" in dns_name:
                        for rid, r in svc.graph.resources.items():
                            if r.resource_type == "cloudfront_distribution" and r.properties.get("domain", "") in dns_name:
                                svc.graph.add_edge(f"r53-{zone_id}", rid, "routes_to", rec_name)
                                break
                    # Link to ELB
                    elif "elb" in dns_name.lower():
                        for rid, r in svc.graph.resources.items():
                            if r.resource_type in ("alb", "nlb") and r.properties.get("dns", "") in dns_name:
                                svc.graph.add_edge(f"r53-{zone_id}", rid, "routes_to", rec_name)
                                break
        except ClientError:
            pass


@register_scanner("API Gateway")
def scan_apigateway(svc: "InfraDiscoveryService"):
    region = svc.region

    # REST APIs (v1)
    try:
        apigw = svc.session.client("apigateway", region_name=region)
        apis = _paginate(apigw, "get_rest_apis", "items")
        for api in apis:
            api_id = api["id"]
            name = api.get("name", api_id)
            svc.graph.add_resource(DiscoveredResource(
                id=f"apigw-{api_id}", arn=f"arn:aws:apigateway:{region}::/restapis/{api_id}",
                resource_type="api_gateway", service="API Gateway",
                name=name, region=region,
                properties={"type": "REST", "description": api.get("description", "")},
                tags={},
            ))
    except ClientError:
        pass

    # HTTP/WebSocket APIs (v2)
    try:
        apigw2 = svc.session.client("apigatewayv2", region_name=region)
        apis_v2 = _paginate(apigw2, "get_apis", "Items")
        for api in apis_v2:
            api_id = api["ApiId"]
            name = api.get("Name", api_id)
            proto = api.get("ProtocolType", "HTTP")
            svc.graph.add_resource(DiscoveredResource(
                id=f"apigw2-{api_id}",
                arn=f"arn:aws:apigateway:{region}::/apis/{api_id}",
                resource_type="api_gateway_v2", service="API Gateway",
                name=name, region=region,
                properties={"type": proto, "endpoint": api.get("ApiEndpoint", "")},
                tags={},
            ))
    except ClientError:
        pass


@register_scanner("ElastiCache")
def scan_elasticache(svc: "InfraDiscoveryService"):
    ec = svc.session.client("elasticache", region_name=svc.region)
    region = svc.region

    clusters = _paginate(ec, "describe_cache_clusters", "CacheClusters")
    for cl in clusters:
        cid = cl["CacheClusterId"]
        arn = cl.get("ARN", "")
        svc.graph.add_resource(DiscoveredResource(
            id=cid, arn=arn,
            resource_type="elasticache_cluster", service="ElastiCache",
            name=cid, region=region,
            properties={
                "engine": cl.get("Engine", ""),
                "engine_version": cl.get("EngineVersion", ""),
                "node_type": cl.get("CacheNodeType", ""),
                "num_nodes": cl.get("NumCacheNodes", 0),
                "status": cl.get("CacheClusterStatus", ""),
            },
            tags={},
        ))
        # ElastiCache security groups → VPC link
        for sg in cl.get("SecurityGroups", []):
            sgid = sg.get("SecurityGroupId", "")
            if sgid and sgid in svc.graph.resources:
                svc.graph.add_edge(cid, sgid, "attached_to", "SG")


@register_scanner("IAM")
def scan_iam(svc: "InfraDiscoveryService"):
    iam = svc.session.client("iam", region_name="us-east-1")

    # Only list roles (limited scope)
    roles = _paginate(iam, "list_roles", "Roles")
    for role in roles[:100]:  # Cap at 100 IAM roles
        rname = role["RoleName"]
        arn = role.get("Arn", "")
        svc.graph.add_resource(DiscoveredResource(
            id=rname, arn=arn,
            resource_type="iam_role", service="IAM",
            name=rname, region="global",
            properties={"path": role.get("Path", "/"),
                        "create_date": str(role.get("CreateDate", ""))},
            tags={},
        ))


@register_scanner("KMS")
def scan_kms(svc: "InfraDiscoveryService"):
    kms = svc.session.client("kms", region_name=svc.region)
    region = svc.region

    keys = _paginate(kms, "list_keys", "Keys")
    # Also get aliases for naming
    aliases = {}
    try:
        alias_list = _paginate(kms, "list_aliases", "Aliases")
        for a in alias_list:
            kid = a.get("TargetKeyId", "")
            if kid:
                aliases[kid] = a.get("AliasName", "")
    except ClientError:
        pass

    for key in keys[:100]:  # Cap at 100
        kid = key["KeyId"]
        arn = key.get("KeyArn", "")
        alias = aliases.get(kid, "")
        svc.graph.add_resource(DiscoveredResource(
            id=f"kms-{kid}", arn=arn,
            resource_type="kms_key", service="KMS",
            name=alias or kid, region=region,
            properties={"alias": alias},
            tags={},
        ))


@register_scanner("CloudWatch")
def scan_cloudwatch(svc: "InfraDiscoveryService"):
    region = svc.region

    # Log Groups
    logs = svc.session.client("logs", region_name=region)
    log_groups = _paginate(logs, "describe_log_groups", "logGroups")
    for lg in log_groups[:200]:  # Cap at 200
        name = lg["logGroupName"]
        arn = lg.get("arn", "")
        svc.graph.add_resource(DiscoveredResource(
            id=f"loggroup-{name}", arn=arn,
            resource_type="log_group", service="CloudWatch",
            name=name, region=region,
            properties={"stored_bytes": lg.get("storedBytes", 0),
                        "retention_days": lg.get("retentionInDays")},
            tags={},
        ))

    # Alarms
    cw = svc.session.client("cloudwatch", region_name=region)
    alarms = _paginate(cw, "describe_alarms", "MetricAlarms")
    for alarm in alarms[:200]:
        aname = alarm["AlarmName"]
        arn = alarm.get("AlarmArn", "")
        actions = alarm.get("AlarmActions", [])
        svc.graph.add_resource(DiscoveredResource(
            id=f"alarm-{aname}", arn=arn,
            resource_type="cloudwatch_alarm", service="CloudWatch",
            name=aname, region=region,
            properties={"state": alarm.get("StateValue", ""),
                        "metric": alarm.get("MetricName", ""),
                        "namespace": alarm.get("Namespace", "")},
            tags={},
        ))
        # Link alarm actions to SNS
        for action_arn in actions:
            if ":sns:" in action_arn:
                topic_name = action_arn.split(":")[-1]
                topic_id = f"sns-{topic_name}"
                if topic_id in svc.graph.resources:
                    svc.graph.add_edge(f"alarm-{aname}", topic_id, "targets", "SNS action")


# ---------------------------------------------------------------------------
# Discovery Service
# ---------------------------------------------------------------------------

class InfraDiscoveryService:
    """Orchestrates infrastructure scanning across registered scanners."""

    def __init__(self, session, region: str, event_callback: Callable | None = None):
        self.session = session
        self.region = region
        self.event_callback = event_callback
        self.graph = InfraGraph(region=region)

    def _emit(self, event: str, data: dict):
        if self.event_callback:
            self.event_callback(event, data)

    def scan_all(self, selected_services: list[str] | None = None) -> InfraGraph:
        """Run all registered scanners (or a subset) and return the populated graph."""
        scanners = _SCANNERS
        if selected_services:
            scanners = {k: v for k, v in _SCANNERS.items() if k in selected_services}

        total = len(scanners)
        for idx, (name, scanner_fn) in enumerate(scanners.items()):
            self._emit("infra_scan_progress", {
                "service": name, "index": idx, "total": total, "status": "scanning",
            })
            try:
                scanner_fn(self)
                self._emit("infra_scan_progress", {
                    "service": name, "index": idx, "total": total, "status": "done",
                })
            except Exception as e:
                error_msg = str(e)[:200]
                log.warning("Scanner %s failed: %s", name, error_msg)
                self.graph.scan_errors.append({"service": name, "error": error_msg})
                self._emit("infra_scan_progress", {
                    "service": name, "index": idx, "total": total,
                    "status": "error", "error": error_msg,
                })

        return self.graph
