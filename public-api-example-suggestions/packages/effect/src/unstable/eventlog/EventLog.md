# Example Suggestions: `effect/unstable/eventlog/EventLog`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/eventlog/EventLog.ts`
- **Uncovered API records:** 31
- **Priorities:** 0 required, 14 recommended, 13 optional, 4 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                         | Line | Kind                    | Priority        |
| ----------------------------------------------------------- | ---: | ----------------------- | --------------- |
| `effect/unstable/eventlog/EventLog.group`                   |  533 | `root-declaration`      | **recommended** |
| `effect/unstable/eventlog/EventLog.groupCompaction`         |  570 | `root-declaration`      | **recommended** |
| `effect/unstable/eventlog/EventLog.groupReactivity`         |  668 | `root-declaration`      | **recommended** |
| `effect/unstable/eventlog/EventLog.layer`                   |  994 | `root-declaration`      | **recommended** |
| `effect/unstable/eventlog/EventLog.EventLog`                |   51 | `root-declaration`      | **recommended** |
| `effect/unstable/eventlog/EventLog.Registry`                |   71 | `root-declaration`      | **recommended** |
| `effect/unstable/eventlog/EventLog.Identity`                |  184 | `root-declaration`      | **recommended** |
| `effect/unstable/eventlog/EventLog.schema`                  |  231 | `root-declaration`      | **recommended** |
| `effect/unstable/eventlog/EventLog.IdentitySchema`          |  434 | `root-declaration`      | **recommended** |
| `effect/unstable/eventlog/EventLog.decodeIdentityString`    |  458 | `root-declaration`      | **recommended** |
| `effect/unstable/eventlog/EventLog.encodeIdentityString`    |  473 | `root-declaration`      | **recommended** |
| `effect/unstable/eventlog/EventLog.makeIdentity`            |  486 | `root-declaration`      | **recommended** |
| `effect/unstable/eventlog/EventLog.makeReplayFromRemote`    |  701 | `root-declaration`      | **recommended** |
| `effect/unstable/eventlog/EventLog.makeClient`              | 1018 | `root-declaration`      | **recommended** |
| `effect/unstable/eventlog/EventLog.EventLogSchema`          |  220 | `root-declaration`      | **optional**    |
| `effect/unstable/eventlog/EventLog.layerRegistry`           |  110 | `root-declaration`      | **optional**    |
| `effect/unstable/eventlog/EventLog.isEventLogSchema`        |  211 | `root-declaration`      | **optional**    |
| `effect/unstable/eventlog/EventLog.Handlers (type)`         |  269 | `root-declaration`      | **optional**    |
| `effect/unstable/eventlog/EventLog.layerEventLog`           |  957 | `root-declaration`      | **optional**    |
| `effect/unstable/eventlog/EventLog.Handlers.handle`         |  283 | `member`                | **optional**    |
| `effect/unstable/eventlog/EventLog.Handlers (type)`         |  306 | `namespace`             | **optional**    |
| `effect/unstable/eventlog/EventLog.Handlers.Any`            |  314 | `namespace-declaration` | **optional**    |
| `effect/unstable/eventlog/EventLog.Handlers.Item`           |  325 | `namespace-declaration` | **optional**    |
| `effect/unstable/eventlog/EventLog.Handlers.ValidateReturn` |  350 | `namespace-declaration` | **optional**    |
| `effect/unstable/eventlog/EventLog.Handlers.Error`          |  373 | `namespace-declaration` | **optional**    |
| `effect/unstable/eventlog/EventLog.Handlers.Services`       |  390 | `namespace-declaration` | **optional**    |
| `effect/unstable/eventlog/EventLog.CurrentStoreId`          |  416 | `root-declaration`      | **optional**    |
| `effect/unstable/eventlog/EventLog.SchemaTypeId (type)`     |  195 | `root-declaration`      | **discouraged** |
| `effect/unstable/eventlog/EventLog.SchemaTypeId (value)`    |  203 | `root-declaration`      | **discouraged** |
| `effect/unstable/eventlog/EventLog.HandlersTypeId (type)`   |  247 | `root-declaration`      | **discouraged** |
| `effect/unstable/eventlog/EventLog.HandlersTypeId (value)`  |  255 | `root-declaration`      | **discouraged** |

## Recommended

### `effect/unstable/eventlog/EventLog.group`

