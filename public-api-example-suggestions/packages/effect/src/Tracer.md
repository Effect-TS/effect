# Example Suggestions: `effect/Tracer`

- **Package:** `effect`
- **Source:** `packages/effect/src/Tracer.ts`
- **Uncovered API records:** 9
- **Priorities:** 0 required, 0 recommended, 9 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                | Line | Kind               | Priority     |
| ---------------------------------- | ---: | ------------------ | ------------ |
| `effect/Tracer.SpanOptionsNoTrace` |  255 | `root-declaration` | **optional** |
| `effect/Tracer.TraceOptions`       |  273 | `root-declaration` | **optional** |
| `effect/Tracer.make`               |  454 | `root-declaration` | **optional** |
| `effect/Tracer.CurrentTraceLevel`  |  562 | `root-declaration` | **optional** |
| `effect/Tracer.MinimumTraceLevel`  |  591 | `root-declaration` | **optional** |
| `effect/Tracer.TracerKey`          |  606 | `root-declaration` | **optional** |
| `effect/Tracer.NativeSpan`         |  654 | `root-declaration` | **optional** |
| `effect/Tracer.Tracer`             |   28 | `root-declaration` | **optional** |
| `effect/Tracer.EffectPrimitive`    |   53 | `root-declaration` | **optional** |

## Optional

### `effect/Tracer.SpanOptionsNoTrace`

- **Source:** `packages/effect/src/Tracer.ts:255`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Span creation options that do not control stack trace capture, including attributes, links, parent or root selection, annotations, span kind, sampling, and the trace level used for filtering.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Tracer.SpanOptionsNoTrace`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Tracer.TraceOptions`

- **Source:** `packages/effect/src/Tracer.ts:273`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Options that control stack trace capture for tracing wrappers. `captureStackTrace` can disable capture or provide a lazy stack string.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Tracer.TraceOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Tracer.make`

- **Source:** `packages/effect/src/Tracer.ts:454`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a `Tracer` value from a tracer implementation object.
- **Signature hint:** `declare function make(options: Tracer): Tracer`
- **Import guidance:** Start from `import { Tracer } from "effect"` and use `Tracer.make`.
- **Suggested snippet:** Construct one representative value with `Tracer.make`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Tracer.CurrentTraceLevel`

- **Source:** `packages/effect/src/Tracer.ts:562`
- **Kind / category:** `root-declaration` / `references`
- **Priority:** **optional**
- **Current description:** Context reference for controlling the current trace level for dynamic filtering.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Tracer } from "effect"` and use `Tracer.CurrentTraceLevel`.
- **Suggested snippet:** Consume `Tracer.CurrentTraceLevel` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Tracer.MinimumTraceLevel`

- **Source:** `packages/effect/src/Tracer.ts:591`
- **Kind / category:** `root-declaration` / `references`
- **Priority:** **optional**
- **Current description:** Context reference for setting the minimum trace level threshold. Spans and their descendants below this level will have their sampling decision forced to false, preventing them from being exported.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Tracer } from "effect"` and use `Tracer.MinimumTraceLevel`.
- **Suggested snippet:** Consume `Tracer.MinimumTraceLevel` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Tracer.TracerKey`

- **Source:** `packages/effect/src/Tracer.ts:606`
- **Kind / category:** `root-declaration` / `references`
- **Priority:** **optional**
- **Current description:** Defines the string key for the active tracer context reference.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Tracer } from "effect"` and use `Tracer.TracerKey`.
- **Suggested snippet:** Use `Tracer.TracerKey` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Tracer.NativeSpan`

- **Source:** `packages/effect/src/Tracer.ts:654`
- **Kind / category:** `root-declaration` / `native tracer`
- **Priority:** **optional**
- **Current description:** Default in-memory `Span` implementation used by the native tracer. It generates span and trace identifiers, stores attributes, events, and links, and records `Started` or `Ended` status.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Tracer } from "effect"` and use `Tracer.NativeSpan`.
- **Suggested snippet:** Use `Tracer.NativeSpan` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Tracer.Tracer`

- **Source:** `packages/effect/src/Tracer.ts:28`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A tracing backend used by Effect to create spans. Custom tracers implement `span` to allocate a span from the supplied name, parent, annotations, links, start time, kind, root flag, and sampling decision.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Tracer.Tracer`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Tracer.EffectPrimitive`

- **Source:** `packages/effect/src/Tracer.ts:53`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A low-level Effect primitive that can be evaluated by a tracer-specific context for the current fiber.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Tracer.EffectPrimitive`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
