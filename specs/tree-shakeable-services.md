# Tree-shakeable services

A program that calls two operations of a fifty-operation service should bundle those two implementations and nothing
else, and a test should still be able to replace one operation. This spec adds one idea to `effect/Context`, at two
granularities. It is normative; the evidence (counts, bundle matrix, full compiler output, compile cost), the
decisions and the rejected alternatives are in [the appendix](./tree-shakeable-services/appendix.md).

The implementation is on this branch: `packages/effect/src/Context.ts`, `Stream.ts`, `Sink.ts`, `FileSystem.ts` and
`Terminal.ts` with their tests, the cost gate in `packages/effect/benchmark/context/`, the Node and Bun providers split
one layer per operation, and a prototype under `specs/tree-shakeable-services/` with a bundle check and error fixtures.

## Summary

```ts
// contract module: keys only, no implementations; each operation and its shape written once
export const readFile = Context.Operation<(path: string) => Effect.Effect<Uint8Array, PlatformError>>()(
  "effect/FileSystem/readFile"
)
export const columns = Context.Operation.value<Effect.Effect<number>>()("effect/Terminal/columns")
export const FileSystem = Context.Operations<FileSystem, Shape>()("effect/FileSystem", members) // "The contract recipe"

// use: call an operation, yield a value operation, or yield the record as today
const bytes = yield* FileSystem.readFile("/etc/hosts") // Effect<Uint8Array, PlatformError, "…/readFile">
const width = yield* Terminal.columns //                  Effect<number, never, "effect/Terminal/columns">
const fs = yield* FileSystem.FileSystem //                Effect<FileSystem.Shape, never, FileSystem>

// provide one operation, or the record (every member); in a test, replace one operation on top of either
Layer.succeed(FileSystem.readFile, (path) => Effect.tryPromise(...)) // Layer<"effect/FileSystem/readFile">
Layer.succeed(FileSystem.FileSystem, record) //                        Layer<FileSystem>
program.pipe(Effect.provideService(FileSystem.readFile, () => Effect.succeed(bytes)))
```

Nothing else is new: providing, overriding, merging, precedence and yielding go through `Context`, `Layer` and
`Effect` as today, with their key parameter widened from `Context.Key` to the new supertype `Context.Slot`. An
operation nobody calls is never imported, so the bundler drops it, and a missing implementation is a compile error
naming its key. A record is literally its members: a write is one ordinary overlay per member, a read is a plain object
assembled from the members' slots, and `lookup`, overlays, flatten and merge are the branch point's code. The price is
stated plainly: a record read is not the provided object, so `instanceof` and identity do not survive it, and a
provided method calling a sibling through `this` reads the instance's member, not an override.

## The problem and the design

A service in Effect is a record, provided whole. A bundler can drop an unused binding or module, and track which members
of a namespace import are read, but cannot delete a property from an object it keeps, so every implementation ships.
Each implementation has to be a binding of its own, the program has to reference only the bindings it uses, and the
types have to say which ones those are, so that a forgotten implementation or test fake does not compile.

Every key is a `Context.Slot`: a string identity, a shape, a position in the context map. A `Context.Key` is a slot
that is also an Effect (what lets `yield* Database` read it). An **operation** is a slot whose implementation is read
when its result runs: a function whose call returns the shape's result with the key in `R`, or, for an Effect shape,
that Effect with the key in `R`. A **record service** (`Context.Operations`) is a key whose shape is the record of its
members' shapes; a member is any slot, and a record's provider writes its members' slots.

### Defining operations

One call form per constructor, curried like `Context.Service<Self, Shape>()("key")`: the shape as the type argument, the
key as the one value argument. The key string is the identity at both levels (the slot at run time, the type in `R`), by
convention `<package>/<Service>/<operation>`. A function in `effect` that accepts "an Effect or a Stream" decides by
looking at the value, and a type argument is erased, so the kind of a call's result is fixed by the constructor:

| Member shape                               | Constructor               | Standalone use                          | In the record                     |
| ------------------------------------------ | ------------------------- | --------------------------------------- | --------------------------------- |
| `(path: string) => Effect<Uint8Array>`     | `Context.Operation`       | `yield* readFile(path)`                 | `fs.readFile(path)`               |
| `Effect<number>`                           | `Context.Operation.value` | `yield* columns`                        | `yield* terminal.columns`         |
| `(path: string) => Stream<Uint8Array>`     | `Stream.Operation`        | `stream(path)`                          | `fs.stream(path)`                 |
| `(…) => Sink<…>`                           | `Sink.Operation`          | `sink(path)`                            | `fs.sink(path)`                   |
| `string`, `(...parts: string[]) => string` | `Context.Service`         | `yield* sep`, `(yield* join)("a", "b")` | `path.sep`, `path.join("a", "b")` |
| a record service                           | `Context.Operations`      | `yield* ReadOnly`                       | `platform.fs.readFile(path)`      |
| a reference                                | `Context.Reference`       | `yield* indent`                         | `path.indent` (default if absent) |

Only a shape that runs later, inside a fiber, can read its implementation then, so a plain value or a synchronous
function stays a `Context.Service`, as does a Stream or Sink _value_ (none exists in `effect`). The three function
constructors reject another kind on the key argument, naming the constructor to use; a non-function shape, or a
function given to `Context.Operation.value`, fails the constraint:

```
typetest/errors/stream-shape.ts(5,88): error TS2345: Argument of type '"test/stream"' is not assignable to parameter of type '"The shape returns a Stream: define it with Stream.Operation"'.
typetest/errors/effect-shape.ts(5,89): error TS2345: Argument of type '"test/readFile"' is not assignable to parameter of type '"The shape returns an Effect: define it with Context.Operation"'.
```

### The contract recipe

The single source of truth: one operation per member with its shape, then four lines for the record.

```ts
export const readFile = Context.Operation<(path: string) => Effect.Effect<Uint8Array, PlatformError>>()(
  "effect/FileSystem/readFile"
)
export const stream = Stream.Operation<(path: string) => Stream.Stream<Uint8Array, PlatformError>>()(
  "effect/FileSystem/stream"
)

const members = { readFile, stream /* … */ } // or a namespace: import * as members from "./operations.ts"
export interface Shape extends Context.Operations.Shape<typeof members>, Context.Operations.Named {}
export type FileSystem = Context.Operations.Identifier<typeof members>
export const FileSystem = Context.Operations<FileSystem, Shape>()("effect/FileSystem", members)
```

- **`Shape`** is an interface so diagnostics print `Shape`; the empty second base `Context.Operations.Named` stops
  TypeScript printing an interface with one base and no own members as `Shape<typeof import(…)>`.
- **`FileSystem`** (the type) is the union of the members' keys, so a merge of all member layers is a
  `Layer<FileSystem>`, and declaring it prints `FileSystem` instead of thirty-two keys.
- **The one-line form**, `Context.Operations("app/Users", { find, create })`, infers shape and identity, for
  application code. In both forms the key exposes its members as properties: `Users.find(id)` is the operation.

The recipe is the floor (appendix F). The constructor checks identity, shape and members against each other, and a
mismatch is a compile error on the key argument; a member named like a property of every key (`use`, `key`,
`members`, `pipe`, `of`, `context`, `useSync`, `toJSON`, `toString`, `Service`, `Identifier`, the type ids:
`Operations.Reserved`) is rejected the same way, and is a defect at run time:

```
typetest/errors/wrong-self.ts(11,82): error TS2345: Argument of type '"test/Partial"' is not assignable to parameter of type '"Self lacks the identifier of \"effect/FileSystem/writeFile\""'.
typetest/errors/wrong-self.ts(19,5): error TS2345: Argument of type '"test/WrongShape"' is not assignable to parameter of type '"Shape is not the members' shape: declare it as interface Shape extends Context.Operations.Shape<typeof members>, Context.Operations.Named {}"'.
typetest/errors/wrong-self.ts(21,45): error TS2345: Argument of type '"test/Unknown"' is not assignable to parameter of type '"Give the record its identifier: Context.Operations<Self, Shape>()(key, members)"'.
typetest/errors/partial-record.ts(6,67): error TS2740: Type '{ readFile: () => Effect.Effect<Uint8Array<ArrayBuffer>, never, never>; }' is missing the following properties from type 'Shape': access, chmod, chown, copy, and 25 more.
```

The relations are plain assignability of unions: `Layer<FileSystem>` satisfies `"effect/FileSystem/readFile"`, a member
layer does not satisfy `FileSystem`, a merge of every member layer does, and `Effect<_, _, "…/readFile">` is assignable
to `Effect<_, _, FileSystem>`. A member record's identity joins the union; a member reference reads its default.

### Subset records

A record over some of another record's members is a record like any other, written with the same recipe:

```ts
const readOnlyMembers = { exists, readFile, stat /* … ten reading operations */ }
export interface ReadOnlyShape extends Context.Operations.Shape<typeof readOnlyMembers>, Context.Operations.Named {}
export type ReadOnly = Context.Operations.Identifier<typeof readOnlyMembers>
export const ReadOnly = Context.Operations<ReadOnly, ReadOnlyShape>()("effect/FileSystem/ReadOnly", readOnlyMembers)

export const sizeOf = (path: string): Effect.Effect<number, PlatformError, FileSystem.ReadOnly> => …
```

By assignability of unions (`typetest/ok/signatures.ts`, `typetest/errors/subset-not-full.ts`): (1) the full record
satisfies the subset (`const a: Layer<ReadOnly> = NodeFileSystem.layer`); (2) so do the member layers merged; (3) it
satisfies each of its members; (4) a program over three of its operations is an `Effect<_, _, ReadOnly>` and runs under
either provider; (5) it does not satisfy the full record, naming the first member it lacks
(`'"effect/FileSystem/access"' is not assignable to type 'ReadOnly'`); (6) it is a key like any record, shadowing the
full one slot by slot. A partial subset prints by name too:

```
typetest/errors/partial-subset.ts(6,59): error TS2739: Type '{ readFile: () => Effect.Effect<Uint8Array<ArrayBuffer>, never, never>; }' is missing the following properties from type 'ReadOnlyShape': exists, stat
```

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

A call has the shape's parameters and result with the key added to `R` (`Scope` stays). An operation is a function, so
`Effect.andThen(getPath, FileSystem.readFile)` calls it, and a slot, so `Effect.service(FileSystem.readFile)` gives the
implementation. The module is the service (`import * as FileSystem`): member access on a namespace import is the one
object-property pattern bundlers shake. For a shorter public type than every operation used, annotate a subset or the
record.

### Providing operations

```ts
export const readFile = Layer.succeed(
  FileSystem.readFile,
  (path) => Effect.tryPromise({ try: () => fs.readFile(path), catch: toPlatformError })
)
export const columns = Layer.succeed(Terminal.columns, Effect.sync(() => process.stdout.columns ?? 80))
// an implementation that needs another service declares it in the layer, never in the shape
export const makeTempDirectoryScoped = Layer.effect(
  FileSystem.makeTempDirectoryScoped,
  Effect.map(Pool, (pool) => (options) => Effect.acquireRelease(pool.mkdtemp(options), pool.rm))
)
```

If the root forgets one, `runPromise` does not compile and the error names the key; the line that matters is the
indented one (TypeScript appends its `exactOptionalPropertyTypes` hint to every `Effect` assignability error):

```
typetest/errors/missing-requirement.ts(5,19): error TS2379: Argument of type 'Effect<number, FileSystemError, "effect/FileSystem/readFile" | "effect/FileSystem/writeFile">' is not assignable to parameter of type 'Effect<number, FileSystemError, never>' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Type '"effect/FileSystem/readFile" | "effect/FileSystem/writeFile"' is not assignable to type 'never'.
    Type '"effect/FileSystem/readFile"' is not assignable to type 'never'.
```

A record program run unprovided prints the record's name (`Type 'FileSystem' is not assignable to type 'never'`); one
_partially_ provided prints the remaining keys in full, because `Exclude` distributes over the union: the price of
letting member layers satisfy the record, mitigated by `FileSystem.ReadOnly` (appendix C). The coarse-grained provider,
the record provided or every member layer merged, is a `Layer<FileSystem>` and bundles everything.

### Overriding one operation in a test

```ts
const fakeRead = Layer.succeed(FileSystem.readFile, () => Effect.succeed(bytes("faked")))
backup("a.txt").pipe(Effect.provide(fakeRead), Effect.provide(live)) // the override is closer, so it wins
backup("a.txt").pipe(Effect.provideService(FileSystem.readFile, () => Effect.succeed(bytes("faked"))))
// the record read sees the override too: (yield* FileSystem.FileSystem).readFile is fakeRead's function
```

`live` may be two member layers or the whole record. A forgotten fake does not compile; an override is the shape, so a
wrong parameter type or an added requirement is rejected too (`wrong-override.ts`, appendix C):

```
typetest/errors/forgotten-override.ts(7,3): error TS2379: Argument of type 'Effect<number, FileSystemError, "effect/FileSystem/writeFile">' is not assignable to parameter of type 'Effect<number, FileSystemError, never>' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Type '"effect/FileSystem/writeFile"' is not assignable to type 'never'.
```

### Required, not defaulted

An operation has no default implementation, by position: a default is bundled with the key, so it ships even in bundles
that override it; platform operations have no universal default (`readFile` on Node, Bun, Deno and a browser are four
implementations, none the default); and a default hides a forgotten override, which runs the default with nothing in
`R`, where without one it is the compile error above. A library that wants "works out of the box" ships a layer.
`Context.Reference` remains for silently replaceable values, and may be a member of a record with its own semantics.

### Generic, overloaded and property-bearing shapes

TypeScript cannot rewrite a generic function type's result without instantiating its type parameters at their
constraints, cannot see past the last overload, and cannot carry a function's properties onto a value. So, at the
definition: a shape whose result already requires the key is the call signature unchanged; otherwise the derived
signature must be as precise as the shape (`Operation.Derivable`) and the shape a bare function.

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

```
typetest/errors/generic-unnamed.ts(7,3): error TS2345: Argument of type '"test/parse"' is not assignable to parameter of type '"The shape of \"test/parse\" is generic or overloaded: its result must require \"test/parse\""'.
typetest/errors/overloaded-unnamed.ts(8,6): error TS2345: Argument of type '"test/format"' is not assignable to parameter of type '"The shape of \"test/format\" is generic or overloaded: its result must require \"test/format\""'.
typetest/errors/shape-with-properties.ts(6,3): error TS2345: Argument of type '"test/double"' is not assignable to parameter of type '"The shape has properties: an operation is a bare function"'.
```

