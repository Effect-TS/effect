# Tree-shakeable services

A program that calls two operations of a fifty-operation service should bundle those two implementations and nothing
else, and a test should still be able to replace one operation. This spec adds one idea to `effect/Context`, at two
granularities. It is normative; the evidence (counts, bundle matrix, full compiler output, compile cost), the
decisions and the rejected alternatives are in [the appendix](./tree-shakeable-services/appendix.md).

The implementation is on this branch: `packages/effect/src/Context.ts`, `Stream.ts`, `Sink.ts`, `FileSystem.ts` and
`Terminal.ts` with their tests (the cost gate is one counted test in `Context.test.ts`), the Node and Bun providers
split one layer per operation, the `HttpPlatform`, `HttpStaticServer`, `Logger` and `Prompt` consumers moved to
operations, and a prototype under `specs/tree-shakeable-services/` with an esbuild bundle check and error fixtures.

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
built from the members' slots, a slot has one name in a record, and `lookup`, overlays, flatten and merge are the branch
point's code. No implementation ships unless a root provides it: there is no default to keep when a test replaces one,
so services with no sensible default, such as the file system, work the same as any other. The price is stated plainly:
a record read is not the provided object, so `instanceof` and the object's identity do not survive it, and what an
implementation calls is fixed where it is provided, as for any Effect value: `this.find`, a closure's `find` and a
primitive a layer was built with are its own, never an override. A sibling that should follow overrides is called through
its operation (`Users.find(id)`), and its key is then in the shape's `R`.

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
function stays a `Context.Service`, as does a Stream or Sink _value_ (none exists in `effect`).

**Why not one `Context.Operation` with a value-level kind.** The kind has to be a value, because the call returns a
Stream or an Effect before anything is read, and type arguments are erased. Spelled as an argument
(`Context.Operation<Shape>()(key, Stream.unwrap)`), the kind is the runner of the module that owns it, which is what
`Stream.Operation` already is: `Context.Operation` with `Stream.unwrap` fixed, so that `Context.ts` imports no
Stream code, and a bundle with no Stream operation carries none. The argument form adds a way for the shape and the
kind to disagree and saves nothing at the definition, so the constructor stays where the runner lives. The key, the
slot, providing, overriding and the record are the same for all three. The function constructors reject another kind
on the key argument, naming the constructor to use; a non-function shape, or a function given to
`Context.Operation.value`, fails the constraint:

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

const members = { readFile, stream /* … */ }
export interface Shape extends Context.Operations.Shape<typeof members> {}
export type FileSystem = Context.Operations.Identifier<typeof members>
export const FileSystem = Context.Operations<FileSystem, Shape>()("effect/FileSystem", members)
```

- **`Shape`** is an interface so a diagnostic's headline names it (`parameter of type 'Shape'`) and the line below
  ends with the members it lacks (`access, chmod, chown, copy, and 25 more`; for a subset, `exists, stat`).
  **Final decision: the middle of that line stays as TypeScript prints it.** TypeScript expands an interface with no
  members of its own into its base type there (`Shape<{ access: …; ... 28 more ...; … }>`), and only a dummy member
  on `Shape` (`readonly "~"?: never`), a line kept for printing, would stop it; a second interface only moves the
  expansion down. The headline gives the shape and the last words the missing members, which is what the reader
  needs. Members are written as an object, as above: a namespace import prints `typeof import("<absolute path>")`.
- **`FileSystem`** (the type) is the union of the members' keys, so a merge of all member layers is a
  `Layer<FileSystem>`, and declaring it prints `FileSystem` instead of thirty-two keys.
- **The one-line form**, `Context.Operations("app/Users", { find, create })`, infers shape and identity, for
  application code; its type is `Context.Operations.Of<"app/Users", typeof members>` and prints by its key first,
  `Of<"app/Users", { readonly find: …; … }>` (`Users.key` is typed `"app/Users"`). In both forms the key is a function
  named after its key, like every other key, with its members as properties: `Users.find(id)` is the operation.
- **One name per slot.** A slot reachable under two names (an alias, a nested record sharing a member, two subsets
  that overlap) is rejected on the key argument, naming the slot, and is a defect at run time naming both paths; so a
  write gives each slot one value and a read cannot disagree with the slots.
- **One rule for siblings.** What an implementation calls is fixed where it is provided, unless its shape requires
  it, as for any Effect value. `this.find(id)`, a closure's `find(id)`, `make(impl)`'s derived members and a
  primitive a layer read when it was built are the implementation's own, and a test's override of `find` does not
  reach them. A sibling that should follow overrides is called through its operation, `Users.find(id)`, which puts
  `"app/Users/find"` in the shape's `R`: the type says the implementation reads it where it runs. Stated once, in
  the `Context.Operations` JSDoc **Gotchas**; "Hazards" and the acceptance list point to it.
- **One receiver rule.** An operation passes no receiver: it calls the implementation it reads with `this`
  undefined, whatever the call site. When a record is provided, an implementation that reads `this` (its source
  names `this` or `super`; asked once per function) is stored bound to the object that provides it, plain object
  or class instance, so its `this` is that object from every call site of the operation (`Users.find(x)`, a bare
  `find(x)`, a destructured read, `Effect.andThen(_, Users.find)`) and private fields work. Every other member, a
  closure included, is stored as it is, with its identity. A function provided alone,
  `Layer.succeed(Users.create, f)`, is called as given, like any function passed as a value: a method that reads
  `this` is provided through its record, or as a closure, `(name) => impl.create(name)` (pinned: the method alone
  dies on `this.find`). A shape that declares `this`, other than `this: void`, is rejected (`The shape declares
  this: an implementation's receiver is the object that provides it`). In the JSDoc **Gotchas**, pinned by a test,
  and run from a bundle (`main-receiver.ts`: three implementations, three call sites, with and without an override).

The recipe is the floor (appendix F). The constructor checks identity, shape and members against each other, and a
mismatch is a compile error on the key argument; a member named like a property of every key (`use`, `key`,
`members`, `pipe`, `of`, `context`, `useSync`, `toJSON`, `toString`, `Service`, `Identifier`, `name`, the type
ids: `Operations.Reserved`) is rejected the same way, and is a defect at run time:

```
typetest/errors/wrong-self.ts(11,82): error TS2345: Argument of type '"test/Partial"' is not assignable to parameter of type '"Self lacks the identifier of \"effect/FileSystem/writeFile\""'.
typetest/errors/wrong-self.ts(19,5): error TS2345: Argument of type '"test/WrongShape"' is not assignable to parameter of type '"Shape is not the members' shape: declare it as interface Shape extends Context.Operations.Shape<typeof members> {}"'.
typetest/errors/wrong-self.ts(21,45): error TS2345: Argument of type '"test/Unknown"' is not assignable to parameter of type '"Give the record its identifier: Context.Operations<Self, Shape>()(key, members)"'.
typetest/errors/shared-slot.ts(13,41): error TS2345: Argument of type '"test/Shared/Alias"' is not assignable to parameter of type '"\"test/Shared/a\" is reachable under two names: a slot has one name in a record"'.
typetest/errors/shared-slot.ts(20,40): error TS2345: Argument of type '"test/Shared/Both"' is not assignable to parameter of type '"\"test/Shared/b\" is reachable under two names: a slot has one name in a record"'.
typetest/errors/partial-record.ts(6,67): error TS2345: Argument of type '{ readFile: () => Effect.Effect<Uint8Array<ArrayBuffer>, never, never>; }' is not assignable to parameter of type 'Shape'.
  Type '{ readFile: () => Effect.Effect<Uint8Array<ArrayBuffer>, never, never>; }' is missing the following properties from type 'Shape<{ access: Operation<"effect/FileSystem/access", (path: string, options?: { readonly writable?: boolean; readonly readable?: boolean; } | undefined) => Effect<void, FileSystemError, never>>; ... 28 more ...; writeFileString: Operation<...>; }>': access, chmod, chown, copy, and 25 more.
typetest/errors/one-line-display.ts(13,14): error TS2322: Type 'Of<"test/Users", { readonly find: Operation<"test/Users/find", (id: string) => Effect<string, never, never>>; readonly create: Operation<"test/Users/create", (name: string) => Effect<...>>; }>' is not assignable to type 'number'.
```

The relations are plain assignability of unions: `Layer<FileSystem>` satisfies `"effect/FileSystem/readFile"`, a member
layer does not satisfy `FileSystem`, a merge of every member layer does, and `Effect<_, _, "…/readFile">` is assignable
to `Effect<_, _, FileSystem>`. A member record's identity joins the union; a member reference reads its default.

### Subset records

A record over some of another record's members is a record like any other, written with the same recipe:

```ts
const readOnlyMembers = { exists, readFile, stat /* … ten reading operations */ }
export interface ReadOnlyShape extends Context.Operations.Shape<typeof readOnlyMembers> {}
export type ReadOnly = Context.Operations.Identifier<typeof readOnlyMembers>
export const ReadOnly = Context.Operations<ReadOnly, ReadOnlyShape>()("effect/FileSystem/ReadOnly", readOnlyMembers)

export const sizeOf = (path: string): Effect.Effect<number, PlatformError, FileSystem.ReadOnly> => …
```

By assignability of unions (`typetest/ok/signatures.ts`, `typetest/errors/subset-not-full.ts`): (1) the full record
satisfies the subset (`const a: Layer<ReadOnly> = NodeFileSystem.layer`); (2) so do the member layers merged; (3) it
satisfies each of its members; (4) a program over three of its operations is an `Effect<_, _, ReadOnly>` and runs under
either provider; (5) it does not satisfy the full record, naming the first member it lacks
(`'"effect/FileSystem/access"' is not assignable to type 'ReadOnly'`); (6) it is a key like any record, shadowing the
full one slot by slot. Two subsets that share a member cannot both be members of one record (one name per slot); a
record lists the full one instead. A partial subset names its shape and the members it lacks:

```
typetest/errors/partial-subset.ts(6,59): error TS2345: Argument of type '{ readFile: () => Effect.Effect<Uint8Array<ArrayBuffer>, never, never>; }' is not assignable to parameter of type 'ReadOnlyShape'.
  Type '{ readFile: () => Effect.Effect<Uint8Array<ArrayBuffer>, never, never>; }' is missing the following properties from type 'Shape<{ exists: Operation<"effect/FileSystem/exists", (path: string) => Effect<boolean, FileSystemError, never>>; readFile: Operation<"effect/FileSystem/readFile", (path: string) => Effect<...>>; stat: Operation<...>; }>': exists, stat
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
_partially_ provided prints the remaining keys, because `Exclude` distributes over the union, truncated by default
(`"effect/FileSystem/access" | … | ... 22 more ... | "effect/FileSystem/writeFileString"`): the price of letting member
layers satisfy the record, mitigated by `FileSystem.ReadOnly` (appendix C). A form like `FileSystem minus readFile`
is out of reach: `Effect.provide`'s `Exclude` resolves eagerly to the remaining union and TypeScript keeps no alias
for it, so it would take a new requirement type and a change to every `provide`, which this spec declines. The
coarse-grained provider, the record provided or every member layer merged, is a `Layer<FileSystem>` and bundles
everything.

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
`R`, where without one it is the compile error above. So replacing an operation never leaves its first implementation
in the bundle, and a service with no default (the file system) is no different from one that has one. A library that
wants "works out of the box" ships a layer.
`Context.Reference` remains for silently replaceable values, and may be a member of a record with its own semantics.

### Generic, overloaded and property-bearing shapes

TypeScript cannot rewrite a generic function type's result without instantiating its type parameters at their
constraints, and cannot carry a function's properties onto a value; it can take an overload set apart, up to a fixed
count. So, at the definition: a shape whose result already requires the key is the call signature unchanged;
otherwise it is derived (`Operation.Derive`): one signature, or up to four overloads each with the key added to its
result, and the derivation must be as precise as the shape (`Operation.Derivable`) and the shape a bare function.
Only a generic shape whose type parameter reaches its result names its key:

```ts
export const parse = Context.Operation<
  <A>(decode: (input: string) => A, input: string) => Effect.Effect<A, never, "app/parse">
