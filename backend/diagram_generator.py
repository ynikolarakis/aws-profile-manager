"""Diagram generation — proper AWS architecture layout, draw.io export, React Flow format.

Based on AWS official architecture diagram standards (2023+):
- Official AWS color palette (Smile/Galaxy/Mars/Endor/Cosmos/Nebula)
- Left-to-right flow: Global → Edge → Compute → Data → Ops
- Proper containment: VPC > Subnet > Resources
- Resource collapsing for large infrastructures (200+ resources)
- draw.io export with mxgraph.aws4 shapes
"""

import re
import xml.etree.ElementTree as ET
from collections import defaultdict


# ---------------------------------------------------------------------------
# Official AWS Color Palette (2023+)
# ---------------------------------------------------------------------------

AWS_COLORS = {
    "smile": "#ED7100",   # Orange — Compute, Containers
    "galaxy": "#8C4FFF",  # Purple — Networking, Serverless
    "mars": "#DD344C",    # Red — Security, Identity & Compliance
    "endor": "#7AA116",   # Green — Storage
    "cosmos": "#E7157B",  # Pink — App Integration, Management
    "nebula": "#C925D1",  # Magenta — Database
    "orbit": "#01A88D",   # Teal — AI/ML
    "squid": "#232F3E",   # Dark Navy — AWS Cloud
}

# Service → official AWS category color
SERVICE_COLORS = {
    "EC2": AWS_COLORS["smile"],
    "ECS": AWS_COLORS["smile"],
    "Lambda": AWS_COLORS["galaxy"],
    "ELB": AWS_COLORS["galaxy"],
    "CloudFront": AWS_COLORS["galaxy"],
    "Route53": AWS_COLORS["galaxy"],
    "API Gateway": AWS_COLORS["galaxy"],
    "VPC": AWS_COLORS["galaxy"],
    "RDS": AWS_COLORS["nebula"],
    "DynamoDB": AWS_COLORS["nebula"],
    "ElastiCache": AWS_COLORS["nebula"],
    "S3": AWS_COLORS["endor"],
    "SQS": AWS_COLORS["cosmos"],
    "SNS": AWS_COLORS["cosmos"],
    "IAM": AWS_COLORS["mars"],
    "KMS": AWS_COLORS["mars"],
    "CloudWatch": AWS_COLORS["cosmos"],
}

# Service icons (emoji)
SERVICE_ICONS = {
    "EC2": "\U0001F5A5\uFE0F",
    "VPC": "\U0001F310",
    "RDS": "\U0001F4BE",
    "S3": "\U0001FAA3",
    "Lambda": "\u26A1",
    "ELB": "\u2696\uFE0F",
    "ECS": "\U0001F433",
    "DynamoDB": "\U0001F4CA",
    "SQS": "\U0001F4E8",
    "SNS": "\U0001F514",
    "CloudFront": "\U0001F30D",
    "Route53": "\U0001F9ED",
    "API Gateway": "\U0001F6AA",
    "ElastiCache": "\U0001F9CA",
    "IAM": "\U0001F512",
    "KMS": "\U0001F511",
    "CloudWatch": "\U0001F4C8",
}

# ---------------------------------------------------------------------------
# Zone classification — left-to-right flow
# ---------------------------------------------------------------------------

# Zones: 0=Global, 1=Edge/Entry, 2=Compute, 3=Data, 4=Integration, 5=Ops
RESOURCE_TYPE_ZONE = {
    # Zone 0 — Global (outside Region)
    "hosted_zone": 0,
    "cloudfront_distribution": 0,
    # Zone 1 — Edge/Entry
    "api_gateway": 1,
    "api_gateway_v2": 1,
    "internet_gateway": 1,
    "alb": 1,
    "nlb": 1,
    "target_group": 1,
    "nat_gateway": 1,
    # Zone 2 — Compute
    "ec2_instance": 2,
    "ecs_cluster": 2,
    "ecs_service": 2,
    "lambda_function": 2,
    # Zone 3 — Data
    "rds_instance": 3,
    "rds_cluster": 3,
    "dynamodb_table": 3,
    "elasticache_cluster": 3,
    "s3_bucket": 3,
    # Zone 4 — Integration
    "sqs_queue": 4,
    "sns_topic": 4,
    # Zone 5 — Security/Ops
    "iam_role": 5,
    "kms_key": 5,
    "log_group": 5,
    "cloudwatch_alarm": 5,
}

