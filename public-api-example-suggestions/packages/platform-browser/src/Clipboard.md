# Example Suggestions: `@effect/platform-browser/Clipboard`

- **Package:** `@effect/platform-browser`
- **Source:** `packages/platform-browser/src/Clipboard.ts`
- **Uncovered API records:** 5
- **Priorities:** 0 required, 4 recommended, 1 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                    | Line | Kind               | Priority        |
| ------------------------------------------------------ | ---: | ------------------ | --------------- |
| `@effect/platform-browser/Clipboard.layer`             |  105 | `root-declaration` | **recommended** |
| `@effect/platform-browser/Clipboard.ClipboardError`    |   60 | `root-declaration` | **recommended** |
| `@effect/platform-browser/Clipboard.Clipboard (value)` |   81 | `root-declaration` | **recommended** |
| `@effect/platform-browser/Clipboard.make`              |   89 | `root-declaration` | **recommended** |
| `@effect/platform-browser/Clipboard.Clipboard (type)`  |   44 | `root-declaration` | **optional**    |

## Recommended

### `@effect/platform-browser/Clipboard.layer`

- **Source:** `packages/platform-browser/src/Clipboard.ts:105`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that directly interfaces with the browser Clipboard API.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Clipboard } from "@effect/platform-browser"` and use `Clipboard.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `Clipboard.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-browser/Clipboard.ClipboardError`

- **Source:** `packages/platform-browser/src/Clipboard.ts:60`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Tagged error raised when a browser clipboard operation fails.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Clipboard } from "@effect/platform-browser"` and use `Clipboard.ClipboardError`.
- **Suggested snippet:** Create or capture `Clipboard.ClipboardError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-browser/Clipboard.Clipboard (value)`

- **Source:** `packages/platform-browser/src/Clipboard.ts:81`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service tag for browser clipboard capabilities.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Clipboard } from "@effect/platform-browser"` and use `Clipboard.Clipboard`.
- **Suggested snippet:** Consume `Clipboard.Clipboard` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-browser/Clipboard.make`

- **Source:** `packages/platform-browser/src/Clipboard.ts:89`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Builds a `Clipboard` service from primitive read and write operations, deriving `clear` and `writeBlob` helpers.
- **Signature hint:** `declare function make(impl: Omit<Clipboard, 'clear' | 'writeBlob' | typeof TypeId>): Clipboard`
- **Import guidance:** Start from `import { Clipboard } from "@effect/platform-browser"` and use `Clipboard.make`.
- **Suggested snippet:** Construct one representative value with `Clipboard.make`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/platform-browser/Clipboard.Clipboard (type)`

- **Source:** `packages/platform-browser/src/Clipboard.ts:44`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Defines the service interface for reading from, writing to, and clearing the browser clipboard.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/platform-browser/Clipboard.Clipboard`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
