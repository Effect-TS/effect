# Example Suggestions: `effect/unstable/cluster/Snowflake`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/cluster/Snowflake.ts`
- **Uncovered API records:** 21
- **Priorities:** 0 required, 4 recommended, 15 optional, 2 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                             | Line | Kind                    | Priority        |
| --------------------------------------------------------------- | ---: | ----------------------- | --------------- |
| `effect/unstable/cluster/Snowflake.layerGenerator`              |  282 | `root-declaration`      | **recommended** |
| `effect/unstable/cluster/Snowflake.SnowflakeFromBigInt (value)` |  105 | `root-declaration`      | **recommended** |
| `effect/unstable/cluster/Snowflake.Generator`                   |  271 | `root-declaration`      | **recommended** |
| `effect/unstable/cluster/Snowflake.SnowflakeFromString (value)` |  122 | `root-declaration`      | **recommended** |
| `effect/unstable/cluster/Snowflake.SnowflakeFromBigInt (type)`  |   97 | `root-declaration`      | **optional**    |
| `effect/unstable/cluster/Snowflake.SnowflakeFromString (type)`  |  113 | `root-declaration`      | **optional**    |
| `effect/unstable/cluster/Snowflake.Snowflake`                   |   56 | `root-declaration`      | **optional**    |
| `effect/unstable/cluster/Snowflake.make`                        |  161 | `root-declaration`      | **optional**    |
| `effect/unstable/cluster/Snowflake.timestamp`                   |  176 | `root-declaration`      | **optional**    |
| `effect/unstable/cluster/Snowflake.dateTime`                    |  184 | `root-declaration`      | **optional**    |
| `effect/unstable/cluster/Snowflake.machineId`                   |  192 | `root-declaration`      | **optional**    |
| `effect/unstable/cluster/Snowflake.sequence`                    |  201 | `root-declaration`      | **optional**    |
| `effect/unstable/cluster/Snowflake.toParts`                     |  209 | `root-declaration`      | **optional**    |
| `effect/unstable/cluster/Snowflake.makeGenerator`               |  227 | `root-declaration`      | **optional**    |
| `effect/unstable/cluster/Snowflake.Snowflake (type) (type)`     |   47 | `root-declaration`      | **optional**    |
| `effect/unstable/cluster/Snowflake.Snowflake (type) (type)`     |   64 | `namespace`             | **optional**    |
| `effect/unstable/cluster/Snowflake.Snowflake.Parts`             |   72 | `namespace-declaration` | **optional**    |
| `effect/unstable/cluster/Snowflake.Snowflake.Generator`         |   85 | `namespace-declaration` | **optional**    |
| `effect/unstable/cluster/Snowflake.constEpochMillis`            |  132 | `root-declaration`      | **optional**    |
| `effect/unstable/cluster/Snowflake.TypeId (value)`              |   30 | `root-declaration`      | **discouraged** |
| `effect/unstable/cluster/Snowflake.TypeId (type)`               |   38 | `root-declaration`      | **discouraged** |

## Recommended

### `effect/unstable/cluster/Snowflake.layerGenerator`

- **Source:** `packages/effect/src/unstable/cluster/Snowflake.ts:282`
- **Kind / category:** `root-declaration` / `Generator`
- **Priority:** **recommended**
- **Current description:** Layer that provides the default snowflake `Generator` service.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Snowflake } from "effect/unstable/cluster"` and use `Snowflake.layerGenerator`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `Snowflake.layerGenerator`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/Snowflake.SnowflakeFromBigInt (value)`

- **Source:** `packages/effect/src/unstable/cluster/Snowflake.ts:105`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Schema for snowflake ids represented as branded bigints.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Snowflake } from "effect/unstable/cluster"` and use `Snowflake.SnowflakeFromBigInt`.
- **Suggested snippet:** Use `Snowflake.SnowflakeFromBigInt` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/Snowflake.Generator`

