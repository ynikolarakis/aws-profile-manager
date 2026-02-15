Use the AWS Cost Analysis MCP server to generate a cost report for the active profile:

1. Query last 30 days of cost data grouped by service
2. Compare with previous 30 days to identify trends
3. Highlight any services with >20% cost increase
4. Suggest optimization opportunities
5. Format as a clean markdown summary

Output format:
```
## Cost Report — {profile_name}
### Period: {start_date} to {end_date}

| Service | This Month | Last Month | Change |
|---------|-----------|------------|--------|
| ...     | $X.XX     | $X.XX      | +/-X%  |

### Total: $X.XX (change from $X.XX)

### Alerts
- [service] increased by X% ($X.XX -> $X.XX)

### Optimization Suggestions
- ...
```

If the Cost Analysis MCP server is not available, fall back to using boto3 Cost Explorer API
with region us-east-1.