- **Source:** `packages/effect/src/unstable/eventlog/EventLog.ts:533`
- **Kind / category:** `root-declaration` / `handlers`
- **Priority:** **recommended**
- **Current description:** Creates a layer that registers handlers for every event in an event group.
- **Signature hint:** `declare function group<Events extends Event.Any, Return>(group: EventGroup.EventGroup<Events>, f: (handlers: Handlers<never, Events>) => Handlers.ValidateReturn<Return>): Layer.Layer<Event.ToService<Events>, Handlers.Error<Return>, Exclude<Handlers.Services<Return>, Scope.Scope | Identity> | Registry>`
- **Import guidance:** Start from `import { EventLog } from "effect/unstable/eventlog"` and use `EventLog.group`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `EventLog.group`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/eventlog/EventLog.groupCompaction`

- **Source:** `packages/effect/src/unstable/eventlog/EventLog.ts:570`
- **Kind / category:** `root-declaration` / `compaction`
- **Priority:** **recommended**
- **Current description:** Registers a compaction handler for an event group.
- **Signature hint:** `declare function groupCompaction<Events extends Event.Any, R>(group: EventGroup.EventGroup<Events>, effect: (options: { readonly primaryKey: string; readonly entries: ReadonlyArray<Entry>; readonly events: ReadonlyArray<Event.TaggedPayload<Events>>; readonly write: <Tag extends Event.Tag<Events>>(tag: Tag, payload: Event.PayloadWithTag<Events, Tag>) => Effect.Effect<void, never, Event.PayloadSchemaWithTag<Events, Tag>['EncodingServices']>; }) => Effect.Effect<void, never, R>): Layer.Layer<never, never, R | Event.PayloadSchema<Events>['DecodingServices'] | Registry>`
- **Import guidance:** Start from `import { EventLog } from "effect/unstable/eventlog"` and use `EventLog.groupCompaction`.
- **Suggested snippet:** Use the public setup or registry consumed by `EventLog.groupCompaction`, apply the layer, and assert the registration, migration, route, resource, or other side effect documented by nearby tests. The layer provides no service, so do not write an example that yields a service from context.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/eventlog/EventLog.groupReactivity`

- **Source:** `packages/effect/src/unstable/eventlog/EventLog.ts:668`
- **Kind / category:** `root-declaration` / `reactivity`
- **Priority:** **recommended**
- **Current description:** Registers reactivity keys to invalidate when events from a group are written or replayed.
- **Signature hint:** `declare function groupReactivity<Events extends Event.Any>(group: EventGroup.EventGroup<Events>, keys: { readonly [Tag in Event.Tag<Events>]?: ReadonlyArray<string>; } | ReadonlyArray<string>): Layer.Layer<never, never, Registry>`
- **Import guidance:** Start from `import { EventLog } from "effect/unstable/eventlog"` and use `EventLog.groupReactivity`.
- **Suggested snippet:** Use the public setup or registry consumed by `EventLog.groupReactivity`, apply the layer, and assert the registration, migration, route, resource, or other side effect documented by nearby tests. The layer provides no service, so do not write an example that yields a service from context.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/eventlog/EventLog.layer`

- **Source:** `packages/effect/src/unstable/eventlog/EventLog.ts:994`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Combines event-group handler layers with the `EventLog` runtime for a schema.
- **Signature hint:** `declare function layer<Groups extends EventGroup.Any, E, R>(_schema: EventLogSchema<Groups>, layer: Layer.Layer<EventGroup.ToService<Groups>, E, R>): Layer.Layer<EventLog | Registry, E, Exclude<R, EventLog | Registry> | EventJournal | Identity>`
- **Import guidance:** Start from `import { EventLog } from "effect/unstable/eventlog"` and use `EventLog.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `EventLog.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/eventlog/EventLog.EventLog`

- **Source:** `packages/effect/src/unstable/eventlog/EventLog.ts:51`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service for writing typed event-log events through registered handlers.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventLog } from "effect/unstable/eventlog"` and use `EventLog.EventLog`.
- **Suggested snippet:** Consume `EventLog.EventLog` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/eventlog/EventLog.Registry`

- **Source:** `packages/effect/src/unstable/eventlog/EventLog.ts:71`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service that collects event handlers, compaction handlers, remote replicas, and reactivity invalidation keys.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventLog } from "effect/unstable/eventlog"` and use `EventLog.Registry`.
- **Suggested snippet:** Consume `EventLog.Registry` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/eventlog/EventLog.Identity`

- **Source:** `packages/effect/src/unstable/eventlog/EventLog.ts:184`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Context service for an event-log identity containing a public key and redacted private key material.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventLog } from "effect/unstable/eventlog"` and use `EventLog.Identity`.
- **Suggested snippet:** Consume `EventLog.Identity` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/eventlog/EventLog.schema`