>()("app/parse")
parse(Number, "42") // Effect<number, never, "app/parse">
export const format = Context.Operation<{
  (value: number): Effect.Effect<string>
  (value: Date, locale: string): Effect.Effect<boolean, Error>
}>()("app/format")
format(new Date(), "en") // Effect<boolean, Error, "app/format">
```

```
typetest/errors/generic-unnamed.ts(7,3): error TS2345: Argument of type '"test/parse"' is not assignable to parameter of type '"The shape of \"test/parse\" is generic: its result must require \"test/parse\""'.
typetest/errors/shape-with-properties.ts(6,3): error TS2345: Argument of type '"test/double"' is not assignable to parameter of type '"The shape has properties: an operation is a bare function"'.
```

`<A>(value: A) => Effect<void>` derives without loss and is accepted unnamed; `<A>(d: (s: string) => A) => Effect<A>`
does not (`unknown` is not `A`) and must name its key. Call sites are the same either way. One hole remains, stated
and pinned in `typetest/Context.tst.ts`: a generic overload _inside_ an overload set is derived at its constraint
(`<A>(value: A): Effect<A>` calls as `Effect<unknown, never, key>`), sound but less precise, because TypeScript relates
overload sets with their type parameters erased and so the definition cannot tell; such a shape names its key in its
results, as `parse` does.

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
  implementation from the fiber's context and applies it to the arguments, with no receiver.
- `Context.Operation.value<Shape>()(key)` returns an Effect primitive (an `Effectable`, `typeof` `"object"`) carrying
  the brand and `key`: running it reads the implementation, an Effect, and continues with it. Not callable.
- `Stream.Operation` / `Sink.Operation` return a function whose call is `Stream.unwrap` / `Sink.unwrap` of the
  implementation applied to the arguments, read from the fiber that pulls it (`isStream` true, `isEffect`
  false). Both use two internals of `Context`, `makeOperation(key, call)` and `applyOperation(op, args)`, so
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
  export type Call<Id extends string, Shape extends Signature> = Shape extends (...args: any) => infer Result ?
    [Id] extends [Requirements<Result>] ? Shape : Derive<Shape, Id>
    : Shape extends Effect<infer A, infer E, infer R> ? [Id] extends [R] ? Shape : Effect<A, E, R | Id>
    : never

  /** One signature, or two to four overloads, each with the key added to its result; the last signature otherwise. */
  export type Derive<Shape, Id> = Shape extends (this: infer T, ...args: infer A) => infer R ?
    [(this: T, ...args: A) => R] extends [Shape] ? (this: T, ...args: A) => Require<R, Id>
    : Shape extends { (this: infer T1, ...args: infer A1): infer R1; (this: infer T2, ...args: infer A2): infer R2 } ?
      [((this: T1, ...args: A1) => R1) & ((this: T2, ...args: A2) => R2)] extends [Shape] ?
        ((this: T1, ...args: A1) => Require<R1, Id>) & ((this: T2, ...args: A2) => Require<R2, Id>)
      : /* the same for three, then four overloads */ (this: T, ...args: A) => Require<R, Id>
    : (this: T, ...args: A) => Require<R, Id>
    : never

  export type Requirements<Result> = Result extends Effect<infer _A, infer _E, infer R> ? R
    : Result extends Stream<infer _A, infer _E, infer R> ? R
    : Result extends Sink<infer _A, infer _In, infer _L, infer _E, infer R> ? R
    : never
  export type Require<Result, Id> = Result extends Effect<infer A, infer E, infer R> ? Effect<A, E, R | Id>
    : Result extends Stream<infer A, infer E, infer R> ? Stream<A, E, R | Id>
    : Result extends Sink<infer A, infer In, infer L, infer E, infer R> ? Sink<A, In, L, E, R | Id>
    : never

  /** True when the derived signature, without the key, is assignable back to the shape: nothing was lost. */
  export type Derivable<Shape extends Signature> = Shape extends (...args: any) => any ?
    [Derive<Shape, never>] extends [Shape] ? true
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
        : `The shape of "${Id}" is generic: its result must require "${Id}"`
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
  <const Name extends string, const Ops extends Operations.Members>(
    key: Operations.Key<Ops, Name>,
    members: Ops
  ): Operations.Of<Name, Ops>
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
  // printed key first: Of<"app/Users", { … }>
  export type Of<Key extends string, Ops extends Members> = Operations<Identifier<Ops>, Shape<Ops>> & Ops & {
    readonly key: Key
  }
  export type Reserved<Ops extends Members> = keyof Ops & (keyof Operations<any, any> | "name")
  // the literal identifiers two members share: an alias, a shared nested member, overlapping subsets
  export type Shared<Ops extends Members> = {
    [K in keyof Ops]: Service.Identifier<Ops[K]> extends infer I ?
      I extends string ? string extends I ? never : Extract<Identifier<Omit<Ops, K>>, I> : never
      : never
  }[keyof Ops]
  export type Key<Ops extends Members, Name extends string = string> = [Reserved<Ops>] extends [never] ?
    [Shared<Ops>] extends [never] ? Name
    : `"${Shared<Ops> & string}" is reachable under two names: a slot has one name in a record`
    : `Member "${Reserved<Ops> & string}" has the name of a property of the key: rename it`
  export type KeyFor<Self, S, Ops extends Members> = unknown extends Self ?
    "Give the record its identifier: Context.Operations<Self, Shape>()(key, members)"
    : [Identifier<Ops>] extends [Self] ? [S] extends [Types.unassigned] ? Key<Ops>
      : [S] extends [Shape<Ops>] ? [Shape<Ops>] extends [S] ? Key<Ops>
        : "Shape is not the members' shape: declare it as interface Shape extends Context.Operations.Shape<typeof members> {}"
      : "Shape is not the members' shape: declare it as interface Shape extends Context.Operations.Shape<typeof members> {}"
    : `Self lacks the identifier of "${Exclude<Identifier<Ops>, Self> & string}"`
  export type ShapeOf<S, Ops extends Members> = [S] extends [Types.unassigned] ? Shape<Ops> : S
}

export type OperationsTypeId = "~effect/Context/Operations"
export const OperationsTypeId: OperationsTypeId
export const isOperations: (u: unknown) => u is Operations<any, any>
```

The plain form infers identifier and shape; in the curried form `KeyFor` is `string` when `Self` contains every member's
identifier and `Shape` is mutually assignable with the members' shape, otherwise the message. `Shared` sees literal
identifiers; a member whose identifier is not a literal is checked when the record is constructed. Both return a
function named after the key, like every other key, with `ServiceTypeId`, `OperationsTypeId`, `key`, `members`, the
members as own properties and the state under "Record storage": a `Service` whose `yield*`, `use` and `useSync` call
the record's own read.

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
| `Context.makeUnsafe(map)`                                      | Unchanged; a record is built from the map on the first read and kept for it                                                   |
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

A context is the branch point's: a flat base map and a chain of overlays `{ key, value, parent, write }` read by
`lookup`, none of which knows what a record is; `write` is the one field this spec adds, `false` for every ordinary
`add` and `true` for the overlays of a record write, so a read can tell an override from a write's own slot. A record key is a function like every other key; `make`, `add`, `pick`,
`omit` and the getters test its brand (`OperationsTypeId`) and send a record to its own write and read. A record key
holds:

| Piece     | Mutability                       | Holds                                                                                                                                                                                                               |
| --------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `~layout` | immutable, fixed at construction | `members`: `[{ name, key, positions, record }]` in declaration order; `slots`: every slot written, each once, a member record's included; `positions`: slot → index; `names`: slot → member name for direct members |
| `~views`  | the one mutable piece            | a `WeakMap` from a storage (an overlay or a base map) to the object built there                                                                                                                                     |