- **Source:** `packages/effect/src/unstable/cluster/Snowflake.ts:271`
- **Kind / category:** `root-declaration` / `Generator`
- **Priority:** **recommended**
- **Current description:** Context service for a stateful snowflake id generator.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Snowflake } from "effect/unstable/cluster"` and use `Snowflake.Generator`.
- **Suggested snippet:** Consume `Snowflake.Generator` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/Snowflake.SnowflakeFromString (value)`

- **Source:** `packages/effect/src/unstable/cluster/Snowflake.ts:122`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Schema that decodes snowflake ids from strings into branded bigints and encodes them back to strings.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Snowflake } from "effect/unstable/cluster"` and use `Snowflake.SnowflakeFromString`.
- **Suggested snippet:** Use `Snowflake.SnowflakeFromString` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/cluster/Snowflake.SnowflakeFromBigInt (type)`

- **Source:** `packages/effect/src/unstable/cluster/Snowflake.ts:97`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema type for snowflake ids represented as branded bigints.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cluster/Snowflake.SnowflakeFromBigInt`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Snowflake.SnowflakeFromString (type)`

- **Source:** `packages/effect/src/unstable/cluster/Snowflake.ts:113`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema type for snowflake ids decoded from strings into branded bigints.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cluster/Snowflake.SnowflakeFromString`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Snowflake.Snowflake`

- **Source:** `packages/effect/src/unstable/cluster/Snowflake.ts:56`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Constructs a branded cluster snowflake id from a bigint or bigint-compatible string.
- **Signature hint:** `declare function Snowflake(input: string | number | bigint): Snowflake`
- **Import guidance:** Start from `import { Snowflake } from "effect/unstable/cluster"` and use `Snowflake.Snowflake`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Constructs a branded cluster snowflake id from a bigint or bigint-compatible string. Call `Snowflake.Snowflake` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Snowflake.make`

- **Source:** `packages/effect/src/unstable/cluster/Snowflake.ts:161`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a branded snowflake id from a timestamp, machine id, and sequence number, using the custom snowflake epoch and 10-bit machine id and 12-bit sequence fields.
- **Signature hint:** `declare function make(options: { readonly machineId: MachineId; readonly sequence: number; readonly timestamp: number; }): Snowflake`
- **Import guidance:** Start from `import { Snowflake } from "effect/unstable/cluster"` and use `Snowflake.make`.
- **Suggested snippet:** Construct one representative value with `Snowflake.make`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Snowflake.timestamp`

- **Source:** `packages/effect/src/unstable/cluster/Snowflake.ts:176`
- **Kind / category:** `root-declaration` / `parts`
- **Priority:** **optional**
- **Current description:** Extracts the Unix timestamp in milliseconds from a snowflake id.
- **Signature hint:** `declare function timestamp(snowflake: Snowflake): number`
- **Import guidance:** Start from `import { Snowflake } from "effect/unstable/cluster"` and use `Snowflake.timestamp`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Extracts the Unix timestamp in milliseconds from a snowflake id. Call `Snowflake.timestamp` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Snowflake.dateTime`

- **Source:** `packages/effect/src/unstable/cluster/Snowflake.ts:184`
- **Kind / category:** `root-declaration` / `parts`
- **Priority:** **optional**
- **Current description:** Extracts the timestamp from a snowflake id as a `DateTime.Utc`.
- **Signature hint:** `declare function dateTime(snowflake: Snowflake): DateTime.Utc`
- **Import guidance:** Start from `import { Snowflake } from "effect/unstable/cluster"` and use `Snowflake.dateTime`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Extracts the timestamp from a snowflake id as a `DateTime.Utc`. Call `Snowflake.dateTime` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Snowflake.machineId`

