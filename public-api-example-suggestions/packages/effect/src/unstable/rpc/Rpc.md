# Example Suggestions: `effect/unstable/rpc/Rpc`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/rpc/Rpc.ts`
- **Uncovered API records:** 59
- **Priorities:** 0 required, 6 recommended, 53 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                          | Line | Kind                    | Priority        |
| -------------------------------------------- | ---: | ----------------------- | --------------- |
| `effect/unstable/rpc/Rpc.wrap`               | 1199 | `root-declaration`      | **recommended** |
| `effect/unstable/rpc/Rpc.fork`               | 1248 | `root-declaration`      | **recommended** |
| `effect/unstable/rpc/Rpc.isRpc`              |   40 | `root-declaration`      | **recommended** |
| `effect/unstable/rpc/Rpc.make`               |  902 | `root-declaration`      | **recommended** |
| `effect/unstable/rpc/Rpc.exitSchema`         | 1123 | `root-declaration`      | **recommended** |
| `effect/unstable/rpc/Rpc.uninterruptible`    | 1256 | `root-declaration`      | **recommended** |
| `effect/unstable/rpc/Rpc.Wrapper`            | 1164 | `root-declaration`      | **optional**    |
| `effect/unstable/rpc/Rpc.wrapMap`            | 1234 | `root-declaration`      | **optional**    |
| `effect/unstable/rpc/Rpc.Custom (type)`      | 1055 | `root-declaration`      | **optional**    |
| `effect/unstable/rpc/Rpc.WrapperOr`          | 1178 | `root-declaration`      | **optional**    |
| `effect/unstable/rpc/Rpc.isWrapper`          | 1186 | `root-declaration`      | **optional**    |
| `effect/unstable/rpc/Rpc.unwrap`             | 1225 | `root-declaration`      | **optional**    |
| `effect/unstable/rpc/Rpc.DefectSchema`       |   53 | `root-declaration`      | **optional**    |
| `effect/unstable/rpc/Rpc.Rpc`                |   72 | `root-declaration`      | **optional**    |
| `effect/unstable/rpc/Rpc.Rpc.setSuccess`     |   96 | `member`                | **optional**    |
| `effect/unstable/rpc/Rpc.Rpc.setError`       |  108 | `member`                | **optional**    |
| `effect/unstable/rpc/Rpc.Rpc.setPayload`     |  120 | `member`                | **optional**    |
| `effect/unstable/rpc/Rpc.Rpc.middleware`     |  134 | `member`                | **optional**    |
| `effect/unstable/rpc/Rpc.Rpc.prefix`         |  146 | `member`                | **optional**    |
| `effect/unstable/rpc/Rpc.Rpc.annotate`       |  158 | `member`                | **optional**    |
| `effect/unstable/rpc/Rpc.Rpc.annotateMerge`  |  166 | `member`                | **optional**    |
| `effect/unstable/rpc/Rpc.ServerClient`       |  187 | `root-declaration`      | **optional**    |
| `effect/unstable/rpc/Rpc.Handler`            |  214 | `root-declaration`      | **optional**    |
| `effect/unstable/rpc/Rpc.Any`                |  233 | `root-declaration`      | **optional**    |
| `effect/unstable/rpc/Rpc.AnyWithProps`       |  247 | `root-declaration`      | **optional**    |
| `effect/unstable/rpc/Rpc.Tag`                |  266 | `root-declaration`      | **optional**    |
| `effect/unstable/rpc/Rpc.SuccessSchema`      |  282 | `root-declaration`      | **optional**    |
| `effect/unstable/rpc/Rpc.Success`            |  298 | `root-declaration`      | **optional**    |
| `effect/unstable/rpc/Rpc.SuccessEncoded`     |  306 | `root-declaration`      | **optional**    |
| `effect/unstable/rpc/Rpc.SuccessExitSchema`  |  327 | `root-declaration`      | **optional**    |
| `effect/unstable/rpc/Rpc.SuccessExit`        |  340 | `root-declaration`      | **optional**    |
| `effect/unstable/rpc/Rpc.SuccessChunk`       |  350 | `root-declaration`      | **optional**    |
| `effect/unstable/rpc/Rpc.ErrorSchema`        |  359 | `root-declaration`      | **optional**    |
| `effect/unstable/rpc/Rpc.Error`              |  376 | `root-declaration`      | **optional**    |
| `effect/unstable/rpc/Rpc.ErrorExitSchema`    |  389 | `root-declaration`      | **optional**    |
| `effect/unstable/rpc/Rpc.ErrorExit`          |  402 | `root-declaration`      | **optional**    |
| `effect/unstable/rpc/Rpc.Exit`               |  411 | `root-declaration`      | **optional**    |
| `effect/unstable/rpc/Rpc.PayloadConstructor` |  420 | `root-declaration`      | **optional**    |
| `effect/unstable/rpc/Rpc.Payload`            |  436 | `root-declaration`      | **optional**    |
| `effect/unstable/rpc/Rpc.Services`           |  453 | `root-declaration`      | **optional**    |
| `effect/unstable/rpc/Rpc.ServicesClient`     |  482 | `root-declaration`      | **optional**    |
| `effect/unstable/rpc/Rpc.ServicesServer`     |  507 | `root-declaration`      | **optional**    |
| `effect/unstable/rpc/Rpc.Middleware`         |  527 | `root-declaration`      | **optional**    |
| `effect/unstable/rpc/Rpc.MiddlewareClient`   |  544 | `root-declaration`      | **optional**    |
| `effect/unstable/rpc/Rpc.AddError`           |  562 | `root-declaration`      | **optional**    |
| `effect/unstable/rpc/Rpc.AddMiddleware`      |  586 | `root-declaration`      | **optional**    |
| `effect/unstable/rpc/Rpc.ToHandler`          |  609 | `root-declaration`      | **optional**    |
| `effect/unstable/rpc/Rpc.ToHandlerFn`        |  630 | `root-declaration`      | **optional**    |
| `effect/unstable/rpc/Rpc.IsStream`           |  647 | `root-declaration`      | **optional**    |
| `effect/unstable/rpc/Rpc.ExtractTag`         |  663 | `root-declaration`      | **optional**    |
| `effect/unstable/rpc/Rpc.ExtractProvides`    |  680 | `root-declaration`      | **optional**    |
| `effect/unstable/rpc/Rpc.ExtractRequires`    |  696 | `root-declaration`      | **optional**    |
| `effect/unstable/rpc/Rpc.ExcludeProvides`    |  713 | `root-declaration`      | **optional**    |
| `effect/unstable/rpc/Rpc.ResultFrom`         |  730 | `root-declaration`      | **optional**    |
| `effect/unstable/rpc/Rpc.Prefixed`           |  762 | `root-declaration`      | **optional**    |
| `effect/unstable/rpc/Rpc.Custom (type)`      | 1067 | `namespace`             | **optional**    |
| `effect/unstable/rpc/Rpc.Custom.Out`         | 1074 | `namespace-declaration` | **optional**    |
| `effect/unstable/rpc/Rpc.Custom.OutDefault`  | 1090 | `namespace-declaration` | **optional**    |
| `effect/unstable/rpc/Rpc.Custom.Kind`        | 1099 | `namespace-declaration` | **optional**    |

