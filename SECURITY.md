# Security Policy

## Reporting Security Vulnerabilities

We take security seriously. If you discover a security vulnerability, please follow these guidelines:

### Where to Report

#### For Original Effect Packages (packages/)

Security issues in original Effect packages should be reported directly to the Effect team:

- **DO NOT** report through this fork
- Report to: Effect-TS/effect repository
- Follow their security policy
- These issues affect all Effect users, not just fork users

#### For Fork-Specific Packages (packages-native/)

Security issues in @effect-native packages should be reported to this fork:

1. **DO NOT** create public issues for security vulnerabilities
2. Email: [Create private security advisory on GitHub]
3. Or create a private security advisory:
   - Go to Security tab → Advisories → New draft advisory
   - Provide detailed information about the vulnerability

### What to Include

Please provide:

- **Description**: Clear explanation of the vulnerability
- **Impact**: What can an attacker do with this vulnerability?
- **Affected versions**: Which package versions are affected?
- **Steps to reproduce**: Detailed steps or proof of concept
- **Suggested fix**: If you have ideas for fixing the issue
- **CVSS score**: If you can assess the severity

### What to Expect

**For fork-specific issues:**
1. Acknowledgment within 48 hours
2. Initial assessment within 1 week
3. Regular updates on progress
4. Credit in the security advisory (unless you prefer anonymity)

**For upstream issues:**
- Follow Effect-TS/effect's security policy and timelines

## Supported Versions

### Fork Packages (@effect-native/*)

| Version | Supported          |
| ------- | ------------------ |
| latest  | :white_check_mark: |
| < latest| :x:               |

### Upstream Packages

See [Effect's security policy](https://github.com/Effect-TS/effect/security/policy) for supported versions of original Effect packages.

## Security Best Practices

When using packages from this fork:

1. **Keep dependencies updated**: Regularly update both Effect and effect-native packages
2. **Review dependencies**: Audit your dependencies with `npm audit` or `pnpm audit`
3. **Use lock files**: Commit pnpm-lock.yaml to ensure reproducible builds
4. **Verify package sources**: Ensure packages come from expected npm namespaces
   - Official: `effect`, `@effect/*`
   - Fork: `@effect-native/*`

## Known Security Considerations

### Fork Synchronization

This fork regularly syncs with upstream to receive security updates:
- Security fixes in Effect are merged into this fork
- Check FORK-WORKFLOW.md for sync procedures

## Vulnerability Disclosure

We follow responsible disclosure:

1. Vulnerabilities are fixed before public disclosure
2. Users are notified through GitHub Security Advisories
3. NPM security advisories are published for affected packages
4. A reasonable time is given for users to update

## Contact

- **Fork security**: Use GitHub's private security advisory feature
- **Upstream security**: Report to Effect-TS/effect
- **General questions**: Open a public issue

## Attribution

This security policy is adapted from standard open source security practices and coordinated with the upstream Effect project's security approach.