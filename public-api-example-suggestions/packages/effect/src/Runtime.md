# Example Suggestions: `effect/Runtime`

- **Package:** `effect`
- **Source:** `packages/effect/src/Runtime.ts`
- **Uncovered API records:** 4
- **Priorities:** 0 required, 2 recommended, 0 optional, 2 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                               | Line | Kind               | Priority        |
| --------------------------------- | ---: | ------------------ | --------------- |
| `effect/Runtime.getErrorExitCode` |  311 | `root-declaration` | **recommended** |
| `effect/Runtime.getErrorReported` |  399 | `root-declaration` | **recommended** |
| `effect/Runtime.errorExitCode`    |  244 | `root-declaration` | **discouraged** |
| `effect/Runtime.errorReported`    |  332 | `root-declaration` | **discouraged** |

## Recommended

### `effect/Runtime.getErrorExitCode`

- **Source:** `packages/effect/src/Runtime.ts:311`
- **Kind / category:** `root-declaration` / `accessors`
- **Priority:** **recommended**
- **Current description:** Reads the runtime exit-code marker from an unknown error value.
- **Signature hint:** `declare function getErrorExitCode(u: unknown): number`
- **Import guidance:** Start from `import { Runtime } from "effect"` and use `Runtime.getErrorExitCode`.
- **Suggested snippet:** Create a small representative input, call `Runtime.getErrorExitCode`, and assert the returned value. Include a missing or empty case only when the return type models absence or failure.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Runtime.getErrorReported`

- **Source:** `packages/effect/src/Runtime.ts:399`
- **Kind / category:** `root-declaration` / `accessors`
- **Priority:** **recommended**
- **Current description:** Reads the runtime error-reporting marker from an unknown error value.
- **Signature hint:** `declare function getErrorReported(u: unknown): boolean`
- **Import guidance:** Start from `import { Runtime } from "effect"` and use `Runtime.getErrorReported`.
- **Suggested snippet:** Create a small representative input, call `Runtime.getErrorReported`, and assert the returned value. Include a missing or empty case only when the return type models absence or failure.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Discouraged

### `effect/Runtime.errorExitCode`

- **Source:** `packages/effect/src/Runtime.ts:244`
- **Kind / category:** `root-declaration` / `symbols`
- **Priority:** **discouraged**
- **Current description:** Type-level key for the `Runtime.errorExitCode` marker.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/Runtime.errorExitCode` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/Runtime.errorReported`

- **Source:** `packages/effect/src/Runtime.ts:332`
- **Kind / category:** `root-declaration` / `symbols`
- **Priority:** **discouraged**
- **Current description:** Type-level key for the `Runtime.errorReported` marker.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/Runtime.errorReported` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
