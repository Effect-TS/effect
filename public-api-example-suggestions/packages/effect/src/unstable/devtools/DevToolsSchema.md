# Example Suggestions: `effect/unstable/devtools/DevToolsSchema`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/devtools/DevToolsSchema.ts`
- **Uncovered API records:** 44
- **Priorities:** 0 required, 3 recommended, 41 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                 | Line | Kind                    | Priority        |
| ------------------------------------------------------------------- | ---: | ----------------------- | --------------- |
| `effect/unstable/devtools/DevToolsSchema.SpanStatusStarted (value)` |   25 | `root-declaration`      | **recommended** |
| `effect/unstable/devtools/DevToolsSchema.SpanStatusEnded (value)`   |   46 | `root-declaration`      | **recommended** |
| `effect/unstable/devtools/DevToolsSchema.SpanStatus (value)`        |   76 | `root-declaration`      | **recommended** |
| `effect/unstable/devtools/DevToolsSchema.SpanStatusEnded (type)`    |   68 | `root-declaration`      | **optional**    |
| `effect/unstable/devtools/DevToolsSchema.SpanStatusStarted (type)`  |   36 | `root-declaration`      | **optional**    |
| `effect/unstable/devtools/DevToolsSchema.SpanStatus (type)`         |   84 | `root-declaration`      | **optional**    |
| `effect/unstable/devtools/DevToolsSchema.ExternalSpan (type)`       |   93 | `root-declaration`      | **optional**    |
| `effect/unstable/devtools/DevToolsSchema.ExternalSpan (value)`      |  107 | `root-declaration`      | **optional**    |
| `effect/unstable/devtools/DevToolsSchema.Span (type)`               |  121 | `root-declaration`      | **optional**    |
| `effect/unstable/devtools/DevToolsSchema.Span (value)`              |  138 | `root-declaration`      | **optional**    |
| `effect/unstable/devtools/DevToolsSchema.SpanEvent (value)`         |  156 | `root-declaration`      | **optional**    |
| `effect/unstable/devtools/DevToolsSchema.SpanEvent (type)`          |  171 | `root-declaration`      | **optional**    |
| `effect/unstable/devtools/DevToolsSchema.ParentSpan (type)`         |  180 | `root-declaration`      | **optional**    |
| `effect/unstable/devtools/DevToolsSchema.ParentSpan (value)`        |  189 | `root-declaration`      | **optional**    |
| `effect/unstable/devtools/DevToolsSchema.Ping (value)`              |  197 | `root-declaration`      | **optional**    |
| `effect/unstable/devtools/DevToolsSchema.Ping (type)`               |  207 | `root-declaration`      | **optional**    |
| `effect/unstable/devtools/DevToolsSchema.Pong (value)`              |  215 | `root-declaration`      | **optional**    |
| `effect/unstable/devtools/DevToolsSchema.Pong (type)`               |  225 | `root-declaration`      | **optional**    |
| `effect/unstable/devtools/DevToolsSchema.MetricsRequest (value)`    |  233 | `root-declaration`      | **optional**    |
| `effect/unstable/devtools/DevToolsSchema.MetricsRequest (type)`     |  243 | `root-declaration`      | **optional**    |
| `effect/unstable/devtools/DevToolsSchema.MetricLabel (value)`       |  251 | `root-declaration`      | **optional**    |
| `effect/unstable/devtools/DevToolsSchema.MetricLabel (type)`        |  262 | `root-declaration`      | **optional**    |
| `effect/unstable/devtools/DevToolsSchema.Counter (value)`           |  280 | `root-declaration`      | **optional**    |
| `effect/unstable/devtools/DevToolsSchema.Counter (type)`            |  299 | `root-declaration`      | **optional**    |
| `effect/unstable/devtools/DevToolsSchema.Frequency (value)`         |  311 | `root-declaration`      | **optional**    |
| `effect/unstable/devtools/DevToolsSchema.Frequency (type)`          |  328 | `root-declaration`      | **optional**    |
| `effect/unstable/devtools/DevToolsSchema.Gauge (value)`             |  340 | `root-declaration`      | **optional**    |
| `effect/unstable/devtools/DevToolsSchema.Gauge (type)`              |  357 | `root-declaration`      | **optional**    |
| `effect/unstable/devtools/DevToolsSchema.Histogram (value)`         |  370 | `root-declaration`      | **optional**    |
| `effect/unstable/devtools/DevToolsSchema.Histogram (type)`          |  392 | `root-declaration`      | **optional**    |
| `effect/unstable/devtools/DevToolsSchema.Summary (value)`           |  405 | `root-declaration`      | **optional**    |
| `effect/unstable/devtools/DevToolsSchema.Summary (type)`            |  432 | `root-declaration`      | **optional**    |
| `effect/unstable/devtools/DevToolsSchema.Metric (value)`            |  445 | `root-declaration`      | **optional**    |
| `effect/unstable/devtools/DevToolsSchema.Metric (type)`             |  457 | `root-declaration`      | **optional**    |
| `effect/unstable/devtools/DevToolsSchema.MetricsSnapshot (value)`   |  466 | `root-declaration`      | **optional**    |
| `effect/unstable/devtools/DevToolsSchema.MetricsSnapshot (type)`    |  477 | `root-declaration`      | **optional**    |
| `effect/unstable/devtools/DevToolsSchema.Request (value)`           |  489 | `root-declaration`      | **optional**    |
| `effect/unstable/devtools/DevToolsSchema.Request (type)`            |  501 | `root-declaration`      | **optional**    |
| `effect/unstable/devtools/DevToolsSchema.Response (value)`          |  532 | `root-declaration`      | **optional**    |
| `effect/unstable/devtools/DevToolsSchema.Response (type)`           |  544 | `root-declaration`      | **optional**    |
| `effect/unstable/devtools/DevToolsSchema.Request (type)`            |  508 | `namespace`             | **optional**    |
| `effect/unstable/devtools/DevToolsSchema.Request.WithoutPing`       |  519 | `namespace-declaration` | **optional**    |
| `effect/unstable/devtools/DevToolsSchema.Response (type)`           |  551 | `namespace`             | **optional**    |
| `effect/unstable/devtools/DevToolsSchema.Response.WithoutPong`      |  562 | `namespace-declaration` | **optional**    |

