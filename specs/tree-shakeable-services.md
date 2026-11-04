# Tree-shakeable services

A program that calls two operations of a fifty-operation service should bundle those two implementations and nothing
else, and a test should still be able to replace one operation. This spec adds one idea to `effect/Context`, at two
granularities, defines it precisely enough to implement, implements it in `packages/effect/src/Context.ts` and
`packages/effect/src/Stream.ts` on this branch, and ships a prototype under `specs/tree-shakeable-services/` whose
esbuild check shows the unused implementations, and the unused parts of the runtime, are absent from the bundle.

## Summary

An **operation** is a service whose shape is a function. A **record service** is a group of operations, stored one
slot each. Both are ordinary `Context.Service` keys; the second differs from today's record services only in where
the implementation is stored.

```ts
// contract module: keys only, no implementations
export const readFile = Context.Operation<(path: string) => Effect.Effect<Uint8Array, PlatformError>>()(
  "effect/FileSystem/readFile"
)
export const stream = Stream.Operation<(path: string) => Stream.Stream<Uint8Array, PlatformError>>()(
  "effect/FileSystem/stream"
)
// … 28 more, then the record service, whose identity is the union of the keys above
const operations = { readFile, stream /* … */ }
export type FileSystem = Context.Operations.Identifier<typeof operations>
export const FileSystem = Context.Operations<FileSystem>()("effect/FileSystem", operations)

// a program calls an operation like a function; the key lands in R
const bytes = yield* FileSystem.readFile("/etc/hosts")
//    Effect<Uint8Array, PlatformError, "effect/FileSystem/readFile">
// or yields the record, as it does today; the whole identity lands in R
const fs = yield* FileSystem.FileSystem
//    Effect<FileSystem.Shape, never, FileSystem>

// an implementation module provides one operation like any service
export const readFile = Layer.succeed(FileSystem.readFile.service, (path) => Effect.tryPromise(...))
// an aggregate provides the record like any service, and that provides every operation
export const layer = Layer.succeed(FileSystem.FileSystem, record) // Layer<FileSystem>
// merging the thirty operation layers is also a Layer<FileSystem>; no helper is involved

// a test replaces one operation like any service, on top of either
program.pipe(Effect.provideService(FileSystem.readFile.service, () => Effect.succeed(bytes)))
```

Nothing else is new. Providing, overriding, merging, precedence and yielding go through `Context`, `Layer` and
`Effect` as they are today. An operation call returns a plain Effect, or a plain Stream when the operation was
defined with `Stream.Operation`; there is no value that is both. The implementation of an operation nobody calls is
never imported, so the bundler drops it, and a program that uses no Stream operation carries no Stream runtime. A
missing implementation is a compile error naming the key, or the record's name.

The prototype's esbuild check, on a 30-operation file system contract:

```
main.ts (two operation layers)                       226.9 kB   2 of 30 implementations   Stream runtime absent
main-twenty.ts (twenty operation layers)             234.4 kB  20 of 30 implementations   Stream runtime absent
main-stream.ts (one Stream operation)                430.9 kB   1 of 30 implementations   Stream runtime present
main-record.ts (yield* FileSystem, record layer)     443.1 kB  30 of 30 implementations   Stream runtime present
```

## The problem

A service in Effect is a record. `yield* FileSystem` gives the whole record, and `Layer.succeed(FileSystem, {...})`
provides the whole record. A bundler can delete an unused top-level binding, but it cannot delete a property from an
object it keeps, so every implementation in the record ships even when the program reads two of them. On platforms
where cold start is dominated by script size, a file system or SQL client with dozens of operations is most of the
bundle.

The requirement cuts both ways. Tests need to replace a single operation with a fake, and a program that forgets to
provide an implementation should not compile. The mechanism has to leave the type system in charge.

What a bundler can do: drop a top-level export that nothing references, drop a module that nothing imports, and track
which members of a namespace import are read. Any design that works has to put each implementation in a binding of its
own and make the program reference only the bindings it uses. The question is what the program references, and how
the whole-record form that existing code is written against relates to the per-operation form.

## The design

### One idea at two granularities

A `Context.Service` key has a string identity, a shape, and a slot in the context map. An **operation** is a key whose
shape is a function, plus the one thing a function-shaped service needs to read well: you can call it. A **record
service** (`Context.Operations`) is a key whose shape is a record of operations' implementations and whose slot is
spread: providing it writes each member under that member's key, and reading it assembles the record from those
slots.

| Form      | Key                                          | Shape                   | Use                               | Provide                               |
| --------- | -------------------------------------------- | ----------------------- | --------------------------------- | ------------------------------------- |
| operation | `Context.Operation<Shape>()("…/readFile")`   | `(path) => Effect<…>`   | `yield* readFile(p)`              | `Layer.succeed(readFile.service, fn)` |
| record    | `Context.Operations<FileSystem>()("…", ops)` | `{ readFile, stat, … }` | `(yield* FileSystem).readFile(p)` | `Layer.succeed(FileSystem, record)`   |

The two rows are the same storage read at different granularity. There is no bridge between them: the record's
provider populates the operations' slots, and the operations' providers populate the record's slots.

### Defining operations

A contract module exports one operation per export and holds no implementations. The result kind of an operation is
fixed where it is defined: `Context.Operation` for shapes returning an Effect, `Stream.Operation` for shapes returning
a Stream.

```ts
// FileSystem.ts
import * as Context from "effect/Context"
import * as Stream from "effect/Stream"

export const readFile = Context.Operation<(path: string) => Effect.Effect<Uint8Array, PlatformError>>()(
  "effect/FileSystem/readFile"
)
export const makeTempFileScoped = Context.Operation<
  (options?: { readonly prefix?: string }) => Effect.Effect<string, PlatformError, Scope.Scope>
>()("effect/FileSystem/makeTempFileScoped")
export const stream = Stream.Operation<
  (path: string, options?: { readonly chunkSize?: number }) => Stream.Stream<Uint8Array, PlatformError>
>()("effect/FileSystem/stream")
// … 27 more
```

The key string is the identity of the operation at both levels: it is the slot the implementation is stored under at
run time, and it is the type that appears in `R` while the operation is unprovided. The convention is
`<package>/<Service>/<operation>`. Two operations with the same key are the same operation, in the types and at run
time, which is the rule `Context.Service` has today.

Giving a Stream shape to `Context.Operation` is a compile error (`does not satisfy the constraint 'EffectSignature'`);
the fix is `Stream.Operation`. Any other result kind with an `unwrap` (`Sink.unwrap` exists) gets the same five-line
constructor in its own module; `Context.ts` knows nothing about any of them.

### Defining the record service

The record service is built from the operations, after them, in the same module:

```ts
const operations = { access, chmod, /* … */ readFile, stream, /* … */ writeFileString }

export type FileSystem = Context.Operations.Identifier<typeof operations>
export const FileSystem = Context.Operations<FileSystem>()("effect/FileSystem", operations)

export type Shape = Context.Service.Shape<typeof FileSystem> // { readonly readFile: (path: string) => …; … }
```

`FileSystem` the type is the union of the thirty keys, and the type alias gives that union a name that TypeScript keeps
in diagnostics (`Layer<FileSystem, never, never>`, `Type 'FileSystem' is not assignable to type 'never'`). `FileSystem`
the value is a `Context.Service<FileSystem, Shape>` with its members attached. The identifier is passed as a type
parameter rather than inferred because an inferred union prints as `Identifier<{ access: Operation<…>; … }>`;
passing anything other than the members' union is a compile error naming the union that was expected.

Because the identity is the union of the keys, the relationships a user expects hold by ordinary assignability, with
no new rule:

- `Layer<FileSystem>` satisfies `"effect/FileSystem/readFile"`: `Exclude<"…/readFile", FileSystem>` is `never`.
- `Layer<"effect/FileSystem/readFile">` does not satisfy `FileSystem`.
- `Layer.mergeAll(all thirty operation layers)` is assignable to `Layer<FileSystem>`; the prototype's `node/layer.ts`
  is exactly that with the annotation, and a merge of some of them is rejected with the missing keys in the error.
- `Effect<_, _, "…/readFile" | "…/writeFile">` is assignable to `Effect<_, _, FileSystem>`, so an author may annotate a
  function with the record's name.