## Recommended

### `effect/unstable/rpc/Rpc.wrap`

- **Source:** `packages/effect/src/unstable/rpc/Rpc.ts:1199`
- **Kind / category:** `root-declaration` / `wrapping`
- **Priority:** **recommended**
- **Current description:** Wraps a handler result with RPC server execution options.
- **Signature hint:** `declare function wrap(options: { readonly fork?: boolean | undefined; readonly uninterruptible?: boolean | undefined; }): <A extends object>(value: A) => Wrapper<A>`
- **Import guidance:** Start from `import { Rpc } from "effect/unstable/rpc"` and use `Rpc.wrap`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Wraps a handler result with RPC server execution options. Call `Rpc.wrap` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/rpc/Rpc.fork`

- **Source:** `packages/effect/src/unstable/rpc/Rpc.ts:1248`
- **Kind / category:** `root-declaration` / `wrapping`
- **Priority:** **recommended**
- **Current description:** Wraps a response Effect or Stream so the RPC server executes it concurrently regardless of the server concurrency setting.
- **Signature hint:** `declare function fork<A extends object>(value: A): Wrapper<A>`
- **Import guidance:** Start from `import { Rpc } from "effect/unstable/rpc"` and use `Rpc.fork`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Wraps a response Effect or Stream so the RPC server executes it concurrently regardless of the server concurrency setting. Call `Rpc.fork` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/rpc/Rpc.isRpc`