# Types that are structural (won't be placed as regular nodes)
STRUCTURAL_TYPES = {"vpc", "subnet", "route_table", "security_group", "ebs_volume"}

# draw.io shape mapping
DRAWIO_SHAPES = {
    "vpc": "mxgraph.aws4.group;grIcon=mxgraph.aws4.group_vpc",
    "subnet": "mxgraph.aws4.group;grIcon=mxgraph.aws4.group_subnet",
    "ec2_instance": "mxgraph.aws4.instance2",
    "security_group": "mxgraph.aws4.permissions",
    "ebs_volume": "mxgraph.aws4.volume",
    "internet_gateway": "mxgraph.aws4.internet_gateway",
    "nat_gateway": "mxgraph.aws4.nat_gateway",
    "route_table": "mxgraph.aws4.route_table",
    "rds_instance": "mxgraph.aws4.rds_instance",
    "rds_cluster": "mxgraph.aws4.aurora_instance",
    "s3_bucket": "mxgraph.aws4.s3",
    "lambda_function": "mxgraph.aws4.lambda_function",
    "alb": "mxgraph.aws4.application_load_balancer",
    "nlb": "mxgraph.aws4.network_load_balancer",
    "target_group": "mxgraph.aws4.traditional_server",
    "ecs_cluster": "mxgraph.aws4.ecs",
    "ecs_service": "mxgraph.aws4.ecs_service",
    "dynamodb_table": "mxgraph.aws4.dynamodb_table",
    "sqs_queue": "mxgraph.aws4.sqs",
    "sns_topic": "mxgraph.aws4.sns",
    "cloudfront_distribution": "mxgraph.aws4.cloudfront",
    "hosted_zone": "mxgraph.aws4.route_53",
    "api_gateway": "mxgraph.aws4.api_gateway",
    "api_gateway_v2": "mxgraph.aws4.api_gateway",
    "elasticache_cluster": "mxgraph.aws4.elasticache_for_redis",
    "iam_role": "mxgraph.aws4.role",
    "kms_key": "mxgraph.aws4.kms",
    "log_group": "mxgraph.aws4.cloudwatch_2",
    "cloudwatch_alarm": "mxgraph.aws4.cloudwatch_alarm",
}


# ---------------------------------------------------------------------------
# Resource Collapsing — reduces 200+ resources to readable count
# ---------------------------------------------------------------------------

def _extract_prefix(name: str) -> str:
    """Extract a meaningful prefix for grouping similar resources."""
    # Common patterns: AWSReservedSSO_Admin_1234, aws-lambda-func-abc
    for delimiter in ["_", "-"]:
        parts = name.split(delimiter)
        if len(parts) >= 3:
            return delimiter.join(parts[:2])
        if len(parts) == 2 and len(parts[0]) >= 3:
            return parts[0]
    # Try common prefix detection: first N alpha chars
    alpha = re.match(r"^[A-Za-z]+", name)
    if alpha and len(alpha.group()) >= 4:
        return alpha.group()[:12]
    return name[:10] if len(name) > 10 else name


# Service-level display names for collapsed groups
_SERVICE_DISPLAY = {
    "iam_role": "IAM Roles",
    "s3_bucket": "S3 Buckets",
    "lambda_function": "Lambda Functions",
    "log_group": "Log Groups",
    "cloudwatch_alarm": "CW Alarms",
    "kms_key": "KMS Keys",
    "sqs_queue": "SQS Queues",
    "sns_topic": "SNS Topics",
}


