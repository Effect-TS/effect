# Example Suggestions: `effect/DateTime`

- **Package:** `effect`
- **Source:** `packages/effect/src/DateTime.ts`
- **Uncovered API records:** 26
- **Priorities:** 0 required, 3 recommended, 23 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                         | Line | Kind                    | Priority        |
| ------------------------------------------- | ---: | ----------------------- | --------------- |
| `effect/DateTime.isDateTime`                |  422 | `root-declaration`      | **recommended** |
| `effect/DateTime.isTimeZone`                |  438 | `root-declaration`      | **recommended** |
| `effect/DateTime.isTimeZoneOffset`          |  454 | `root-declaration`      | **recommended** |
| `effect/DateTime.isTimeZoneNamed`           |  470 | `root-declaration`      | **optional**    |
| `effect/DateTime.isUtc`                     |  486 | `root-declaration`      | **optional**    |
| `effect/DateTime.isZoned`                   |  502 | `root-declaration`      | **optional**    |
| `effect/DateTime.DateTime (type) (type)`    |   37 | `root-declaration`      | **optional**    |
| `effect/DateTime.Utc`                       |   50 | `root-declaration`      | **optional**    |
| `effect/DateTime.Zoned`                     |   68 | `root-declaration`      | **optional**    |
| `effect/DateTime.DateTime (type) (type)`    |   83 | `namespace`             | **optional**    |
| `effect/DateTime.DateTime.Input`            |   97 | `namespace-declaration` | **optional**    |
| `effect/DateTime.DateTime.PreserveZone`     |  110 | `namespace-declaration` | **optional**    |
| `effect/DateTime.DateTime.Unit`             |  124 | `namespace-declaration` | **optional**    |
| `effect/DateTime.DateTime.UnitSingular`     |  133 | `namespace-declaration` | **optional**    |
| `effect/DateTime.DateTime.UnitPlural`       |  150 | `namespace-declaration` | **optional**    |
| `effect/DateTime.DateTime.PartsWithWeekday` |  172 | `namespace-declaration` | **optional**    |
| `effect/DateTime.DateTime.Parts`            |  193 | `namespace-declaration` | **optional**    |
| `effect/DateTime.DateTime.PartsForMath`     |  213 | `namespace-declaration` | **optional**    |
| `effect/DateTime.DateTime.Instant`          |  231 | `namespace-declaration` | **optional**    |
| `effect/DateTime.DateTime.InstantWithZone`  |  246 | `namespace-declaration` | **optional**    |
| `effect/DateTime.DateTime.Proto`            |  262 | `namespace-declaration` | **optional**    |
| `effect/DateTime.TimeZone (type) (type)`    |  277 | `root-declaration`      | **optional**    |
| `effect/DateTime.TimeZone (type) (type)`    |  285 | `namespace`             | **optional**    |
| `effect/DateTime.TimeZone.Proto`            |  296 | `namespace-declaration` | **optional**    |
| `effect/DateTime.TimeZone.Offset`           |  311 | `namespace-declaration` | **optional**    |
| `effect/DateTime.TimeZone.Named`            |  327 | `namespace-declaration` | **optional**    |

## Recommended

### `effect/DateTime.isDateTime`

- **Source:** `packages/effect/src/DateTime.ts:422`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **recommended**
- **Current description:** Checks whether a value is a `DateTime`.
- **Signature hint:** `declare function isDateTime(u: unknown): u is DateTime`
- **Import guidance:** Start from `import { DateTime } from "effect"` and use `DateTime.isDateTime`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `DateTime.isDateTime` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/DateTime.isTimeZone`

- **Source:** `packages/effect/src/DateTime.ts:438`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **recommended**
- **Current description:** Checks whether a value is a `TimeZone`.
- **Signature hint:** `declare function isTimeZone(u: unknown): u is TimeZone`
- **Import guidance:** Start from `import { DateTime } from "effect"` and use `DateTime.isTimeZone`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `DateTime.isTimeZone` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/DateTime.isTimeZoneOffset`

- **Source:** `packages/effect/src/DateTime.ts:454`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **recommended**
- **Current description:** Checks whether a value is an offset-based `TimeZone`.
- **Signature hint:** `declare function isTimeZoneOffset(u: unknown): u is TimeZone.Offset`
- **Import guidance:** Start from `import { DateTime } from "effect"` and use `DateTime.isTimeZoneOffset`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `DateTime.isTimeZoneOffset` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/DateTime.isTimeZoneNamed`

- **Source:** `packages/effect/src/DateTime.ts:470`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **optional**
- **Current description:** Checks whether a value is a named `TimeZone` (IANA time zone).
- **Signature hint:** `declare function isTimeZoneNamed(u: unknown): u is TimeZone.Named`
- **Import guidance:** Start from `import { DateTime } from "effect"` and use `DateTime.isTimeZoneNamed`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `DateTime.isTimeZoneNamed` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/DateTime.isUtc`

