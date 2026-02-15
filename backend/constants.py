"""Constants ported from legacy/app.py L18-68."""

import re
from pathlib import Path

APP_DIR = Path(__file__).parent
AWS_DIR = Path.home() / ".aws"
CONFIG_FILE = AWS_DIR / "config"
CREDENTIALS_FILE = AWS_DIR / "credentials"
STATE_FILE = AWS_DIR / "profile-manager.json"

REGIONS = [
    "us-east-1", "us-east-2", "us-west-1", "us-west-2",
    "eu-west-1", "eu-west-2", "eu-west-3", "eu-central-1", "eu-central-2",
    "eu-north-1", "eu-south-1", "eu-south-2",
    "ap-southeast-1", "ap-southeast-2", "ap-northeast-1", "ap-northeast-2",
    "ap-south-1", "sa-east-1", "ca-central-1", "me-south-1", "af-south-1",
]

PROFILE_NAME_RE = re.compile(r'^[a-zA-Z0-9][a-zA-Z0-9._-]*$')

SVC = {
    "Amazon Elastic Compute Cloud": {
        "icon": "⚡", "short": "EC2", "color": "#f59e0b",
        "desc": "Virtual servers in the cloud",
        "cmds": [
            ("Instances", 'aws ec2 describe-instances --query "Reservations[].Instances[].{ID:InstanceId,Type:InstanceType,State:State.Name,Name:Tags[?Key==\'Name\']|[0].Value}" --output table'),
            ("Security Groups", 'aws ec2 describe-security-groups --query "SecurityGroups[].{ID:GroupId,Name:GroupName,VPC:VpcId}" --output table'),
            ("Volumes", 'aws ec2 describe-volumes --query "Volumes[].{ID:VolumeId,Size:Size,State:State}" --output table'),
            ("Key Pairs", 'aws ec2 describe-key-pairs --query "KeyPairs[].{Name:KeyName,ID:KeyPairId}" --output table'),
        ],
    },
    "Amazon Relational Database Service": {
        "icon": "🗄", "short": "RDS", "color": "#a78bfa",
        "desc": "Managed relational databases",
        "cmds": [
            ("DB Instances", 'aws rds describe-db-instances --query "DBInstances[].{ID:DBInstanceIdentifier,Engine:Engine,Class:DBInstanceClass,Status:DBInstanceStatus}" --output table'),
            ("Snapshots", 'aws rds describe-db-snapshots --query "DBSnapshots[].{ID:DBSnapshotIdentifier,Status:Status}" --output table'),
        ],
    },
    "Amazon Simple Storage Service": {
        "icon": "📦", "short": "S3", "color": "#22c55e",
        "desc": "Scalable object storage",
        "cmds": [
            ("List Buckets", "aws s3 ls"),
            ("Detailed", 'aws s3api list-buckets --query "Buckets[].{Name:Name,Created:CreationDate}" --output table'),
        ],
    },
    "AWS Lambda": {
        "icon": "λ", "short": "Lambda", "color": "#22d3ee",
        "desc": "Serverless function execution",
        "cmds": [
            ("Functions", 'aws lambda list-functions --query "Functions[].{Name:FunctionName,Runtime:Runtime}" --output table'),
        ],
    },
    "Amazon CloudWatch": {
        "icon": "📊", "short": "CloudWatch", "color": "#f472b6",
        "desc": "Monitoring and observability",
        "cmds": [
            ("Alarms", 'aws cloudwatch describe-alarms --query "MetricAlarms[].{Name:AlarmName,State:StateValue}" --output table'),
            ("Log Groups", 'aws logs describe-log-groups --query "logGroups[].{Name:logGroupName}" --output table'),
        ],
    },
    "Amazon Virtual Private Cloud": {
        "icon": "🌐", "short": "VPC", "color": "#3b82f6",
        "desc": "Isolated virtual networks",
        "cmds": [
            ("VPCs", 'aws ec2 describe-vpcs --query "Vpcs[].{ID:VpcId,CIDR:CidrBlock,Name:Tags[?Key==\'Name\']|[0].Value}" --output table'),
            ("Subnets", 'aws ec2 describe-subnets --query "Subnets[].{ID:SubnetId,CIDR:CidrBlock,AZ:AvailabilityZone}" --output table'),
        ],
    },
    "Amazon Route 53": {
        "icon": "🔀", "short": "Route53", "color": "#f59e0b",
        "desc": "DNS and domain management",
        "cmds": [
            ("Hosted Zones", 'aws route53 list-hosted-zones --query "HostedZones[].{Name:Name,Records:ResourceRecordSetCount}" --output table'),
        ],
    },
    "Amazon DynamoDB": {
        "icon": "⚙️", "short": "DynamoDB", "color": "#22d3ee",
        "desc": "Managed NoSQL database",
        "cmds": [("Tables", "aws dynamodb list-tables --output table")],
    },
    "Amazon CloudFront": {
        "icon": "🌍", "short": "CloudFront", "color": "#a78bfa",
        "desc": "Global content delivery network",
        "cmds": [
            ("Distributions", 'aws cloudfront list-distributions --query "DistributionList.Items[].{ID:Id,Domain:DomainName}" --output table'),
        ],
    },
    "AWS Key Management Service": {
        "icon": "🔑", "short": "KMS", "color": "#f59e0b",
        "desc": "Encryption key management",
        "cmds": [
            ("Keys", "aws kms list-keys --output table"),
            ("Aliases", 'aws kms list-aliases --query "Aliases[].{Alias:AliasName}" --output table'),
        ],
    },
    "Amazon Elastic Container Service": {
        "icon": "🐳", "short": "ECS", "color": "#3b82f6",
        "desc": "Container orchestration",
        "cmds": [("Clusters", "aws ecs list-clusters --output table")],
    },
    "AWS CloudTrail": {
        "icon": "📜", "short": "CloudTrail", "color": "#22c55e",
        "desc": "API activity logging and auditing",
        "cmds": [("Trails", 'aws cloudtrail describe-trails --query "trailList[].{Name:Name}" --output table')],
    },
    "Amazon Simple Notification Service": {
        "icon": "📧", "short": "SNS", "color": "#f472b6",
        "desc": "Pub/sub messaging service",
        "cmds": [("Topics", "aws sns list-topics --output table")],
    },
    "Amazon Simple Queue Service": {
        "icon": "📬", "short": "SQS", "color": "#22d3ee",
        "desc": "Managed message queuing",
        "cmds": [("Queues", "aws sqs list-queues --output table")],
    },
    "AWS Config": {
        "icon": "⚙️", "short": "Config", "color": "#f59e0b",
        "desc": "Resource configuration tracking",
        "cmds": [
            ("Rules", 'aws configservice describe-config-rules --query "ConfigRules[].{Name:ConfigRuleName,State:ConfigRuleState}" --output table'),
        ],
    },
    "Amazon Elastic Load Balancing": {
        "icon": "⚖️", "short": "ELB", "color": "#a78bfa",
        "desc": "Traffic distribution across targets",
        "cmds": [
            ("Load Balancers", 'aws elbv2 describe-load-balancers --query "LoadBalancers[].{Name:LoadBalancerName,Type:Type}" --output table'),
        ],
    },
    "AWS Security Hub": {
        "icon": "🛡", "short": "SecurityHub", "color": "#22c55e",
        "desc": "Centralized security findings",
        "cmds": [
            ("Findings", 'aws securityhub get-findings --query "Findings[0:10].{Title:Title,Severity:Severity.Label}" --output table'),
        ],
    },
    "Amazon Bedrock": {
        "icon": "🤖", "short": "Bedrock", "color": "#a78bfa",
        "desc": "Foundation models as a service",
        "cmds": [
            ("Models", 'aws bedrock list-foundation-models --query "modelSummaries[].{ID:modelId,Provider:providerName}" --output table'),
        ],
    },
    "AWS Backup": {
        "icon": "💾", "short": "Backup", "color": "#22d3ee",
        "desc": "Centralized backup management",
        "cmds": [("Vaults", 'aws backup list-backup-vaults --query "BackupVaultList[].{Name:BackupVaultName}" --output table')],
    },
    "AWS Elastic Disaster Recovery": {
        "icon": "🔄", "short": "DRS", "color": "#f59e0b",
        "desc": "Automated disaster recovery",
        "cmds": [("Source Servers", 'aws drs describe-source-servers --query "items[].{ID:sourceServerID}" --output table')],
    },
    "Amazon ElastiCache": {
        "icon": "⚡", "short": "ElastiCache", "color": "#ef4444",
        "desc": "In-memory caching service",
        "cmds": [
            ("Clusters", 'aws elasticache describe-cache-clusters --query "CacheClusters[].{ID:CacheClusterId,Engine:Engine}" --output table'),
        ],
    },
}


def make_default_svc(name: str) -> dict:
    """Generate a default service definition for services not in SVC."""
    return {
        "icon": "☁️",
        "short": name.removeprefix("Amazon ").removeprefix("AWS "),
        "color": "#71717a",
        "desc": "",
        "cmds": [],
    }

COMMON_SVCS = [
    "Amazon Elastic Compute Cloud",
    "Amazon Simple Storage Service",
    "Amazon Relational Database Service",
    "AWS Lambda",
    "Amazon CloudWatch",
    "Amazon Virtual Private Cloud",
]
