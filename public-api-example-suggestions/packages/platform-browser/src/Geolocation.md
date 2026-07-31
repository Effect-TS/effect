# Example Suggestions: `@effect/platform-browser/Geolocation`

- **Package:** `@effect/platform-browser`
- **Source:** `packages/platform-browser/src/Geolocation.ts`
- **Uncovered API records:** 9
- **Priorities:** 0 required, 7 recommended, 2 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                           | Line | Kind               | Priority        |
| ------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/platform-browser/Geolocation.layer`                  |  199 | `root-declaration` | **recommended** |
| `@effect/platform-browser/Geolocation.Geolocation (value)`    |   77 | `root-declaration` | **recommended** |
| `@effect/platform-browser/Geolocation.GeolocationError`       |   85 | `root-declaration` | **recommended** |
| `@effect/platform-browser/Geolocation.PositionUnavailable`    |  110 | `root-declaration` | **recommended** |
| `@effect/platform-browser/Geolocation.PermissionDenied`       |  124 | `root-declaration` | **recommended** |
| `@effect/platform-browser/Geolocation.Timeout`                |  138 | `root-declaration` | **recommended** |
| `@effect/platform-browser/Geolocation.watchPosition`          |  223 | `root-declaration` | **recommended** |
| `@effect/platform-browser/Geolocation.GeolocationErrorReason` |  152 | `root-declaration` | **optional**    |
| `@effect/platform-browser/Geolocation.Geolocation (type)`     |   50 | `root-declaration` | **optional**    |

## Recommended

### `@effect/platform-browser/Geolocation.layer`

- **Source:** `packages/platform-browser/src/Geolocation.ts:199`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that provides `Geolocation` using `navigator.geolocation`, with watched positions buffered in a sliding queue.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Geolocation } from "@effect/platform-browser"` and use `Geolocation.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `Geolocation.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-browser/Geolocation.Geolocation (value)`

- **Source:** `packages/platform-browser/src/Geolocation.ts:77`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service tag for browser geolocation capabilities.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Geolocation } from "@effect/platform-browser"` and use `Geolocation.Geolocation`.
- **Suggested snippet:** Consume `Geolocation.Geolocation` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-browser/Geolocation.GeolocationError`

- **Source:** `packages/platform-browser/src/Geolocation.ts:85`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Tagged error wrapping a browser geolocation failure reason.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Geolocation } from "@effect/platform-browser"` and use `Geolocation.GeolocationError`.
- **Suggested snippet:** Create or capture `Geolocation.GeolocationError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-browser/Geolocation.PositionUnavailable`

- **Source:** `packages/platform-browser/src/Geolocation.ts:110`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Error reason for the browser geolocation `POSITION_UNAVAILABLE` failure.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Geolocation } from "@effect/platform-browser"` and use `Geolocation.PositionUnavailable`.
- **Suggested snippet:** Create or capture `Geolocation.PositionUnavailable` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-browser/Geolocation.PermissionDenied`

- **Source:** `packages/platform-browser/src/Geolocation.ts:124`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Error reason for the browser geolocation `PERMISSION_DENIED` failure.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Geolocation } from "@effect/platform-browser"` and use `Geolocation.PermissionDenied`.
- **Suggested snippet:** Create or capture `Geolocation.PermissionDenied` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-browser/Geolocation.Timeout`

- **Source:** `packages/platform-browser/src/Geolocation.ts:138`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Error reason for the browser geolocation `TIMEOUT` failure.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Geolocation } from "@effect/platform-browser"` and use `Geolocation.Timeout`.
- **Suggested snippet:** Create or capture `Geolocation.Timeout` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-browser/Geolocation.watchPosition`

- **Source:** `packages/platform-browser/src/Geolocation.ts:223`
- **Kind / category:** `root-declaration` / `accessors`
- **Priority:** **recommended**
- **Current description:** Reads geolocation positions from the `Geolocation` service as a stream, with an optional sliding buffer size.
- **Signature hint:** `declare function watchPosition(options?: (PositionOptions & { readonly bufferSize?: number | undefined; }) | undefined): Stream.Stream<GeolocationPosition, GeolocationError, Geolocation>`
- **Import guidance:** Start from `import { Geolocation } from "@effect/platform-browser"` and use `Geolocation.watchPosition`.
- **Suggested snippet:** Create a finite stream, apply `Geolocation.watchPosition`, consume it with `Stream.runCollect` or `Stream.runForEach`, and assert the stable ordering, cardinality, or failure behavior. Bound any potentially infinite stream first.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/platform-browser/Geolocation.GeolocationErrorReason`

- **Source:** `packages/platform-browser/src/Geolocation.ts:152`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **optional**
- **Current description:** Union of browser geolocation error reasons represented by the service.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/platform-browser/Geolocation.GeolocationErrorReason`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-browser/Geolocation.Geolocation (type)`

- **Source:** `packages/platform-browser/src/Geolocation.ts:50`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Defines the service interface for browser geolocation, providing effects for the current position and streams of watched positions.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/platform-browser/Geolocation.Geolocation`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