`<A>(value: A) => Effect<void>` derives without loss and is accepted unnamed; `<A>(d: (s: string) => A) => Effect<A>`
does not (`unknown` is not `A`) and must name its key. Call sites are the same either way.

## API

Additions are in `effect/Context`, `effect/Stream` and `effect/Sink` (all `@stability unstable` except `Slot`), and in
the modules under "Migrating". No existing type changes; existing functions are under "Existing APIs this touches".

### `Context.Slot<Identifier, Shape>`

```ts
export interface Slot<out Identifier, out Shape> {
  readonly Service: Shape
  readonly Identifier: Identifier
  readonly key: string
}
export interface Key<out Identifier, out Shape> extends Slot<Identifier, Shape>, Effect<Shape, never, Identifier> {
  readonly [ServiceTypeId]: ServiceTypeId
}
```

The supertype of every key and the key parameter of every key-taking function; `Key` is unchanged and gets its three
fields from it. A slot has no runtime brand (`isKey` tests `ServiceTypeId`, `isOperation` `OperationTypeId`,
`isOperations` `OperationsTypeId`). `Service.Identifier<T>` and `Service.Shape<T>` extract from any slot. Stable.

### `Context.Operation`, `Stream.Operation`, `Sink.Operation`

```ts
// effect/Context
export const Operation: {
  <Shape extends Operation.FunctionSignature>(): <const Id extends string>(
    key: Operation.KeyFor<Id, Shape>
  ) => Operation<Id, Shape>
  readonly value: <Shape extends Operation.EffectValue>() => <const Id extends string>(key: Id) => Operation<Id, Shape>
}
// effect/Stream (effect/Sink: the same with "Sink" and SinkSignature)
export const Operation: <Shape extends Context.Operation.FunctionSignature>() => <const Id extends string>(
  key: Context.Operation.KeyFor<Id, Shape, "Stream">
) => Context.Operation<Id, Shape>
export type Operation<Id extends string, Shape extends Context.Operation.StreamSignature> = Context.Operation<Id, Shape>

export type OperationTypeId = "~effect/Context/Operation"
export const OperationTypeId: OperationTypeId
export const isOperation: (u: unknown) => u is Operation.Any
```

- `Context.Operation<Shape>()(key)` returns a function with `name === key`, own `key`, `OperationTypeId` brand and
  `toJSON`, no `ServiceTypeId` (`isKey` and `isEffect` false). A call returns `withFiber`: when run, it reads the
  implementation from the fiber's context and applies it to the call's receiver and arguments.
- `Context.Operation.value<Shape>()(key)` returns an Effect primitive (an `Effectable`, `typeof` `"object"`) carrying
  the brand and `key`: running it reads the implementation, an Effect, and continues with it. Not callable.
- `Stream.Operation` / `Sink.Operation` return a function whose call is `Stream.unwrap` / `Sink.unwrap` of the
  implementation applied to the receiver and arguments, read from the fiber that pulls it (`isStream` true, `isEffect`
  false). Both use two internals of `Context`, `makeOperation(key, call)` and `applyOperation(op, receiver, args)`, so
  `Context.ts` has no run-time import of `Stream`, `Sink` or `Channel`.

### `Context.Operation<Id, Shape>` and its namespace

```ts
export type Operation<Id extends string, Shape extends Operation.Signature> =
  & Operation.Call<Id, Shape>
  & Slot<Id, Shape>
  & { readonly [OperationTypeId]: OperationTypeId; readonly key: Id }

export declare namespace Operation {
  export type EffectSignature = (...args: any) => Effect<any, any, any>
  export type StreamSignature = (...args: any) => Stream<any, any, any>
  export type SinkSignature = (...args: any) => Sink<any, any, any, any, any>
  export type EffectValue = Effect<any, any, any>
  export type FunctionSignature = EffectSignature | StreamSignature | SinkSignature
  export type Signature = FunctionSignature | EffectValue

  /** The shape when its result requires the key; a derived signature, or the Effect with the key added, otherwise. */
  export type Call<Id extends string, Shape extends Signature> = Shape extends
    (this: infer This, ...args: infer Args) => infer Result ? [Id] extends [Requirements<Result>] ? Shape
    : (this: This, ...args: Args) => Require<Result, Id>
    : Shape extends Effect<infer A, infer E, infer R> ? [Id] extends [R] ? Shape : Effect<A, E, R | Id>
    : never

  export type Requirements<Result> = Result extends Effect<infer _A, infer _E, infer R> ? R
    : Result extends Stream<infer _A, infer _E, infer R> ? R
    : Result extends Sink<infer _A, infer _In, infer _L, infer _E, infer R> ? R
    : never
  export type Require<Result, Id> = Result extends Effect<infer A, infer E, infer R> ? Effect<A, E, R | Id>
    : Result extends Stream<infer A, infer E, infer R> ? Stream<A, E, R | Id>
    : Result extends Sink<infer A, infer In, infer L, infer E, infer R> ? Sink<A, In, L, E, R | Id>
    : never

  /** True when the signature derived by `infer` is assignable back to the shape: nothing was lost deriving it. */
  export type Derivable<Shape extends Signature> = Shape extends
    (this: infer This, ...args: infer Args) => infer Result ?
    [(this: This, ...args: Args) => Result] extends [Shape] ? true
    : false
    : false

  export type ResultKind = "Effect" | "Stream" | "Sink"
  export type KindOf<Result> = Result extends Effect<any, any, any> ? "Effect"
    : Result extends Stream<any, any, any> ? "Stream"
    : Result extends Sink<any, any, any, any, any> ? "Sink"
    : never
  export interface Fix {
    readonly Effect: "The shape returns an Effect: define it with Context.Operation"
    readonly Stream: "The shape returns a Stream: define it with Stream.Operation"
    readonly Sink: "The shape returns a Sink: define it with Sink.Operation"
  }

  /** The key, or the reason the definition is rejected; the key for a shape that is not a function. */
  export type KeyFor<Id extends string, Shape extends Signature, Kind extends ResultKind = "Effect"> = Shape extends
    (...args: any) => infer Result ?
    [keyof Shape] extends [never] ? [KindOf<Result>] extends [Kind] ? [Id] extends [Requirements<Result>] ? Id
        : Derivable<Shape> extends true ? Id
        : `The shape of "${Id}" is generic or overloaded: its result must require "${Id}"`
      : Fix[KindOf<Result>]
    : "The shape has properties: an operation is a bare function"
    : Id

  export interface Any extends Slot<any, any> {
    readonly [OperationTypeId]: OperationTypeId
  }
}
```

`Operation` is an alias because its call signature is conditional on the shape; diagnostics keep the alias name.
`KeyFor` is a string literal type where the definition is rejected, so the message prints as the parameter type.

### `Context.Operations`, its type and namespace