def _make_collapsed_node(rtype: str, prefix: str, group: list[tuple[str, dict]]) -> dict:
    """Create a single collapsed node representing a group of similar resources."""
    representative = group[0][1]
    collapsed_id = f"collapsed_{rtype}_{prefix}"
    service_label = _SERVICE_DISPLAY.get(rtype, rtype.replace("_", " "))
    display_name = f"{prefix}\u2026 ({len(group)})" if prefix else f"{service_label} ({len(group)})"
    return collapsed_id, {
        **representative,
        "id": collapsed_id,
        "name": display_name,
        "properties": {
            **representative.get("properties", {}),
            "_collapsed": True,
            "_count": len(group),
            "_children": [rid for rid, _ in group],
        },
    }


def _collapse_resources(resources: dict, edges: list) -> tuple[dict, dict]:
    """Aggressively collapse similar resources for readable diagrams.

    Strategy:
    1. Resources with direct edges (non-contains) stay individual — they're "important"
    2. For each resource type with many unconnected items:
       a. Group by name prefix → collapse groups of 2+
       b. Any remaining ungrouped items → collapse into catch-all per type
    3. Target: <50 visible resource nodes

    Returns (visible_resources, collapse_map).
    """
    # Find resources with direct non-contains edges
    connected_ids = set()
    for e in edges:
        if e["edge_type"] != "contains":
            connected_ids.add(e["source_id"])
            connected_ids.add(e["target_id"])

    # Group non-structural resources by type
    type_groups: dict[str, list[tuple[str, dict]]] = defaultdict(list)
    for rid, r in resources.items():
        if r["resource_type"] in STRUCTURAL_TYPES:
            continue
        type_groups[r["resource_type"]].append((rid, r))

    visible = {}
    collapse_map = {}

    # Keep all structural resources as-is
    for rid, r in resources.items():
        if r["resource_type"] in STRUCTURAL_TYPES:
            visible[rid] = r

    for rtype, items in type_groups.items():
        # Very small groups — keep individual
        if len(items) <= 2:
            for rid, r in items:
                visible[rid] = r
            continue

        # Split: connected stay individual, unconnected get collapsed
        connected = [(rid, r) for rid, r in items if rid in connected_ids]
        unconnected = [(rid, r) for rid, r in items if rid not in connected_ids]

        for rid, r in connected:
            visible[rid] = r

        if len(unconnected) <= 2:
            for rid, r in unconnected:
                visible[rid] = r
            continue

        # If many unconnected items, just collapse entire type into one node
        # (avoids creating 13 prefix groups for IAM roles, etc.)
        MAX_GROUPS_PER_TYPE = 3
        service_label = _SERVICE_DISPLAY.get(rtype, rtype.replace("_", " "))

        # Group unconnected by prefix
        prefix_groups: dict[str, list[tuple[str, dict]]] = defaultdict(list)
        for rid, r in unconnected:
            prefix = _extract_prefix(r["name"])
            prefix_groups[prefix].append((rid, r))

        # Count how many groups of 2+ we'd create
        big_groups = [g for g in prefix_groups.values() if len(g) >= 2]

        if len(big_groups) > MAX_GROUPS_PER_TYPE or len(unconnected) > 10:
            # Too many groups — collapse ALL unconnected into single node
            collapsed_id, collapsed_node = _make_collapsed_node(rtype, "", unconnected)
            collapsed_node["name"] = f"{service_label} ({len(unconnected)})"
            visible[collapsed_id] = collapsed_node
            for rid, _ in unconnected:
                collapse_map[rid] = collapsed_id
        else:
            ungrouped: list[tuple[str, dict]] = []
            for prefix, group in prefix_groups.items():
                if len(group) >= 2:
                    collapsed_id, collapsed_node = _make_collapsed_node(rtype, prefix, group)
                    visible[collapsed_id] = collapsed_node
                    for rid, _ in group:
                        collapse_map[rid] = collapsed_id
                else:
                    ungrouped.extend(group)

            # Catch-all for remaining ungrouped
            if len(ungrouped) >= 3:
                collapsed_id, collapsed_node = _make_collapsed_node(
                    rtype, "", ungrouped
                )
                collapsed_node["name"] = f"Other {service_label} ({len(ungrouped)})"
                visible[collapsed_id] = collapsed_node
                for rid, _ in ungrouped:
                    collapse_map[rid] = collapsed_id
            else:
                for rid, r in ungrouped:
                    visible[rid] = r

    return visible, collapse_map