- **Source:** `packages/effect/src/unstable/rpc/Rpc.ts:40`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **recommended**
- **Current description:** Returns `true` when the value is an `Rpc` definition.
- **Signature hint:** `declare function isRpc(u: unknown): u is Rpc<any, any, any>`
- **Import guidance:** Start from `import { Rpc } from "effect/unstable/rpc"` and use `Rpc.isRpc`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `Rpc.isRpc` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/rpc/Rpc.make`

- **Source:** `packages/effect/src/unstable/rpc/Rpc.ts:902`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates an RPC definition with the supplied tag and optional schemas.
- **Signature hint:** `declare function make<const Tag extends string, Payload extends Schema.Top | Schema.Struct.Fields = Schema.Void, Success extends Schema.Top = Schema.Void, Error extends Schema.Top = Schema.Never, const Stream extends boolean = false>(tag: Tag, options?: { readonly payload?: Payload; readonly success?: Success; readonly error?: Error; readonly defect?: DefectSchema; readonly stream?: Stream; readonly primaryKey?: [Payload] extends [Schema.Struct.Fields] ? ((payload: Payload extends Schema.Struct.Fields ? Struct.Simplify<Schema.Struct<Payload>['Type']> : Payload['Type']) => string) : never; }): Rpc<Tag, Payload extends Schema.Struct.Fields ? Schema.Struct<Payload> : Payload, Stream extends true ? RpcSchema.Stream<Success, Error> : Success, Stream extends true ? typeof Schema.Never : Error>`
- **Import guidance:** Start from `import { Rpc } from "effect/unstable/rpc"` and use `Rpc.make`.
- **Suggested snippet:** Construct one representative value with `Rpc.make`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/rpc/Rpc.exitSchema`

- **Source:** `packages/effect/src/unstable/rpc/Rpc.ts:1123`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Builds the `Schema.Exit` used to encode and decode RPC results.
- **Signature hint:** `declare function exitSchema<R extends Any>(self: R): Schema.Exit<SuccessExitSchema<R>, ErrorExitSchema<R>, DefectSchema>`
- **Import guidance:** Start from `import { Rpc } from "effect/unstable/rpc"` and use `Rpc.exitSchema`.
- **Suggested snippet:** Define the smallest domain Schema involving `Rpc.exitSchema`, decode one representative unknown input, and assert the typed semantic output. If encoded and decoded forms differ, also encode once to show the reverse boundary.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/rpc/Rpc.uninterruptible`

- **Source:** `packages/effect/src/unstable/rpc/Rpc.ts:1256`
- **Kind / category:** `root-declaration` / `wrapping`
- **Priority:** **recommended**
- **Current description:** Wraps a response Effect or Stream so the RPC server runs it in an uninterruptible region.
- **Signature hint:** `declare function uninterruptible<A extends object>(value: A): Wrapper<A>`
- **Import guidance:** Start from `import { Rpc } from "effect/unstable/rpc"` and use `Rpc.uninterruptible`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Wraps a response Effect or Stream so the RPC server runs it in an uninterruptible region. Call `Rpc.uninterruptible` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/rpc/Rpc.Wrapper`

- **Source:** `packages/effect/src/unstable/rpc/Rpc.ts:1164`
- **Kind / category:** `root-declaration` / `wrapping`
- **Priority:** **optional**
- **Current description:** Wraps a handler result with execution options for the RPC server.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/Rpc.Wrapper`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/Rpc.wrapMap`