```ts
export const Operations: {
  <const Ops extends Operations.Members>(
    key: Operations.Key<Ops>,
    members: Ops
  ): Operations<Operations.Identifier<Ops>, Operations.Shape<Ops>> & Ops
  <Self, Shape = Types.unassigned>(): <const Ops extends Operations.Members>(
    key: Operations.KeyFor<Self, Shape, Ops>,
    members: Ops
  ) => Operations<Self, Operations.ShapeOf<Shape, Ops>> & Ops
}

export interface Operations<in out Identifier, in out Shape> extends Service<Identifier, Shape> {
  readonly [OperationsTypeId]: OperationsTypeId
  readonly members: { readonly [K in keyof Shape]: Slot<any, Shape[K]> }
}

export declare namespace Operations {
  export interface Members {
    readonly [name: string]: Slot<any, any>
  }
  export type Identifier<Ops extends Members> = { [K in keyof Ops]: Service.Identifier<Ops[K]> }[keyof Ops]
  export type Shape<Ops extends Members> = { readonly [K in keyof Ops]: Service.Shape<Ops[K]> }
  export interface Named {}
  export type Reserved<Ops extends Members> = keyof Ops & keyof Operations<any, any>
  export type Key<Ops extends Members> = [Reserved<Ops>] extends [never] ? string
    : `Member "${Reserved<Ops> & string}" has the name of a property of the key: rename it`
  export type KeyFor<Self, S, Ops extends Members> = unknown extends Self ?
    "Give the record its identifier: Context.Operations<Self, Shape>()(key, members)"
    : [Identifier<Ops>] extends [Self] ? [S] extends [Types.unassigned] ? Key<Ops>
      : [S] extends [Shape<Ops>] ? [Shape<Ops>] extends [S] ? Key<Ops>
        : "Shape is not the members' shape: declare it as interface Shape extends Context.Operations.Shape<typeof members>, Context.Operations.Named {}"
      : "Shape is not the members' shape: declare it as interface Shape extends Context.Operations.Shape<typeof members>, Context.Operations.Named {}"
    : `Self lacks the identifier of "${Exclude<Identifier<Ops>, Self> & string}"`
  export type ShapeOf<S, Ops extends Members> = [S] extends [Types.unassigned] ? Shape<Ops> : S
}

export type OperationsTypeId = "~effect/Context/Operations"
export const OperationsTypeId: OperationsTypeId
export const isOperations: (u: unknown) => u is Operations<any, any>
```