```
define(key, members):                        // Context.Operations
  a slot reachable under two names (alias, shared nested member, overlapping subsets): defect naming both paths
  a reserved name: defect

write(context, value):                       // Context.make, Context.add, Effect.provideService, Layer.succeed
  values = collect(value)                    // each member read once, now; present iff name in value (undefined is a
                                             // member); a function operation's implementation that
                                             // reads `this` is bound to value; every other member
                                             // is stored as value holds it;
                                             // absent: defect "Service not found: <member key> (the object provided
                                             // for <record key> has no member "<name>")"
  if context is empty or at maxDepth: one flat map = context's slots + one entry per slot     // as addUnsafe does
  else: one RecordSlot { key: slot, value, parent } per slot, depth + 1                      // nothing copied
  new cache root if a slot is fiber-cached, as its own write would

read(context):                               // Context.get, yield*, use, useSync, getOption, …
  storage = the topmost overlay whose key is one of slots, else the base map
  if views has storage: return it
  if storage is a plain overlay of a direct member:                // an override, not a RecordSlot; never recursive
    below = views.get(next storage down), else build(next storage down), kept there
    if below: return { ...below, [name]: overlay.value }           // one copy, not kept
  object = build(storage)                    // every slot from storage down, one walk; a member record built from
                                             // its own positions; a missing reference reads its default; any other
                                             // missing member: notFound (or the defect), nothing kept
  views.set(storage, object); return object
```

The override copy equals what `build` would give because a slot has one name: no other name in the record, nested or
not, reads the overridden slot. That is why the definition rejects a second name rather than the read patching every
path.

Invariants, each pinned by a test:

1. A context holds only the slots written into it; a record write is one ordinary overlay per slot, or one flat map,
   and performs no `Map` operation into a non-empty context; a member override is an overlay like any other.
2. A record is its members: it has no slot of its own, a read returns only the members' slots, and a record is present
   exactly when every member is (`in`, not `!== undefined`: a member whose value is `undefined` is present).
