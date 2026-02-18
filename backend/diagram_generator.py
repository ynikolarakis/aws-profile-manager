"""Diagram generation — algorithmic layout, draw.io XML export, and React Flow format.

Provides:
- AlgorithmicLayoutEngine: Tiered/hierarchical layout positioning
- DrawioXmlGenerator: Generates .drawio (mxfile) XML
- ReactFlowConverter: Converts layout positions + graph into React Flow nodes/edges
"""

import xml.etree.ElementTree as ET


# ---------------------------------------------------------------------------
# AWS resource type → draw.io shape mapping
# ---------------------------------------------------------------------------

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

# Service → color for node badges
SERVICE_COLORS = {
    "VPC": "#248814",
    "EC2": "#ED7100",
    "RDS": "#3B48CC",
    "S3": "#3F8624",
    "Lambda": "#ED7100",
    "ELB": "#8C4FFF",
    "ECS": "#ED7100",
    "DynamoDB": "#3B48CC",
    "SQS": "#E7157B",
    "SNS": "#E7157B",
    "CloudFront": "#8C4FFF",
    "Route53": "#8C4FFF",
    "API Gateway": "#E7157B",
    "ElastiCache": "#3B48CC",
    "IAM": "#DD344C",
    "KMS": "#DD344C",
    "CloudWatch": "#E7157B",
}

# Tier assignments for hierarchical layout
SERVICE_TIERS = {
    "Route53": 0,
    "CloudFront": 0,
    "API Gateway": 1,
    "ELB": 1,
    "EC2": 2,
    "ECS": 2,
    "Lambda": 2,
    "SQS": 2,
    "SNS": 2,
    "RDS": 3,
    "DynamoDB": 3,
    "ElastiCache": 3,
    "S3": 3,
    "IAM": 4,
    "KMS": 4,
    "CloudWatch": 4,
}

CONTAINER_TYPES = {"vpc", "subnet"}


# ---------------------------------------------------------------------------
# Algorithmic Layout Engine
# ---------------------------------------------------------------------------

class AlgorithmicLayoutEngine:
    """Tiered/hierarchical layout with VPC/Subnet containers."""

    NODE_W = 60
    NODE_H = 60
    GROUP_PAD = 40
    TIER_GAP_Y = 140
    NODE_GAP_X = 100

    def layout(self, graph_dict: dict) -> dict:
        """Returns {node_id: {x, y, width, height, group, is_container}} positions dict."""
        resources = graph_dict.get("resources", {})
        if not resources:
            return {}

        positions: dict = {}

        # Separate containers and regular nodes
        containers = {}
        children_map: dict[str, list[str]] = {}  # container_id -> [child_ids]
        non_contained: dict[str, dict] = {}

        # Build containment from edges
        contained_ids: set[str] = set()
        for edge in graph_dict.get("edges", []):
            if edge["edge_type"] == "contains":
                parent_id = edge["source_id"]
                child_id = edge["target_id"]
                if parent_id in resources and resources[parent_id]["resource_type"] in CONTAINER_TYPES:
                    children_map.setdefault(parent_id, []).append(child_id)
                    contained_ids.add(child_id)

        for rid, r in resources.items():
            if r["resource_type"] in CONTAINER_TYPES:
                containers[rid] = r
            elif rid not in contained_ids:
                non_contained[rid] = r

        # Group non-contained nodes by tier
        tiers: dict[int, list[str]] = {}
        for rid, r in non_contained.items():
            tier = SERVICE_TIERS.get(r["service"], 2)
            tiers.setdefault(tier, []).append(rid)

        # Position non-contained nodes in tiers
        y_offset = 40
        for tier_num in sorted(tiers.keys()):
            ids = tiers[tier_num]
            x_start = 40
            for i, rid in enumerate(ids):
                positions[rid] = {
                    "x": x_start + i * self.NODE_GAP_X,
                    "y": y_offset,
                    "width": self.NODE_W,
                    "height": self.NODE_H,
                    "group": None,
                    "is_container": False,
                }
            y_offset += self.TIER_GAP_Y

        # Position containers: lay out children inside
        container_y = y_offset
        for cid, c_res in containers.items():
            children = children_map.get(cid, [])
            # Sub-containers (subnets inside VPCs)
            sub_containers = [ch for ch in children if ch in containers]
            regular_children = [ch for ch in children if ch not in containers]

            if not children:
                positions[cid] = {
                    "x": 40, "y": container_y,
                    "width": 200, "height": 80,
                    "group": None, "is_container": True,
                }
                container_y += 120
                continue

            # Position regular children inside container
            inner_x = self.GROUP_PAD
            inner_y = self.GROUP_PAD + 20  # Extra for title
            for i, child_id in enumerate(regular_children):
                positions[child_id] = {
                    "x": inner_x + i * self.NODE_GAP_X,
                    "y": inner_y,
                    "width": self.NODE_W,
                    "height": self.NODE_H,
                    "group": cid,
                    "is_container": False,
                }

            # Calculate container bounds
            max_x = inner_x + max(len(regular_children), 1) * self.NODE_GAP_X + self.GROUP_PAD
            max_y = inner_y + self.NODE_H + self.GROUP_PAD

            # Handle sub-containers
            sub_y = max_y
            for sub_cid in sub_containers:
                sub_children = children_map.get(sub_cid, [])
                sub_inner_x = self.GROUP_PAD
                sub_inner_y = self.GROUP_PAD + 20
                for j, sc_id in enumerate(sub_children):
                    positions[sc_id] = {
                        "x": sub_inner_x + j * self.NODE_GAP_X,
                        "y": sub_inner_y,
                        "width": self.NODE_W,
                        "height": self.NODE_H,
                        "group": sub_cid,
                        "is_container": False,
                    }
                sub_w = sub_inner_x + max(len(sub_children), 1) * self.NODE_GAP_X + self.GROUP_PAD
                sub_h = sub_inner_y + self.NODE_H + self.GROUP_PAD
                positions[sub_cid] = {
                    "x": self.GROUP_PAD,
                    "y": sub_y,
                    "width": sub_w,
                    "height": sub_h,
                    "group": cid,
                    "is_container": True,
                }
                max_x = max(max_x, sub_w + self.GROUP_PAD * 2)
                sub_y += sub_h + 20

            max_y = max(max_y, sub_y) + self.GROUP_PAD
            positions[cid] = {
                "x": 40, "y": container_y,
                "width": max_x,
                "height": max_y,
                "group": None,
                "is_container": True,
            }
            container_y += max_y + 40

        return positions