## Recommended

### `effect/unstable/devtools/DevToolsSchema.SpanStatusStarted (value)`

- **Source:** `packages/effect/src/unstable/devtools/DevToolsSchema.ts:25`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Schema for a span status representing a span that has started but not yet ended.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { DevToolsSchema } from "effect/unstable/devtools"` and use `DevToolsSchema.SpanStatusStarted`.
- **Suggested snippet:** Define the smallest domain Schema involving `DevToolsSchema.SpanStatusStarted`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/devtools/DevToolsSchema.SpanStatusEnded (value)`

- **Source:** `packages/effect/src/unstable/devtools/DevToolsSchema.ts:46`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Schema for a span status representing an ended span, including start time, end time, and encoded exit status. Encoding drops success values with `Exit.asVoid`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { DevToolsSchema } from "effect/unstable/devtools"` and use `DevToolsSchema.SpanStatusEnded`.
- **Suggested snippet:** Define the smallest domain Schema involving `DevToolsSchema.SpanStatusEnded`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/devtools/DevToolsSchema.SpanStatus (value)`

- **Source:** `packages/effect/src/unstable/devtools/DevToolsSchema.ts:76`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Schema for devtools span status, either started or ended.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { DevToolsSchema } from "effect/unstable/devtools"` and use `DevToolsSchema.SpanStatus`.
- **Suggested snippet:** Define the smallest domain Schema involving `DevToolsSchema.SpanStatus`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/devtools/DevToolsSchema.SpanStatusEnded (type)`