- **Source:** `packages/effect/src/unstable/eventlog/EventLog.ts:231`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Creates an `EventLogSchema` from one or more event groups.
- **Signature hint:** `declare function schema<Groups extends ReadonlyArray<EventGroup.Any>>(...groups: Groups): EventLogSchema<Groups[number]>`
- **Import guidance:** Start from `import { EventLog } from "effect/unstable/eventlog"` and use `EventLog.schema`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates an `EventLogSchema` from one or more event groups. Call `EventLog.schema` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/eventlog/EventLog.IdentitySchema`

- **Source:** `packages/effect/src/unstable/eventlog/EventLog.ts:434`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Schema for an event-log identity with a string public key and redacted base64-encoded private key bytes.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventLog } from "effect/unstable/eventlog"` and use `EventLog.IdentitySchema`.
- **Suggested snippet:** Use `EventLog.IdentitySchema` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/eventlog/EventLog.decodeIdentityString`

- **Source:** `packages/effect/src/unstable/eventlog/EventLog.ts:458`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Decodes a base64url identity string produced by `encodeIdentityString`.
- **Signature hint:** `declare function decodeIdentityString(value: string): Identity['Service']`
- **Import guidance:** Start from `import { EventLog } from "effect/unstable/eventlog"` and use `EventLog.decodeIdentityString`.
- **Suggested snippet:** Convert one representative external input with `EventLog.decodeIdentityString` and assert the semantic output. Add one invalid or boundary input only when the return type models failure or absence.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/eventlog/EventLog.encodeIdentityString`

- **Source:** `packages/effect/src/unstable/eventlog/EventLog.ts:473`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Encodes an event-log identity as a base64url string containing the public key and private key bytes.
- **Signature hint:** `declare function encodeIdentityString(identity: Identity['Service']): string`
- **Import guidance:** Start from `import { EventLog } from "effect/unstable/eventlog"` and use `EventLog.encodeIdentityString`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `EventLog.encodeIdentityString`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/eventlog/EventLog.makeIdentity`

- **Source:** `packages/effect/src/unstable/eventlog/EventLog.ts:486`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Generates a new event-log identity using the configured `EventLogEncryption` service.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventLog } from "effect/unstable/eventlog"` and use `EventLog.makeIdentity`.
- **Suggested snippet:** Construct one representative value with `EventLog.makeIdentity`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/eventlog/EventLog.makeReplayFromRemote`

- **Source:** `packages/effect/src/unstable/eventlog/EventLog.ts:701`
- **Kind / category:** `root-declaration` / `handlers`
- **Priority:** **recommended**
- **Current description:** Builds the effect used to replay entries received from a remote event log.
- **Signature hint:** `declare function makeReplayFromRemote(options: { readonly handlers: ReadonlyMap<string, Handlers.Item<any>>; readonly storeId: StoreId; readonly identity: Identity['Service']; readonly reactivity: Reactivity['Service']; readonly reactivityKeys: Record<string, ReadonlyArray<string>>; readonly logAnnotations: { readonly service: string; readonly effect: string; }; }): (args_0: { readonly entry: Entry; readonly conflicts: ReadonlyArray<Entry>; }) => Effect.Effect<void, never, never>`
- **Import guidance:** Start from `import { EventLog } from "effect/unstable/eventlog"` and use `EventLog.makeReplayFromRemote`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `EventLog.makeReplayFromRemote`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/eventlog/EventLog.makeClient`

- **Source:** `packages/effect/src/unstable/eventlog/EventLog.ts:1018`
- **Kind / category:** `root-declaration` / `client`
- **Priority:** **recommended**
- **Current description:** Creates a typed client function for writing events defined by an `EventLogSchema`.
- **Signature hint:** `declare function makeClient<Groups extends EventGroup.Any>(schema: EventLogSchema<Groups>): Effect.Effect<(<Tag extends Event.Tag<EventGroup.Events<Groups>>>(event: Tag, payload: Event.PayloadWithTag<EventGroup.Events<Groups>, Tag>) => Effect.Effect<Event.SuccessWithTag<EventGroup.Events<Groups>, Tag>, Event.ErrorWithTag<EventGroup.Events<Groups>, Tag> | EventJournalError>), never, EventLog>`
- **Import guidance:** Start from `import { EventLog } from "effect/unstable/eventlog"` and use `EventLog.makeClient`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `EventLog.makeClient`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/eventlog/EventLog.EventLogSchema`

- **Source:** `packages/effect/src/unstable/eventlog/EventLog.ts:220`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema describing the event groups that can be written through an `EventLog`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/eventlog/EventLog.EventLogSchema`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/EventLog.layerRegistry`

- **Source:** `packages/effect/src/unstable/eventlog/EventLog.ts:110`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **optional**
- **Current description:** Provides an in-memory `Registry` for event handlers, compactors, remote replicas, and reactivity keys.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventLog } from "effect/unstable/eventlog"` and use `EventLog.layerRegistry`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `EventLog.layerRegistry`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/EventLog.isEventLogSchema`

- **Source:** `packages/effect/src/unstable/eventlog/EventLog.ts:211`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Returns `true` when a value carries the `EventLogSchema` marker.
- **Signature hint:** `declare function isEventLogSchema(u: unknown): u is EventLogSchema<EventGroup.Any>`
- **Import guidance:** Start from `import { EventLog } from "effect/unstable/eventlog"` and use `EventLog.isEventLogSchema`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `EventLog.isEventLogSchema` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/EventLog.Handlers (type)`