# ---------------------------------------------------------------------------
# Subnet classification
# ---------------------------------------------------------------------------

def _is_public_subnet(resource: dict, edges: list, resources: dict) -> bool:
    """Determine if a subnet is public based on name or attached IGW."""
    name = resource.get("name", "").lower()
    if any(kw in name for kw in ("public", "pub-", "dmz", "external")):
        return True
    if any(kw in name for kw in ("private", "priv-", "internal", "data")):
        return False
    # Check if any IGW is connected via the same VPC
    vpc_id = resource.get("properties", {}).get("vpc_id", "")
    if vpc_id:
        for e in edges:
            if e["edge_type"] == "attached_to":
                src = resources.get(e["source_id"], {})
                tgt = resources.get(e["target_id"], {})
                if src.get("resource_type") == "internet_gateway" or tgt.get("resource_type") == "internet_gateway":
                    igw_vpc = src.get("properties", {}).get("vpc_id", "") or tgt.get("properties", {}).get("vpc_id", "")
                    if igw_vpc == vpc_id:
                        return True
    return False


# ---------------------------------------------------------------------------
# Algorithmic Layout Engine — Zone-based, left-to-right
# ---------------------------------------------------------------------------

class AlgorithmicLayoutEngine:
    """AWS architecture diagram layout with left-to-right flow and proper containment."""

    # Node dimensions
    NODE_W = 150
    NODE_H = 56
    NODE_GAP_X = 20
    NODE_GAP_Y = 16

    # Container padding
    PAD = 24
    PAD_TOP = 44  # Extra room for title badge

    # Zone X base positions (left-to-right)
    ZONE_GAP = 80
    ZONE_START_X = {
        0: 50,     # Global
        1: 0,      # Entry (positioned dynamically inside VPC)
        2: 0,      # Compute (positioned dynamically inside VPC)
        3: 0,      # Data (positioned dynamically)
        4: 0,      # Integration (positioned dynamically)
        5: 0,      # Ops (positioned dynamically)
    }

    def layout(self, graph_dict: dict) -> tuple[dict, dict, dict]:
        """Returns (positions_dict, collapse_map, visible_resources)."""
        resources = graph_dict.get("resources", {})
        edges = graph_dict.get("edges", [])

        if not resources:
            return {}, {}

        # Step 1: Collapse similar resources
        visible, collapse_map = _collapse_resources(resources, edges)

        # Step 2: Build containment (VPC -> subnet -> resources)
        vpc_subnets, subnet_resources = self._build_containment(visible, edges)

        # Step 3: Classify non-contained resources by zone
        contained_ids = set()
        for vpc_id, subs in vpc_subnets.items():
            contained_ids.add(vpc_id)
            for sid in subs:
                contained_ids.add(sid)
                contained_ids.update(subnet_resources.get(sid, []))

        zone_resources: dict[int, list[str]] = defaultdict(list)
        for rid, r in visible.items():
            if rid in contained_ids:
                continue
            if r["resource_type"] in STRUCTURAL_TYPES:
                continue
            zone = RESOURCE_TYPE_ZONE.get(r["resource_type"], 3)
            zone_resources[zone].append(rid)

        # Step 4: Layout everything
        positions = {}

        # Layout VPC containers first to know their width
        vpc_x_start = 300  # After global zone
        vpc_total_width = 0
        vpc_total_height = 0

        for vpc_id, subnet_ids in vpc_subnets.items():
            vpc_pos = self._layout_vpc(
                vpc_id, subnet_ids, subnet_resources, visible, edges, resources
            )
            # Offset VPC to its position
            for nid, pos in vpc_pos.items():
                pos["x"] += vpc_x_start
                pos["y"] += 50
            positions.update(vpc_pos)

            vpc_w = positions[vpc_id]["width"]
            vpc_h = positions[vpc_id]["height"]
            vpc_total_width = max(vpc_total_width, vpc_w)
            vpc_total_height += vpc_h + 40

        # Determine zone X positions based on VPC width
        right_of_vpc = vpc_x_start + vpc_total_width + self.ZONE_GAP if vpc_total_width > 0 else 300
        managed_x = right_of_vpc
        ops_x = managed_x  # Will be adjusted

        # Layout zone 0: Global (far left)
        y_global = 80
        for rid in zone_resources.get(0, []):
            positions[rid] = {
                "x": 50, "y": y_global,
                "width": self.NODE_W, "height": self.NODE_H,
                "group": None, "is_container": False,
            }
            y_global += self.NODE_H + self.NODE_GAP_Y * 3

        # Layout zones outside VPC (stacked in columns right of VPC)
        # Zone 3 (data outside VPC): S3, DynamoDB etc that aren't in subnets
        # Zone 4 (integration): SQS, SNS
        # Zone 5 (ops): IAM, KMS, CloudWatch
        col_x = right_of_vpc
        for zone_num in [3, 4, 2, 1]:
            zone_items = zone_resources.get(zone_num, [])
            if not zone_items:
                continue
            y = 80
            for rid in zone_items:
                positions[rid] = {
                    "x": col_x, "y": y,
                    "width": self.NODE_W, "height": self.NODE_H,
                    "group": None, "is_container": False,
                }
                y += self.NODE_H + self.NODE_GAP_Y
            col_x += self.NODE_W + self.ZONE_GAP

        # Zone 5 (ops) — rightmost column
        ops_items = zone_resources.get(5, [])
        if ops_items:
            y = 80
            for rid in ops_items:
                positions[rid] = {
                    "x": col_x, "y": y,
                    "width": self.NODE_W, "height": self.NODE_H,
                    "group": None, "is_container": False,
                }
                y += self.NODE_H + self.NODE_GAP_Y

        return positions, collapse_map, visible

    def _build_containment(self, resources: dict, edges: list):
        """Build VPC -> subnet -> resource containment from edges."""
        vpc_subnets: dict[str, list[str]] = defaultdict(list)
        subnet_resources: dict[str, list[str]] = defaultdict(list)

        # VPC contains subnet
        for e in edges:
            if e["edge_type"] != "contains":
                continue
            src = resources.get(e["source_id"])
            tgt = resources.get(e["target_id"])
            if not src or not tgt:
                continue
            if src.get("resource_type") == "vpc" and tgt.get("resource_type") == "subnet":
                vpc_subnets[e["source_id"]].append(e["target_id"])

        # Assign non-structural resources to subnets based on "contains" edges
        # or infer from VPC/subnet properties
        resource_subnet = {}
        for e in edges:
            if e["edge_type"] != "contains":
                continue
            src = resources.get(e["source_id"])
            tgt = resources.get(e["target_id"])
            if not src or not tgt:
                continue
            if src.get("resource_type") == "subnet" and tgt.get("resource_type") not in STRUCTURAL_TYPES:
                subnet_resources[e["source_id"]].append(e["target_id"])
                resource_subnet[e["target_id"]] = e["source_id"]

        # Also check resources that reference a subnet via properties
        for rid, r in resources.items():
            if rid in resource_subnet or r["resource_type"] in STRUCTURAL_TYPES:
                continue
            subnet_id = r.get("properties", {}).get("subnet_id", "")
            if subnet_id and subnet_id in resources:
                subnet_resources[subnet_id].append(rid)
                resource_subnet[rid] = subnet_id

        return vpc_subnets, subnet_resources

    def _layout_vpc(self, vpc_id: str, subnet_ids: list[str],
                    subnet_resources: dict, visible: dict, edges: list,
                    all_resources: dict) -> dict:
        """Layout a VPC with its subnets and contained resources."""
        positions = {}
        vpc_res = visible[vpc_id]

        # Classify subnets as public/private
        public_subnets = []
        private_subnets = []
        for sid in subnet_ids:
            s = visible.get(sid)
            if not s:
                continue
            if _is_public_subnet(s, edges, all_resources):
                public_subnets.append(sid)
            else:
                private_subnets.append(sid)

        # Group subnets by AZ
        az_groups: dict[str, dict[str, list[str]]] = defaultdict(lambda: {"public": [], "private": []})
        for sid in public_subnets:
            az = visible[sid].get("properties", {}).get("az", "unknown")
            az_groups[az]["public"].append(sid)
        for sid in private_subnets:
            az = visible[sid].get("properties", {}).get("az", "unknown")
            az_groups[az]["private"].append(sid)

        # Layout: AZs stacked vertically, public subnets left, private right
        vpc_inner_y = self.PAD_TOP
        max_vpc_width = 0

        for az_name in sorted(az_groups.keys()):
            az_data = az_groups[az_name]
            row_x = self.PAD
            row_max_height = 0

            # Public subnets (left column)
            for sid in az_data["public"]:
                sub_pos = self._layout_subnet(sid, subnet_resources, visible, "public-subnet")
                # Offset to row position
                for nid, pos in sub_pos.items():
                    pos["x"] += row_x
                    pos["y"] += vpc_inner_y
                positions.update(sub_pos)
                sub_w = positions[sid]["width"]
                sub_h = positions[sid]["height"]
                row_x += sub_w + self.NODE_GAP_X
                row_max_height = max(row_max_height, sub_h)

            # Private subnets (right column)
            for sid in az_data["private"]:
                sub_pos = self._layout_subnet(sid, subnet_resources, visible, "private-subnet")
                for nid, pos in sub_pos.items():
                    pos["x"] += row_x
                    pos["y"] += vpc_inner_y
                positions.update(sub_pos)
                sub_w = positions[sid]["width"]
                sub_h = positions[sid]["height"]
                row_x += sub_w + self.NODE_GAP_X
                row_max_height = max(row_max_height, sub_h)

            max_vpc_width = max(max_vpc_width, row_x)
            vpc_inner_y += row_max_height + self.NODE_GAP_Y

        # VPC dimensions
        vpc_w = max(max_vpc_width + self.PAD, 400)
        vpc_h = max(vpc_inner_y + self.PAD, 200)

        positions[vpc_id] = {
            "x": 0, "y": 0,
            "width": vpc_w, "height": vpc_h,
            "group": None, "is_container": True,
            "group_type": "vpc",
        }

        return positions

    def _layout_subnet(self, subnet_id: str, subnet_resources: dict,
                       visible: dict, subnet_type: str) -> dict:
        """Layout a subnet with its contained resources."""
        positions = {}
        children = subnet_resources.get(subnet_id, [])

        # Grid layout for children
        cols = max(1, min(3, len(children)))  # 1-3 columns
        inner_x = self.PAD
        inner_y = self.PAD_TOP
        col_idx = 0
        row_height = 0
        max_x = inner_x

        for child_id in children:
            if child_id not in visible:
                continue
            x = inner_x + col_idx * (self.NODE_W + self.NODE_GAP_X)
            positions[child_id] = {
                "x": x, "y": inner_y,
                "width": self.NODE_W, "height": self.NODE_H,
                "group": subnet_id, "is_container": False,
            }
            max_x = max(max_x, x + self.NODE_W)
            row_height = self.NODE_H
            col_idx += 1
            if col_idx >= cols:
                col_idx = 0
                inner_y += self.NODE_H + self.NODE_GAP_Y
                row_height = 0

        if col_idx > 0:
            inner_y += row_height

        sub_w = max(max_x + self.PAD, 200)
        sub_h = max(inner_y + self.PAD, 120)

        positions[subnet_id] = {
            "x": 0, "y": 0,
            "width": sub_w, "height": sub_h,
            "group": visible[subnet_id].get("properties", {}).get("vpc_id", None),
            "is_container": True,
            "group_type": subnet_type,
        }

        return positions