- **Source:** `packages/effect/src/unstable/devtools/DevToolsSchema.ts:68`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Type of a span status representing an ended span with start time, end time, and exit status.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/devtools/DevToolsSchema.SpanStatusEnded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/devtools/DevToolsSchema.SpanStatusStarted (type)`

- **Source:** `packages/effect/src/unstable/devtools/DevToolsSchema.ts:36`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Type of a span status representing a span that has started but not yet ended.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/devtools/DevToolsSchema.SpanStatusStarted`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/devtools/DevToolsSchema.SpanStatus (type)`

- **Source:** `packages/effect/src/unstable/devtools/DevToolsSchema.ts:84`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Type of a devtools span status, either started or ended.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/devtools/DevToolsSchema.SpanStatus`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/devtools/DevToolsSchema.ExternalSpan (type)`

- **Source:** `packages/effect/src/unstable/devtools/DevToolsSchema.ts:93`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Serialized parent span context for a span created outside the current devtools span tree.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/devtools/DevToolsSchema.ExternalSpan`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/devtools/DevToolsSchema.ExternalSpan (value)`

- **Source:** `packages/effect/src/unstable/devtools/DevToolsSchema.ts:107`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for an external parent span context containing span id, trace id, and sampling flag.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { DevToolsSchema } from "effect/unstable/devtools"` and use `DevToolsSchema.ExternalSpan`.
- **Suggested snippet:** Define the smallest domain Schema involving `DevToolsSchema.ExternalSpan`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/devtools/DevToolsSchema.Span (type)`

- **Source:** `packages/effect/src/unstable/devtools/DevToolsSchema.ts:121`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Telemetry payload for an Effect span sent to devtools, including identity, attributes, status, sampling flag, and optional parent span.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/devtools/DevToolsSchema.Span`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/devtools/DevToolsSchema.Span (value)`

- **Source:** `packages/effect/src/unstable/devtools/DevToolsSchema.ts:138`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for an Effect span telemetry payload sent to devtools.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { DevToolsSchema } from "effect/unstable/devtools"` and use `DevToolsSchema.Span`.
- **Suggested snippet:** Define the smallest domain Schema involving `DevToolsSchema.Span`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/devtools/DevToolsSchema.SpanEvent (value)`

- **Source:** `packages/effect/src/unstable/devtools/DevToolsSchema.ts:156`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for a named event emitted by a span, including trace id, span id, start time, and optional attributes.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { DevToolsSchema } from "effect/unstable/devtools"` and use `DevToolsSchema.SpanEvent`.
- **Suggested snippet:** Define the smallest domain Schema involving `DevToolsSchema.SpanEvent`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/devtools/DevToolsSchema.SpanEvent (type)`

- **Source:** `packages/effect/src/unstable/devtools/DevToolsSchema.ts:171`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Type of a named event emitted by a span and sent to devtools.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/devtools/DevToolsSchema.SpanEvent`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/devtools/DevToolsSchema.ParentSpan (type)`

- **Source:** `packages/effect/src/unstable/devtools/DevToolsSchema.ts:180`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Type of a span parent, represented either by a devtools `Span` payload or an `ExternalSpan` context.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/devtools/DevToolsSchema.ParentSpan`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/devtools/DevToolsSchema.ParentSpan (value)`

- **Source:** `packages/effect/src/unstable/devtools/DevToolsSchema.ts:189`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for a span parent, either a full devtools `Span` payload or an `ExternalSpan` context.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { DevToolsSchema } from "effect/unstable/devtools"` and use `DevToolsSchema.ParentSpan`.
- **Suggested snippet:** Define the smallest domain Schema involving `DevToolsSchema.ParentSpan`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/devtools/DevToolsSchema.Ping (value)`

- **Source:** `packages/effect/src/unstable/devtools/DevToolsSchema.ts:197`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for the devtools heartbeat request sent by the client.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { DevToolsSchema } from "effect/unstable/devtools"` and use `DevToolsSchema.Ping`.
- **Suggested snippet:** Define the smallest domain Schema involving `DevToolsSchema.Ping`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/devtools/DevToolsSchema.Ping (type)`

- **Source:** `packages/effect/src/unstable/devtools/DevToolsSchema.ts:207`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Type of the devtools heartbeat request sent by the client.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/devtools/DevToolsSchema.Ping`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/devtools/DevToolsSchema.Pong (value)`

- **Source:** `packages/effect/src/unstable/devtools/DevToolsSchema.ts:215`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for the devtools heartbeat response.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { DevToolsSchema } from "effect/unstable/devtools"` and use `DevToolsSchema.Pong`.
- **Suggested snippet:** Define the smallest domain Schema involving `DevToolsSchema.Pong`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/devtools/DevToolsSchema.Pong (type)`

- **Source:** `packages/effect/src/unstable/devtools/DevToolsSchema.ts:225`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Type of the devtools heartbeat response.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/devtools/DevToolsSchema.Pong`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/devtools/DevToolsSchema.MetricsRequest (value)`

- **Source:** `packages/effect/src/unstable/devtools/DevToolsSchema.ts:233`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for a devtools request asking the client to send a metrics snapshot.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { DevToolsSchema } from "effect/unstable/devtools"` and use `DevToolsSchema.MetricsRequest`.
- **Suggested snippet:** Define the smallest domain Schema involving `DevToolsSchema.MetricsRequest`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/devtools/DevToolsSchema.MetricsRequest (type)`

- **Source:** `packages/effect/src/unstable/devtools/DevToolsSchema.ts:243`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Type of a devtools request asking the client to send a metrics snapshot.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/devtools/DevToolsSchema.MetricsRequest`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/devtools/DevToolsSchema.MetricLabel (value)`

- **Source:** `packages/effect/src/unstable/devtools/DevToolsSchema.ts:251`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for a metric label key/value pair in a devtools metrics snapshot.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { DevToolsSchema } from "effect/unstable/devtools"` and use `DevToolsSchema.MetricLabel`.
- **Suggested snippet:** Define the smallest domain Schema involving `DevToolsSchema.MetricLabel`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/devtools/DevToolsSchema.MetricLabel (type)`

- **Source:** `packages/effect/src/unstable/devtools/DevToolsSchema.ts:262`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Type of a metric label key/value pair in a devtools metrics snapshot.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/devtools/DevToolsSchema.MetricLabel`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/devtools/DevToolsSchema.Counter (value)`

- **Source:** `packages/effect/src/unstable/devtools/DevToolsSchema.ts:280`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for a counter metric snapshot, including the count and whether updates are incremental.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { DevToolsSchema } from "effect/unstable/devtools"` and use `DevToolsSchema.Counter`.
- **Suggested snippet:** Define the smallest domain Schema involving `DevToolsSchema.Counter`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/devtools/DevToolsSchema.Counter (type)`

- **Source:** `packages/effect/src/unstable/devtools/DevToolsSchema.ts:299`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Type of a devtools counter metric snapshot.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/devtools/DevToolsSchema.Counter`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/devtools/DevToolsSchema.Frequency (value)`

- **Source:** `packages/effect/src/unstable/devtools/DevToolsSchema.ts:311`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for a devtools frequency metric snapshot.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { DevToolsSchema } from "effect/unstable/devtools"` and use `DevToolsSchema.Frequency`.
- **Suggested snippet:** Define the smallest domain Schema involving `DevToolsSchema.Frequency`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/devtools/DevToolsSchema.Frequency (type)`

- **Source:** `packages/effect/src/unstable/devtools/DevToolsSchema.ts:328`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Type of a devtools frequency metric snapshot.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/devtools/DevToolsSchema.Frequency`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/devtools/DevToolsSchema.Gauge (value)`

- **Source:** `packages/effect/src/unstable/devtools/DevToolsSchema.ts:340`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for a devtools gauge metric snapshot.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { DevToolsSchema } from "effect/unstable/devtools"` and use `DevToolsSchema.Gauge`.
- **Suggested snippet:** Define the smallest domain Schema involving `DevToolsSchema.Gauge`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/devtools/DevToolsSchema.Gauge (type)`

- **Source:** `packages/effect/src/unstable/devtools/DevToolsSchema.ts:357`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Type of a devtools gauge metric snapshot.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/devtools/DevToolsSchema.Gauge`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/devtools/DevToolsSchema.Histogram (value)`

- **Source:** `packages/effect/src/unstable/devtools/DevToolsSchema.ts:370`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for a devtools histogram metric snapshot.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { DevToolsSchema } from "effect/unstable/devtools"` and use `DevToolsSchema.Histogram`.
- **Suggested snippet:** Define the smallest domain Schema involving `DevToolsSchema.Histogram`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/devtools/DevToolsSchema.Histogram (type)`

- **Source:** `packages/effect/src/unstable/devtools/DevToolsSchema.ts:392`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Type of a devtools histogram metric snapshot.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/devtools/DevToolsSchema.Histogram`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/devtools/DevToolsSchema.Summary (value)`

- **Source:** `packages/effect/src/unstable/devtools/DevToolsSchema.ts:405`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for a devtools summary metric snapshot.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { DevToolsSchema } from "effect/unstable/devtools"` and use `DevToolsSchema.Summary`.
- **Suggested snippet:** Define the smallest domain Schema involving `DevToolsSchema.Summary`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/devtools/DevToolsSchema.Summary (type)`

- **Source:** `packages/effect/src/unstable/devtools/DevToolsSchema.ts:432`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Type of a devtools summary metric snapshot.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/devtools/DevToolsSchema.Summary`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/devtools/DevToolsSchema.Metric (value)`

- **Source:** `packages/effect/src/unstable/devtools/DevToolsSchema.ts:445`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for any devtools metric snapshot.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { DevToolsSchema } from "effect/unstable/devtools"` and use `DevToolsSchema.Metric`.
- **Suggested snippet:** Define the smallest domain Schema involving `DevToolsSchema.Metric`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/devtools/DevToolsSchema.Metric (type)`

- **Source:** `packages/effect/src/unstable/devtools/DevToolsSchema.ts:457`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Type of any devtools metric snapshot.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/devtools/DevToolsSchema.Metric`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/devtools/DevToolsSchema.MetricsSnapshot (value)`

- **Source:** `packages/effect/src/unstable/devtools/DevToolsSchema.ts:466`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for a devtools protocol message containing the current metric snapshots.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { DevToolsSchema } from "effect/unstable/devtools"` and use `DevToolsSchema.MetricsSnapshot`.
- **Suggested snippet:** Define the smallest domain Schema involving `DevToolsSchema.MetricsSnapshot`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/devtools/DevToolsSchema.MetricsSnapshot (type)`

- **Source:** `packages/effect/src/unstable/devtools/DevToolsSchema.ts:477`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Type of a devtools protocol message containing the current metric snapshots.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/devtools/DevToolsSchema.MetricsSnapshot`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/devtools/DevToolsSchema.Request (value)`

- **Source:** `packages/effect/src/unstable/devtools/DevToolsSchema.ts:489`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for devtools protocol requests accepted by the server.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { DevToolsSchema } from "effect/unstable/devtools"` and use `DevToolsSchema.Request`.
- **Suggested snippet:** Define the smallest domain Schema involving `DevToolsSchema.Request`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/devtools/DevToolsSchema.Request (type)`

- **Source:** `packages/effect/src/unstable/devtools/DevToolsSchema.ts:501`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Type of devtools protocol requests accepted by the server.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/devtools/DevToolsSchema.Request`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/devtools/DevToolsSchema.Response (value)`

- **Source:** `packages/effect/src/unstable/devtools/DevToolsSchema.ts:532`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for devtools protocol responses sent by the server.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { DevToolsSchema } from "effect/unstable/devtools"` and use `DevToolsSchema.Response`.
- **Suggested snippet:** Define the smallest domain Schema involving `DevToolsSchema.Response`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/devtools/DevToolsSchema.Response (type)`

- **Source:** `packages/effect/src/unstable/devtools/DevToolsSchema.ts:544`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Type of devtools protocol responses sent by the server.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/devtools/DevToolsSchema.Response`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/devtools/DevToolsSchema.Request (type)`

- **Source:** `packages/effect/src/unstable/devtools/DevToolsSchema.ts:508`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Namespace containing helper types for devtools protocol requests.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/devtools/DevToolsSchema.Request`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/devtools/DevToolsSchema.Request.WithoutPing`

- **Source:** `packages/effect/src/unstable/devtools/DevToolsSchema.ts:519`
- **Kind / category:** `namespace-declaration` / `none`
- **Priority:** **optional**
- **Current description:** Devtools request messages excluding heartbeat pings.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/devtools/DevToolsSchema.Request.WithoutPing`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/devtools/DevToolsSchema.Response (type)`

- **Source:** `packages/effect/src/unstable/devtools/DevToolsSchema.ts:551`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Namespace containing helper types for devtools protocol responses.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/devtools/DevToolsSchema.Response`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/devtools/DevToolsSchema.Response.WithoutPong`

- **Source:** `packages/effect/src/unstable/devtools/DevToolsSchema.ts:562`
- **Kind / category:** `namespace-declaration` / `none`
- **Priority:** **optional**
- **Current description:** Devtools response messages excluding heartbeat pongs.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/devtools/DevToolsSchema.Response.WithoutPong`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