The plain form infers identifier and shape; in the curried form `KeyFor` is `string` when `Self` contains every member's
identifier and `Shape` is mutually assignable with the members' shape, otherwise the message. Both return a plain object
(not a function like other keys) with `ServiceTypeId`, `OperationsTypeId`, `key`, `members`, the members as properties
(on a prototype of the key's own) and the state under "Record storage": a `Service` whose `yield*`, `use` and
`useSync` call the record's own read.

### Existing APIs this touches

| API                                                            | What changes                                                                                                                  |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| The key parameter, `Context.Key<I, S>` → `Context.Slot<I, S>`  | In every key-taking function listed below; `Key` is unchanged                                                                 |
| `Effect.service(key)`                                          | Was `(key) => key`; now reads the key from the fiber's context. Same result for every existing key                            |
| `Layer.updateService(layer, key, f)`                           | Mapped over `key` as an Effect; now maps over `Effect.service(key)`. Same result for every existing key                       |
| `Context.make(key, value)`                                     | A record: a flat map of its members' slots; a member missing from `value` is a defect naming its key                          |
| `Context.add(self, key, value)`, `Effect.provideService`       | A record: one ordinary overlay per member, counting as one addition; a flat map into an empty context or one at `maxDepth`    |
| `Context.get`, `getUnsafe`, `yield* key`, `key.use`, `useSync` | A record: a plain object of the members, or `Service not found: <member key>` for a missing member (reference: its default)   |
| `Context.getOption`, `getOrElse`, `getOrUndefined`             | A record: present when every non-reference member is present, otherwise the fallback                                          |
| `Context.pick(...keys)`, `Context.omit(...keys)`               | A record: every slot it writes. Omitting a member makes the record absent                                                     |
| `Context.addUnsafe`, `getOrUndefinedUnsafe` (string-keyed)     | One slot, by string, always: a member's string is the member; a record's string is no slot of the record                      |
| `Context.merge`, `mergeAll`, flattening, `mapUnsafe`           | Slot by slot, as at the branch point; nothing knows what a record is                                                          |
| `Context.makeUnsafe(map)`                                      | Unchanged; a record is assembled from the map on the first read and remembered for it                                         |
| `Layer.succeed`, `Layer.effect`, `Layer.sync`, `Layer.mock`    | Via `Context.make`: an operation is one slot, a record its members' slots                                                     |
| `Context.isKey`, `isReference`, `isOperation`, `isOperations`  | `isKey(op)` false, `isOperation(op)` true; `isKey(record)` and `isOperations(record)` true; `isReference` false for all three |

Widened: `Context.make`, `add`, `addOrOmit`, `get`, `getUnsafe`, `getOption`, `getOrElse`, `getOrUndefined`, `pick`,
`omit`, `isReference`; `Effect.service`, `serviceOption`, `serviceOptional`, `provideService`,
`provideServiceEffect`, `updateService`; `Layer.succeed`, `sync`, `effect`, `mock`, `updateService`;
`Stream.service`, `serviceOption`, `provideService`, `provideServiceEffect`, `updateService`;
`Sink.provideService`; `Channel.provideService`, `provideServiceEffect`, `updateService`. A parameter widened to a
supertype accepts every call it accepted before.

`Key` itself does not change, because it is stable and is an Effect (appendix F). `Context.ts` gains type-only imports
of `Stream` and `Sink`; `Sink.ts` imports `Context` as a value, as `Stream.ts` already does; `pnpm circular` is clean.

## Runtime semantics

| Rule                   | Behaviour                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lookup timing          | The implementation is read from the running fiber's context each time the call result (or value operation) runs; not at the call, not at construction. One call value run under two providers runs two implementations, Streams included, so an override applies to calls built before it.                                                                                                                                                                                                                                                                             |
| Missing implementation | The types prevent it. With the types bypassed, the read dies with the existing `Service not found: <key>` when the result runs, naming the member key for a record.                                                                                                                                                                                                                                                                                                                                                                                                    |
| Identity               | Every key reads and writes the slot named by its string, whatever its kind: a second `Context.Operation`, a `Context.Service` or `addUnsafe` with `"effect/FileSystem/readFile"` is that member, seen by `yield* FileSystem`. A record's own string is no slot of the record: `addUnsafe(ctx, "effect/FileSystem", x)` fills one slot of its own and provides no member; `getOrUndefinedUnsafe(ctx, "effect/FileSystem")` after a record write is `undefined`. A record constructed again under its string with the same members reads and writes what the first does. |
| Precedence             | Ordinary `Context` precedence, slot by slot: the provider closest to the call wins, for every mix of member layers, record writes and flat maps. A member provided inside a record wins for that member and the record read has it; the other order has the record win.                                                                                                                                                                                                                                                                                                |
| Lifecycle              | No registry. The only memory outside a context is each record key's `WeakMap` keyed by storages, emptied by the collector with them. Two copies of `effect` read and write each other's slots (keys are strings; a record is recognised by its string-valued `OperationsTypeId`).                                                                                                                                                                                                                                                                                      |

### Record storage

A context is the branch point's: a flat base map and a chain of overlays `{ key, value, parent }` read by `lookup`,
none of which knows what a record is. `make`, `add`, `pick`, `omit` and the getters test the key with one `typeof` (a
record key is the one key that is a plain object) and send a record to its prototype's methods. A record key holds:

| Piece     | Mutability                       | Holds                                                                                                                                                                                                                                                                                         |
| --------- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `~layout` | immutable, fixed at construction | `members`: `[{ name, key, positions }]` in declaration order; `slotList`: every slot written, a member record's included; `index`: the same as a `Set`; `plain`: slot → member name for non-record members; `template`: every member name → `undefined`, so assembled objects share one shape |
| `~cache`  | the one mutable piece            | `views`: `WeakMap` storage → assembled object; `storage`/`view`: a one-entry cache in front of it; `cached`/`cachedAt`: whether one of the slots is fiber-cached, as of `cacheKeys.size`                                                                                                      |

```
write(context, value):                       // Context.make, Context.add, Effect.provideService, Layer.succeed
  members = collect(value)                   // { ...template }, each member read once, now; present iff name in value
                                             // (undefined is a member); a prototype method bound to value; absent:
                                             // defect "Service not found: <member key> (the object provided for
                                             // <record key> has no member "<name>")"
  if context is empty or at maxDepth: one flat map = context's slots + one entry per slot     // as addUnsafe does
  else: one ordinary overlay { key: slot, value, parent } per slot, depth + 1                 // nothing copied
  new cache root if cache.cached (a slot is fiber-cached; recomputed when cacheKeys.size moves past cachedAt)
  remember(storage created, members)         // the flat map, or the topmost new overlay

read(context):                               // Context.get, yield*, use, useSync, getOption, …
  storage = the topmost overlay whose key is in index, else the base map
  if storage is cache.storage: return cache.view                                 // one-entry cache
  if views has storage: return it (and put it in the one-entry cache)            // WeakMap
  if storage is an overlay of a plain member and read(below it) is found:
    return remember(storage, { ...below, [name]: overlay.value })                // an override: one copy
  return remember(storage, build(storage))   // a missing member: notFound (or the defect), nothing remembered

build(storage):  { ...template } with each member read from its slot, storage down (a record member: read of it);
                 a missing reference reads its default; any other missing member is notFound / Service not found
remember(storage, object): views.set(storage, object); cache.storage = storage; cache.view = object
```

Invariants, each pinned by a test:

1. A context holds only the slots written into it; a record write is one ordinary overlay per slot, or one flat map,
   and performs no `Map` operation into a non-empty context; a member override is an overlay like any other.
2. A record is its members: it has no slot of its own, a read returns only the members' slots, and a record is present
   exactly when every member is (`in`, not `!== undefined`: a member whose value is `undefined` is present).
3. A record read is a plain object with every member as its own enumerable property, in the record's order. Every
   object a read returns is remembered under its storage, an override's copy included, so every read of one storage
   returns the same object, also when reads of two override contexts alternate; the same slots read through overlays
   and through a flat map give the same keys, order and values. Its price is one `WeakMap.set` per new override read
   ("Cost").
4. Precedence is ordinary `Context` precedence, slot by slot.
5. Nothing outside the record key and the contexts it reads is written: no registry, no flag on `Context`, no field on
   overlays; the ordinary path is the branch point's code behind one `typeof`.

## Cost

The gate is `pnpm --filter tree-shakeable-services-spec bench:check`: counts (`counts.ts --check`, load-insensitive,
the CI gate), then timing without records (`operations.ts --ordinary`) and with them (`operations.ts`), each in three
pair orders against the branch point's `Context.ts` in the same process. An order is readable when its A/A control
envelope is within 1.05. A mode is decided only when all three orders are readable, and is **INCONCLUSIVE** otherwise:
printed, neither passing nor failing. When decided, a gated pair passes when the median of its three per-order medians
is within its limit plus the largest envelope, that is when two of three orders are; every order in which a row is
over its limit prints a **WARNING**. The twin, the method and the pasted runs are in appendix A.

**Status of the timing gate.** No run on the reference machine (a shared host) has yet decided a timing mode: in two
full runs, 2 and 0 of 3 orders were readable without records, and 2 of 3 with them. The counts gate held in both.
The timing readings below are therefore the range over the readable orders of those two runs. They show where each
row sits; they are not a pass. A row over its limit in a readable order is named.

| Gate               | Measure                                                                                                                            | Limit / count                                                                                                                                                                                                                    | Reading                                                                         |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| counts (CI)        | every ordinary-key operation (8 rows: reads, `add`, `make`, `mergeAll`)                                                            | the branch point's Map/Set operations; no more bytes under 1 KB                                                                                                                                                                  | identical                                                                       |
| counts (CI)        | record write (32 members) into 33 slots / into 300                                                                                 | Weak.set 1; 2,216 B both                                                                                                                                                                                                         | as stated                                                                       |
| counts (CI)        | `make`, record                                                                                                                     | Map.set 32, Weak.set 1; 2,632 B                                                                                                                                                                                                  | as stated                                                                       |
| counts (CI)        | member read through a record's overlays                                                                                            | nothing; 0 B                                                                                                                                                                                                                     | as stated                                                                       |
| counts (CI)        | record read: same flat context / through one overlay or its own / member overridden underneath                                     | 0 / Set.has 1 / Set.has 2; 0 B                                                                                                                                                                                                   | as stated                                                                       |
| counts (CI)        | add member override into a context holding the record                                                                              | Set.has 1; 144 B                                                                                                                                                                                                                 | as stated                                                                       |
| counts (CI)        | add member override then record read, per request                                                                                  | Map.get 1, Set.has 1, Weak.get 2, Weak.set 1; 312 B                                                                                                                                                                              | as stated                                                                       |
| counts (CI)        | record read, two override contexts read alternately                                                                                | Set.has 2, Weak.get 2; 0 B                                                                                                                                                                                                       | as stated                                                                       |
| counts (CI)        | record never written: first read of a storage / later read                                                                         | Map.get 1, Set.has 1, Weak.get 2, Weak.set 1, 312 B / nothing                                                                                                                                                                    | as stated                                                                       |
| timing, no records | ordinary rows (7: reads, reference default, `add`, add+read, `mergeAll`)                                                           | ≤ 1.05× branch point                                                                                                                                                                                                             | 0.97–1.10                                                                       |
| timing, records    | ordinary rows: reads, reference default, add then read, `mergeAll` (5) / plain `add` (2)                                           | ≤ 1.10× / ≤ 1.25× the pristine twin, a copy of this branch's `Context.ts` warmed like the live module and given the fiber runtime's contexts (identical code reads 1.0 to 1.33 by order in `add`); vs branch point reported only | twin 0.87–1.05 (`mergeAll` 1.34 in order 2) / 0.97–1.27; branch point 1.00–1.35 |
| timing, records    | member override add                                                                                                                | ≤ 1.25× ordinary add                                                                                                                                                                                                             | 1.01 (orders 0, 2); 2.20, 2.75 in order 1                                       |
| timing, records    | record read, same context / rebuilt per request / overridden underneath / from member layers                                       | ≤ 1.25 / 1.5 / 1.5 / 1.5× ordinary read                                                                                                                                                                                          | 0.78–0.80 / 0.98–1.06 / 1.09–1.23 / 1.00–1.04 (1.69 in order 0)                 |
| timing, records    | new override then record read, per request                                                                                         | ≤ 10× ordinary add then read (one copy and one `WeakMap.set`; the price of invariant 3)                                                                                                                                          | 4.36–14.96 by order; run medians 9.16, 8.05                                     |
| timing, records    | record write, into 33 and into 300 slots                                                                                           | ≤ 2 ordinary writes per member; 300/33 ≤ 1.15; ≤ 1.25× `mergeAll` of 33                                                                                                                                                          | 48.9–60.2 / 42.5–57.8; 0.95–1.00; 1.09–1.20                                     |
| timing, records    | `yield*` record vs plain: same / rebuilt / overridden underneath / override per request / whole record per request / member layers | ≤ 1.25 / 1.5 / 1.5 / 3 / 5 / 1.5×                                                                                                                                                                                                | 1.03–1.13 / 1.00–1.04 / 1.05–1.08 / 1.59–1.88 / 3.80–4.33 / 1.03–1.17           |
| timing, records    | operation call vs method on a yielded plain record; method on record read vs plain                                                 | ≤ 1.0×; ≤ 1.25×                                                                                                                                                                                                                  | 0.80–0.86; 1.00–1.03                                                            |
| bundle             | no-record bundle, `Context.ts` over branch point (minified)                                                                        | ≤ 512 B                                                                                                                                                                                                                          | 275 B                                                                           |
| compile            | `tsc --extendedDiagnostics`, `packages/effect`                                                                                     | about 1 % (reported)                                                                                                                                                                                                             | +0.87 % types, +0.91 % instantiations                                           |

## Hazards, and what the design does about each

| Hazard                                                      | What the design does                                                                                                                                                                                                                                                                                                                                                                                   |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Callables that are also Effects                             | Would type as a call in `Effect.andThen(x, op)` (function overload first) and run as an Effect (`isEffect` checked first). A function operation is a `Slot`, not a `Key`: `isEffect` and `isKey` false, so `Effect.andThen`, `tap` and `flatMap` call it and `Layer.succeed(op, impl)` provides it; a value operation is an Effect (`isEffect(columns)` true), so they run it, and it is not callable. |
| `isEffect`-dispatching duals                                | Every `dual` with an `isEffect(args[0])` predicate (39 sites in `internal/effect.ts`, `Effect.ts`, `Console.ts`, `Runtime.ts`, `http/HttpServer.ts`, `internal/layer.ts`, `internal/executionPlan.ts`) sees a function; `Effect.map(op, f)` and `yield* op` are type errors (appendix C).                                                                                                              |
| Stream-returning operations                                 | A call result is one kind, fixed by the constructor, so the 35 `isStream` sites in `Stream.ts` and the checks in `HttpApiBuilder.ts`, `HttpApiClient.ts`, `reactivity/Atom.ts`, `http/Template.ts`, `cluster/Entity.ts` and the child-process spawners cannot misclassify it; a Stream shape given to `Context.Operation` is the error naming `Stream.Operation`.                                      |
| Receivers                                                   | `op` forwards its `this`: a shape declaring `this` keeps it in the call signature, otherwise it is `this: unknown`, ignored. A class instance's prototype methods are bound to it at the write (private fields work); a sibling call through `this` reads the instance's member in every form. Tested.                                                                                                 |
| Function properties                                         | Rejected at the definition, so a type never promises a property the value lacks: `op` has `key`, `name`, `length`, `toJSON` and the brand, nothing else; a value beside a function is a separate key, which may sit in the same record.                                                                                                                                                                |
| Identity and `instanceof`                                   | A record read is never the provided object: `instanceof`, `===` and non-member properties do not survive it, and nothing in the repository relied on them; code that needs the instance keeps it as a separate key. Every member is an own enumerable property, so `Object.keys`, `JSON.stringify` and spread list them, overrides in place.                                                           |
| A partial record                                            | Rejected against `Shape` (pasted above); with types bypassed, the write's defect names the member, where the layer is built. `Layer.mock` is the partial convenience and dies on what it lacks (`effect/FileSystem: Unimplemented method "stat"`); `FileSystem.makeNoop({})` is complete.                                                                                                              |
| Key collisions, string-keyed access, two copies of `effect` | One string is one slot ("Identity" under "Runtime semantics"), so code reaching in by string cannot make a record disagree with its members; the `<package>/<Service>/<operation>` convention keeps keys unique; a subset shares its members' keys on purpose.                                                                                                                                         |
| Mutation after the fact                                     | A map mutated after `makeUnsafe` is read live by member reads while a record already assembled for it stays as it was (pinned); a provided object is read once, at the write.                                                                                                                                                                                                                          |
| Misuse that does not compile                                | `Terminal.columns()`: `This expression is not callable`; `Context.Operation("key")`: `Expected 0 arguments, but got 1`.                                                                                                                                                                                                                                                                                |
| Requirement unions written as type aliases                  | The codemod cannot tell `type Env = FileSystem.FileSystem \| Path.Path` from a value type and rewrites it; two such aliases in the repository were restored by hand; users review the codemod's diff.                                                                                                                                                                                                  |

## Tree-shaking

Three ordinary requirements: one implementation per top-level export in a side-effect-free module; a composition root
that imports implementation modules, or reads members off their namespace, and never an aggregate unless it wants
everything; aggregates (`Layer.mergeAll(...)`) in their own module or `/* @__PURE__ */`-annotated. The types enforce the
half that matters: `R` names what to import. A key the bundler keeps costs about 4 kB for an unannotated thirty-key
contract and nothing once published.

The prototype's `pnpm --filter tree-shakeable-services-spec bundle` builds nine composition roots and fails if an unused
implementation appears, a used one is missing, or the no-record root is more than 512 bytes over the branch point,
minified. `packages/effect/test/FileSystem/treeShaking.test.ts` bundles the real modules with `effect` as published
(fixtures in `packages/effect/test/fixtures/tree-shaking/`): `NodeFileSystem.readFile` plus `writeFile` is 39,939 bytes
minified (91,152 unminified), those two modules and `shared` with no Stream runtime, against 76,829 (179,138) for
`NodeFileSystem.layer`: 52 %, asserted under 60 %. Through `@effect/platform-node` or `@effect/platform-bun` it is
39,959; the fixture contract's two-of-thirty root is 39,579 (89,767). Appendix B has the matrix.

## Migrating `effect/FileSystem` and `effect/Terminal`

Both modules are `@stability unstable`, and `MIGRATION.md` lets a minor change their identity, so the identity change
ships in one release with the codemod and the subset record. All of the following is on this branch.

**Contracts.** `packages/effect/src/FileSystem.ts`: one operation per member with its shape and documentation (`stream`
and `watch` by `Stream.Operation`, `sink` by `Sink.Operation`; the scoped ones keep `Scope`), the record and
`ReadOnly` (ten reading operations) by the recipe; `make`, `makeNoop` and `layerNoop` unchanged but for the `Shape`
type and the removed `[TypeId]` brand, which nothing read. The six derived operations get public layers
over the primitives they use: `layerExists` (requires `access`), `layerGlob` (`readDirectoryEntries | stat |
readLink`), `layerReadFileString` (`readFile`), `layerWriteFileString` (`writeFile`), `layerStream` and `layerSink`
(`open`). `packages/effect/src/Terminal.ts` is the same with five value operations and one function operation; its
shape does not change, so `NodeTerminal.make`, `Terminal.make({...})` and the ten `yield* terminal.columns` sites in
`cli/Prompt.ts` changed only by the codemod, and `yield* Terminal.columns` works under any `Layer<Terminal>`.

**Providers.** `@effect/platform-node-shared`'s `NodeFileSystem.ts` is split into `src/internal/fileSystem/` (32
operation modules, `shared.ts`, `layer.ts`; appendix E) and exports the 32 layers by member name plus `layer`, their
merge, unchanged; `@effect/platform-node`'s `NodeFileSystem` and `BunFileSystem` re-export all 33.