- **Source:** `packages/effect/src/unstable/cluster/Snowflake.ts:192`
- **Kind / category:** `root-declaration` / `parts`
- **Priority:** **optional**
- **Current description:** Extracts the machine id component from a snowflake id.
- **Signature hint:** `declare function machineId(snowflake: Snowflake): MachineId`
- **Import guidance:** Start from `import { Snowflake } from "effect/unstable/cluster"` and use `Snowflake.machineId`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Extracts the machine id component from a snowflake id. Call `Snowflake.machineId` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Snowflake.sequence`

- **Source:** `packages/effect/src/unstable/cluster/Snowflake.ts:201`
- **Kind / category:** `root-declaration` / `parts`
- **Priority:** **optional**
- **Current description:** Extracts the per-machine sequence component from a snowflake id.
- **Signature hint:** `declare function sequence(snowflake: Snowflake): number`
- **Import guidance:** Start from `import { Snowflake } from "effect/unstable/cluster"` and use `Snowflake.sequence`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Extracts the per-machine sequence component from a snowflake id. Call `Snowflake.sequence` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Snowflake.toParts`

- **Source:** `packages/effect/src/unstable/cluster/Snowflake.ts:209`
- **Kind / category:** `root-declaration` / `parts`
- **Priority:** **optional**
- **Current description:** Decomposes a snowflake id into its timestamp, machine id, and sequence parts.
- **Signature hint:** `declare function toParts(snowflake: Snowflake): Snowflake.Parts`
- **Import guidance:** Start from `import { Snowflake } from "effect/unstable/cluster"` and use `Snowflake.toParts`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `Snowflake.toParts`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Snowflake.makeGenerator`

- **Source:** `packages/effect/src/unstable/cluster/Snowflake.ts:227`
- **Kind / category:** `root-declaration` / `Generator`
- **Priority:** **optional**
- **Current description:** Creates a stateful snowflake generator using `Clock`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Snowflake } from "effect/unstable/cluster"` and use `Snowflake.makeGenerator`.
- **Suggested snippet:** Construct one representative value with `Snowflake.makeGenerator`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Snowflake.Snowflake (type) (type)`

- **Source:** `packages/effect/src/unstable/cluster/Snowflake.ts:47`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Branded bigint identifier composed from a timestamp, machine id, and per-machine sequence number.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cluster/Snowflake.Snowflake (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Snowflake.Snowflake (type) (type)`

- **Source:** `packages/effect/src/unstable/cluster/Snowflake.ts:64`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Namespace containing support types for snowflake parts and generators.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cluster/Snowflake.Snowflake (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Snowflake.Snowflake.Parts`

- **Source:** `packages/effect/src/unstable/cluster/Snowflake.ts:72`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Decoded components of a snowflake id: Unix timestamp milliseconds, machine id, and sequence number.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cluster/Snowflake.Snowflake.Parts`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Snowflake.Snowflake.Generator`

- **Source:** `packages/effect/src/unstable/cluster/Snowflake.ts:85`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Stateful generator for runner-local snowflake ids, exposing an unsafe synchronous `nextUnsafe` operation and an effectful machine id setter.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cluster/Snowflake.Snowflake.Generator`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Snowflake.constEpochMillis`

- **Source:** `packages/effect/src/unstable/cluster/Snowflake.ts:132`
- **Kind / category:** `root-declaration` / `constants`
- **Priority:** **optional**
- **Current description:** Defines the custom snowflake epoch in Unix milliseconds.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Snowflake } from "effect/unstable/cluster"` and use `Snowflake.constEpochMillis`.
- **Suggested snippet:** Use `Snowflake.constEpochMillis` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/cluster/Snowflake.TypeId (value)`

- **Source:** `packages/effect/src/unstable/cluster/Snowflake.ts:30`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Runtime brand identifier for cluster snowflake ids.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Snowflake } from "effect/unstable/cluster"` and use `Snowflake.TypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `Snowflake.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/cluster/Snowflake.TypeId (type)`

- **Source:** `packages/effect/src/unstable/cluster/Snowflake.ts:38`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Type-level representation of the cluster snowflake brand identifier.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/cluster/Snowflake.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