- **Source:** `packages/effect/src/unstable/eventlog/EventLog.ts:269`
- **Kind / category:** `root-declaration` / `handlers`
- **Priority:** **optional**
- **Current description:** Builder for the handlers associated with an `EventGroup`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/eventlog/EventLog.Handlers`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/EventLog.layerEventLog`

- **Source:** `packages/effect/src/unstable/eventlog/EventLog.ts:957`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **optional**
- **Current description:** Provides `EventLog` and `Registry` using the configured `EventJournal` and `Identity`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventLog } from "effect/unstable/eventlog"` and use `EventLog.layerEventLog`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `EventLog.layerEventLog`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/EventLog.Handlers.handle`

- **Source:** `packages/effect/src/unstable/eventlog/EventLog.ts:283`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Add the implementation for an `Event` to a `Handlers` group.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/eventlog/EventLog.Handlers.handle` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/EventLog.Handlers (type)`

- **Source:** `packages/effect/src/unstable/eventlog/EventLog.ts:306`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Namespace containing helper types for `Handlers` values and handler-producing layers.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/eventlog/EventLog.Handlers`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/EventLog.Handlers.Any`

- **Source:** `packages/effect/src/unstable/eventlog/EventLog.ts:314`
- **Kind / category:** `namespace-declaration` / `handlers`
- **Priority:** **optional**
- **Current description:** Type that matches any `Handlers` value regardless of its services or remaining events.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/eventlog/EventLog.Handlers.Any`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/EventLog.Handlers.Item`

- **Source:** `packages/effect/src/unstable/eventlog/EventLog.ts:325`
- **Kind / category:** `namespace-declaration` / `handlers`
- **Priority:** **optional**
- **Current description:** Runtime representation of one registered event handler, including its event metadata, captured context, and handler function.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/eventlog/EventLog.Handlers.Item`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/EventLog.Handlers.ValidateReturn`

- **Source:** `packages/effect/src/unstable/eventlog/EventLog.ts:350`
- **Kind / category:** `namespace-declaration` / `handlers`
- **Priority:** **optional**
- **Current description:** Validates that a handler builder returned all required handlers.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/eventlog/EventLog.Handlers.ValidateReturn`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/EventLog.Handlers.Error`

- **Source:** `packages/effect/src/unstable/eventlog/EventLog.ts:373`
- **Kind / category:** `namespace-declaration` / `handlers`
- **Priority:** **optional**
- **Current description:** Extracts the error type from an effect that produces `Handlers`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/eventlog/EventLog.Handlers.Error`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/EventLog.Handlers.Services`

- **Source:** `packages/effect/src/unstable/eventlog/EventLog.ts:390`
- **Kind / category:** `namespace-declaration` / `handlers`
- **Priority:** **optional**
- **Current description:** Computes the services required by a `Handlers` value or by an effect that produces one, including event schema services.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/eventlog/EventLog.Handlers.Services`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/EventLog.CurrentStoreId`

- **Source:** `packages/effect/src/unstable/eventlog/EventLog.ts:416`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Context reference for the store id used by event-log writes and remote replication.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventLog } from "effect/unstable/eventlog"` and use `EventLog.CurrentStoreId`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `EventLog.CurrentStoreId`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/eventlog/EventLog.SchemaTypeId (type)`

- **Source:** `packages/effect/src/unstable/eventlog/EventLog.ts:195`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Type-level identifier used to brand `EventLogSchema` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/eventlog/EventLog.SchemaTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/eventlog/EventLog.SchemaTypeId (value)`

- **Source:** `packages/effect/src/unstable/eventlog/EventLog.ts:203`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Runtime property key used to identify `EventLogSchema` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventLog } from "effect/unstable/eventlog"` and use `EventLog.SchemaTypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `EventLog.SchemaTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/eventlog/EventLog.HandlersTypeId (type)`

- **Source:** `packages/effect/src/unstable/eventlog/EventLog.ts:247`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Type-level identifier used to brand `Handlers` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/eventlog/EventLog.HandlersTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/eventlog/EventLog.HandlersTypeId (value)`

- **Source:** `packages/effect/src/unstable/eventlog/EventLog.ts:255`
- **Kind / category:** `root-declaration` / `type IDs`
- **Priority:** **discouraged**
- **Current description:** Runtime property key used to identify `Handlers` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventLog } from "effect/unstable/eventlog"` and use `EventLog.HandlersTypeId`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `EventLog.HandlersTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