**What changes for users.** The _type_ `FileSystem.FileSystem` becomes the union of 32 key literals; code that used it
as a value type says `FileSystem.Shape` (the codemod); `yield* FileSystem` returns an object of the members. Every
requirement position, `yield* FileSystem`, `Layer.succeed(FileSystem, make(impl))` and `Layer.mock` stays as it is.

**Codemod**, `scripts/codemods/record-shape.ts` with `pnpm codemod:shape [--module FileSystem|Terminal] <paths>`: a
`jscodeshift` transform rewriting `FileSystem.FileSystem` to `FileSystem.Shape` in type positions, except type arguments
of `Effect`, `Layer`, `Stream`, `Sink`, `Channel`, `Context` and `Effect.fn.Return`; it does not write the recipe. Over
`packages` and `tools` it rewrote 56 sites in 11 files; two requirement-union aliases ("Hazards") and four platform
`Terminal` re-exports were restored by hand. `test/cli/services/MockTerminal.ts` became its own service whose layer
also provides the terminal record; `test/http/HttpPlatform.test.ts` provides `FileSystem.makeNoop({})`, not `{} as any`.

| User code                                                                          | This branch                       | After issues 10 to 12               |
| ---------------------------------------------------------------------------------- | --------------------------------- | ----------------------------------- |
| `yield* FileSystem` or `FileSystem.readFile(p)`, + `NodeFileSystem.layer`          | compiles; whole bundle            | compiles; whole bundle              |
| `FileSystem.readFile(p)` + `NodeFileSystem.readFile` (or `BunFileSystem.readFile`) | two implementations in the bundle | two implementations in the bundle   |
| `HttpServerResponse.file` + `NodeFileSystem.layer`                                 | whole bundle                      | compiles; member layers now suffice |
| `fs: FileSystem.FileSystem` as a record type                                       | `fs: FileSystem.Shape` (codemod)  |                                     |
| a CLI that displays without prompting, + `NodeTerminal.layer`                      | whole terminal                    | `display` alone                     |