3. A record read is a plain object with every member as its own enumerable property, in the record's order, equal to
   the object built from the slots; the same slots read through overlays and through a flat map give the same keys,
   order and values. Identity is not promised: every storage but an override returns one object, built in one walk
   and kept in `~views` (a record write's own overlays, a subset over the full record, a stack of overrides); an
   override reads as a fresh copy of the storage below it, and that storage is built and kept first if it was never
   read, so N per-request overrides over an unread record write build it once and leave nothing else behind. The cost
   of every read is linear in the record's members.
4. A slot has one name in a record (type and run time), so a write gives each slot one value.
5. Precedence is ordinary `Context` precedence, slot by slot.
6. Nothing outside the record key and the contexts it reads is written: no registry, no flag on `Context` or on an
   overlay. The one module-level table is a memo of a fact about a function, whether its source reads `this`
   (a `WeakMap` from the function to a boolean), which no context or record state depends on and which never changes. A record write's overlays are `RecordSlot`s, a class beside the record code with the overlay's three fields;
   a key added alone is the branch point's plain overlay; the ordinary path is the branch point's code behind one brand
   test.

## Cost

The gate is one test, "costs: …" in `packages/effect/test/Context.test.ts`, so the normal CI suite runs it. It counts
`Map.get/has/set` and `WeakMap.get/set` calls per operation, which do not depend on the machine's load; timing is
not gated. Each row is one assertion. A record write asks of each function member whether it reads `this`: one
`WeakMap.get` of the answer, kept per function the first time it is written (one source scan), so a write allocates
a bound copy only for an implementation that reads `this`.

| Measure                                                             | Limit (counted)               | Reading | Pass |
| ------------------------------------------------------------------- | ----------------------------- | ------- | ---- |
| ordinary key read                                                   | 1 Map, 0 Weak                 | 1, 0    | yes  |
| ordinary key `add`                                                  | 0, 0                          | 0, 0    | yes  |
| record write into a non-empty context (4 function members)          | 0, functions (`this` asked)   | 0, 4    | yes  |
| member read through a record's overlays                             | 0, 0                          | 0, 0    | yes  |
| repeated record read                                                | 1, 1                          | 1, 1    | yes  |
| member override `add`                                               | 0, 0                          | 0, 0    | yes  |
| member override then record read, per request                       | 2, 2 (one copy, kept nowhere) | 2, 2    | yes  |
| unrelated `add` above an override, then record read                 | 3, 2                          | 3, 2    | yes  |
| first read from a flat map (4 members)                              | members, 2                    | 4, 2    | yes  |
| first read after a record write into a non-empty context, 4 members | members + 1, 2                | 5, 2    | yes  |
| the same, 32 members                                                | members + 1, 2                | 33, 2   | yes  |
| N per-request overrides over an unread record write, first request  | members + 3, 3 (below kept)   | 7, 3    | yes  |
| the same, each later request                                        | 3, 2 (one copy, kept nowhere) | 3, 2    | yes  |
| repeated read, a subset written over the full record                | 1, 1 (the same object)        | 1, 1    | yes  |

**`add` and `mergeAll`.** Earlier timing runs showed both over a twin copy of the module. The code says why that is not a cost:
`mergeAll` is byte for byte the branch point's, and `add` differs by one brand test before the branch point's
`addUnsafe`; the counts rows equal the branch point's. The excess was the reference machine's noise, the same noise
that put identical code at 1.0 to 1.5× by run order, which is why timing no longer gates.

**First reads.** Round 12's override shortcut recursed through a record write's own overlays, so the first read after
`provideService(FS, impl)` into a non-empty context was quadratic in the members,
and a subset over the full record was never kept (a copy per member overlay, per read). The shortcut now looks one
storage down and never recurses; everything else is one walk and kept. Round 13's shortcut also built the storage
below an override without keeping it, so every request over an unread record write rebuilt it, and the first read of
a write built through the shortcut's path (7, 3 for four members); round 14 takes the shortcut only for an override
(a plain overlay, not a `RecordSlot`) and keeps what it builds below, and the last five rows above gate it. No
timing figure is claimed: the earlier per-request ratio came from a probe that was never committed.

## Hazards, and what the design does about each

| Hazard                                                        | What the design does                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Callables that are also Effects                               | Would type as a call in `Effect.andThen(x, op)` (function overload first) and run as an Effect (`isEffect` checked first). A function operation is a `Slot`, not a `Key`: `isEffect` and `isKey` false, so `Effect.andThen`, `tap` and `flatMap` call it and `Layer.succeed(op, impl)` provides it; a value operation is an Effect (`isEffect(columns)` true), so they run it, and it is not callable.                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `isEffect`-dispatching duals                                  | Every `dual` with an `isEffect(args[0])` predicate (39 sites in `internal/effect.ts`, `Effect.ts`, `Console.ts`, `Runtime.ts`, `http/HttpServer.ts`, `internal/layer.ts`, `internal/executionPlan.ts`) sees a function; `Effect.map(op, f)` and `yield* op` are type errors (appendix C).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Stream-returning operations                                   | A call result is one kind, fixed by the constructor, so the 35 `isStream` sites in `Stream.ts` and the checks in `HttpApiBuilder.ts`, `HttpApiClient.ts`, `reactivity/Atom.ts`, `http/Template.ts`, `cluster/Entity.ts` and the child-process spawners cannot misclassify it; a Stream shape given to `Context.Operation` is the error naming `Stream.Operation`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Receivers                                                     | One rule ("One receiver rule"): an operation calls its implementation with no receiver; a record write binds an implementation that reads `this` to the object that provides it, plain object or class instance, so `this` is that object from every call site of the operation and private fields work. A closure, a value operation, a service and a class are stored as they are. A method provided alone (`Layer.succeed(Users.create, impl.create)`) is called as given and dies on `this.find`, like any method passed as a value; the JSDoc gives the record or a closure as the way to provide it (both pinned). A shape declaring `this` is rejected at the definition. Run from a bundle (`main-receiver.ts`).                                                                                                         |
| Function properties                                           | On an operation, rejected at the definition, so a type never promises a property the value lacks: `op` has `key`, `name`, `length`, `toJSON` and the brand, nothing else; a value beside a function is a separate key, which may sit in the same record. On a member's value (a `Context.Service` member whose shape is a function with properties, or a class with statics), kept: the value is stored as it is, so `Context.get(ctx, member) === value`, `.sep` and statics survive the write (pinned).                                                                                                                                                                                                                                                                                                                        |
| Identity and `instanceof`                                     | A record read is never the provided object: `instanceof`, `===` and non-member properties of the object do not survive it, and nothing in the repository relied on them; code that needs the instance keeps it as a separate key. An implementation that reads `this` is a bound copy (`name` is `"bound find"`); every other member keeps its identity, closures included (`Context.get(ctx, member) === value`, pinned). Every member is an own enumerable property, so `Object.keys`, `JSON.stringify` and spread list them, overrides in place.                                                                                                                                                                                                                                                                              |
| Class constructors as members                                 | A member whose value is a class (a `Context.Service<typeof Parser>` member) is not an operation's implementation, so it is stored as it is: `new read.Parser()` constructs and its statics read (pinned).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| A sibling call under an override                              | One rule ("One rule for siblings"): fixed where provided, unless the shape requires the sibling. `this.read(path)` and a closure's `read(path)` call the object's own `read`; a test that overrides `read` does not reach them (pinned). A sibling called through its operation, with its key in the shape's `R`, sees the override. There is no context-first fallback anywhere: `FileSystem.make(impl)` is closed over `impl`, so a local `make(mem)` under a live file system reads `mem`, a fake's `readFileString` provided alone reads the fake's `readFile`, and a fake `readFile` written over `readFileString` cannot loop (pinned in `FileSystem.test.ts`). To fake a primitive for the derived members too, build them with it: `make({ ...impl, readFile: fake })`, or `layerReadFileString` provided with the fake. |
| Derived and consuming layers read their dependencies at build | Ordinary layer precedence: `layerReadFileString.pipe(Layer.provide(localRead))` calls `localRead`, not the caller's `readFile` (pinned), and the same for `layerExists`, `layerGlob`, `layerStream`, `layerSink` and `layerWriteFileString`. `HttpPlatform.layer` and `HttpStaticServer.make` read `stat` and `stream` once at build, because the `fileResponse` shape they fill has `R = never`; an override of `stat` provided above the layer does not reach the platform (pinned in `HttpPlatform.test.ts`). A test that fakes them provides the fake to the layer, as for any layer's dependency.                                                                                                                                                                                                                           |
| A partial record                                              | Rejected against `Shape` (pasted above); with types bypassed, the write's defect names the member, where the layer is built. `Layer.mock` is the partial convenience and dies on what it lacks (`effect/FileSystem: Unimplemented method "stat"`); `FileSystem.makeNoop({})` is complete.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Key collisions, string-keyed access, two copies of `effect`   | One string is one slot ("Identity" under "Runtime semantics"), so code reaching in by string cannot make a record disagree with its members; the `<package>/<Service>/<operation>` convention keeps keys unique; a subset shares its members' keys on purpose.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Mutation after the fact                                       | A map mutated after `makeUnsafe` is read live by member reads while a record already assembled for it stays as it was (pinned); a provided object is read once, at the write.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Misuse that does not compile                                  | `Terminal.columns()`: `This expression is not callable`; `Context.Operation("key")`: `Expected 0 arguments, but got 1`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Requirement unions written as type aliases                    | The codemod cannot tell `type Env = FileSystem.FileSystem \| Path.Path` from a value type and rewrites it; two such aliases in the repository were restored by hand; users review the codemod's diff.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

## Tree-shaking

Three ordinary requirements: one implementation per top-level export in a side-effect-free module; a composition root
that imports implementation modules, or reads members off their namespace, and never an aggregate unless it wants
everything; aggregates (`Layer.mergeAll(...)`) in their own module or `/* @__PURE__ */`-annotated. The types enforce the
half that matters: `R` names what to import. A key the bundler keeps costs about 4 kB for an unannotated thirty-key
contract and nothing once published.

The prototype's `pnpm --filter tree-shakeable-services-spec bundle` (esbuild, about 4 s) builds five composition
roots over its thirty-key fixture contract and fails if an unused implementation appears or a used one is missing.
`packages/effect/test/FileSystem/treeShaking.test.ts` is one esbuild build of five roots over the real modules, with
`effect` as published (fixtures in `packages/effect/test/fixtures/tree-shaking/`), asserting which operation modules
and keys are in each bundle, that the record key is not, and the Stream bytes. Sizes, minified, measured once and not
asserted:

| Root                                                | Bundle   | Node operation modules               | Whole `NodeFileSystem.layer`     |
| --------------------------------------------------- | -------- | ------------------------------------ | -------------------------------- |
| `FileSystem.readFile`/`writeFile`, their two layers | 39,950 B | readFile, writeFile, shared          | 76,840 B                         |
| `HttpServerResponse.file` over `HttpPlatform.layer` | 99,645 B | stat, stream, open, shared           | 123,964 B                        |
| `Logger.toFile`                                     | 64,215 B | open, shared; no Stream code         | not built                        |
| `Terminal.display` (a CLI that only displays)       | 83,664 B | display; no readline, no Stream code | 110,052 B (`NodeTerminal.layer`) |

The fifth root, `main-receiver.ts`, runs the receiver matrix ("One receiver rule") from the bundle and is not
sized. `open` is in the HTTP root because `NodeFileSystem.stream` is `FileSystem.layerStream` over `NodeFileSystem.open`.
A replaced implementation is never in the bundle: a test that overrides `readFile` provides its own layer, and the root
that ships provides the real one, so neither carries the other.

## Migrating `effect/FileSystem` and `effect/Terminal`

Both modules are `@stability unstable`, and `MIGRATION.md` lets a minor change their identity, so the identity change
ships in one release with the codemod and the subset record. All of the following is on this branch.

**Contracts.** `packages/effect/src/FileSystem.ts`: one operation per member with its shape and documentation (`stream`
and `watch` by `Stream.Operation`, `sink` by `Sink.Operation`; the scoped ones keep `Scope`), the record and
`ReadOnly` (ten reading operations) by the recipe; `makeNoop` and `layerNoop` unchanged but for the `Shape`
type and the removed `[TypeId]` brand, which nothing read. `make(impl)` keeps its signature and its behaviour: the derived members
(`exists`, `glob`, `readFileString`, `stream`, `sink`, `writeFileString`) are closures over `impl`'s
primitives, wherever the result is called or provided ("One rule for siblings"). The six derived operations get public
layers, each reading its primitives once at build like any layer, over the primitives they use: `layerExists` (requires `access`), `layerGlob` (`readDirectoryEntries | stat |
readLink`), `layerReadFileString` (`readFile`), `layerWriteFileString` (`writeFile`), `layerStream` and `layerSink`
(`open`). `packages/effect/src/Terminal.ts` is the same with five value operations and one function operation, and
`Terminal.Interactive`, the subset record `{ columns, readInput, display }` a prompt uses; its shape does not change, so
`Terminal.make({...})` and `Layer<Terminal>` work as before.

**Providers.** `@effect/platform-node-shared`'s `NodeFileSystem.ts` is split into `src/internal/fileSystem/` (32
operation modules, `shared.ts`, `layer.ts`; appendix E) and exports the 32 layers by member name plus `layer`, their
merge, unchanged; `@effect/platform-node`'s `NodeFileSystem` and `BunFileSystem` re-export all 33. `NodeTerminal.ts` is
split the same way into `src/internal/terminal/`: `columns`, `rows`, `size` and `display` over `process.stdout` alone,
and `readInput` and `readLine` over an internal scoped service `Input` that owns the `stdin`, `readline` and raw-mode
setup; each of those two layers provides `Input.layer`, so merged they build one `Input` (layer memoization by
reference, pinned in `NodeTerminal.test.ts`). `NodeTerminal` exports the six layers by member name; `make(shouldQuit)`
and `layer` keep their signatures and are built from the same modules; `@effect/platform-node` and `BunTerminal`
re-export the six. `DenoTerminal` stays whole and out of scope, like `DenoFileSystem`: it re-exports
`NodeTerminal.make` and `layer`, so a Deno root that wants members imports the six layers from
`@effect/platform-node-shared/NodeTerminal`, which is the implementation `DenoTerminal` already uses.

