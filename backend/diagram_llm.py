"""LLM-assisted layout enhancement for infrastructure diagrams.

Sends a summarized graph to the configured LLM provider and receives back
logical groupings, architectural annotations, and suggested resource labels.
"""

import json

from .llm_service import create_provider

SYSTEM_PROMPT = """You are an AWS Solutions Architect analyzing infrastructure for diagram layout.
Given a list of AWS resources and their relationships, provide:

1. **groups**: Logical tier groupings (e.g. "Web Tier", "Data Tier", "Networking", "Security")
   - Each group has a name and a list of resource IDs
2. **annotations**: Architectural observations and potential issues (e.g. "Single AZ deployment", "No NAT Gateway for private subnets", "Public S3 bucket detected")
3. **resource_labels**: Suggested human-friendly labels for resources (resource_id -> label)

Return ONLY valid JSON with this exact structure:
{
  "groups": {
    "Web Tier": ["resource-id-1", "resource-id-2"],
    "Data Tier": ["resource-id-3"]
  },
  "annotations": [
    "Single AZ deployment — consider multi-AZ for high availability",
    "No CloudFront distribution in front of the ALB"
  ],
  "resource_labels": {
    "resource-id-1": "Primary Web Server",
    "resource-id-2": "API Gateway"
  }
}"""


def _summarize_graph(graph_dict: dict) -> str:
    """Create a token-efficient summary of the graph for the LLM."""
    lines = ["AWS Resources:"]
    for rid, r in graph_dict.get("resources", {}).items():
        props = r.get("properties", {})
        # Include only key properties
        brief_props = {}
        for k in ("instance_type", "engine", "runtime", "type", "state", "status",
                   "cidr", "az", "scheme", "node_type", "billing_mode"):
            if k in props and props[k]:
                brief_props[k] = props[k]
        prop_str = f" ({', '.join(f'{k}={v}' for k, v in brief_props.items())})" if brief_props else ""
        lines.append(f"  - {rid}: {r['resource_type']} ({r['service']}){prop_str}")

    lines.append("\nRelationships:")
    for e in graph_dict.get("edges", []):
        lines.append(f"  - {e['source_id']} --[{e['edge_type']}]--> {e['target_id']}"
                      + (f" ({e['label']})" if e.get("label") else ""))

    return "\n".join(lines)


def llm_enhance_layout(graph_dict: dict, provider_type: str, provider_config: dict) -> dict:
    """Send graph summary to LLM and get back grouping/annotation suggestions.

    Returns dict with keys: groups, annotations, resource_labels
    """
    summary = _summarize_graph(graph_dict)
    provider = create_provider(provider_type, provider_config)

    # Collect full response (non-streaming)
    full_text = ""
    for chunk in provider.generate(SYSTEM_PROMPT, summary):
        full_text += chunk

    # Strip markdown code fences if present
    text = full_text.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        lines = lines[1:]  # Remove opening fence
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines).strip()

    result = json.loads(text)

    # Validate structure
    return {
        "groups": result.get("groups", {}),
        "annotations": result.get("annotations", []),
        "resource_labels": result.get("resource_labels", {}),
    }