# ---------------------------------------------------------------------------
# React Flow Converter
# ---------------------------------------------------------------------------

class ReactFlowConverter:
    """Convert positions + graph into React Flow nodes/edges format."""

    def convert(self, graph_dict: dict, positions: dict, collapse_map: dict,
                llm_result: dict | None = None,
                visible_resources: dict | None = None) -> dict:
        resources = visible_resources or graph_dict.get("resources", {})
        edges_raw = graph_dict.get("edges", [])
        nodes = []
        edges = []

        llm_labels = (llm_result or {}).get("resource_labels", {})

        for rid, pos in positions.items():
            # Look up resource in visible set or original
            r = None
            for src in [resources]:
                if rid in src:
                    r = src[rid]
                    break
            # Check if it's a collapsed resource (starts with "collapsed_")
            is_collapsed = rid.startswith("collapsed_")
            if r is None and not is_collapsed:
                continue

            if r is None:
                continue

            label = llm_labels.get(rid, r["name"])
            service = r["service"]
            service_color = SERVICE_COLORS.get(service, "#71717a")
            icon = SERVICE_ICONS.get(service, "\u2601\uFE0F")
            count = r.get("properties", {}).get("_count", 1)

            if pos.get("is_container"):
                group_type = pos.get("group_type", "vpc")
                nodes.append({
                    "id": rid,
                    "type": "awsGroup",
                    "position": {"x": pos["x"], "y": pos["y"]},
                    "data": {
                        "label": label,
                        "resourceType": r["resource_type"],
                        "service": service,
                        "groupType": group_type,
                        "serviceColor": service_color,
                        "properties": r.get("properties", {}),
                    },
                    "style": {
                        "width": pos["width"],
                        "height": pos["height"],
                    },
                    **({"parentId": pos["group"], "extent": "parent"} if pos.get("group") else {}),
                })
            else:
                node = {
                    "id": rid,
                    "type": "awsResource",
                    "position": {"x": pos["x"], "y": pos["y"]},
                    "data": {
                        "label": label,
                        "resourceType": r["resource_type"],
                        "service": service,
                        "serviceColor": service_color,
                        "icon": icon,
                        "count": count,
                        "collapsed": is_collapsed,
                        "arn": r.get("arn", ""),
                        "properties": {
                            k: v for k, v in r.get("properties", {}).items()
                            if not k.startswith("_")
                        },
                        "tags": r.get("tags", {}),
                    },
                }
                if pos.get("group"):
                    node["parentId"] = pos["group"]
                    node["extent"] = "parent"
                nodes.append(node)

        # Edges — skip "contains", remap collapsed
        seen_edges = set()
        edge_id = 0
        for e in edges_raw:
            if e["edge_type"] == "contains":
                continue
            src = collapse_map.get(e["source_id"], e["source_id"])
            tgt = collapse_map.get(e["target_id"], e["target_id"])
            if src not in positions or tgt not in positions:
                continue
            if src == tgt:
                continue
            edge_key = (src, tgt, e["edge_type"])
            if edge_key in seen_edges:
                continue
            seen_edges.add(edge_key)

            animated = e["edge_type"] in ("triggers", "routes_to")
            stroke_color = "#666666"
            if e["edge_type"] == "triggers":
                stroke_color = AWS_COLORS["cosmos"]
            elif e["edge_type"] == "routes_to":
                stroke_color = AWS_COLORS["galaxy"]
            elif e["edge_type"] == "targets":
                stroke_color = AWS_COLORS["smile"]

            edges.append({
                "id": f"e{edge_id}",
                "source": src,
                "target": tgt,
                "type": "smoothstep",
                "animated": animated,
                "label": e.get("label", ""),
                "style": {"stroke": stroke_color, "strokeWidth": 1.5},
                "data": {"edgeType": e["edge_type"]},
            })
            edge_id += 1

        return {"nodes": nodes, "edges": edges}