- **Source:** `packages/effect/src/unstable/rpc/Rpc.ts:1234`
- **Kind / category:** `root-declaration` / `wrapping`
- **Priority:** **optional**
- **Current description:** Maps the value inside an RPC wrapper, preserving wrapper options such as `fork` and `uninterruptible`; unwrapped values are mapped directly.
- **Signature hint:** `declare function wrapMap<A extends object, B extends object>(self: WrapperOr<A>, f: (value: A) => B): WrapperOr<B>`
- **Import guidance:** Start from `import { Rpc } from "effect/unstable/rpc"` and use `Rpc.wrapMap`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Maps the value inside an RPC wrapper, preserving wrapper options such as `fork` and `uninterruptible`; unwrapped values are mapped directly. Call `Rpc.wrapMap` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/Rpc.Custom (type)`

- **Source:** `packages/effect/src/unstable/rpc/Rpc.ts:1055`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Defines the type-level contract for an RPC custom constructor.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/Rpc.Custom`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/Rpc.WrapperOr`

- **Source:** `packages/effect/src/unstable/rpc/Rpc.ts:1178`
- **Kind / category:** `root-declaration` / `wrapping`
- **Priority:** **optional**
- **Current description:** A value that may be returned directly or wrapped with RPC server execution options.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/Rpc.WrapperOr`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/Rpc.isWrapper`

- **Source:** `packages/effect/src/unstable/rpc/Rpc.ts:1186`
- **Kind / category:** `root-declaration` / `wrapping`
- **Priority:** **optional**
- **Current description:** Returns `true` when the value is an RPC `Wrapper`.
- **Signature hint:** `declare function isWrapper(u: object): u is Wrapper<any>`
- **Import guidance:** Start from `import { Rpc } from "effect/unstable/rpc"` and use `Rpc.isWrapper`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `Rpc.isWrapper` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/Rpc.unwrap`

- **Source:** `packages/effect/src/unstable/rpc/Rpc.ts:1225`
- **Kind / category:** `root-declaration` / `wrapping`
- **Priority:** **optional**
- **Current description:** Returns the wrapped response value when the input is an RPC `Wrapper`, or the input itself when it is already unwrapped.
- **Signature hint:** `declare function unwrap<A extends object>(value: WrapperOr<A>): A`
- **Import guidance:** Start from `import { Rpc } from "effect/unstable/rpc"` and use `Rpc.unwrap`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Returns the wrapped response value when the input is an RPC `Wrapper`, or the input itself when it is already unwrapped. Call `Rpc.unwrap` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/Rpc.DefectSchema`

- **Source:** `packages/effect/src/unstable/rpc/Rpc.ts:53`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Schema for RPC defects.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/Rpc.DefectSchema`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/Rpc.Rpc`

- **Source:** `packages/effect/src/unstable/rpc/Rpc.ts:72`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents a typed RPC definition.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/Rpc.Rpc`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/Rpc.Rpc.setSuccess`

- **Source:** `packages/effect/src/unstable/rpc/Rpc.ts:96`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Set the schema for the success response of the rpc.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/rpc/Rpc.Rpc.setSuccess` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/Rpc.Rpc.setError`

- **Source:** `packages/effect/src/unstable/rpc/Rpc.ts:108`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Set the schema for the error response of the rpc.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/rpc/Rpc.Rpc.setError` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/Rpc.Rpc.setPayload`

- **Source:** `packages/effect/src/unstable/rpc/Rpc.ts:120`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Set the schema for the payload of the rpc.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/rpc/Rpc.Rpc.setPayload` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/Rpc.Rpc.middleware`

- **Source:** `packages/effect/src/unstable/rpc/Rpc.ts:134`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Add an `RpcMiddleware` to this procedure.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/rpc/Rpc.Rpc.middleware` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/Rpc.Rpc.prefix`

- **Source:** `packages/effect/src/unstable/rpc/Rpc.ts:146`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Set the schema for the error response of the rpc.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/rpc/Rpc.Rpc.prefix` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/Rpc.Rpc.annotate`

- **Source:** `packages/effect/src/unstable/rpc/Rpc.ts:158`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Add an annotation on the rpc.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/rpc/Rpc.Rpc.annotate` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/Rpc.Rpc.annotateMerge`

- **Source:** `packages/effect/src/unstable/rpc/Rpc.ts:166`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Merge the annotations of the rpc with the provided annotations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/rpc/Rpc.Rpc.annotateMerge` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/Rpc.ServerClient`

- **Source:** `packages/effect/src/unstable/rpc/Rpc.ts:187`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents server-side metadata for the client associated with an RPC request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Rpc } from "effect/unstable/rpc"` and use `Rpc.ServerClient`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `Rpc.ServerClient`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/Rpc.Handler`

- **Source:** `packages/effect/src/unstable/rpc/Rpc.ts:214`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents the server-side implementation of an RPC.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/Rpc.Handler`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/Rpc.Any`

- **Source:** `packages/effect/src/unstable/rpc/Rpc.ts:233`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** An erased RPC definition that preserves the common runtime metadata shared by all RPCs.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/Rpc.Any`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/Rpc.AnyWithProps`

- **Source:** `packages/effect/src/unstable/rpc/Rpc.ts:247`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** An erased RPC definition with all schema, middleware, annotation, and service metadata available.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/Rpc.AnyWithProps`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/Rpc.Tag`

- **Source:** `packages/effect/src/unstable/rpc/Rpc.ts:266`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the tag string from an `Rpc`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/Rpc.Tag`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/Rpc.SuccessSchema`

- **Source:** `packages/effect/src/unstable/rpc/Rpc.ts:282`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the success schema from an `Rpc`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/Rpc.SuccessSchema`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/Rpc.Success`

- **Source:** `packages/effect/src/unstable/rpc/Rpc.ts:298`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the decoded success value type from an `Rpc`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/Rpc.Success`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/Rpc.SuccessEncoded`

- **Source:** `packages/effect/src/unstable/rpc/Rpc.ts:306`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the encoded success value type from an `Rpc`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/Rpc.SuccessEncoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/Rpc.SuccessExitSchema`