- **Source:** `packages/effect/src/DateTime.ts:486`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **optional**
- **Current description:** Checks whether a `DateTime` is a UTC `DateTime` (no time zone information).
- **Signature hint:** `declare function isUtc(self: DateTime): self is Utc`
- **Import guidance:** Start from `import { DateTime } from "effect"` and use `DateTime.isUtc`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `DateTime.isUtc` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/DateTime.isZoned`

- **Source:** `packages/effect/src/DateTime.ts:502`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **optional**
- **Current description:** Checks whether a `DateTime` is a zoned `DateTime` (has time zone information).
- **Signature hint:** `declare function isZoned(self: DateTime): self is Zoned`
- **Import guidance:** Start from `import { DateTime } from "effect"` and use `DateTime.isZoned`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `DateTime.isZoned` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/DateTime.DateTime (type) (type)`

- **Source:** `packages/effect/src/DateTime.ts:37`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A `DateTime` represents a point in time. It can optionally have a time zone associated with it.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/DateTime.DateTime (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/DateTime.Utc`

- **Source:** `packages/effect/src/DateTime.ts:50`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents a `DateTime` stored as an absolute UTC instant with no associated time zone.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/DateTime.Utc`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/DateTime.Zoned`

- **Source:** `packages/effect/src/DateTime.ts:68`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents a `DateTime` with an associated `TimeZone`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/DateTime.Zoned`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/DateTime.DateTime (type) (type)`

- **Source:** `packages/effect/src/DateTime.ts:83`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Companion namespace containing the public helper types used by `DateTime` constructors, parts APIs, formatting, and date/time arithmetic.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/DateTime.DateTime (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/DateTime.DateTime.Input`

- **Source:** `packages/effect/src/DateTime.ts:97`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Input accepted by `DateTime.make`, `DateTime.makeUnsafe`, and the zoned constructors.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/DateTime.DateTime.Input`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/DateTime.DateTime.PreserveZone`

- **Source:** `packages/effect/src/DateTime.ts:110`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-level helper used by constructors to preserve a zoned input.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/DateTime.DateTime.PreserveZone`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/DateTime.DateTime.Unit`

- **Source:** `packages/effect/src/DateTime.ts:124`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Date and time unit name accepted by `DateTime` rounding and arithmetic APIs.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/DateTime.DateTime.Unit`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/DateTime.DateTime.UnitSingular`

- **Source:** `packages/effect/src/DateTime.ts:133`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Singular date and time unit names used by rounding APIs such as `DateTime.startOf`, `DateTime.endOf`, and `DateTime.nearest`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/DateTime.DateTime.UnitSingular`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/DateTime.DateTime.UnitPlural`

- **Source:** `packages/effect/src/DateTime.ts:150`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Plural date and time unit names used by `DateTime.PartsForMath` for amount-based arithmetic.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/DateTime.DateTime.UnitPlural`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/DateTime.DateTime.PartsWithWeekday`

- **Source:** `packages/effect/src/DateTime.ts:172`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Calendar and time components of a `DateTime`, including the weekday.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/DateTime.DateTime.PartsWithWeekday`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/DateTime.DateTime.Parts`

- **Source:** `packages/effect/src/DateTime.ts:193`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Calendar and time components of a `DateTime`, without weekday information.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/DateTime.DateTime.Parts`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/DateTime.DateTime.PartsForMath`

- **Source:** `packages/effect/src/DateTime.ts:213`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Plural amount fields accepted by `DateTime.add` and `DateTime.subtract`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/DateTime.DateTime.PartsForMath`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/DateTime.DateTime.Instant`

- **Source:** `packages/effect/src/DateTime.ts:231`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Object input representing an absolute instant as milliseconds since the Unix epoch.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/DateTime.DateTime.Instant`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/DateTime.DateTime.InstantWithZone`

- **Source:** `packages/effect/src/DateTime.ts:246`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Object input representing an absolute instant plus a time zone identifier.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/DateTime.DateTime.InstantWithZone`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/DateTime.DateTime.Proto`

- **Source:** `packages/effect/src/DateTime.ts:262`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Shared protocol implemented by all `DateTime` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/DateTime.DateTime.Proto`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/DateTime.TimeZone (type) (type)`

- **Source:** `packages/effect/src/DateTime.ts:277`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents a time zone used by `DateTime.Zoned`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/DateTime.TimeZone (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/DateTime.TimeZone (type) (type)`

- **Source:** `packages/effect/src/DateTime.ts:285`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Companion namespace containing the public variant and protocol types for `TimeZone`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/DateTime.TimeZone (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/DateTime.TimeZone.Proto`

- **Source:** `packages/effect/src/DateTime.ts:296`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Shared protocol implemented by all `TimeZone` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/DateTime.TimeZone.Proto`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/DateTime.TimeZone.Offset`

- **Source:** `packages/effect/src/DateTime.ts:311`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Fixed-offset time zone.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/DateTime.TimeZone.Offset`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/DateTime.TimeZone.Named`

- **Source:** `packages/effect/src/DateTime.ts:327`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Named IANA time zone.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/DateTime.TimeZone.Named`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