**Consumers in `effect`.** The ones that use a few members now require only those, so an HTTP or logging app
given member layers compiles and bundles only them ("Tree-shaking"); a `Layer<FileSystem>` still satisfies each:

| API                                                           | Requires now                                             | How                                                                                           |
| ------------------------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `HttpPlatform.layer` (`HttpServerResponse.file`)              | `"effect/FileSystem/stat" \| "effect/FileSystem/stream"` | reads both once at layer build (`Effect.service(op)`)                                         |
| `HttpStaticServer.make`                                       | `"effect/FileSystem/stat" \| Path \| HttpPlatform`       | the same, for `stat`                                                                          |
| `Logger.toFile`                                               | `Scope \| "effect/FileSystem/open"`                      | calls `FileSystem.open`                                                                       |
| `HttpBody.file`, `fileFromInfo`, `HttpClientRequest.bodyFile` | their operations                                         | narrowed requirements                                                                         |
| `Prompt` internals: `run`, the nine width sites, file prompts | unchanged (`Prompt.Environment`)                         | `yield* Terminal.Interactive`, `Terminal.columns`, `FileSystem.exists`/`readDirectory`/`stat` |

`HttpPlatform.make` reads the operations at layer build because the `fileResponse` shape it fills has `R = never`.
`NodeHttpPlatform` and `BunHttpPlatform` provide `NodeFileSystem.stat`/`BunFileSystem.stat`. Left whole, with the
reason: `Multipart.toPersisted` would narrow a user writer callback; the `HttpServerRequest`
multipart types are implemented by the platforms; `HttpServer.layerServices` provides `FileSystem` rather than
requiring it; `DenoHttpPlatform` has no per-operation layers (out of scope). Also left whole, out of scope, each
requiring the record where it is read and each its own follow-up by the pattern above: `ConfigProvider.fromDir`,
`KeyValueStore.layerFileSystem`, `K8sHttpClient`, `SchemaAOTCompiler`'s `Build`, `NodeChildProcessSpawner`,
`PgMigrator`'s file loader, `BunClusterSocket`, and the `tools/*` CLIs, which are not bundled for size.

**cli requirements: split out.** The cli's public types are unchanged by this spec: `Flag`, `Argument`, `Param`,
`Primitive`, `Prompt` and `Command.run` keep `Environment`, and `Prompt`'s internals read operations (the table
above), which a `Layer<Environment>` satisfies. Letting a command require only what its params and handler use is a
change to the cli's types, not to services, and has its own open question: params are parsed before the handler, and
`Command.provide((input) => layer)` builds its layer from the parsed input, so it cannot serve the parse. It is the
follow-up issue under "Implementation plan", with its own acceptance; this branch carries none of it.

**What changes for users.** The _type_ `FileSystem.FileSystem` becomes the union of 32 key literals; code that used it
as a value type says `FileSystem.Shape` (the codemod); `yield* FileSystem` returns an object of the members. Every
requirement position, `yield* FileSystem`, `Layer.succeed(FileSystem, make(impl))` and `Layer.mock` stays as it is.

**Codemod**, `scripts/codemods/record-shape.ts` with `pnpm codemod:shape [--module FileSystem|Terminal] <paths>`: a
`jscodeshift` transform rewriting `FileSystem.FileSystem` to `FileSystem.Shape` in type positions, except type arguments
of `Effect`, `Layer`, `Stream`, `Sink`, `Channel`, `Context` and `Effect.fn.Return`; it does not write the recipe. Over
`packages` and `tools` it rewrote 56 sites in 11 files; two requirement-union aliases ("Hazards") and four platform
`Terminal` re-exports were restored by hand. `test/cli/services/MockTerminal.ts` became its own service whose layer
also provides the terminal record; `test/http/HttpPlatform.test.ts` provides `FileSystem.makeNoop({})`, not `{} as any`.