# ---------------------------------------------------------------------------
# React Flow Converter
# ---------------------------------------------------------------------------

class ReactFlowConverter:
    """Convert positions + graph into React Flow nodes/edges format."""

    def convert(self, graph_dict: dict, positions: dict,
                llm_result: dict | None = None) -> dict:
        resources = graph_dict.get("resources", {})
        edges_raw = graph_dict.get("edges", [])
        nodes = []
        edges = []

        # Get LLM labels/groups if available
        llm_labels = (llm_result or {}).get("resource_labels", {})
        llm_groups = (llm_result or {}).get("groups", {})

        for rid, pos in positions.items():
            r = resources.get(rid)
            if not r:
                continue

            label = llm_labels.get(rid, r["name"])
            service_color = SERVICE_COLORS.get(r["service"], "#71717a")

            if pos["is_container"]:
                nodes.append({
                    "id": rid,
                    "type": "awsGroup",
                    "position": {"x": pos["x"], "y": pos["y"]},
                    "data": {
                        "label": label,
                        "resourceType": r["resource_type"],
                        "service": r["service"],
                        "color": service_color,
                        "properties": r.get("properties", {}),
                    },
                    "style": {
                        "width": pos["width"],
                        "height": pos["height"],
                    },
                    **({"parentId": pos["group"]} if pos.get("group") else {}),
                })
            else:
                node = {
                    "id": rid,
                    "type": "awsResource",
                    "position": {"x": pos["x"], "y": pos["y"]},
                    "data": {
                        "label": label,
                        "resourceType": r["resource_type"],
                        "service": r["service"],
                        "color": service_color,
                        "arn": r.get("arn", ""),
                        "properties": r.get("properties", {}),
                        "tags": r.get("tags", {}),
                    },
                }
                if pos.get("group"):
                    node["parentId"] = pos["group"]
                    node["extent"] = "parent"
                nodes.append(node)

        # Edges (skip "contains" — handled by parent/child)
        edge_id = 0
        for e in edges_raw:
            if e["edge_type"] == "contains":
                continue
            if e["source_id"] not in positions or e["target_id"] not in positions:
                continue
            animated = e["edge_type"] == "triggers"
            edges.append({
                "id": f"e{edge_id}",
                "source": e["source_id"],
                "target": e["target_id"],
                "type": "smoothstep",
                "animated": animated,
                "label": e.get("label", ""),
                "data": {"edgeType": e["edge_type"]},
            })
            edge_id += 1

        return {"nodes": nodes, "edges": edges}


# ---------------------------------------------------------------------------
# Draw.io XML Generator
# ---------------------------------------------------------------------------

class DrawioXmlGenerator:
    """Generate .drawio (mxfile) XML from graph + positions."""

    def generate(self, graph_dict: dict, positions: dict) -> str:
        resources = graph_dict.get("resources", {})
        edges_raw = graph_dict.get("edges", [])

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

        # Create cells for each positioned resource
        rid_to_cell: dict[str, str] = {}

        # Containers first (they must exist before children reference them)
        for rid, pos in positions.items():
            if not pos["is_container"]:
                continue
            r = resources.get(rid)
            if not r:
                continue

            cid = str(cell_id)
            cell_id += 1
            rid_to_cell[rid] = cid

            shape = DRAWIO_SHAPES.get(r["resource_type"], "mxgraph.aws4.group")
            color = SERVICE_COLORS.get(r["service"], "#248814")
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
            if pos["is_container"]:
                continue
            r = resources.get(rid)
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

        # Edges (skip "contains")
        for e in edges_raw:
            if e["edge_type"] == "contains":
                continue
            src_cell = rid_to_cell.get(e["source_id"])
            tgt_cell = rid_to_cell.get(e["target_id"])
            if not src_cell or not tgt_cell:
                continue

            eid = str(cell_id)
            cell_id += 1
            style = (
                "edgeStyle=orthogonalEdgeStyle;rounded=1;orthogonalLoop=1;"
                "jettySize=auto;html=1;strokeColor=#666666;"
            )
            if e["edge_type"] == "triggers":
                style += "dashed=1;strokeColor=#E7157B;"

            cell = ET.SubElement(root, "mxCell",
                                 id=eid, value=e.get("label", ""), style=style,
                                 edge="1", parent="1",
                                 source=src_cell, target=tgt_cell)
            ET.SubElement(cell, "mxGeometry", relative="1", **{"as": "geometry"})

        return ET.tostring(mxfile, encoding="unicode", xml_declaration=True)