## Earlier designs considered

**Service slices: `Context.Only<S, K>`.** Keep the record service and let a program depend on, and a layer provide, one
member of it. `Only<S, K>` is a subtype of the identifier `S` carrying the member name, so a full `Layer<FileSystem>`
satisfies every slice by variance; each slice has a derived key (`effect/FileSystem#readFile`) that lookup tries before
the full service, read by `FileSystem.only("readFile")` and provided by `Layer.only(FileSystem, "writeFile", impl)`.
Set aside: it is a type algebra (seven assignability properties, a distributive conditional, badly printing
intersections) and a second provisioning API, and its fallback breaks precedence (a slice provided outside a full
service wins over it). Kept from it: a forgotten mock is a compile error, and a full layer satisfies a member
requirement by plain assignability, here because the identity is a union. PR #10319 was closed.

**Context-overridable functions: `Context.overridable`.** Each operation is a module-level function with a default
implementation that a `Context.Reference` can replace: `Context.overridable("app/processItem", (item) => …)` returns the
function plus `.reference`, a call looks the reference up when its result runs, and `Effect.provideService(fn.reference,
fake)` overrides. Set aside because of the default ("Required, not defaulted"): platform operations with no universal
default would be written against a lower-level driver, which moves what tests mock. PR #10369 is open; this spec keeps
its callable wrapper, makes the wrapper the key itself, and replaces the defaulted `Reference` with a required slot.

## Scope

In scope: everything under "API" and "Migrating", with its tests, JSDoc, cost gate, bundle test, changesets and codemod.
Out of scope: the Deno provider (`packages/platform/deno/src/DenoFileSystem.ts` is untouched and still provides the
record whole; appendix E), bundler plugins (appendix G), other record services (each follows the recipe; `Path`,
fifteen small synchronous functions over one implementation, is not worth one) and the ai-docs example.

## Implementation plan

Twelve issues, each a PR against `v4/next-minor`. The checklist under each is its acceptance, ready to paste, and
implies `pnpm check`, `lint`, `circular`, `jsdocs --check` and every existing suite clean; issues 1 to 9 are on this
branch, to be cut at the seams named; R<n> and T<n> are the numbered runtime and type tests under "Test plan".

1. **`Context.Slot` and the widening**: every parameter under "Existing APIs this touches".
   - [ ] R35, T2; every existing test passes unchanged; `Effect.service` and `Layer.updateService` return as before.
   - [ ] The ordinary rows of the counts gate are identical to the branch point.
   - [ ] Changeset `effect: minor` names `Context.Slot`, the widened parameters and the recipe.
2. **`Context.Operation`**: constructor, type and namespace, `OperationTypeId`, `isOperation`, `makeOperation`,
   `applyOperation`.
   - [ ] R1 to R5, R7, R8; T1, T3 to T7, T13; the definition messages print as pasted.
   - [ ] JSDoc **Gotchas**: "Required, not defaulted", the shape rule, an Effect member uses `.value`.
   - [ ] `@stability unstable` on every new export.
3. **`Context.Operation.value`, `Stream.Operation`, `Sink.Operation`.**
   - [ ] R6, R9, R29, R30; T1, T8, T9.
   - [ ] `Context.ts` has no run-time import of `Stream`, `Sink` or `Channel`; `pnpm circular` clean.
4. **Records: key, storage, write and read**: both forms, the namespace with `Named`, `OperationsTypeId`,
   `isOperations`, `~layout` and `~cache`, the `typeof` dispatch, `write`, `read`, `build`, `remember`.
   - [ ] R10 to R17, R20, R21, R24, R25, R27; T10 to T12; invariants 1 to 5 under "Record storage" hold.
   - [ ] The counts gate's record rows equal "Cost"; each timing mode passes or prints INCONCLUSIVE.
   - [ ] `partial-record` prints `Shape` as pasted; the prototype's bundle check passes (no-record root ≤ 512 B).
   - [ ] JSDoc **Gotchas**: "a record read is an object of the members, not the provided object".
5. **Records: provided objects, class instances, the key's members**: `collect`, `Layer.mock`'s proxy, `Reserved`.
   - [ ] R10, R17, R18, R19, R26; T10.
   - [ ] A method reading a private field runs standalone, through the record and through a spread copy.
6. **Records: `pick`/`omit`, strings, nested, subset and reference members.**
   - [ ] R22, R23, R28, R31 to R34; T12.
   - [ ] `getOrUndefinedUnsafe(ctx, record.key)` is `undefined` after a record write.
7. **`effect/FileSystem` and `effect/Terminal` contracts**, `ReadOnly`, the codemod, `MockTerminal`.
   - [ ] `FileSystem.test.ts` (21 tests), `Terminal.test.ts` (5) and `typetest/FileSystem.tst.ts` (T14) pass.
   - [ ] `pnpm check` over every package is clean after `pnpm codemod:shape`, which rewrites type positions only.
   - [ ] `Shape` and `ReadOnlyShape` are written by the recipe, with `Context.Operations.Named`.
   - [ ] `tsc --extendedDiagnostics` on `packages/effect` grows by about 1 % in types and instantiations.
   - [ ] Changesets `filesystem-operations.md` and `terminal-operations.md`, marked **Breaking**.