### Using operations

```ts
export const backup = (path: string) =>
  Effect.gen(function*() {
    const bytes = yield* FileSystem.readFile(path)
    yield* FileSystem.writeFile(`${path}.bak`, bytes)
    return bytes.length
  })
// Effect<number, PlatformError, "effect/FileSystem/readFile" | "effect/FileSystem/writeFile">
```

A call has the shape's parameters and the shape's result with the operation's key added to its requirements. A Stream
operation returns a Stream. An operation whose shape requires `Scope` keeps `Scope` in `R`. Because an operation is a
function and not an Effect, `Effect.andThen(getPath, FileSystem.readFile)`, `Effect.tap(_, FileSystem.readFile)` and
`Effect.flatMap(_, FileSystem.readFile)` all call it.

From the consumer's side the module is the service: `import * as FileSystem from "effect/FileSystem"` and then
`FileSystem.readFile(path)`. Member access on a namespace import is the one object-property pattern bundlers do shake,
so the "record" the program sees is the module, and it costs only the members read. The record service itself is one
more export of that module, `FileSystem.FileSystem`, which is what today's code already writes.

**How `R` grows, and the author's choice.** Inferred requirements list every operation a function calls: a function
using fifteen operations shows fifteen keys, and adding a sixteenth call changes its public type. That is the precise
truth about what the function needs, and it is what lets a composition root provide exactly that. An author who wants a
stable public type annotates with the record's name instead:

```ts
export const exerciseStable = (root: string): Effect.Effect<unknown, PlatformError, FileSystem> => exercise(root)
```

That compiles for any subset of operations, never changes when a call is added, and requires callers to provide the
whole file system, which is the trade the annotation makes explicit. Both forms are in the prototype
(`program-twenty.ts`), and both error texts are pasted under "Type-level evidence".

### Providing operations

An implementation module provides one operation with the existing layer constructors:

```ts
// node/readFile.ts
export const readFile = Layer.succeed(
  FileSystem.readFile.service,
  (path) => Effect.tryPromise({ try: () => fs.readFile(path), catch: toPlatformError })
)

// an implementation that needs another service declares it in the layer, never in the shape
export const makeTempDirectoryScoped = Layer.effect(
  FileSystem.makeTempDirectoryScoped.service,
  Effect.map(Pool, (pool) => (options) => Effect.acquireRelease(pool.mkdtemp(options), pool.rm))
)
```

The composition root provides the operations the program requires:

```ts
import { readFile } from "./node/readFile.ts"
import { writeFile } from "./node/writeFile.ts"

Effect.runPromise(backup(path).pipe(Effect.provide(Layer.mergeAll(readFile, writeFile))))
```

If `writeFile` is missing, `runPromise` does not compile and the error names `"effect/FileSystem/writeFile"`. The types
tell the root what to import; no layout rule has to be remembered.

The coarse-grained form is a `Layer<FileSystem>`, obtained either by merging every operation layer or by providing the
record: `Layer.succeed(FileSystem.FileSystem, record)`, `Layer.effect(FileSystem.FileSystem, makeRecord)`, as a record
service is provided today. Either bundles every implementation, by construction. A library ships both: one layer per
operation in its own module, and the aggregate in a module of its own so that importing one does not import the
other.

### The record service at run time

`Layer.succeed(FileSystem.FileSystem, record)` writes thirty slots, `"effect/FileSystem/access"` through
`"effect/FileSystem/writeFileString"`, and nothing under `"effect/FileSystem"`. `yield* FileSystem.FileSystem` reads the
thirty slots and returns `{ access, …, writeFileString }`; if a slot is empty it dies with
`Service not found: effect/FileSystem/stat`, naming the member. Because there is only one kind of storage, precedence
is ordinary `Context` precedence for every combination of the two forms: the provider closest to the call wins, slot by
slot.

```ts
// a record provided live, one member replaced closer to the program: the fake wins, and the record view sees it too
program.pipe(
  Effect.provideService(FileSystem.readFile.service, fakeRead),
  Effect.provide(NodeFileSystem.layer)
)
// the other order: the record is closer, so its readFile wins
program.pipe(Effect.provide(NodeFileSystem.layer), Effect.provideService(FileSystem.readFile.service, fakeRead))
```

Both orders are tested. `Layer.mock(FileSystem.FileSystem, { readFile })` works unchanged: the proxy it builds is spread
member by member, so `readFile` runs and `stat` dies with `effect/FileSystem: Unimplemented method "stat"`.

**What `yield* FileSystem` costs.** Its requirement is `FileSystem`, which only a `Layer<FileSystem>` satisfies, so the
bundle contains every implementation (443.1 kB against 226.9 kB in the prototype). At run time each `yield*` reads
thirty slots and allocates one record; code that yields once and keeps the record pays this once. Calling an operation
costs one slot read, like `Service.use`.

### Overriding one operation in a test

```ts
const fakeRead = Layer.succeed(FileSystem.readFile.service, () => Effect.succeed(bytes("faked")))

// the override is closer to the program than the live layer, so it wins
backup("a.txt").pipe(Effect.provide(fakeRead), Effect.provide(live))

// or without a layer
backup("a.txt").pipe(Effect.provideService(FileSystem.readFile.service, () => Effect.succeed(bytes("faked"))))

// or composed into one layer
Layer.provideMerge(fakeRead, live)
```

`live` may be two operation layers or the whole record; the override is the same. A test provides the operations the
program uses; if it forgets one, the test does not compile:

```
typetest/errors/forgotten-override.ts(7,3): error TS2379: Argument of type 'Effect<number, FileSystemError, "effect/FileSystem/writeFile">' is not assignable to parameter of type 'Effect<number, FileSystemError, never>' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Type '"effect/FileSystem/writeFile"' is not assignable to type 'never'.
```

### Required, not defaulted

An operation has no default implementation. This is a position, taken for three reasons:

- A default is bundled with the key. A library operation with a default keeps its default implementation in every
  bundle, including bundles that override it, which is the opposite of the goal.
- Platform operations have no universal default. `readFile` on Node, Bun, Deno and a browser are four
  implementations and none is the default; the composition root picks one by importing it.
- A default hides a missing implementation. With a default, a forgotten override runs the default and nothing appears
  in `R`. Without one, the forgotten override is the compile error above.

