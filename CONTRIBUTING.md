# Contributing to effect-native

Thank you for your interest in contributing! This fork accepts two types of contributions:

## Types of Contributions

### 1. Upstream Contributions (packages/)

Changes to original Effect packages that should be contributed back upstream.

**Process:**
1. Work from the `main` branch (synced with upstream)
2. Create feature branch: `git checkout -b feature/description`
3. Make changes ONLY in `packages/` directory
4. Sign commits: `git commit -s` (DCO requirement)
5. Push to fork: `git push origin feature/description`
6. Create PR to `Effect-TS/effect`

**Requirements:**
- Follow Effect's original contribution guidelines
- Include tests for new functionality
- Update documentation with JSDoc comments
- Add changeset: `pnpm changeset`
- Reference upstream issues when applicable

### 2. Fork-Specific Contributions (packages-native/)

New packages or features specific to the effect-native ecosystem.

**Process:**
1. Work from `effect-native/main` branch
2. Create feature branch: `git checkout -b native/description`
3. Work in `packages-native/` directory
4. Regular commits (sign-off optional but recommended)
5. Push to fork: `git push origin native/description`
6. Create PR to `effect-native/effect`

**Requirements:**
- Use `@effect-native/` namespace for packages
- Include LICENSE file in each package
- Add attribution to Effect in README
- Follow same code standards as Effect

## Commit Guidelines

### DCO Sign-off

For upstream contributions, we use the Developer Certificate of Origin (DCO).

Add sign-off to commits:
```bash
git commit -s -m "fix: resolve issue with Effect.map"
```

This adds: `Signed-off-by: Your Name <your.email@example.com>`

The DCO sign-off certifies:
- You have the right to submit the work
- The work is your original creation or properly attributed
- You agree to the license terms

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Formatting, semicolons, etc
- `refactor`: Code restructuring
- `test`: Adding tests
- `chore`: Maintenance tasks

**Scopes:**
- For upstream: `effect`, `platform`, `cli`, etc.
- For fork: `native`, `example`, or specific package name

**Examples:**
```
feat(effect): add new Stream.throttle operator

Implements throttling for streams with configurable rate limiting.
Uses token bucket algorithm for smooth rate control.

Closes #123
Signed-off-by: Jane Doe <jane@example.com>
```

## Code Standards

### TypeScript Guidelines
- Strict TypeScript configuration
- No `any` types without justification
- Comprehensive type inference
- Pure functions preferred

### Testing Requirements
- Unit tests for all new functionality
- Use Vitest for testing
- Property-based tests with FastCheck where appropriate
- Test files in `test/` directory

### Documentation
- JSDoc comments for all public APIs
- Include `@since` tag with version
- Provide `@example` with usage
- Use `@category` for organization

Example:
```typescript
/**
 * Creates a greeting effect
 * 
 * @since 1.0.0
 * @category Constructors
 * @example
 * ```ts
 * import { greet } from "@effect-native/example"
 * import * as Effect from "effect/Effect"
 * 
 * Effect.runSync(greet("World"))
 * // "Hello World"
 * ```
 */
export const greet = (name: string): Effect.Effect<string> =>
  Effect.succeed(`Hello ${name}`)
```

## Development Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone git@github.com:YOUR_USERNAME/effect.git
   cd effect
   ```

3. Set up remotes:
   ```bash
   git remote add upstream git@github.com:Effect-TS/effect.git
   ```

4. Install dependencies:
   ```bash
   pnpm install
   ```

5. Build packages:
   ```bash
   pnpm build
   ```

6. Run tests:
   ```bash
   pnpm test
   ```

## Pre-submission Checklist

- [ ] Tests pass: `pnpm test`
- [ ] TypeScript compiles: `pnpm check`
- [ ] Linting passes: `pnpm lint`
- [ ] No circular dependencies: `pnpm circular`
- [ ] Documentation generates: `pnpm docgen`
- [ ] Changeset created (if needed): `pnpm changeset`
- [ ] Commits signed (for upstream): `git commit -s`

## Legal

### Copyright
- Original work: Copyright (c) 2023 Effectful Technologies Inc
- Fork contributions: Copyright (c) 2025 effect-native contributors

### License
All contributions are licensed under MIT license.

### Attribution
When contributing:
- Upstream contributions may be incorporated into Effect
- Fork contributions remain in effect-native
- Proper attribution is maintained for all work

## Questions?

- **Upstream Effect questions**: [Effect Discord](https://discord.gg/effect-ts)
- **Fork-specific questions**: Open an issue in this repository
- **Security issues**: See [SECURITY.md](./SECURITY.md)

## Acknowledgments

Thank you for contributing to the Effect ecosystem!