8. **`effect/FileSystem` derived-operation layers**: `layerExists`, `layerGlob`, `layerReadFileString`,
   `layerStream`, `layerSink`, `layerWriteFileString`.
   - [ ] Each requires exactly the primitives listed under "Migrating".
   - [ ] "a derived operation's layer provides the primitive it is derived from" passes.
9. **Node and Bun providers, one layer per operation; the bundle test.**
   - [ ] `NodeFileSystem.test.ts` (127 tests) passes, with the test that `layer` equals the merge of the operation layers.
   - [ ] `treeShaking.test.ts` (10 tests) passes: the two-operation bundle is under 0.6 × the aggregate.
   - [ ] `NodeFileSystem` (three packages) and `BunFileSystem` have 33 `export const` each; export maps unchanged.
   - [ ] Changeset `node-filesystem-operations.md` (patch).
10. **`effect/FileSystem` consumers** (appendix E): `yield* FileSystem` sites inside `effect` that use few members
    move to calls or a subset, one commit per module, tests unchanged.
    - [ ] A fixture using `HttpServerResponse.file` with member layers only compiles and carries those members.
11. **`effect/Terminal` providers** (appendix E): `NodeTerminal` one module per member over an internal `Input`.
    - [ ] The Terminal and cli suites pass; a fixture that displays without reading carries `display` alone.
12. **`effect/Terminal` consumers**: `Terminal.Interactive` and the `cli/Prompt.ts` sites.
    - [ ] The cli suites pass; `Prompt` programs name `Terminal.Interactive` as their requirement.

## Test plan

Runtime: `packages/effect/test/Context.test.ts`, `describe("Operation")` (35 of the file's 55 tests), mirrored by the
prototype's `test/Operation.test.ts` (42 tests). In the file's order:

1. An operation is a function named after its key, a slot and not a key, not an Effect.
2. A call runs the implementation from `Layer.succeed`, `Layer.effect` or `Effect.provideService`; innermost wins.
3. `Context.make`, `get`, `getOption`, `getOrUndefined`, `pick`, `omit`, `Effect.service` treat it as one slot.
4. A call whose key is unprovided (types bypassed) dies with `Service not found: <key>`.
5. One call value run under two providers runs two implementations, Effect and Stream.
6. An Effect, Stream or Sink operation's call is exactly that kind and runs through its runner.
7. `Effect.andThen`, `tap` and `flatMap` call an operation given as their function; the receiver is forwarded.
8. A generic shape naming its key runs with its signature; `Effect.fn` implementations work.
9. An operation of no arguments reads the same standalone and through a record.
10. A record is a key with `members` and the members as properties; a reserved name is a defect.
11. A record layer writes one slot per member, none for its string; the read is a plain object, not the one provided.
12. `yield* record` assembles under member layers; one missing dies naming its key; `getOption` and friends: absent.
13. An override wins for its member, directly and through the read; the other order has the record win; `Layer.mock`.
14. `Effect.updateService`, `getOption`, `pick`, `omit` as in "Existing APIs"; omitting a member: record absent.
15. One object per storage, shared by contexts derived by unrelated writes; overlays and flat maps agree; `merge`.
16. Reads of two override contexts, alternating, return one object per storage.
17. A member whose value is `undefined` is a member, in a flat map and through overlays; `getOption` is `Some`.
18. A prototype method is bound to its instance; a sibling call via `this` reads the instance; `Layer.mock`'s proxy.
19. A class with private fields works after one member is overridden: through the read, standalone, spread.
20. A record added to 1 slot and to 300 is one overlay per member, one addition; empty or at `maxDepth`, a flat map.
21. The `makeUnsafe` map is the storage: a slot changed behind it is read by the member, not by an assembled record.
22. A service, a reference (default from member layers) and a record are members; `omit` of the outer removes all.
23. A subset is satisfied by the full record and by member layers, and shadows it slot by slot in both orders.
24. A record never written has no slot, is assembled once per storage, and again where a member changed.
25. Members provided as separate overlays assemble in every mix of overlays, flat maps, records, subsets and fibers.
26. A record read spreads, copies and re-provides (`updateService` with a spread, `Layer.effect` over `Effect.map`).
27. A record provided without a member, or as `null`, is a defect naming it (`make`, `add`, `Layer.succeed`/`effect`).
28. A context's behaviour depends only on its slots, not on which records exist or when they were built.
29. A value operation is an Effect and a slot, not a function and not a key.
30. A value operation yielded runs its Effect; through the record the member is that Effect; overrides seen both ways.
31. A second operation object with a member's string is that member, seen by the record read.
32. A `Context.Service` with a member's string is that member; with the record's string, a slot of its own.
33. A record constructed again under its string reads and writes what the first does.
34. `addUnsafe` with a member's string is that member; with the record's string, a slot the record never reads.
35. A key built structurally (`{ key } as Context.Service<…>`) has one-slot semantics.

Types: `packages/effect/typetest/Context.tst.ts` (13) and `FileSystem.tst.ts` (3); the diagnostics' text is pinned by
the prototype's `check-errors` over its 19 fixtures.

1. A call: the shape's parameters, its result with the key in `R`; `Scope` stays; Stream and Sink shapes keep kind.
2. An operation is a `Slot`, not a `Key` or `Effect`; `Layer.succeed(op, impl)` is `Layer<Id>`; a `Key` is an Effect.
3. An override with a wrong parameter type, or an added requirement, is rejected.
4. A non-Effect result, a non-function or an Effect value is rejected by `Context.Operation`; a function by `.value`.
5. `op` is not an `Effect`; `yield* op` and `Context.Operation("key")` are rejected.
6. Generic and overloaded shapes naming their key keep their signatures; a derivable generic is accepted unnamed.
7. A `this` parameter in the shape is part of the call signature.
8. `KeyFor` is the kind message for another kind, the key for its own, the documented message otherwise.
9. A value operation is `Effect<A, E, Id>` and `Slot<Id, Effect<A, E>>`, not a `Key`; `Layer.succeed` takes no function.
10. A record's identity is the union of its members'; its key is `Operations<Id, Shape> & Ops`; the messages as pasted.
11. The plain form infers identifier and shape; a wider identifier is accepted; a `Pick` of the shape is a subset shape.
12. Subset facts 1 to 6; a nested record's identity is the union of its members'.
13. Displayed types: `Operation<"…", …>`, `Effect<…, "…">`, `Layer<Record>`, `Shape`, `This expression is not callable`.
14. `FileSystem.FileSystem` is 32 keys, its shape `Shape`; a partial layer is not a `Layer<FileSystem>`; `ReadOnly`.

Migration and providers: `packages/effect/test/FileSystem.test.ts` (21), `test/Terminal.test.ts` (5),
`packages/platform/node-shared/test/NodeFileSystem.test.ts` (127) and
`packages/effect/test/FileSystem/treeShaking.test.ts` (10); doctests for every new export; the prototype's `bench:check`, `check-errors` and `bundle`.