| User code                                                                          | Before this round                          | This branch     |
| ---------------------------------------------------------------------------------- | ------------------------------------------ | --------------- |
| `yield* FileSystem` or `FileSystem.readFile(p)`, + `NodeFileSystem.layer`          | compiles; whole bundle                     | the same        |
| `FileSystem.readFile(p)` + `NodeFileSystem.readFile` (or `BunFileSystem.readFile`) | two implementations in the bundle          | the same        |
| `HttpServerResponse.file` + `NodeFileSystem.stat` and `stream`                     | compiles; those (and `open`) in the bundle | the same        |
| `Logger.toFile` + `NodeFileSystem.open`                                            | compiles; `open` alone, no Stream code     | the same        |
| `fs: FileSystem.FileSystem` as a record type                                       | `fs: FileSystem.Shape` (codemod)           |                 |
| a CLI that displays without prompting, + `NodeTerminal.display`                    | did not exist: `NodeTerminal.layer` only   | `display` alone |

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
fake)` overrides. Set aside for two reasons, both about the default. First, the default is the function's body, so it
is in every bundle that calls the function, even one whose root always replaces it: the replaced implementation is
kept. Second, a service with no implementation that works everywhere, such as the file system, has nothing to put
there; it would have to be written against a lower-level driver, which moves what tests mock ("Required, not
defaulted"). PR #10369 is open; this spec keeps its callable wrapper, makes the wrapper the key itself, and replaces the
defaulted `Reference` with a required slot: the implementation lives in a layer, only the layer the root provides is
bundled, and an unprovided operation is a compile error rather than a missing default.

## Scope

In scope: everything under "API" and "Migrating", with its tests, JSDoc, cost gate, bundle test, changesets and codemod.
Out of scope: the Deno providers (`DenoFileSystem.ts` and `DenoTerminal.ts` in `packages/platform/deno/src` are
untouched and still provide the records whole; appendix E), the whole-record consumers listed under "Migrating",
the cli's requirement types (the follow-up issue below), bundler plugins (appendix G), other record services (each follows the recipe; `Path`,
fifteen small synchronous functions over one implementation, is not worth one) and the ai-docs example.

## Implementation plan

Twelve issues, each a PR against `v4/next-minor`, and one follow-up issue after them. The checklist under each is its
acceptance, ready to paste, and implies `pnpm check`, `pnpm check-tsc`, `lint`, `circular`, `jsdocs --check` and
every existing suite clean; the twelve are on this branch, to be cut at the seams named, and the follow-up is not.

1. **`Context.Slot` and the widening**: every parameter under "Existing APIs this touches".
   - [ ] Every existing test passes unchanged; `Effect.service` and `Layer.updateService` return as before.
   - [ ] The ordinary rows of the costs test hold (read 1 `Map` call, `add` 0).
   - [ ] Changeset `effect: minor` names `Context.Slot`, the widened parameters and the recipe.
2. **`Context.Operation`**: constructor, type and namespace, `OperationTypeId`, `isOperation`.
   - [ ] A call runs the innermost provided implementation; an unprovided one dies with `Service not found: <key>`.
   - [ ] `Effect.andThen`/`tap`/`flatMap` call an operation given as their function; `yield* op` is a type error.
   - [ ] The definition messages print as pasted (`check-errors`); `@stability unstable` on every new export.
3. **`Context.Operation.value`, `Stream.Operation`, `Sink.Operation`.**
   - [ ] A call's kind is fixed by its constructor; a Stream shape given to `Context.Operation` names `Stream.Operation`.
   - [ ] `Context.ts` has no run-time import of `Stream`, `Sink` or `Channel`; `pnpm circular` clean.
4. **Records: key, storage, write and read** ("Record storage"), with the shared-slot rule.
   - [ ] Invariants 1 to 6 hold, each with a test; the costs test passes as in "Cost".
   - [ ] A slot under two names (alias, nested, overlapping subsets) is rejected at the definition, type and run time.
   - [ ] `partial-record`, `shared-slot` and `one-line-display` print as pasted.
   - [ ] JSDoc **Gotchas**: a record read is an object of the members, not the provided object; "One rule for
         siblings", stated there once.
5. **Records: provided objects and receivers**: `collect`, `Layer.mock`'s proxy, `Reserved`.
   - [ ] An operation passes no receiver; a record write binds an implementation that reads `this` to the object
         that provides it, so its `this` is that object from every call site of the operation, private fields
         included; a closure and any other member keep their identity, properties and statics. A shape declaring
         `this` is rejected.
   - [ ] A method provided alone dies on `this`; provided as a closure over its object, it runs (`Context.test.ts`).
   - [ ] A sibling called through the operation sees a test override, from a plain object and from a class;
         `treeShaking.test.ts`'s receiver test runs the same matrix from a bundle.
6. **Records: `pick`/`omit`, strings, nested, subset and reference members.**
   - [ ] `getOrUndefinedUnsafe(ctx, record.key)` is `undefined` after a record write; a subset shadows the full record
         slot by slot, in both orders.
7. **`effect/FileSystem` and `effect/Terminal` contracts**, `ReadOnly`, the codemod, `MockTerminal`.
   - [ ] `FileSystem.test.ts`, `Terminal.test.ts` and `typetest/FileSystem.tst.ts` pass.
   - [ ] `pnpm check` over every package is clean after `pnpm codemod:shape`.
   - [ ] Changesets `filesystem-operations.md` and `terminal-operations.md`, marked **Breaking**.
8. **`effect/FileSystem` derived-operation layers**: `layerExists`, `layerGlob`, `layerReadFileString`,
   `layerStream`, `layerSink`, `layerWriteFileString`, and `make`'s derived members.
   - [ ] Each requires exactly the primitives listed under "Migrating".
   - [ ] `make(impl)` is closed over `impl` and each derived layer calls the primitive it was provided with
         (`FileSystem.test.ts`, "make and the derived layers keep the primitive they were given": a local
         `make(mem)` under a live file system reads `mem`; a fake's `readFileString` alone reads its own `readFile`;
         no loop; a `Layer.provide`d primitive beats the caller's).
9. **Node and Bun providers, one layer per operation; the bundle test.**
   - [ ] `NodeFileSystem.test.ts` passes, with the test that `layer` equals the merge of the operation layers.
   - [ ] `treeShaking.test.ts` passes: `readFile` + `writeFile` bundles those two modules and `shared`, no Stream code.
   - [ ] Changeset `node-filesystem-operations.md` (patch).
10. **`effect/FileSystem` consumers**: the table under "Migrating".
    - [ ] `HttpPlatform.layer` provided with `stat` and `stream` only compiles and bundles those (and `open`);
          `Logger.toFile` with `open` only bundles `open` and no Stream code.
    - [ ] `typetest/http/HttpPlatform.tst.ts` and `typetest/Logger.tst.ts` pin the narrowed requirements and that a
          `Layer<FileSystem>` satisfies them; changeset `filesystem-operation-consumers.md` (patch).
    - [ ] `HttpPlatform.layer` reads `stat` at build: an override above the layer is not seen (`HttpPlatform.test.ts`).
11. **`effect/Terminal` providers** (appendix E): `NodeTerminal` one module per member over an internal `Input`;
    `NodeTerminal`'s and `BunTerminal`'s six member layers.
    - [x] `NodeTerminal.test.ts` passes: the six layers merged provide `Terminal`; `readInput` and `readLine` merged
          build one `Input`.
    - [x] `treeShaking.test.ts`'s "display alone, no readline": the root bundles the `display` module alone, no
          `readline`, `emitKeypressEvents` or `setRawMode`, no other member key, 0 Stream bytes (83,664 B minified,
          against 110,052 B with `NodeTerminal.layer`).
12. **`effect/Terminal` consumers**: `Terminal.Interactive` and the `cli/Prompt.ts` sites, public types unchanged.
    - [x] The cli suites pass unchanged; `Prompt.run` reads `Terminal.Interactive`, the width sites `Terminal.columns`,
          the file prompt `FileSystem.exists`, `readDirectory` and `stat`.

**Follow-up, its own issue: cli requirements.** Not part of this spec's acceptance; it builds on issues 7 and 12.
Goal: a command requires what its params, validations and handler use, so a `Command.run` over value flags bundles no
file-system code. The issue decides how parse-time services are discharged, since a `Command.provide` whose layer is
built from the parsed input cannot serve the parse; whatever it decides, a command's `R` is one ordinary union.

- [ ] `Flag`, `Argument`, `Param`, `Primitive` and `Prompt` carry the services they use; an annotated
      `Flag.Flag<A>` and a callback typed with `Command.Environment` compile unchanged.
- [ ] `Command.run`, `runWith` and `wizard` require the command's `R` and `Stdio | Terminal.Interactive`; no
      wrapper type in a displayed `R`, and no cast in the runners.
- [ ] `Command.provide` and its siblings discharge exactly what they serve; a parse-time service they cannot serve
      stays in `R` (tstyche).
- [ ] `Prompt.run` requires `Terminal.Interactive` and what the prompt itself uses.
- [ ] A `treeShaking.test.ts` root: `Command.run` with two value flags bundles no file-system code and three
      terminal members (about 210 kB against 239 kB in the round-14 measurement).
- [ ] A changeset (minor) for the cli type changes.

## Test plan

Kept to what pins the contract, so the suites stay fast (the bundle test and the prototype's bundle check take about
4 s each; nothing is timed).

**Runtime**, `packages/effect/test/Context.test.ts`, `describe("Operation")`:

1. An operation is a function named after its key, a slot, not a key, not an Effect; a call runs the innermost
   implementation (`Layer.succeed`, `Layer.effect`, `Effect.provideService`) when its result runs.
2. An unprovided call (types bypassed) dies with `Service not found: <key>`; a call value run under two providers
   runs two implementations, Effect and Stream.
3. Effect, Stream and Sink operations keep their kind; `Effect.andThen`/`tap`/`flatMap` call an operation.
4. A record writes one slot per member and none of its own; its read is a plain object of the members, equal to the
   one built from the slots, through overlays and flat maps alike; a missing member is a defect naming it.
5. An override wins for its member, directly and through the record; the other order has the record win;
   `Layer.mock`; an override's read is a copy, a write's read is kept.
6. A slot under two names is a defect at the definition: alias, nested shared member, overlapping subsets.
7. Receivers: an operation passes no receiver; an implementation that reads `this` is bound to the object that
   provides it, plain or class, from the key, a bare call, a record read, a destructured read, a copy and
   `Effect.andThen`; a closure and any other member are stored as provided (identity, properties, statics, a class
   constructor as a value); a method provided alone dies on `this`, and as a closure runs; a sibling called through
   the operation sees an override, and `this.sibling` does not.
8. Subsets, nested and reference members, `pick`/`omit`, and keys built from a member's string.
9. Costs: the counted rows under "Cost".

**Types**, `packages/effect/typetest/Context.tst.ts` and `FileSystem.tst.ts`, and the prototype's `check-errors`
fixtures for the diagnostics' text: a call's parameters, result and `R`; an operation is a `Slot`, not a `Key`;
wrong overrides rejected; kind errors; a record's identity is the union of its members'; partial records and subsets
rejected naming the shape; a slot under two names rejected naming the slot; the one-line form prints as `Of<…>`.

**Migration and bundles**: `test/FileSystem.test.ts` (with `make` and the derived layers keeping the primitive they
were given), `test/http/HttpPlatform.test.ts` (the build-time read), `test/Terminal.test.ts`,
`packages/platform/node-shared/test/NodeFileSystem.test.ts` and `NodeTerminal.test.ts`,
`test/FileSystem/treeShaking.test.ts` (five roots, one build), `typetest/http/HttpPlatform.tst.ts`, `typetest/Logger.tst.ts`, doctests for every new export, and the
prototype's `pnpm verify` (`check`, `check-errors`, `bundle`).

## Acceptance criteria

- [ ] A program using 2 of the 32 `FileSystem` operations, provided with their two layers, bundles those two
      implementations and no Stream runtime (`treeShaking.test.ts`).
- [ ] A test overrides one operation with `Effect.provideService(FileSystem.readFile, fake)` or a layer, and the
      operation, the record read and `ReadOnly` all see it.
- [ ] No operation has a default: an unprovided operation is a compile error naming its key, and a replaced
      implementation is not in the bundle.
- [ ] A `Layer<FileSystem>` satisfies every member requirement; `HttpPlatform.layer` and `Logger.toFile` need only
      their operations.
- [ ] A slot has one name in a record, enforced at the definition; an operation passes no receiver, and an
      implementation that reads `this` is bound to the object that provides it, from every call site of the
      operation, in the suite and in a bundle; a closure keeps its identity.
- [ ] One rule for siblings: what an implementation calls is fixed where it is provided unless its shape requires it;
      `FileSystem.make(impl)` is closed over `impl`, derived and consuming layers (`HttpPlatform.layer`) keep the
      dependencies they were built with, and no lookup falls back from the context to a default
      (`FileSystem.test.ts`, `HttpPlatform.test.ts`).
- [ ] The costs test passes in CI; ordinary keys cost what they cost at the branch point.
- [ ] `pnpm check`, `check-tsc`, `lint`, `circular`, `jsdocs --check` and the suites above are clean.
