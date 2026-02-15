# AWS Profile Manager Patterns

## Profile Types

### SSO (Single Sign-On)
- Uses `sso_start_url`, `sso_region`, `sso_account_id`, `sso_role_name`
- Optional: `sso_session` for named SSO sessions
- Login: `aws sso login --profile <name>` opens browser for authentication
- Tokens cached in `~/.aws/sso/cache/` as JSON files with `expiresAt` field
- Preferred for human users and cross-account access
- Detected by presence of `sso_start_url` or `sso_session` in config

### Credentials (IAM Access Keys)
- Uses `aws_access_key_id`, `aws_secret_access_key`
- Optional: `aws_session_token` for temporary credentials
- Written to `~/.aws/credentials` (separate from config)
- Only for service accounts and legacy setups
- Must NEVER appear in logs, error messages, or UI (mask with dots)
- Detected as default when neither SSO nor Role fields are present

### Role (Assume Role)
- Uses `role_arn`, `source_profile`
- Optional: `external_id` for cross-account trust
- No credentials stored directly — assumes role from source profile
- Preferred for automation and cross-account access
- Detected by presence of `role_arn` in config

## Config File Format

### ~/.aws/config (INI format)
```ini
[default]
region = eu-central-1
output = json

[profile my-dev]
region = us-east-1
output = json
sso_start_url = https://my-sso.awsapps.com/start
sso_region = eu-central-1
sso_account_id = 123456789012
sso_role_name = AdministratorAccess

[profile my-prod]
role_arn = arn:aws:iam::123456789012:role/AdminRole
source_profile = my-dev
region = eu-central-1
```

Key rules:
- `[default]` section has no "profile" prefix
- All other sections use `[profile name]` format
- Section names are case-sensitive

### ~/.aws/credentials (INI format)
```ini
[default]
aws_access_key_id = AKIAIOSFODNN7EXAMPLE
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

[my-service-account]
aws_access_key_id = AKIAI44QH8DHBEXAMPLE
aws_secret_access_key = je7MtGbClwBF/2Zp9Utk/h3yCo8nvbEXAMPLEKEY
```

Key rules:
- NO "profile" prefix — just `[name]`
- Contains only credential fields (access key, secret key, session token)
- File permissions should be 600 (owner read/write only)

## Auto-Save Rules
- Every profile save MUST write to both `~/.aws/config` AND `~/.aws/credentials`
- Never require a separate "Save" button — one action = files updated
- Always create timestamped backup before overwriting (`.bak.YYYYMMDD_HHMMSS`)
- Backup both config and credentials files independently

## SSO Session Management
- SSO tokens are cached in `~/.aws/sso/cache/` as JSON files
- Each file contains: `startUrl`, `region`, `accessToken`, `expiresAt`
- Check session validity by comparing `expiresAt` with current time
- `aws sso login --profile <name>` opens browser for authentication
- Expired sessions show warning in UI with re-login button

## Cost Explorer
- Always use `us-east-1` region for Cost Explorer API calls (global service)
- Cost Explorer requires `ce:GetCostAndUsage` IAM permission
- Use `GetCostAndUsage` API with `DAILY` or `MONTHLY` granularity
- Group by `SERVICE` dimension for per-service breakdown
- Filter costs > $0.001 to avoid spurious entries

## Service Discovery
Three-tier fallback strategy:
1. **Cost Explorer** (primary): Query costs grouped by service — services with spend are active
2. **STS** (fallback): Use `get_caller_identity` to verify profile works, return common services
3. **Hardcoded** (offline): Return first 8 services from the SVC constant

## Multi-Account Best Practices
- Use SSO profiles for cross-account access
- Role-based profiles for automation
- Credential profiles only for service accounts
- Categories map to organizational units or environments
- Cost badges show 30-day spend per profile

## Profile Name Validation
- Regex: `^[a-zA-Z0-9][a-zA-Z0-9._-]*$`
- Must start with alphanumeric character
- Allowed characters: letters, digits, dots, hyphens, underscores
- No spaces, no special characters

## Environment Variables for Command Execution
When running AWS CLI commands, set these env vars:
- `AWS_PROFILE` — for SSO and role-based profiles
- `AWS_ACCESS_KEY_ID` + `AWS_SECRET_ACCESS_KEY` — for credentials profiles
- `AWS_SESSION_TOKEN` — if temporary credentials
- `AWS_DEFAULT_REGION` — from profile's region setting
- Inherit all other env vars from parent process
