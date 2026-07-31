# Example Suggestions: `@effect/platform-browser/BrowserStream`

- **Package:** `@effect/platform-browser`
- **Source:** `packages/platform-browser/src/BrowserStream.ts`
- **Uncovered API records:** 2
- **Priorities:** 0 required, 2 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                | Line | Kind               | Priority        |
| ------------------------------------------------------------------ | ---: | ------------------ | --------------- |
| `@effect/platform-browser/BrowserStream.fromEventListenerWindow`   |   25 | `root-declaration` | **recommended** |
| `@effect/platform-browser/BrowserStream.fromEventListenerDocument` |   47 | `root-declaration` | **recommended** |

## Recommended

### `@effect/platform-browser/BrowserStream.fromEventListenerWindow`

- **Source:** `packages/platform-browser/src/BrowserStream.ts:25`
- **Kind / category:** `root-declaration` / `streams`
- **Priority:** **recommended**
- **Current description:** Creates a `Stream` from `window.addEventListener`.
- **Signature hint:** `declare function fromEventListenerWindow<K extends keyof WindowEventMap>(type: K, options?: boolean | { readonly capture?: boolean; readonly passive?: boolean; readonly once?: boolean; readonly bufferSize?: number | undefined; } | undefined): Stream.Stream<WindowEventMap[K], never, never>`
- **Import guidance:** Start from `import { BrowserStream } from "@effect/platform-browser"` and use `BrowserStream.fromEventListenerWindow`.
- **Suggested snippet:** Create a finite stream, apply `BrowserStream.fromEventListenerWindow`, consume it with `Stream.runCollect` or `Stream.runForEach`, and assert the stable ordering, cardinality, or failure behavior. Bound any potentially infinite stream first.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-browser/BrowserStream.fromEventListenerDocument`

- **Source:** `packages/platform-browser/src/BrowserStream.ts:47`
- **Kind / category:** `root-declaration` / `streams`
- **Priority:** **recommended**
- **Current description:** Creates a `Stream` from `document.addEventListener`.
- **Signature hint:** `declare function fromEventListenerDocument<K extends keyof DocumentEventMap>(type: K, options?: boolean | { readonly capture?: boolean; readonly passive?: boolean; readonly once?: boolean; readonly bufferSize?: number | undefined; } | undefined): Stream.Stream<DocumentEventMap[K], never, never>`
- **Import guidance:** Start from `import { BrowserStream } from "@effect/platform-browser"` and use `BrowserStream.fromEventListenerDocument`.
- **Suggested snippet:** Create a finite stream, apply `BrowserStream.fromEventListenerDocument`, consume it with `Stream.runCollect` or `Stream.runForEach`, and assert the stable ordering, cardinality, or failure behavior. Bound any potentially infinite stream first.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.