# ---------------------------------------------------------------------------
# Draw.io XML Generator
# ---------------------------------------------------------------------------

class DrawioXmlGenerator:
    """Generate .drawio (mxfile) XML from graph + positions."""

    def generate(self, graph_dict: dict, positions: dict, collapse_map: dict = None,
                 visible_resources: dict | None = None) -> str:
        resources = visible_resources or graph_dict.get("resources", {})
        edges_raw = graph_dict.get("edges", [])
        collapse_map = collapse_map or {}

        mxfile = ET.Element("mxfile")
        diagram = ET.SubElement(mxfile, "diagram", name="AWS Architecture")
        model = ET.SubElement(diagram, "mxGraphModel",
                              dx="1422", dy="762", grid="1", gridSize="10",
                              guides="1", tooltips="1", connect="1", arrows="1",
                              fold="1", page="1", pageScale="1",
                              pageWidth="1920", pageHeight="1080")
        root = ET.SubElement(model, "root")
        ET.SubElement(root, "mxCell", id="0")
        ET.SubElement(root, "mxCell", id="1", parent="0")

        cell_id = 2
        rid_to_cell: dict[str, str] = {}

        # Containers first
        for rid, pos in sorted(positions.items(), key=lambda x: 0 if x[1].get("is_container") else 1):
            if not pos.get("is_container"):
                continue
            r = resources.get(rid)
            if not r:
                continue

            cid = str(cell_id)
            cell_id += 1
            rid_to_cell[rid] = cid

            shape = DRAWIO_SHAPES.get(r["resource_type"], "mxgraph.aws4.group")
            color = SERVICE_COLORS.get(r["service"], "#8C4FFF")
            parent = rid_to_cell.get(pos.get("group", ""), "1")

            style = (
                f"shape={shape};verticalAlign=top;align=left;"
                f"spacingLeft=10;dashed=1;dashPattern=5 5;"
                f"fillColor=none;strokeColor={color};fontColor={color};"
                f"fontSize=12;fontStyle=1;"
            )

            cell = ET.SubElement(root, "mxCell",
                                 id=cid, value=r["name"], style=style,
                                 vertex="1", parent=parent)
            ET.SubElement(cell, "mxGeometry",
                          x=str(pos["x"]), y=str(pos["y"]),
                          width=str(pos["width"]), height=str(pos["height"]),
                          **{"as": "geometry"})

        # Regular nodes
        for rid, pos in positions.items():
            if pos.get("is_container"):
                continue
            r = resources.get(rid)
            if not r:
                # Check collapsed
                if rid.startswith("collapsed_"):
                    r = pos.get("_resource")
                if not r:
                    continue

            cid = str(cell_id)
            cell_id += 1
            rid_to_cell[rid] = cid

            shape = DRAWIO_SHAPES.get(r["resource_type"], "mxgraph.aws4.resourceIcon")
            color = SERVICE_COLORS.get(r["service"], "#ED7100")
            parent = rid_to_cell.get(pos.get("group", ""), "1")

            style = (
                f"shape={shape};outlineConnect=0;fontColor=#232F3E;"
                f"gradientColor=none;fillColor={color};strokeColor=none;"
                f"verticalLabelPosition=bottom;verticalAlign=top;"
                f"align=center;fontSize=10;"
            )

            cell = ET.SubElement(root, "mxCell",
                                 id=cid, value=r["name"], style=style,
                                 vertex="1", parent=parent)
            ET.SubElement(cell, "mxGeometry",
                          x=str(pos["x"]), y=str(pos["y"]),
                          width=str(pos["width"]), height=str(pos["height"]),
                          **{"as": "geometry"})

        # Edges
        seen_edges = set()
        for e in edges_raw:
            if e["edge_type"] == "contains":
                continue
            src = collapse_map.get(e["source_id"], e["source_id"])
            tgt = collapse_map.get(e["target_id"], e["target_id"])
            src_cell = rid_to_cell.get(src)
            tgt_cell = rid_to_cell.get(tgt)
            if not src_cell or not tgt_cell or src == tgt:
                continue
            edge_key = (src_cell, tgt_cell)
            if edge_key in seen_edges:
                continue
            seen_edges.add(edge_key)

            eid = str(cell_id)
            cell_id += 1
            style = (
                "edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;"
                "jettySize=auto;html=1;strokeColor=#666666;"
            )
            if e["edge_type"] == "triggers":
                style += f"dashed=1;strokeColor={AWS_COLORS['cosmos']};"
            elif e["edge_type"] == "routes_to":
                style += f"strokeColor={AWS_COLORS['galaxy']};"

            cell = ET.SubElement(root, "mxCell",
                                 id=eid, value=e.get("label", ""), style=style,
                                 edge="1", parent="1",
                                 source=src_cell, target=tgt_cell)
            ET.SubElement(cell, "mxGeometry", relative="1", **{"as": "geometry"})

        return ET.tostring(mxfile, encoding="unicode", xml_declaration=True)
