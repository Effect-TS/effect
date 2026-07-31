# Example Suggestions: `@effect/platform-browser/BrowserCrypto`

- **Package:** `@effect/platform-browser`
- **Source:** `packages/platform-browser/src/BrowserCrypto.ts`
- **Uncovered API records:** 2
- **Priorities:** 0 required, 2 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                | Line | Kind               | Priority        |
| -------------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/platform-browser/BrowserCrypto.layer`     |   54 | `root-declaration` | **recommended** |
| `@effect/platform-browser/BrowserCrypto.WebCrypto` |   28 | `root-declaration` | **recommended** |

## Recommended

### `@effect/platform-browser/BrowserCrypto.layer`

- **Source:** `packages/platform-browser/src/BrowserCrypto.ts:54`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that directly interfaces with the Web Crypto API.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { BrowserCrypto } from "@effect/platform-browser"` and use `BrowserCrypto.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `BrowserCrypto.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-browser/BrowserCrypto.WebCrypto`

- **Source:** `packages/platform-browser/src/BrowserCrypto.ts:28`
- **Kind / category:** `root-declaration` / `references`
- **Priority:** **recommended**
- **Current description:** Provides Browser Web Crypto APIs used by the Crypto service implementation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { BrowserCrypto } from "@effect/platform-browser"` and use `BrowserCrypto.WebCrypto`.
- **Suggested snippet:** Consume `BrowserCrypto.WebCrypto` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.