A library that wants "sensible out of the box" ships a layer and the root imports it. Code that genuinely wants a
silently replaceable value keeps using `Context.Reference` and `yield*`; that is the existing primitive for defaults,
and it is deliberately not merged into this one. Both halves of the earlier objection to defaults ("this will always
keep the base impl even when it gets replaced, also it doesn't work for things that don't have a default") are
answered by not having one.

### Generic, overloaded and property-bearing shapes

The call signature of an operation is derived from its shape: the shape's `this` and parameters, and the shape's
result with the key added to `R`. TypeScript cannot rewrite the result of a generic function type without
instantiating its type parameters at their constraints, cannot see past the last overload, and cannot carry a
function's properties onto a value that does not have them at run time. So the constructor checks, at the definition:

> If the shape's result already requires the key, the shape is the call signature, unchanged. Otherwise the derived
> signature must be as precise as the shape, and the shape must be a bare function. Anything else does not compile.

A generic or overloaded shape names its key and keeps its signature exactly:

```ts
export const parse = Context.Operation<
  <A>(decode: (input: string) => A, input: string) => Effect.Effect<A, never, "app/parse">
>()("app/parse")
parse(Number, "42") // Effect<number, never, "app/parse">

export const format = Context.Operation<{
  (value: number): Effect.Effect<string, never, "app/format">
  (value: Date, locale: string): Effect.Effect<string, never, "app/format">
}>()("app/format")
```

Forgetting to is an error at the definition, not an imprecise type at the call:

```
typetest/errors/generic-unnamed.ts(7,3): error TS2345: Argument of type '"test/parse"' is not assignable to parameter of type '"The shape of \"test/parse\" is generic or overloaded: its result must require \"test/parse\""'.
typetest/errors/overloaded-unnamed.ts(8,6): error TS2345: Argument of type '"test/format"' is not assignable to parameter of type '"The shape of \"test/format\" is generic or overloaded: its result must require \"test/format\""'.
typetest/errors/shape-with-properties.ts(6,3): error TS2345: Argument of type '"test/double"' is not assignable to parameter of type '"The shape has properties: an operation is a bare function"'.
```

"As precise as the shape" is checked by round-tripping: the signature derived by `infer` must be assignable back to
the shape. For `<A>(d: (s: string) => A) => Effect<A>` the derived `(d: (s: string) => unknown) => Effect<unknown>` is
not, because `unknown` is not `A`; for `<A>(value: A) => Effect<void>` it is, and that shape is accepted and derived
without loss (`typetest/ok/signatures.ts`). Nothing changes at call sites between the two cases; the rule only affects
how a contract author writes a generic shape, and breaking it cannot go unnoticed.

## API

Additions live in `effect/Context` and `effect/Stream`. No existing export changes signature. Six `Context` functions
gain a branch for record-service keys, listed under "Existing APIs this touches".

### `Context.Operation` (constructor)

```ts
export const Operation: <Shape extends Operation.EffectSignature>() => <const Key extends string>(
  key: Operation.KeyFor<Key, Shape>
) => Operation<Key, Shape>
```

Two stages so the shape is given explicitly and the key is inferred as a literal, mirroring
`Context.Service<Self, Shape>()("Id")`. Returns a function with `name === key`, the `OperationTypeId` marker and a
`service` property. `KeyFor<Key, Shape>` is `Key` when the shape names its key or is derivable, and otherwise a string
literal type explaining why the definition is rejected; TypeScript infers `Key` through it and prints the explanation
as the parameter type, as pasted above.

### `Stream.Operation` (constructor)

```ts
export const Operation: <Shape extends Context.Operation.StreamSignature>() => <const Key extends string>(
  key: Context.Operation.KeyFor<Key, Shape>
) => Context.Operation<Key, Shape>
```

Same key, same service, same type; a call returns `Stream.unwrap` of the implementation looked up from the running
fiber. Implemented in `Stream.ts` on top of an internal `Context.makeOperation(key, call)`, so `Context.ts` has no
run-time dependency on Stream.

### `Context.Operation<Key, Shape>` (type)

```ts
export type Operation<Key extends string, Shape extends Operation.Signature> =
  & Operation.Call<Key, Shape>
  & {
    readonly [OperationTypeId]: OperationTypeId
    readonly service: Service<Key, Shape>
  }

export declare namespace Operation {
  export type EffectSignature = (...args: any) => Effect<any, any, any>
  export type StreamSignature = (...args: any) => Stream<any, any, any>
  export type Signature = EffectSignature | StreamSignature

  /** The shape when its result requires the key; otherwise derived with the key added to the result. */
  export type Call<Key extends string, Shape extends Signature> = Shape extends
    (this: infer This, ...args: infer Args) => infer Result ? [Key] extends [Requirements<Result>] ? Shape
    : (this: This, ...args: Args) => Require<Result, Key>
    : never

  export type Requirements<Result> = Result extends Effect<infer _A, infer _E, infer R> ? R
    : Result extends Stream<infer _A, infer _E, infer R> ? R
    : never
  export type Require<Result, Key> = Result extends Effect<infer A, infer E, infer R> ? Effect<A, E, R | Key>
    : Result extends Stream<infer A, infer E, infer R> ? Stream<A, E, R | Key>
    : never

  /** True when the derived signature is assignable back to the shape. */
  export type Derivable<Shape extends Signature> = Shape extends
    (this: infer This, ...args: infer Args) => infer Result ?
    [(this: This, ...args: Args) => Result] extends [Shape] ? true
    : false
    : false

  /** The key, or the reason the definition is rejected. */
  export type KeyFor<Key extends string, Shape extends Signature> = [keyof Shape] extends [never] ?
    Shape extends (...args: any) => infer Result ? [Key] extends [Requirements<Result>] ? Key
      : Derivable<Shape> extends true ? Key
      : `The shape of "${Key}" is generic or overloaded: its result must require "${Key}"`
    : never
    : "The shape has properties: an operation is a bare function"

  export interface Any {
    readonly [OperationTypeId]: OperationTypeId
    readonly service: Service<any, any>
  }
  export type Key<Op extends Any> = Op["service"]["Identifier"]
  export type Shape<Op extends Any> = Op["service"]["Service"]
}
```

`Operation` is a type alias, not an interface, because its call signature is conditional on the shape. TypeScript keeps
the alias name in diagnostics:

```
typetest/errors/displayed-type.ts(4,14): error TS2322: Type 'Operation<"effect/FileSystem/readFile", (path: string) => Effect<Uint8Array<ArrayBufferLike>, FileSystemError, never>>' is not assignable to type 'string'.
typetest/errors/displayed-type.ts(6,14): error TS2322: Type 'Effect<Uint8Array<ArrayBufferLike>, FileSystemError, "effect/FileSystem/readFile">' is not assignable to type 'string'.
typetest/errors/displayed-type.ts(8,14): error TS2322: Type 'Stream<Uint8Array<ArrayBufferLike>, FileSystemError, "effect/FileSystem/stream">' is not assignable to type 'string'.
```

Shapes that return neither an Effect nor a Stream are rejected by the constraint:

```
typetest/errors/not-an-operation.ts(4,39): error TS2344: Type '(path: string) => string' does not satisfy the constraint 'EffectSignature'.
  Type 'string' is not assignable to type 'Effect<any, any, any>'.
typetest/errors/stream-shape.ts(5,41): error TS2344: Type '(path: string) => Stream<Uint8Array<ArrayBufferLike>, never, never>' does not satisfy the constraint 'EffectSignature'.
```

A value or a synchronous function is a `Context.Service` and is yielded; that is the same idea at value granularity.

### `Context.OperationTypeId` and `Context.isOperation`

```ts
export type OperationTypeId = "~effect/Context/Operation"
export const OperationTypeId: OperationTypeId
export const isOperation: (u: unknown) => u is Operation.Any
```

### `Context.Operations` (constructor)

```ts
export const Operations: <Self>() => <const Ops extends Operations.Members>(
  key: string,
  operations: Operations.Validate<Self, Ops>
) => Operations<Self, Ops>
```

Creates a `Service(key)` and attaches `OperationsTypeId` and `operations`. `Validate<Self, Ops>` is `Ops` when `Self` is
exactly `Operations.Identifier<Ops>` and otherwise `{ readonly "Self is not the identifier of these operations":
Identifier<Ops> }`, so a wrong `Self` fails at the members argument with the expected union in the message
(`typetest/errors/wrong-self.ts`).

### `Context.Operations<Identifier, Ops>` (type)

```ts
export interface Operations<in out Identifier, in out Ops extends Operations.Members>
  extends Service<Identifier, Operations.Shape<Ops>>
{
  readonly [OperationsTypeId]: OperationsTypeId
  readonly operations: Ops
}

export declare namespace Operations {
  export interface Members {
    readonly [name: string]: Operation.Any
  }
  export type Identifier<Ops extends Members> = { [K in keyof Ops]: Operation.Key<Ops[K]> }[keyof Ops]
  export type Shape<Ops extends Members> = { readonly [K in keyof Ops]: Operation.Shape<Ops[K]> }
  export type Validate<Self, Ops extends Members> = …
}
```

It is a `Service`, so `yield*`, `.use`, `.useSync`, `.of`, `.context`, `Context.Service.Shape<typeof FileSystem>` and
`Context.Service.Identifier<typeof FileSystem>` all apply. `Identifier` is written as a mapped type indexed by its
keys rather than a plain indexed access so that a user's alias of it keeps its name in diagnostics.

### `Context.OperationsTypeId` and `Context.isOperations`

```ts
export type OperationsTypeId = "~effect/Context/Operations"
export const OperationsTypeId: OperationsTypeId
export const isOperations: (u: unknown) => u is Operations<any, any>
```

### Existing APIs this touches

Signatures are unchanged. Six `Context` functions gain a branch for record-service keys; everything else sees ordinary
keys and values.

| API                                                              | Ordinary key                      | Record-service key                                                                                      |
| ---------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `Context.make(key, value)`                                       | one slot                          | one slot per member, under the member's key                                                             |
| `Context.add(self, key, value)`                                  | one overlay                       | a flattened copy with one slot per member                                                               |
| `Context.get`, `getUnsafe`, `yield* key`, `key.use`, `useSync`   | the slot                          | the record assembled from the members' slots; a missing member throws `Service not found: <member key>` |
| `Context.getOption`, `getOrElse`, `getOrUndefined`               | the slot or the fallback          | the record when every member is present, otherwise the fallback                                         |
| `Context.pick(...keys)`, `Context.omit(...keys)`                 | the slot                          | every member's slot                                                                                     |
| `Context.addUnsafe`, `getOrUndefinedUnsafe` (string-keyed)       | unchanged                         | unchanged: they address slots, and a record service has no slot of its own                              |
| `Layer.succeed`, `Layer.effect`, `Layer.sync`, `Layer.mock`      | via `Context.make`                | via `Context.make`, so the members' slots                                                               |
| `Effect.provideService`, `provideServiceEffect`, `updateService` | via `Context.add` / `Context.get` | via `Context.add` / `Context.get`                                                                       |
| `Context.merge`, `mergeAll`, equality, `mapUnsafe`               | slots                             | slots: `mapUnsafe.size` is the member count, and no `"effect/FileSystem"` entry exists                  |
| `Context.isKey`, `isReference`                                   |                                   | `true`, `false`; `isKey(op)` is `false`, `isKey(op.service)` is `true`                                  |
| `Effect.andThen`, `Effect.tap`, `Effect.flatMap` given `op`      |                                   | a function, so they call it (`isEffect(op)` is `false`)                                                 |
| `Effect.map(op, …)`, `yield* op`                                 |                                   | a type error: an operation is not an Effect                                                             |

`Context.ts` gains a type-only import of `Stream` for `Operation.StreamSignature`, `Requirements` and `Require`, as
`Layer.ts` already has. It gains no run-time import; `pnpm circular` is clean.

## Runtime semantics

**Construction.** `Context.Operation<Shape>()(key)` creates `service = Service(key)` and a function `op` whose `name`
is `key`, with `op[OperationTypeId]` and `op.service`. `Stream.Operation` does the same through the internal
`makeOperation`, passing a different `call`. `Context.Operations<Self>()(key, operations)` creates `Service(key)` and
attaches `operations`. Nothing is looked up at construction. All three are cheap enough to do at module top level for
every export of a contract; the prototype annotates each with `/* @__PURE__ */` so a bundler drops the keys of
operations a program never references, and the record service when nothing yields it (the bundle check reports
`record service "effect/FileSystem" in main.ts: absent`).

**Calling an Effect operation.** `op(...args)` returns
`withFiber((fiber) => Reflect.apply(getUnsafe(fiber.context, service), receiver, args))`: an Effect primitive that,
when run, reads the implementation from the running fiber's context, calls it with the call's receiver and arguments,
and continues with the Effect it returns. `Effect.isEffect` is `true` and `Stream.isStream` is `false`.

**Calling a Stream operation.** `op(...args)` returns
`Stream.unwrap(service.useSync((implementation) => Reflect.apply(implementation, receiver, args)))`: a Stream that, when
run, reads the implementation from the fiber that pulls it and delegates to the Stream it returns. `Stream.isStream` is
`true` and `Effect.isEffect` is `false`. Both facts are pinned by a test.

**Lookup timing.** The implementation is read from the running fiber's context each time the call result runs, not
when `op` is called and not when it is constructed. One call value run under two providers runs two implementations;
this holds for Stream operations too and is what makes `Effect.provideService(op.service, fake)` work on a call built
before the override is applied.

**Receiver.** `op` forwards its `this` to the implementation. A shape that declares a `this` parameter keeps it in the
call signature; an ordinary shape has `this: unknown` and ignores it. Implementations written as arrows or `Effect.fn`
are unaffected.

**Function properties.** A shape with properties is rejected at the definition. `op` has its own properties (`service`,
`name`, `length`) and nothing else; an implementation that needs to expose values beside its function exposes them as
a separate service.

**Missing implementation.** The types prevent running a program whose `R` still contains an operation's key or a
record's identity. If the types are bypassed, `getUnsafe` throws the existing `Service not found: <key>` defect when
the call result runs, naming the member key in the record case.

**Record storage.** `make` and `add` with a record-service key write `operations[name].service.key → value[name]` for
each member; `add` does so on a flattened copy, which keeps the overlay chain short for thirty entries. `get` and the
getters read each member's slot with the existing `lookup`; a miss on any member is a miss for the record. `pick` and
`omit` expand a record-service key to its members' keys. A record service is never stored under its own key.

**Precedence.** Ordinary `Context` semantics, slot by slot: the provider closest to the call wins. `Effect.provide(a)`
then `Effect.provide(b)` in a pipe means `a` wins over `b` for keys both provide; `Layer.provideMerge(override, live)`
has `override` win; a record provided inside an operation override wins for that member.

**Cost.** One slot read per run of an operation call, the same as `Service.use`, plus one Effect primitive per call
(plus `Stream.unwrap`'s channel for Stream operations). One slot read per member per `yield* FileSystem`, plus the
record allocation. `Context.get` with an ordinary key pays one extra `in` check for the record-service marker.

## Hazards, and what the design does about each

- **Callables that are also Effects.** A `Context.Service` key is a function that is also an Effect. If the operation
  itself were the key, `Effect.andThen(x, op)` would type as a call (the function overload is listed first) but run as
  an Effect (`isEffect` is checked first), returning the implementation instead of calling it. The operation is
  therefore a plain function and the key lives on `.service`. `isEffect(op)` and `isKey(op)` are `false`.
- **`isEffect`-dispatching duals.** `Effect.andThen` and `Effect.tap` dispatch on `isEffect(f)`; every `dual` with an
  `isEffect(args[0])` predicate (thirty-nine in `internal/effect.ts`, `Console.ts`, `Runtime.ts`, `HttpServer.ts`,
  `internal/layer.ts` and `internal/executionPlan.ts`) decides data-first against data-last the same way. With `op` not an Effect, all of them see a
  function and the types agree with the runtime. `Effect.map(op, f)` is rejected at the type level:

  ```
  typetest/errors/not-an-effect.ts(5,34): error TS2345: Argument of type 'Operation<"effect/FileSystem/readFile", (path: string) => Effect<Uint8Array<ArrayBufferLike>, FileSystemError, never>>' is not assignable to parameter of type 'Effect<unknown, unknown, unknown>'.
  typetest/errors/not-an-effect.ts(8,24): error TS2488: Type 'Operation<"effect/FileSystem/readFile", (path: string) => Effect<Uint8Array<ArrayBufferLike>, FileSystemError, never>>' must have a '[Symbol.iterator]()' method that returns an iterator.
  ```

- **Stream-returning operations.** A call result is exactly one kind of value, decided by which constructor defined
  the operation, so the `isStream`/`isEffect` dispatch sites cannot misclassify it: the twenty
  `dual((args) => isStream(args[0]))` sites in `Stream.ts`, the streaming-response check in `HttpApiBuilder.ts`, the
  payload check in `HttpApiClient.ts`, `reactivity/Atom.ts` (which distinguishes functions, Effects and Streams),
  `http/Template.ts`, `cluster/Entity.ts` and the child-process spawners all see an Effect for an Effect operation and
  a Stream for a Stream operation. The kind test is pinned so this stays true.
- **Receivers.** Forwarded, so method-style use (`holder.greet("x")`) reaches an implementation that declares `this`.
  Tested.
- **Function properties.** Rejected at the definition, so a type can never promise a property the runtime value lacks.
- **Key collisions.** Two operations with the same string are the same key, in `R` and in the map; the types and the
  runtime cannot disagree about identity. The `<package>/<Service>/<operation>` convention keeps keys unique.
- **An operation defined outside its record.** An operation with the record's prefix that is not in `operations` is
  not part of the record: `Layer<FileSystem>` does not claim it and does not provide it. Nothing is unsound; the
  convention is that a record's operations are the ones passed to `Context.Operations`.
- **A partial record.** `Layer.succeed(FileSystem, { readFile })` is rejected, listing the missing members. The
  partial-record test convenience is `Layer.mock`, which claims the whole record and dies on the members it lacks,
  exactly as it does for today's record services.
- **Override typing.** An override is the shape, so a wrong parameter type and an added requirement are both rejected:

  ```
  typetest/errors/wrong-override.ts(11,3): error TS2345: Argument of type '(path: number) => Effect.Effect<Uint8Array<ArrayBuffer>, never, never>' is not assignable to parameter of type '(path: string) => Effect<Uint8Array<ArrayBufferLike>, FileSystemError, never>'.
    Types of parameters 'path' and 'path' are incompatible.
      Type 'string' is not assignable to type 'number'.
  typetest/errors/wrong-override.ts(16,13): error TS2375: Type 'Effect<Uint8Array<ArrayBuffer>, never, { readonly value: number; }>' is not assignable to type 'Effect<Uint8Array<ArrayBufferLike>, FileSystemError, never>' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
    Type '{ readonly value: number; }' is not assignable to type 'never'.
  ```

- **`Layer.succeed(op, …)` instead of `Layer.succeed(op.service, …)`.** Rejected: an operation is not a `Key`
  (`typetest/errors/layer-succeed-operation.ts`).
- **Error text under `exactOptionalPropertyTypes`.** TypeScript appends "with 'exactOptionalPropertyTypes: true'.
  Consider adding 'undefined'…" to every `Effect` assignability error because `Effect` has optional `Unify` members.
  This is the same for every missing requirement in v4 today and is not specific to operations; the line that matters
  is the indented one naming the key.
- **`op.service` is callable.** Every `Context.Service` key is a `function KeyClass() {}` at run time and calling it
  returns `undefined`. That is an existing property of keys, unchanged here; the typed call is `op`, not
  `op.service`.
- **String-keyed unsafe access.** `Context.getOrUndefinedUnsafe(ctx, "effect/FileSystem")` returns `undefined` for a
  record service, because nothing is stored under that string. Code that reaches into contexts by string addresses
  slots, and a record's slots are its members'.

## Type-level evidence

All of the following is the output of `pnpm --filter tree-shakeable-services-spec check-errors`, which compiles the
files under `typetest/errors` and checks each fails for its documented reason. `typetest/ok/signatures.ts` holds the
positive assertions and compiles under `pnpm check`.

A program run without its operations:

```
typetest/errors/missing-requirement.ts(5,19): error TS2379: Argument of type 'Effect<number, FileSystemError, "effect/FileSystem/readFile" | "effect/FileSystem/writeFile">' is not assignable to parameter of type 'Effect<number, FileSystemError, never>' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Type '"effect/FileSystem/readFile" | "effect/FileSystem/writeFile"' is not assignable to type 'never'.
    Type '"effect/FileSystem/readFile"' is not assignable to type 'never'.
```

The twenty-operation composition root (`src/main-twenty.ts`) with three implementations left out, then the same
program under its stable `FileSystem` annotation provided with all twenty, which requires the ten it does not call:

```
typetest/errors/missing-twenty.ts(48,19): error TS2379: Argument of type 'Effect<{ root: string; text: string; bytes: number; present: boolean; size: number; link: "Directory" | "File" | "Other" | "SymbolicLink"; real: string; names: number; entries: number; }, FileSystemError, "effect/FileSystem/rename" | "effect/FileSystem/stat" | "effect/FileSystem/utimes">' is not assignable to parameter of type 'Effect<{ … }, FileSystemError, never>' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Type '"effect/FileSystem/rename" | "effect/FileSystem/stat" | "effect/FileSystem/utimes"' is not assignable to type 'never'.
    Type '"effect/FileSystem/rename"' is not assignable to type 'never'.
typetest/errors/missing-twenty.ts(52,19): error TS2379: Argument of type 'Effect<unknown, FileSystemError, "effect/FileSystem/chmod" | "effect/FileSystem/chown" | "effect/FileSystem/glob" | "effect/FileSystem/link" | "effect/FileSystem/makeTempDirectoryScoped" | "effect/FileSystem/makeTempFile" | "effect/FileSystem/makeTempFileScoped" | "effect/FileSystem/readLink" | "effect/FileSystem/stream" | "effect/FileSystem/watch">' is not assignable to parameter of type 'Effect<unknown, FileSystemError, never>' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Type '"effect/FileSystem/chmod" | "effect/FileSystem/chown" | "effect/FileSystem/glob" | "effect/FileSystem/link" | "effect/FileSystem/makeTempDirectoryScoped" | "effect/FileSystem/makeTempFile" | "effect/FileSystem/makeTempFileScoped" | "effect/FileSystem/readLink" | "effect/FileSystem/stream" | "effect/FileSystem/watch"' is not assignable to type 'never'.
    Type '"effect/FileSystem/chmod"' is not assignable to type 'never'.
```

The record program run unprovided, which prints the record's name, and a partial merge annotated as the record,
which prints what is missing:

```
typetest/errors/record-requires-all.ts(8,19): error TS2379: Argument of type 'Effect<number, FileSystemError, FileSystem>' is not assignable to parameter of type 'Effect<number, FileSystemError, never>' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Type 'FileSystem' is not assignable to type 'never'.
    Type '"effect/FileSystem/access"' is not assignable to type 'never'.
typetest/errors/partial-aggregate.ts(7,14): error TS2375: Type 'Layer<"effect/FileSystem/readFile" | "effect/FileSystem/writeFile", never, never>' is not assignable to type 'Layer<FileSystem, never, never>' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Type 'FileSystem' is not assignable to type '"effect/FileSystem/readFile" | "effect/FileSystem/writeFile"'.
    Type '"effect/FileSystem/access"' is not assignable to type '"effect/FileSystem/readFile" | "effect/FileSystem/writeFile"'.
```

What compiles (from `typetest/ok/signatures.ts`, abridged):

```ts
const read: Effect<Uint8Array, FileSystemError, "effect/FileSystem/readFile"> = FileSystem.readFile("a.txt")
const scoped: Effect<string, FileSystemError, Scope | "effect/FileSystem/makeTempFileScoped"> = FileSystem
  .makeTempFileScoped()
const stream: Stream<Uint8Array, FileSystemError, "effect/FileSystem/stream"> = FileSystem.stream("a.txt")
const stable: Effect<number, FileSystemError, FileSystem> = backup("a.txt") // two operations, annotated with the record
const record: Effect<FileSystem.Shape, never, FileSystem> = FileSystem.FileSystem
const underRecord: Effect<number, FileSystemError, never> = backup("a.txt").pipe(Effect.provide(nodeLayer))
const recordUnderOperations: Effect<number, FileSystemError, never> = backupViaRecord("a.txt").pipe(
  Effect.provide(nodeLayer)
)
const succeeded: Layer<FileSystem> = Layer.succeed(FileSystem.FileSystem, record)
const mocked: Layer<FileSystem> = Layer.mock(FileSystem.FileSystem, { readFile: () => Effect.succeed(bytes) })
const parsed: Effect<number, never, "test/parse"> = parse(Number, "42") // generic shape naming its key
const logged: Effect<void, never, "test/log"> = log({ anything: true }) // generic shape derived without loss
const formattedDate: Effect<string, never, "test/format"> = format(new Date(), "en") // overloaded shape naming its key
const greeting: Effect<string, never, "test/greet"> = greeter.greet("x") // shape with a `this` parameter
const lineStream: Stream<string, FileSystemError, "test/lines"> = lines("a.txt") // Stream.Operation
```

## Tree-shaking: what the bundler needs, and what the prototype shows

Requirements on code, all of which are the ordinary requirements for anything to tree-shake:

1. One implementation per top-level export, in a side-effect-free module. One module per operation is the simplest
   way to get that and is what the prototype does; several exports in one side-effect-free module also work.
2. The composition root imports implementation modules, or reads members off their namespace. It does not import an
   aggregate unless it wants everything.
3. Aggregates (`layer = Layer.mergeAll(...)`) live in their own module or are `/* @__PURE__ */`-annotated, because an
   unused call expression at top level is retained otherwise.
4. Contract modules hold keys only. Their `Operation`, `Stream.Operation` and `Operations` calls may be
   `/* @__PURE__ */`-annotated to let unused keys, and the record service, drop too.

The types enforce the half that matters: `R` names what to import. Nothing in the design depends on a rule that the
types cannot check except rule 3, which is the general rule for any top-level call in any bundled code.

The prototype (`specs/tree-shakeable-services/`) models `effect/FileSystem` as 30 operations, three of them
Stream-returning and two needing `Scope`, with one Node implementation module each, and six composition roots.
`pnpm --filter tree-shakeable-services-spec bundle` builds each with esbuild and reports which implementation modules
and which `packages/effect/src` modules it contains, by metafile and by a per-implementation marker string:

```
Bundle sizes (esbuild, esm, unminified)

  main.ts (two operation layers)                       226.9 kB
  main-namespace.ts (two layers off a namespace)       226.8 kB
  main-stream.ts (one Stream operation)                430.9 kB
  main-twenty.ts (twenty operation layers)             234.4 kB
  main-record.ts (yield* FileSystem, record layer)     443.1 kB
  main-full.ts (two operations, record layer)          442.4 kB

  main.ts              contains 2 of 30 implementations: readFile, writeFile
  main-namespace.ts    contains 2 of 30 implementations: readFile, writeFile
  main-stream.ts       contains 1 of 30 implementations: stream
  main-twenty.ts       contains 20 of 30 implementations: access, copy, copyFile, exists, lstat, makeDirectory, …
  main-record.ts       contains 30 of 30 implementations: all
  main-full.ts         contains 30 of 30 implementations: all

Stream runtime modules in each bundle (packages/effect/src)

  main.ts              53 effect modules    Stream runtime absent
  main-namespace.ts    53 effect modules    Stream runtime absent
  main-stream.ts       77 effect modules    Stream runtime present (Stream.ts, Channel.ts, Sink.ts, internal/stream.ts)
  main-twenty.ts       53 effect modules    Stream runtime absent
  main-record.ts       77 effect modules    Stream runtime present (Stream.ts, Channel.ts, Sink.ts, internal/stream.ts)
  main-full.ts         77 effect modules    Stream runtime present (Stream.ts, Channel.ts, Sink.ts, internal/stream.ts)

  operation keys in main.ts (contract constants the bundler kept): readFile, writeFile
  record service "effect/FileSystem" in main.ts: absent

  node dist/main.js <file>: backed up 6 bytes of <file>
  node dist/main-stream.js <file>: <file> has 6 bytes

OK: every bundle contains exactly the implementations its program uses, Effect-only roots carry no Stream runtime, and the shaken bundles run
```

The check fails if an unused implementation appears in any bundle, a used one is missing, or a root whose program uses
only Effect operations contains `Stream.ts`, `Channel.ts`, `Sink.ts`, `internal/stream.ts` or `internal/channel.ts`.
(`Pull.ts` is imported by `Queue.ts` and `Schedule.ts`, so every root carries it; it is not evidence either way.) It
then runs the two-operation and the Stream bundles against a temporary file.

Three readings of the numbers. The two-operation root and the twenty-operation root differ by 7.5 kB: the
implementations themselves are small, and the 53 `effect` modules they share are the Effect/Layer/Context core that
any program carries. The record roots cost 443 kB not because of thirty implementations but because three of them
return Streams, which pulls the Stream runtime (24 modules, about 200 kB); the Stream root shows the same jump with a
single implementation. And the contract module costs nothing a root does not use: only the two keys the program
references survive in `main.ts`, and the record service is gone.

## Migrating an existing record service: `effect/FileSystem`

`effect/FileSystem` today exports `interface FileSystem` (the record shape, 32 members), `const FileSystem:
Context.Service<FileSystem, FileSystem>`, `make(impl)` (which derives `exists`, `glob`, `readFileString`, `stream`,
`sink` and `writeFileString` from the primitives), `makeNoop`/`layerNoop`, and the `WatchBackend` service. Providers:
`NodeFileSystem.layer` and `DenoFileSystem.layer`, each `Layer.effect(FileSystem, Effect.map(serviceOption(WatchBackend),
(backend) => make({...}))`, plus `layerNoop` in tests and docs. Consumers: 57 `yield* FileSystem` sites across
`effect` (http, cli, persistence, logger, config, schema), and user code.

The migration has three phases. Each is a PR that is mergeable and verifiable on its own, and nothing in a later phase
is needed for an earlier one to work.

### Phase 1: the contract gains operations, the key becomes the record service

In `packages/effect/src/FileSystem.ts`:

- One `Context.Operation` per member of the interface, exported under the member's name, with the member's signature
  and key `effect/FileSystem/<member>`. `stream` and `watch` use `Stream.Operation`; `sink` uses a `Sink.Operation`
  added to `Sink.ts` with the same five-line recipe over `Sink.unwrap`. `open`, `makeTempDirectoryScoped` and
  `makeTempFileScoped` keep `Scope` in their shapes.
- `export const FileSystem = Context.Operations<FileSystem>()("effect/FileSystem", operations)` replaces
  `Context.Service("effect/FileSystem")`, and `export type FileSystem = Context.Operations.Identifier<typeof operations>`
  replaces the interface as the identity. The record shape becomes `export type Shape = Context.Service.Shape<typeof
  FileSystem>`; the `[TypeId]` brand property on the interface is dropped (nothing reads it).
- `make(impl)` keeps its signature and returns a `Shape`; `makeNoop` and `layerNoop` keep theirs.

What keeps working, unchanged: every `yield* FileSystem` and `FileSystem.use(...)`; every `Layer<FileSystem>` and
`Effect<_, _, FileSystem>` annotation, because the name `FileSystem` still denotes the identity of the whole service;
`Layer.succeed(FileSystem, make(impl))`, `Layer.effect(FileSystem, …)`, `layerNoop({...})` and `Layer.mock(FileSystem,
{...})`, which now write 32 slots instead of one; `NodeFileSystem.layer` and `DenoFileSystem.layer` without a line
changed, which now also satisfy every operation key.

What changes: the 40 places (five files: `NodeFileSystem.ts`, `DenoFileSystem.ts`, `internal/glob.ts`, two in
`tools/graphql-generator`) that use `FileSystem.FileSystem` as the _record type_, as in `FileSystem.FileSystem["access"]`
or `fs: FileSystem.FileSystem`, say `FileSystem.Shape` instead. User code that annotates a value with the record type
makes the same one-word change; user code that only yields, provides or annotates requirements changes nothing.

After phase 1, every consumer that calls `FileSystem.readFile(path)` instead of `(yield* FileSystem).readFile(path)`
has a precise requirement, but no bundle is smaller yet, because the only providers are still the aggregates.

### Phase 2: per-operation implementation modules

In `packages/platform/node-shared` (and `deno`, then `bun` through its re-export): one module per primitive operation,
`src/NodeFileSystem/<op>.ts`, each exporting `Layer.succeed(FileSystem.<op>.service, impl)` built from the function
`NodeFileSystem.ts` already has for that member (`watch` is `Layer.effect` over `serviceOption(WatchBackend)`); a
barrel `src/NodeFileSystem/index.ts` with `export *` so `import * as NodeFileSystem from
"@effect/platform-node-shared/NodeFileSystem"` and `NodeFileSystem.readFile` shake as the prototype's
`main-namespace.ts` does. The derived operations (`exists`, `glob`, `readFileString`, `stream`, `sink`,
`writeFileString`) are platform-independent: `effect/FileSystem` ships each as a layer over the primitives it needs,
for example `layerReadFileString: Layer<"effect/FileSystem/readFileString", never, "effect/FileSystem/readFile">`,
and each platform's module for a derived operation is that layer provided with the platform's primitive.

`NodeFileSystem.layer` keeps its name, type and module: it becomes the merge of the per-operation layers, which is a
`Layer<FileSystem>` by annotation, and lives apart from the barrel so importing one operation does not import thirty.

After phase 2, a program that calls two operations and provides `NodeFileSystem.readFile` and
`NodeFileSystem.writeFile` bundles two implementations, and a program that still provides `NodeFileSystem.layer`
behaves as before.

### Phase 3: consumers inside `effect` call operations

The 57 `yield* FileSystem` sites move to operation calls where they use a few members (`HttpServerResponse.file`,
`HttpStaticServer`, `Logger` file sinks, `ConfigProvider` directory reads), so a user of those modules no longer
requires the whole file system. Sites that genuinely use many members, or hand the record to other code, keep
`yield* FileSystem`. This phase is incremental: each site is its own commit, and nothing depends on it.

### What a user sees at each phase

| User code                                                                                   | Phase 1                 | Phase 2                           |
| ------------------------------------------------------------------------------------------- | ----------------------- | --------------------------------- |
| `yield* FileSystem` + `NodeFileSystem.layer`                                                | unchanged; whole bundle | unchanged; whole bundle           |
| `FileSystem.readFile(p)` + `NodeFileSystem.layer`                                           | compiles; whole bundle  | compiles; whole bundle            |
| `FileSystem.readFile(p)` + `NodeFileSystem.readFile`                                        | not yet available       | two implementations in the bundle |
| test: `Effect.provideService(FileSystem.readFile.service, fake)` on top of any of the above | works                   | works                             |
| test: `FileSystem.layerNoop({ readFile })` / `Layer.mock(FileSystem, {...})`                | unchanged               | unchanged                         |
| `fs: FileSystem.FileSystem` as a record type                                                | `fs: FileSystem.Shape`  |                                   |

## Earlier designs considered

### Service slices: `Context.Only<S, K>`

Keep the record service and let a program depend on, and a layer provide, one member of it. `Only<S, K>` is a subtype
of the service identifier `S` carrying the member name, so `R` can say `Only<FileSystem, "readFile">`; v4's variance
makes a full `Layer<FileSystem>` satisfy every slice, while a slice layer satisfies only its own. At run time each
slice has a derived key (`effect/FileSystem#readFile`), lookup tries the slice key then falls back to the full service
and picks the member, and a slice provided on top of a full service wins. Access is `FileSystem.only("readFile",
"writeFile")`; provision is `Layer.only(FileSystem, "writeFile", impl)`. A forgotten mock is a compile error, which is
the property this spec keeps.

Why it was set aside: it is a type algebra (seven assignability properties to verify, a distributive conditional,
intersection types that print badly in errors) and a second provisioning API (`only`, `Layer.only`, slice keys with a
fallback rule) layered over the record abstraction, when the tree-shaking goal only needs the implementations in
separate bindings. The fallback rule also breaks ordinary precedence: a slice provided outside a full service wins
over it, because lookup order rather than provision order decides. This spec keeps the one thing slices got right,
that a full-service layer must satisfy a member requirement by plain assignability, and gets it from the identity
being a union rather than from a subtype relation. PR #10319 was closed without merging.

### Context-overridable functions: `Context.overridable`

Make each operation a module-level function with a default implementation that a `Context.Reference` can replace.
`Context.overridable("app/processItem", (item) => Effect…)` returns the function itself plus `.reference`; calls look
the reference up when the result runs; `Effect.provideService(fn.reference, fake)` overrides. Values (`Effect`,
`Stream`) are accepted as well as functions returning them. The wrapper is deliberately not a key, because a key is an
Effect and `Effect.andThen` would stop calling it. Stream-returning functions use the `Layer.mock`-style Effect+Stream
hybrid.

Why it was set aside: the default. A forgotten override silently runs the default and nothing shows in `R`; the
default implementation is bundled even when overridden, so a library's "real" operation ships in the bundle that
replaced it; and operations with no universal default (anything platform-specific) have to be written as a default
that itself depends on a lower-level service, which moves the thing tests mock from the public operation down to a
driver. PR #10369 implemented it and is open; this spec keeps its callable-not-key wrapper and replaces the defaulted
`Reference` with a required `Service`.

### Bundler-side property shaking (Rolldown)

A third avenue, explored separately: teach the bundler to drop unused properties from service records by tracking
demand from `Context` lookups to provider object literals. The investigation found Rolldown has no property-level
shaking or value-flow machinery to build on, so the analysis has to be Effect-specific and keyed on service identity;
a plugin proof of concept recovered up to 41% on closed-world programs but bailed out on exported entry points,
Streams, forks, reflection and direct `Context` access, and a native fork handles only the `Layer.effect` plus
`yield* Key` base case so far. It is complementary: it attacks existing record services without changing user code,
at the cost of a bundler fork and a list of bailouts. This spec gives library authors a way to make the guarantee
unconditional for the services they choose to expose per operation.

### The previous round of this design

The first round of this spec had the operation primitive but two things this round removes.

**A call result that was both an Effect and a Stream.** The implementation's result kind was unknown until lookup, so
every call returned a value carrying both type IDs, with the static type saying which side was real. That is a value
that passes `Stream.isStream` while being an Effect, and `Stream.ts` alone has twenty `dual((args) =>
isStream(args[0]))` sites that would read a data-first call as data-last; the same holds for `HttpApiBuilder`'s
streaming-response check and `Atom`'s function/Effect/Stream dispatch. The hybrid existed only to defer a decision the
contract author already makes when writing the shape. Fixing the kind at the definition, with `Stream.Operation` for
Stream shapes, removes the hybrid, removes the Stream shell from `Context.ts`, and makes "no Stream runtime for
Effect-only programs" a property the bundle check can assert.

**A record form joined to the operations by hand.** Record services and operations were distinct keys, bridged by
`Layer.effect(FileSystem, Effect.all({ readFile: readFile.service, … }))` in one direction and
`Layer.effect(readFile.service, Effect.map(FileSystem, (fs) => fs.readFile))` in the other. Every program's `R` listed
every operation it called with no way to name the whole, and no existing record service could move without rewriting
its providers. `Context.Operations` makes the record a key with spread storage, so the two forms share one store and
the bridges disappear, the record's name is a type an author can annotate with, and an existing service migrates by
changing how its key is constructed.

### Alternatives rejected within this design

- **The operation is the key** (one object that is both callable and a `Service`). Best possible ergonomics for
  providing, but a callable that is also an Effect is exactly the first hazard above, and every `Effect | function`
  acceptance site in the library and in user code would type one way and run the other. Rejected.
- **A defaulted variant** (`Operation<Shape>()(key, { defaultValue })` backed by `Reference`). One extra overload,
  zero runtime cost, and it brings back all three reasons overridable was set aside. Rejected; `Context.Reference` and
  `yield*` remain for genuinely defaulted values.
- **The record's identity as a prefix type** (`` `effect/FileSystem/${string}` ``). Prints short and needs no alias,
  but a merge of the thirty operation layers cannot be shown to cover it, so the per-operation form could never
  satisfy a whole-record requirement without a cast or a helper. The union identity has that property for free.
  Rejected.
- **The record's identity as the record interface, with operations as branded subtypes**
  (`"effect/FileSystem/readFile" & FileSystem`). Keeps today's type names with no rename, but has the same merge
  weakness as the prefix type, and a second identity scheme for operations inside records. Rejected in favour of one
  rename (`FileSystem.Shape`).
- **Lookup through the record with a fallback** (an operation reads its own slot, then the record's). Would let
  `Layer.succeed(FileSystem, record)` keep writing one slot, but reintroduces the precedence bug of slices. Rejected;
  spread storage keeps one rule.
- **Inferring the record's identity instead of taking `Self`.** Works, and the class-style `Context.Service` has the
  same two forms, but the inferred union prints as `Identifier<{ thirty operation types }>` in every diagnostic that
  involves the key. One form, with the alias, was kept.
- **Derived call signatures only**, with `op.service.use((f) => f(...))` as the escape hatch for generics. Fully
  general, but it moves the special case to every call site of every generic operation. Naming the key in the shape
  keeps it at the single declaration, and the derivability check makes forgetting impossible. Rejected.
- **Class-style operations** (`class ReadFile extends Context.Operation<…>()("…") {}`). A class cannot be called
  without `new`. Rejected.
- **An identifier type parameter for operations** (`Operation<Self, Shape>`). Two operations with the same shape
  would alias in `R` unless each carried a brand; the key string is already unique and already nominal, and it prints
  better in errors. Rejected.

## Scope

In scope: `Context.Operation`, `Context.Operations` and their types, `Stream.Operation`, `isOperation`,
`isOperations`, the record-service branches in `Context`, tests, JSDoc, a bundle regression test, a changeset, and the
three-phase migration of `effect/FileSystem` with its Node and Deno providers. Out of scope: bundler plugins, migrating
other record services (each follows the `FileSystem` recipe and is its own issue), and the ai-docs example (tracked
separately, since the equivalent example was removed from PR #10369 pending a decision on ai-docs).

## Implementation plan

Six issues. The first two are the primitive; each later one is mergeable and verifiable on its own.

1. **`Context.Operation`, `Context.Operations` and `Stream.Operation`.** The code on this branch in
   `packages/effect/src/Context.ts` and `packages/effect/src/Stream.ts`, moved from spec quality to release quality:
   runtime tests in `packages/effect/test/Context.test.ts`, type tests in `packages/effect/typetest/Context.tst.ts`,
   JSDoc (already in place and passing `pnpm jsdocs --check` and `pnpm doctest`), changeset `effect: minor` with
   `@stability unstable`. Acceptance criteria and test plan below.
2. **Bundle regression test.** An esbuild test in `packages/effect/test` following `test/ai/McpServer/Workerd.test.ts`,
   bundling a fixture like the prototype's `main.ts` and asserting the unused implementation markers are absent, the
   used ones present, and no Stream runtime module is in the output. Keeps both guarantees from regressing.
3. **`effect/FileSystem` phase 1.** Operations for the 32 members, `Sink.Operation`, the record service, the
   `FileSystem.Shape` rename at its 40 use sites, `make`/`makeNoop`/`layerNoop` unchanged in signature. Verified by the
   existing FileSystem, Node and Deno test suites passing unchanged, plus new tests that an operation call runs under
   `NodeFileSystem.layer` and that `Effect.provideService(FileSystem.readFile.service, fake)` overrides one member of
   it.
4. **`effect/FileSystem` phase 2, Node.** Per-operation modules under `NodeFileSystem/`, derived-operation layers in
   `effect/FileSystem`, the aggregate rebuilt as the merge. Verified by the bundle test from issue 2 run against a
   fixture that provides `NodeFileSystem.readFile` and `NodeFileSystem.writeFile`.
5. **`effect/FileSystem` phase 2, Deno and Bun.** The same layout for `DenoFileSystem`; Bun re-exports Node's.
6. **`effect/FileSystem` phase 3.** The `yield* FileSystem` sites inside `effect` that use few members move to
   operation calls, one commit per module, with the module's tests unchanged.

The ai-docs example `ai-docs/src/01_effect/03_services/30_operations.ts` (a contract, one implementation per module, a
root importing two, a test overriding one) is opened only once ai-docs are wanted again.

## Test plan

Runtime tests (`packages/effect/test/Context.test.ts`, `describe("Operation")` and `describe("Operations")`), each
mirrored in the prototype's `test/Operation.test.ts`, which passes (20 tests):

1. An operation is a function named after its key; `isOperation` is true; `Effect.isEffect` and `Context.isKey` are
   false; `isKey(op.service)` is true and `op.service.key` is the key.
2. A call runs the implementation provided for `op.service` with `Layer.succeed`, `Layer.effect` and
   `Effect.provideService`.
3. Running a call whose key is unprovided (types bypassed) dies with `Service not found: <key>`.
4. A single operation is overridden in a test with the innermost provider winning, through `Effect.provide`,
   `Effect.provideService` and `Layer.provideMerge`.
5. One call value run under two providers runs two implementations (lookup at run time), for an Effect operation and
   a Stream operation.
6. A Stream operation runs its implementation and an override through `Stream.runCollect`, and `Stream.map` composes
   on the call result.
7. An Effect operation's call is an Effect and not a Stream; a Stream operation's call is a Stream and not an Effect.
8. `Effect.andThen`, `Effect.tap` and `Effect.flatMap` call an operation passed as their function.
9. The receiver is forwarded to the implementation.
10. A generic shape naming its key runs with its signature.
11. `Effect.fn` implementations work unchanged.
12. A record service is a key with `isOperations` true and `operations` attached.
13. `Layer.succeed(record, value)` provides every member: the per-operation program and the `yield*` program both run
    under it.
14. `yield* record` assembles the record under per-operation layers; with one member unprovided it dies naming the
    member's key.
15. An operation override on top of a record wins for that member, both directly and through the record view; the
    other order has the record win.
16. `Layer.mock(record, partial)` runs the provided member and dies as unimplemented on the others.
17. `Effect.provideService(record, value)`, `Effect.updateService(record, f)`, `Context.make`, `get`, `getOption`,
    `pick` and `omit` behave as in "Existing APIs this touches"; `Context.get` on a missing member throws naming it.
18. A record is stored under its members' keys and never under its own.

Type tests (`packages/effect/typetest/Context.tst.ts`):

1. A call has the shape's parameters and the shape's result with the key added to `R`; `Scope` in the shape stays in
   `R`; a Stream shape returns a Stream.
2. Providing `op.service` removes exactly the key; `Layer.succeed(op.service, impl)` is `Layer<Key>`.
3. An override with a wrong parameter type and an override that adds a requirement are rejected.
4. A shape returning a plain value, a non-function, and a Stream shape given to `Context.Operation`, are rejected.
5. `op` is not assignable to `Effect`; `yield* op` is rejected; `Layer.succeed(op, …)` is rejected.
6. A generic shape naming its key keeps its type parameter; an overloaded shape naming its key keeps both overloads;
   a generic shape whose parameter is only in its parameters is derived; a generic or overloaded shape not naming its
   key, and a shape with properties, are rejected at the definition with the documented messages.
7. A `this` parameter in the shape is part of the call signature.
8. The record's identity is the union of its members' keys; a program using two operations is assignable to an
   `Effect` annotated with it; `Layer<Record>` satisfies a member; a member layer does not satisfy the record; the
   merge of every member layer is a `Layer<Record>` and a merge of some is rejected naming the missing keys; a wrong
   `Self` is rejected naming the expected union; a partial record given to `Layer.succeed` is rejected.
9. Displayed-type tests pin `Operation<"…", (path: string) => Effect<…>>`, `Effect<…, "…">`, `Stream<…, "…">`,
   `Layer<Record, never, never>` and `Type 'Record' is not assignable to type 'never'`.

Doctests: the JSDoc examples for `Context.Operation`, `Context.Operations` and `Stream.Operation` run under
`pnpm doctest` (they do on this branch).

Bundle test (issue 2): fixture root bundled with esbuild; assert each unused implementation marker is absent, each
used one present, no Stream runtime module present, and that the bundle runs.

## Acceptance criteria

- [ ] `Context.Operation`, `Context.Operation<Key, Shape>` with the `Operation` namespace types, `Context.OperationTypeId`,
      `Context.isOperation`, `Context.Operations`, `Context.Operations<Identifier, Ops>` with the `Operations` namespace
      types, `Context.OperationsTypeId` and `Context.isOperations` are exported from `effect/Context`, and
      `Stream.Operation` from `effect/Stream`, with the signatures in "API".
- [ ] An operation is a plain function (`isEffect` false, `isKey` false) whose `name` is its key, carrying
      `OperationTypeId` and `service: Context.Service<Key, Shape>`.
- [ ] A call to an Effect operation is an Effect and not a Stream; a call to a Stream operation is a Stream and not an
      Effect; `Context.ts` has no run-time import of `Stream` or `Channel`, and a bundle of a program using only Effect
      operations contains no Stream runtime module.
- [ ] The implementation is looked up from the running fiber's context each time the call result runs, with the call's
      receiver forwarded.
- [ ] `Operation.KeyFor` accepts a shape that names its key or is derivable, and rejects generic and overloaded shapes
      that do not name their key and shapes with properties, with the messages in "Generic, overloaded and
      property-bearing shapes".
- [ ] A record service is a `Context.Service` whose identity is the union of its members' keys; `Context.make`, `add`,
      `get`, `getOption`, `getOrElse`, `getOrUndefined`, `pick` and `omit` treat it as in "Existing APIs this touches",
      and no other `Context`, `Layer` or `Effect` export changes behaviour.
- [ ] The merge of every member layer is assignable to `Layer<Record>`; `Layer.mock` on a record service dies only on
      the members it lacks.
- [ ] The runtime tests, type tests and doctests in "Test plan" pass; `pnpm check`, `pnpm lint`, `pnpm jsdocs --check`
      and `pnpm circular` are clean.
- [ ] JSDoc on every new export follows the repository conventions, with "Required, not defaulted" and the shape rule
      under **Gotchas**, and `@stability unstable`.
- [ ] Changeset `effect: minor`.
- [ ] PR against `v4/next-minor`.