- **Source:** `packages/effect/src/unstable/rpc/Rpc.ts:327`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the success schema used in an RPC exit.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/Rpc.SuccessExitSchema`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/Rpc.SuccessExit`

- **Source:** `packages/effect/src/unstable/rpc/Rpc.ts:340`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the decoded success value carried by an RPC exit.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/Rpc.SuccessExit`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/Rpc.SuccessChunk`

- **Source:** `packages/effect/src/unstable/rpc/Rpc.ts:350`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the decoded stream element type from a streaming RPC, or `never` for non-streaming RPCs.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/Rpc.SuccessChunk`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/Rpc.ErrorSchema`

- **Source:** `packages/effect/src/unstable/rpc/Rpc.ts:359`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the RPC error schema, including error schemas contributed by middleware.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/Rpc.ErrorSchema`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/Rpc.Error`

- **Source:** `packages/effect/src/unstable/rpc/Rpc.ts:376`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the decoded error value type from an `Rpc`, including middleware errors.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/Rpc.Error`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/Rpc.ErrorExitSchema`

- **Source:** `packages/effect/src/unstable/rpc/Rpc.ts:389`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the error schema used in an RPC exit.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/Rpc.ErrorExitSchema`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/Rpc.ErrorExit`

- **Source:** `packages/effect/src/unstable/rpc/Rpc.ts:402`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the decoded error type used by an RPC exit.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/Rpc.ErrorExit`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/Rpc.Exit`

- **Source:** `packages/effect/src/unstable/rpc/Rpc.ts:411`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** The `Exit` type produced for an RPC, using the RPC's exit success and exit error types.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/Rpc.Exit`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/Rpc.PayloadConstructor`

- **Source:** `packages/effect/src/unstable/rpc/Rpc.ts:420`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the payload constructor input type accepted by the RPC payload schema.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/Rpc.PayloadConstructor`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/Rpc.Payload`

- **Source:** `packages/effect/src/unstable/rpc/Rpc.ts:436`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the decoded payload type from an `Rpc`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/Rpc.Payload`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/Rpc.Services`

- **Source:** `packages/effect/src/unstable/rpc/Rpc.ts:453`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts all schema services required to encode or decode an RPC's payload, success, error, and middleware error schemas.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/Rpc.Services`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/Rpc.ServicesClient`

