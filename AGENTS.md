# Agent Contribution Rules

This repository enforces a fail-fast, evidence-first workflow. Agents and contributors must not hide defects behind optional guards or conditional logic in tests.

## Hard-Fail Policy (Never Hide Defects)

- NEVER add conditional wrappers (feature-detection, try/catch fallbacks, dynamic-import guards, environment sniffing, etc.) to silence or skip integration tests. If a dependency is missing or misconfigured (e.g., native modules like `better-sqlite3`), tests MUST FAIL LOUDLY.
- NEVER convert hard failures into no-ops (e.g., returning `Effect.void` or “skip” behavior) without an explicit repository decision recorded in a PR description and this file. The default is fail-fast.
- NEVER obfuscate errors or swallow exceptions in test setup. Prefer explicit, early failures that surface configuration issues.

## Rationale

Failing fast makes defects visible early, prevents silent regressions, and aligns local behavior with CI. Any environment constraints should be resolved by fixing the environment or adjusting the build matrix — not by weakening tests.

## Evidence-First Expectations

- When changing tests or infrastructure:
  - Provide concrete file paths and code references for the behavior being asserted.
  - If a failure requires an environment change, document the exact steps to reproduce and remediate (e.g., reinstall `better-sqlite3` for the current Node version).
- All changes must keep `pnpm ok` green unless a failing test is intentionally introduced as part of a RED phase in a TDD cycle (and is clearly marked as such in the PR).

## Examples of Disallowed Patterns

- Dynamic import guards to skip tests when a module is missing:
  ```ts
  // ❌ Do not do this
  Effect.tryPromise(() => import("better-sqlite3")).pipe(
    Effect.flatMap((ok) => (ok ? test : Effect.void))
  )
  ```

- Swallowing initialization failures:
  ```ts
  // ❌ Do not do this
  client.loadExtension(ext).pipe(Effect.orDie) // hides misconfiguration
  ```

## Positive Patterns

- Ensure native dependencies match the current runtime. If installing is not possible in a given matrix, mark tests with a clear CI job exclusion rather than weakening test logic.
- Keep integration tests using the real drivers and environments; prefer realistic failure modes over mocks for critical paths.

## TypeScript Type Assertions (`as`) Policy

- Prefer type inference and precise types. Avoid assertions that "lie about reality" by widening or narrowing without proof.
- "as const" is explicitly allowed and encouraged: it narrows values (e.g., tuples and object literals) and increases strictness. This does not misrepresent runtime values.
- "as any" is explicitly banned. It disables type safety and is a foot cannon.
- Double assertions (e.g., `as unknown as T`) and other unsafe up/down casts are banned by default unless narrowly justified.
- Rare exceptions must be explicitly justified:
  - Place a one‑line comment immediately above the assertion with:
    - `Justification:` short, concrete rationale explaining why the assertion is safe and unavoidable.
    - `Approved‑by:` the handle of a specific engineer who reviewed the line (not an agent; do not impersonate anyone). Include a link to the PR or issue.
  - Example (allowed):
    ```ts
    // Justification: upstream API returns branded string at runtime; Approved-by: @eng-handle (PR #123)
    const id = value as Brand<Id>
    ```
  - Example (forbidden):
    ```ts
    // "works on my machine"
    const x = foo as any // ❌ banned
    ```
- Agents MUST NOT self‑approve or forge approvals. Do not use the repository owner's name or identity; never impersonate a human reviewer.

## Modern Effect Patterns (v3.17+)

This project uses the latest Effect `^3.17.11` which supports modern error handling patterns. Code reviews and agents should expect and accept these patterns:

- **Error Creation**: Effect v3.17+ supports direct yielding of Error constructors:
  ```ts
  // ✅ Modern Effect v3.17+ (preferred)
  return yield* new SqliteClientError({ cause: "..." })

  // ✅ Legacy syntax (technically valid but unnecessarily verbose)
  return yield* Effect.fail(new SqliteClientError({ cause: "..." }))
  ```

- **Rationale**: Modern Effect Error classes implement the necessary protocols to be yielded directly, making code more concise while maintaining full type safety and error propagation.

- **Review Expectation**: Contributors and automated reviews should NOT flag the modern `yield* new Error()` syntax as incorrect. It is the current standard for this project's Effect version.

## Nix Development Environment

This project uses Nix for dependency management and reproducible builds. All development commands should be run within the Nix development shell:

- **Command Prefix**: Always prefix package manager and build commands with `nix develop --command` or run `nix develop` first to enter the shell:
  ```bash
  # ✅ Preferred
  nix develop --command pnpm install
  nix develop --command pnpm ok
  nix develop --command pnpm test

  # ✅ Alternative (enter shell first)
  nix develop
  pnpm install
  pnpm ok
  ```

- **Rationale**: The Nix shell ensures consistent Node.js versions, native dependencies, and build tools across all environments, preventing "works on my machine" issues.

- **CI Alignment**: This matches the CI environment which also runs commands within the Nix development shell.

### Native Modules (better-sqlite3) ABI Mismatch

- Symptom: Errors like "was compiled against a different Node.js version" or mismatched `NODE_MODULE_VERSION` (e.g., 131 vs 137) when running tests that use `better-sqlite3`.
- Cause: Running install/build/test outside the Nix shell compiles native addons against the wrong Node version/ABI.
- Resolution: Always run installs and tests inside the Nix dev shell. When in doubt, clean and rebuild inside `nix develop`:
  - `nix develop --command pnpm -w install`
  - `nix develop --command pnpm -w rebuild better-sqlite3`
  - Then re-run tests: `nix develop --command pnpm test`

In practice: relying on `nix develop` 100% of the time avoids ABI mismatches and “everything just works.”
