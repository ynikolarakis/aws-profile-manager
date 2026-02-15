Implement a new feature using the compound engineering approach:

1. **Plan** (using aws-architect subagent):
   - Read the feature description from $ARGUMENTS
   - Review existing codebase for related code
   - Write implementation plan to PROGRESS.md
   - Identify affected files and potential breaking changes

2. **Build** (using frontend-builder or main agent):
   - Implement backend API endpoints (if needed)
   - Implement frontend components (if needed)
   - Follow Linear design system (see skills/linear-design-system)
   - Follow AWS profile patterns (see skills/aws-profile-patterns)
   - Update PROGRESS.md as you go

3. **Test** (using test-writer subagent):
   - Write unit tests for new code
   - Run tests and fix failures
   - Verify no regressions in existing tests

4. **Review** (using security-reviewer subagent):
   - Security review of changes
   - Check for credential exposure
   - Check for injection vulnerabilities
   - Report findings

5. **Document**:
   - Update CLAUDE.md if architecture changed
   - Update PROGRESS.md with completion status
   - Add inline comments only where logic isn't self-evident

Important:
- Complete each phase before moving to the next
- If a test fails, go back to Build phase and fix
- If security review finds issues, fix before marking complete
- Keep the user informed of progress at each phase