- **Source:** `packages/effect/src/unstable/rpc/Rpc.ts:482`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the schema services required on the client side of an RPC.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/Rpc.ServicesClient`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/Rpc.ServicesServer`

- **Source:** `packages/effect/src/unstable/rpc/Rpc.ts:507`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the schema services required on the server side of an RPC.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/Rpc.ServicesServer`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/Rpc.Middleware`

- **Source:** `packages/effect/src/unstable/rpc/Rpc.ts:527`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the service identifiers for middleware attached to an `Rpc`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/Rpc.Middleware`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/Rpc.MiddlewareClient`

- **Source:** `packages/effect/src/unstable/rpc/Rpc.ts:544`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts client-side middleware service requirements for middleware marked as required on the client.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/Rpc.MiddlewareClient`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/Rpc.AddError`

- **Source:** `packages/effect/src/unstable/rpc/Rpc.ts:562`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Returns an RPC type with an additional error schema unioned into its error channel.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/Rpc.AddError`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/Rpc.AddMiddleware`

- **Source:** `packages/effect/src/unstable/rpc/Rpc.ts:586`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Returns an RPC type with additional middleware and the corresponding middleware service requirements applied.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/Rpc.AddMiddleware`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/Rpc.ToHandler`

- **Source:** `packages/effect/src/unstable/rpc/Rpc.ts:609`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Converts an RPC definition into the corresponding `Handler` type.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/Rpc.ToHandler`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/Rpc.ToHandlerFn`

- **Source:** `packages/effect/src/unstable/rpc/Rpc.ts:630`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** The function signature for implementing an RPC handler.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/Rpc.ToHandlerFn`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/Rpc.IsStream`

- **Source:** `packages/effect/src/unstable/rpc/Rpc.ts:647`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Returns `true` when the RPC with the specified tag has a streaming success schema, or `never` otherwise.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/Rpc.IsStream`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/Rpc.ExtractTag`

- **Source:** `packages/effect/src/unstable/rpc/Rpc.ts:663`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the RPC with the specified tag from an RPC union.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/Rpc.ExtractTag`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/Rpc.ExtractProvides`

- **Source:** `packages/effect/src/unstable/rpc/Rpc.ts:680`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the services provided by middleware on the RPC with the specified tag.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/Rpc.ExtractProvides`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/Rpc.ExtractRequires`

- **Source:** `packages/effect/src/unstable/rpc/Rpc.ts:696`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the service requirements of the RPC with the specified tag.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/Rpc.ExtractRequires`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/Rpc.ExcludeProvides`

- **Source:** `packages/effect/src/unstable/rpc/Rpc.ts:713`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Removes the services provided by middleware for the specified RPC tag from an environment type.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/Rpc.ExcludeProvides`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/Rpc.ResultFrom`

- **Source:** `packages/effect/src/unstable/rpc/Rpc.ts:730`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Computes the allowed handler result type for an RPC.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/Rpc.ResultFrom`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/Rpc.Prefixed`

- **Source:** `packages/effect/src/unstable/rpc/Rpc.ts:762`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Returns an RPC type with the specified string prefix added to its tag while preserving its payload, success, error, middleware, and requirements.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/Rpc.Prefixed`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/Rpc.Custom (type)`

- **Source:** `packages/effect/src/unstable/rpc/Rpc.ts:1067`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Helper types for defining RPC custom constructors.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/Rpc.Custom`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/Rpc.Custom.Out`

- **Source:** `packages/effect/src/unstable/rpc/Rpc.ts:1074`
- **Kind / category:** `namespace-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** The transformed schemas produced by a custom RPC constructor.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/Rpc.Custom.Out`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/Rpc.Custom.OutDefault`

- **Source:** `packages/effect/src/unstable/rpc/Rpc.ts:1090`
- **Kind / category:** `namespace-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** The default custom-constructor output shape for arbitrary success and error schemas.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/Rpc.Custom.OutDefault`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/Rpc.Custom.Kind`

- **Source:** `packages/effect/src/unstable/rpc/Rpc.ts:1099`
- **Kind / category:** `namespace-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Applies a custom constructor definition to concrete success and error schemas and returns its transformed output schema type.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/Rpc.Custom.Kind`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
