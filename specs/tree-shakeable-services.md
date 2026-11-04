# Tree-shakeable services

A program that calls two operations of a fifty-operation service should bundle those two implementations and nothing
else, and a test should still be able to replace one operation. This spec adds one idea to `effect/Context`, at two
granularities, defines it precisely enough to implement, implements it in `packages/effect/src/Context.ts`,
`packages/effect/src/Stream.ts` and `packages/effect/src/Sink.ts` on this branch, and ships a prototype under
`specs/tree-shakeable-services/` whose bundle check shows the unused implementations, and the unused parts of the
runtime, are absent from the bundle.

## Summary

An **operation** is a service whose shape produces an Effect, a Stream or a Sink, so the lookup of its implementation
can be folded into the thing it produces. A **record service** is a group of members, stored one slot each. Both are
ordinary `Context.Service` keys; the second differs from today's record services only in where the implementation is
stored. Members that cannot absorb a lookup (a plain value, a synchronous function) are ordinary `Context.Service`
keys and take part in the record the same way.

```ts
// contract module: keys only, no implementations; declared the way effect declares every key
export const readFile: Context.Operation<"effect/FileSystem/readFile", (path: string) => Effect.Effect<Uint8Array, PlatformError>> =
  Context.Operation("effect/FileSystem/readFile")
export const stream: Stream.Operation<"effect/FileSystem/stream", (path: string) => Stream.Stream<Uint8Array, PlatformError>> =
  Stream.Operation("effect/FileSystem/stream")
// … 28 more, then the record service, whose identity is the union of the keys above
const members = { readFile, stream /* … */ }
export type FileSystem = Context.Operations.Identifier<typeof members>
export interface Shape extends Context.Operations.Shape<typeof members> {}
export const FileSystem: Context.Operations<FileSystem, Shape> = Context.Operations("effect/FileSystem", members)
// a record over three of the same members: a reader's one named requirement
export const ReadOnly: Context.Operations<ReadOnly, ReadOnlyShape> = Context.Operations("effect/FileSystem/ReadOnly", { exists, readFile, stat })

// a program calls an operation like a function; the key lands in R
const bytes = yield* FileSystem.readFile("/etc/hosts")
//    Effect<Uint8Array, PlatformError, "effect/FileSystem/readFile">
// or yields the record, as it does today; the whole identity lands in R
const fs = yield* FileSystem.FileSystem
//    Effect<FileSystem.Shape, never, FileSystem>
// a member that is an Effect rather than a function is called with no arguments
const width = yield* Terminal.columns()
//    Effect<number, never, "effect/Terminal/columns">

// an implementation module provides one operation like any service
export const readFile = Layer.succeed(FileSystem.readFile.service, (path) => Effect.tryPromise(...))
// an aggregate provides the record like any service, and that provides every operation
export const layer = Layer.succeed(FileSystem.FileSystem, record) // Layer<FileSystem>
// merging the thirty operation layers is also a Layer<FileSystem>, and three of them a Layer<ReadOnly>; no helper

// a test replaces one operation like any service, on top of either
program.pipe(Effect.provideService(FileSystem.readFile.service, () => Effect.succeed(bytes)))
```

Nothing else is new. Providing, overriding, merging, precedence and yielding go through `Context`, `Layer` and
`Effect` as they are today. An operation call returns a plain Effect, or a plain Stream or Sink when the operation was
defined with `Stream.Operation` or `Sink.Operation`; there is no value that is both. The implementation of an
operation nobody calls is never imported, so the bundler drops it, and a program that uses no Stream operation carries
no Stream runtime. A missing implementation is a compile error naming the key, or the record's name.

The prototype's bundle check, on a 30-operation file system contract and a 6-member terminal contract:

```
main.ts (two operation layers)                          227.8 kB    2 of 30 implementations   Stream runtime absent
main-readonly.ts (ReadOnly subset, three member layers) 228.3 kB    3 of 30 implementations   Stream runtime absent
main-twenty.ts (twenty operation layers)                235.3 kB   20 of 30 implementations   Stream runtime absent
main-terminal.ts (two terminal layers, one value-shaped) 226.9 kB   2 of 6 terminal members    Stream runtime absent
main-stream.ts (one Stream operation)                   431.8 kB    1 of 30 implementations   Stream runtime present
main-record.ts (yield* FileSystem, record layer)        444.7 kB   30 of 30 implementations   Stream runtime present
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
shape produces an Effect, a Stream or a Sink, plus the one thing such a shape needs to read well: you can call it, and
the lookup of the implementation happens when the result runs. A **record service** (`Context.Operations`) is a key
whose shape is a record of its members' shapes and whose slot is spread: providing it writes each member under that
member's key, and reading it assembles the record from those slots. A member is an operation or any other key.

| Form      | Key                                                                                        | Shape                   | Use                               | Provide                               |
| --------- | ------------------------------------------------------------------------------------------ | ----------------------- | --------------------------------- | ------------------------------------- |
| operation | `readFile: Context.Operation<"…/readFile", Shape> = Context.Operation("…/readFile")`       | `(path) => Effect<…>`   | `yield* readFile(p)`              | `Layer.succeed(readFile.service, fn)` |
| value     | `columns: Context.Operation<"…/columns", Effect<number>> = Context.Operation("…/columns")` | `Effect<number>`        | `yield* columns()`                | `Layer.succeed(columns.service, eff)` |
| service   | `sep: Context.Service<"…/sep", string> = Context.Service("…/sep")`                         | `string`                | `yield* sep`                      | `Layer.succeed(sep, "/")`             |
| record    | `FileSystem: Context.Operations<FileSystem, Shape> = Context.Operations("…", members)`     | `{ readFile, stat, … }` | `(yield* FileSystem).readFile(p)` | `Layer.succeed(FileSystem, record)`   |

The rows are the same storage read at different granularity. There is no bridge between them: the record's provider
populates the members' slots, and the members' providers populate the record's slots. A record over some of another
record's members is a record like any other; see "Subset records".

### Defining operations

A contract module exports one key per member and holds no implementations. The result kind of an operation is fixed
where it is defined: `Context.Operation` for shapes producing an Effect, `Stream.Operation` for shapes producing a
Stream, `Sink.Operation` for shapes producing a Sink. A shape is either a function returning that kind, or a value of
that kind.

```ts
// FileSystem.ts
import * as Context from "effect/Context"
import * as Stream from "effect/Stream"

export const readFile: Context.Operation<
  "effect/FileSystem/readFile",
  (path: string) => Effect.Effect<Uint8Array, PlatformError>
> = Context.Operation("effect/FileSystem/readFile")
export const makeTempFileScoped: Context.Operation<
  "effect/FileSystem/makeTempFileScoped",
  (options?: { readonly prefix?: string }) => Effect.Effect<string, PlatformError, Scope.Scope>
> = Context.Operation("effect/FileSystem/makeTempFileScoped")
export const stream: Stream.Operation<
  "effect/FileSystem/stream",
  (path: string, options?: { readonly chunkSize?: number }) => Stream.Stream<Uint8Array, PlatformError>
> = Stream.Operation("effect/FileSystem/stream")
// … 27 more

// Terminal.ts: a member that is an Effect, not a function
export const columns: Context.Operation<"effect/Terminal/columns", Effect.Effect<number>> = Context.Operation(
  "effect/Terminal/columns"
)
```

Every constructor has the two call forms `Context.Service` has. `Context.Operation(key)` takes the key and the shape
from the declaration's type, the way `export const Path: Context.Service<Path, Path> = Context.Service("effect/Path")`
is written today; a key that disagrees with the annotation is a compile error, and a declaration without a type is
rejected with a message saying what to add. `Context.Operation<Shape>()(key)` takes the shape explicitly and infers
the key as a literal, for code that does not annotate declarations. The first form is a single call, which is what
lets a bundler treat it as pure from an annotation on the constructor; see "Tree-shaking".

The key string is the identity of the operation at both levels: it is the slot the implementation is stored under at
run time, and it is the type that appears in `R` while the operation is unprovided. The convention is
`<package>/<Service>/<operation>`. Two operations with the same key are the same operation, in the types and at run
time, which is the rule `Context.Service` has today.

Giving a Stream shape to `Context.Operation` is a compile error (`does not satisfy the constraint 'EffectSignature'`);
the fix is `Stream.Operation`. So is giving it a shape that is neither a function returning an Effect nor an Effect.
Each result kind with an `unwrap` has the same ten-line constructor in its own module (`Stream.Operation` over
`Stream.unwrap`, `Sink.Operation` over `Sink.unwrap`); `Context.ts` knows nothing about any of them at run time.

### Which members are operations, and why

A member is an operation when its shape is an Effect, a Stream or a Sink, or a function returning one. Only such a
shape can absorb the lookup: the result is run later, inside a fiber that has a context, so the key can read its
implementation at that moment and continue with it. A plain value (`Path.sep: string`) or a synchronous function
(`Path.join: (...parts) => string`) has no later moment; it is a `Context.Service` and is yielded, which is the same
idea at value granularity. Both kinds are per-slot services, and a record service accepts both as members, so every
record service in `effect` can become a `Context.Operations`:

| Member shape                                   | Kind                                  | Standalone use                          | In the record                     |
| ---------------------------------------------- | ------------------------------------- | --------------------------------------- | --------------------------------- |
| `(path: string) => Effect<Uint8Array>`         | `Context.Operation`                   | `yield* readFile(path)`                 | `fs.readFile(path)`               |
| `Effect<number>`                               | `Context.Operation`                   | `yield* columns()`                      | `yield* terminal.columns`         |
| `(path: string) => Stream<Uint8Array>`         | `Stream.Operation`                    | `stream(path)`                          | `fs.stream(path)`                 |
| `Stream<Event>` / `Sink<…>` / `(…) => Sink<…>` | `Stream.Operation` / `Sink.Operation` | `events()` / `sink(path)`               | unchanged                         |
| `string`, `(...parts: string[]) => string`     | `Context.Service`                     | `yield* sep`, `(yield* join)("a", "b")` | `path.sep`, `path.join("a", "b")` |
| a record service                               | `Context.Operations`                  | `yield* ReadOnly`                       | `platform.fs.readFile(path)`      |

A value-shaped operation is called with no arguments: `Terminal.columns()` is `Effect<number, never,
"effect/Terminal/columns">`, and the record keeps the member as the Effect it is today, so `(yield* Terminal).columns`
and an implementation `{ columns: Effect.sync(() => process.stdout.columns) }` are unchanged. The one rule, "an
operation is called", holds for every operation; a value is a function of no arguments.

Whether a service is _worth_ migrating is a separate question: the gain is one implementation module per member, so
`Path`, whose fifteen members are small synchronous functions sharing one implementation, gains nothing and stays a
plain record service. `FileSystem` and `Terminal`, whose members pull in `node:fs`, `node:readline` and the Stream
runtime, are the worked migrations below.

### Defining the record service

The record service is built from the members, after them, in the same module:

```ts
const members = { access, chmod, /* … */ readFile, stream, /* … */ writeFileString }

export type FileSystem = Context.Operations.Identifier<typeof members>
export interface Shape extends Context.Operations.Shape<typeof members> {}
export const FileSystem: Context.Operations<FileSystem, Shape> = Context.Operations("effect/FileSystem", members)
```

`FileSystem` the type is the union of the thirty keys, and the alias gives that union a name that TypeScript keeps in
diagnostics (`Layer<FileSystem, never, never>`, `Type 'FileSystem' is not assignable to type 'never'`). `Shape` is the
record of the members' shapes, declared as an interface so that diagnostics print `Shape` rather than thirty members
(`is not assignable to parameter of type 'Shape'`). `FileSystem` the value is a `Context.Service<FileSystem, Shape>`
with its members attached. Both types are declared by the author and checked against the members, as
`Context.Service<Self, Shape>()` already asks for `Self` and `Shape`: passing an identifier or a shape that differs
from the members' is a compile error naming where it differs
(`"Self differs from the members' identifier at": "effect/FileSystem/writeFile"`,
`"Shape differs from the members' shape at": "writeFile"`).

Because the identity is the union of the keys, the relationships a user expects hold by ordinary assignability, with
no new rule:

- `Layer<FileSystem>` satisfies `"effect/FileSystem/readFile"`: `Exclude<"…/readFile", FileSystem>` is `never`.
- `Layer<"effect/FileSystem/readFile">` does not satisfy `FileSystem`.
- `Layer.mergeAll(all thirty operation layers)` is assignable to `Layer<FileSystem>`; the prototype's `node/layer.ts`
  is exactly that with the annotation, and a merge of some of them is rejected with the missing keys in the error.
- `Effect<_, _, "…/readFile" | "…/writeFile">` is assignable to `Effect<_, _, FileSystem>`, so an author may annotate a
  function with the record's name.

A record may be a member of a record (`{ fs: FileSystem.ReadOnly, terminal: Terminal }`): its slots are spread the
same way, its identity joins the union, and `yield*` assembles it nested. A `Context.Reference` may be a member: its
default is read when its slot is empty, as `Context.get` does for it on its own.

### Subset records

A record service over some of another record's members is a record service like any other; nothing distinguishes it
from the full record except which members it lists. This is how a consumer names a short, stable requirement without
asking for the whole service:

```ts
const readOnlyMembers = { exists, readFile, stat }
export type ReadOnly = Context.Operations.Identifier<typeof readOnlyMembers>
export interface ReadOnlyShape extends Context.Operations.Shape<typeof readOnlyMembers> {}
export const ReadOnly: Context.Operations<ReadOnly, ReadOnlyShape> = Context.Operations("effect/FileSystem/ReadOnly", readOnlyMembers)

export const sizeOf = (path: string): Effect.Effect<number, PlatformError, FileSystem.ReadOnly> => …
```

The facts a user needs, all pinned in `typetest/ok/signatures.ts` and `typetest/errors/subset-not-full.ts`, all by
assignability of unions:

1. The full record satisfies the subset: `const a: Layer<ReadOnly> = NodeFileSystem.layer`.
2. The member layers merged satisfy the subset: `const b: Layer<ReadOnly> = Layer.mergeAll(exists, readFile, stat)`.
3. The subset satisfies each of its members: `FileSystem.readFile(p).pipe(Effect.provide(readOnlyLayer))` has `R = never`.
4. A program over three operations is assignable to `Effect<_, _, ReadOnly>` and runs under either provider.
5. The subset does not satisfy the full record: `Layer<ReadOnly>` is not a `Layer<FileSystem>`, and the error names the
   first member it lacks (`Type '"effect/FileSystem/access"' is not assignable to type 'ReadOnly'`).
6. The subset is a key: `yield* ReadOnly` assembles three slots, `Layer.succeed(ReadOnly, {...})` writes three.

The bundle check's `main-readonly.ts` provides the three member layers to `sizeOf` and contains three
implementations.

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

**How `R` grows, and the author's three choices.** Inferred requirements list every operation a function calls: a
function using fifteen operations shows fifteen keys, and adding a sixteenth call changes its public type. That is the
precise truth about what the function needs, and it is what lets a composition root provide exactly that. An author
who wants a shorter or more stable public type has two names to annotate with:

```ts
// a subset record: short, stable, and satisfied by three member layers or by the whole file system
export const sizeOf = (path: string): Effect.Effect<number, PlatformError, FileSystem.ReadOnly> => …
// the full record: stable, and requires the whole file system
export const exerciseStable = (root: string): Effect.Effect<unknown, PlatformError, FileSystem> => exercise(root)
```

The subset keeps every bundle-size property of the precise union with one name; the full record trades them for
never having to name a subset. All three forms are in the prototype (`program.ts`, `program-readonly.ts`,
`program-twenty.ts`), and the error texts are pasted under "Type-level evidence".

### Providing operations

An implementation module provides one operation with the existing layer constructors:

```ts
// node/readFile.ts
export const readFile = Layer.succeed(
  FileSystem.readFile.service,
  (path) => Effect.tryPromise({ try: () => fs.readFile(path), catch: toPlatformError })
)

// a value-shaped operation's implementation is the value
export const columns = Layer.succeed(Terminal.columns.service, Effect.sync(() => process.stdout.columns ?? 80))

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

**What you provide is a key.** A record is a key, so it is provided as itself. An operation is a function, and a
function cannot be a key without being an Effect, which is the first hazard below; its key is `op.service`. So
`Layer.succeed(FileSystem.FileSystem, record)` and `Layer.succeed(FileSystem.readFile.service, fn)` are the one rule
applied to the two kinds of value. The alternative, accepting an operation wherever a key is accepted, touches the
signatures of `Layer.succeed`, `Layer.effect`, `Layer.sync`, `Layer.mock`, `Effect.provideService`,
`Effect.provideServiceEffect`, `Effect.updateService`, `Context.make`, `Context.add`, `Context.get` and the rest of
`Context`, for one dotted property at provision sites, and is rejected; `Layer.succeed(op, …)` is a compile error
pointing at the parameter type `Key`.

### The record service at run time

`Layer.succeed(FileSystem.FileSystem, record)` writes thirty slots, `"effect/FileSystem/access"` through
`"effect/FileSystem/writeFileString"`, and nothing under `"effect/FileSystem"`. `yield* FileSystem.FileSystem` reads the
thirty slots and returns `{ access, …, writeFileString }`; if a slot is empty it dies with
`Service not found: effect/FileSystem/stat`, naming the member. The assembled record is cached per context, so a
second read from the same context is one `WeakMap` lookup. Because there is only one kind of storage, precedence is
ordinary `Context` precedence for every combination of the forms: the provider closest to the call wins, slot by slot.

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
bundle contains every implementation (444.7 kB against 227.8 kB in the prototype). At run time the first read from a
context assembles thirty slots into one record (about 5 µs, measured below); later reads from the same context cost a
`WeakMap` lookup (about 60 ns, the same as one slot). Calling an operation costs one slot read, like `Service.use`.

### Overriding one operation in a test

```ts
const fakeRead = Layer.succeed(FileSystem.readFile.service, () => Effect.succeed(bytes("faked")))

// the override is closer to the program than the live layer, so it wins
backup("a.txt").pipe(Effect.provide(fakeRead), Effect.provide(live))

// or without a layer
backup("a.txt").pipe(Effect.provideService(FileSystem.readFile.service, () => Effect.succeed(bytes("faked"))))

// or composed into one layer
Layer.provideMerge(fakeRead, live)

// a value-shaped operation is overridden with a value
Terminal.columns().pipe(Effect.provideService(Terminal.columns.service, Effect.succeed(120)))
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
it is deliberately not merged into this one, and a `Reference` can be a member of a record service with exactly its
own semantics. Both halves of the earlier objection to defaults ("this will always keep the base impl even when it
gets replaced, also it doesn't work for things that don't have a default") are answered by not having one.

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
how a contract author writes a generic shape, and breaking it cannot go unnoticed. A value shape has nothing to
derive and is never rejected by this rule.

## API

Additions live in `effect/Context`, `effect/Stream` and `effect/Sink`. No existing export changes signature. Eight
`Context` functions gain a branch for record-service keys, listed under "Existing APIs this touches".

### `Context.Operation` (constructor)

```ts
export const Operation: {
  <Shape extends Operation.EffectSignature>(): <const Key extends string>(
    key: Operation.KeyFor<Key, Shape>
  ) => Operation<Key, Shape>
  <const Key extends string, Shape extends Operation.EffectSignature = never>(
    key: Operation.KeyFor<Key, Shape>
  ): Operation<Key, Shape>
}
```

Two call forms, mirroring `Context.Service`. The flat form infers `Key` from its argument and `Shape` from the
declaration's type; without a declared type `Shape` is `never` and the parameter type is the string
`"Annotate the declaration: Context.Operation<Key, Shape>, or pass the shape: Context.Operation<Shape>()(key)"`.
The curried form takes `Shape` explicitly and infers `Key` as a literal. Both return a function with `name === key`,
the `OperationTypeId` marker and a `service` property. `KeyFor<Key, Shape>` is `Key` when the shape names its key, is
derivable, or is a value, and otherwise a string literal type explaining why the definition is rejected; TypeScript
infers `Key` through it and prints the explanation as the parameter type, as pasted above. The constructor is
declared `/* @__NO_SIDE_EFFECTS__ */`.

### `Stream.Operation` and `Sink.Operation` (constructors)

```ts
export const Operation: {
  <Shape extends Context.Operation.StreamSignature>(): <const Key extends string>(
    key: Context.Operation.KeyFor<Key, Shape>
  ) => Context.Operation<Key, Shape>
  <const Key extends string, Shape extends Context.Operation.StreamSignature = never>(
    key: Context.Operation.KeyFor<Key, Shape>
  ): Context.Operation<Key, Shape>
}
export type Operation<Key extends string, Shape extends Context.Operation.StreamSignature> = Context.Operation<
  Key,
  Shape
>
```

`Sink.Operation` is the same with `SinkSignature`. Same key, same service, same type; a call returns `Stream.unwrap`
(`Sink.unwrap`) of the implementation looked up from the running fiber. Both are implemented on top of an internal
`Context.makeOperation(key, call)`, so `Context.ts` has no run-time dependency on either module, and both are
declared `/* @__NO_SIDE_EFFECTS__ */`. The type aliases exist so a contract can write `Stream.Operation<"…", Shape>`
on a declaration next to `Stream.Operation("…")`.

### `Context.Operation<Key, Shape>` (type)

```ts
export type Operation<Key extends string, Shape extends Operation.Signature> =
  & Operation.Call<Key, NoInfer<Shape>>
  & {
    readonly [OperationTypeId]: OperationTypeId
    readonly service: Service<Key, Shape>
  }

export declare namespace Operation {
  export type EffectSignature = ((...args: any) => Effect<any, any, any>) | Effect<any, any, any>
  export type StreamSignature = ((...args: any) => Stream<any, any, any>) | Stream<any, any, any>
  export type SinkSignature = ((...args: any) => Sink<any, any, any, any, any>) | Sink<any, any, any, any, any>
  export type Signature = EffectSignature | StreamSignature | SinkSignature

  /** The shape when its result requires the key; a derived signature otherwise; `() => Require<Shape, Key>` for a value. */
  export type Call<Key extends string, Shape extends Signature> = Shape extends
    (this: infer This, ...args: infer Args) => infer Result ? [Key] extends [Requirements<Result>] ? Shape
    : (this: This, ...args: Args) => Require<Result, Key>
    : () => Require<Shape, Key>

  export type Requirements<Result> = Result extends Effect<infer _A, infer _E, infer R> ? R
    : Result extends Stream<infer _A, infer _E, infer R> ? R
    : Result extends Sink<infer _A, infer _In, infer _L, infer _E, infer R> ? R
    : never
  export type Require<Result, Key> = Result extends Effect<infer A, infer E, infer R> ? Effect<A, E, R | Key>
    : Result extends Stream<infer A, infer E, infer R> ? Stream<A, E, R | Key>
    : Result extends Sink<infer A, infer In, infer L, infer E, infer R> ? Sink<A, In, L, E, R | Key>
    : never

  /** True when the derived signature is assignable back to the shape. */
  export type Derivable<Shape extends Signature> = …

  /** The key, or the reason the definition is rejected. */
  export type KeyFor<Key extends string, Shape extends Signature> = [Shape] extends [never] ?
    "Annotate the declaration: Context.Operation<Key, Shape>, or pass the shape: Context.Operation<Shape>()(key)"
    : Shape extends (...args: any) => infer Result ? [keyof Shape] extends [never] ?
        [Key] extends [Requirements<Result>] ? Key
        : Derivable<Shape> extends true ? Key
        : `The shape of "${Key}" is generic or overloaded: its result must require "${Key}"`
      : "The shape has properties: an operation is a bare function"
    : Key

  export interface Any {
    readonly [OperationTypeId]: OperationTypeId
    readonly service: Service<any, any>
  }
  export type Key<Op extends Any> = Op["service"]["Identifier"]
  export type Shape<Op extends Any> = Op["service"]["Service"]
}
```

`Operation` is a type alias, not an interface, because its call signature is conditional on the shape. `NoInfer` on
the call-signature half makes the flat constructor infer `Shape` from `service` alone; without it, inference through
the conditional also offered the whole annotated type as a candidate and produced a union. TypeScript keeps the alias
name in diagnostics:

```
typetest/errors/displayed-type.ts(4,14): error TS2322: Type 'Operation<"effect/FileSystem/readFile", (path: string) => Effect<Uint8Array<ArrayBufferLike>, FileSystemError, never>>' is not assignable to type 'string'.
typetest/errors/displayed-type.ts(6,14): error TS2322: Type 'Effect<Uint8Array<ArrayBufferLike>, FileSystemError, "effect/FileSystem/readFile">' is not assignable to type 'string'.
typetest/errors/displayed-type.ts(8,14): error TS2322: Type 'Stream<Uint8Array<ArrayBufferLike>, FileSystemError, "effect/FileSystem/stream">' is not assignable to type 'string'.
```

Shapes that produce neither an Effect, a Stream nor a Sink are rejected by the constraint:

```
typetest/errors/not-an-operation.ts(4,39): error TS2344: Type '(path: string) => string' does not satisfy the constraint 'EffectSignature'.
  Type '(path: string) => string' is not assignable to type '(...args: any) => Effect<any, any, any>'.
    Type 'string' is not assignable to type 'Effect<any, any, any>'.
typetest/errors/not-an-operation.ts(6,40): error TS2344: Type '{ readonly port: number; }' does not satisfy the constraint 'EffectSignature'.
typetest/errors/stream-shape.ts(5,41): error TS2344: Type '(path: string) => Stream<Uint8Array<ArrayBufferLike>, never, never>' does not satisfy the constraint 'EffectSignature'.
```

A value or a synchronous function is a `Context.Service` and is yielded.

### `Context.OperationTypeId` and `Context.isOperation`

```ts
export type OperationTypeId = "~effect/Context/Operation"
export const OperationTypeId: OperationTypeId
export const isOperation: (u: unknown) => u is Operation.Any
```

### `Context.Operations` (constructor)

```ts
export const Operations: {
  <Self, Shape>(): <const Ops extends Operations.Members>(
    key: string,
    members: Operations.Validate<Self, Shape, Ops>
  ) => Operations<Self, Shape>
  <Self, Shape, const Ops extends Operations.Members>(
    key: string,
    members: Operations.Validate<Self, Shape, Ops>
  ): Operations<Self, Shape>
}
```

Creates a `Service(key)` and attaches `OperationsTypeId`, `members`, and, internally, one resolved slot per member
(name, key, nested record if any, whether the key is a reference) and a `WeakMap` cache of assembled records. The
same two call forms: `const FileSystem: Context.Operations<FileSystem, Shape> = Context.Operations("…", members)`
takes `Self` and `Shape` from the declaration, `Context.Operations<Self, Shape>()("…", members)` takes them
explicitly. `Validate<Self, Shape, Ops>` is `Ops` when `Self` is exactly `Identifier<Ops>` and `Shape` exactly
`Shape<Ops>`, and otherwise an object type whose one property names the difference, so the error lands on the
members argument. Declared `/* @__NO_SIDE_EFFECTS__ */`.

### `Context.Operations<Identifier, Shape>` (type)

```ts
export interface Operations<in out Identifier, in out Shape> extends Service<Identifier, Shape> {
  readonly [OperationsTypeId]: OperationsTypeId
  readonly members: { readonly [K in keyof Shape]: Operations.Member }
}

export declare namespace Operations {
  export type Member = Operation.Any | Key<any, any>
  export interface Members {
    readonly [name: string]: Member
  }
  export type MemberIdentifier<M> = M extends Operation.Any ? Operation.Key<M> : M extends Key<infer I, any> ? I : never
  export type MemberShape<M> = M extends Operation.Any ? Operation.Shape<M> : M extends Key<any, infer S> ? S : never
  export type Identifier<Ops extends Members> = { [K in keyof Ops]: MemberIdentifier<Ops[K]> }[keyof Ops]
  export type Shape<Ops extends Members> = { readonly [K in keyof Ops]: MemberShape<Ops[K]> }
  /** The names at which two record shapes differ. */
  export type ShapeDifference<A, B> = …
  export type Validate<Self, S, Ops extends Members> = unknown extends Self ?
    { readonly "Annotate the declaration: Context.Operations<Self, Shape>": Self }
    : [Self] extends [Identifier<Ops>] ? [Identifier<Ops>] extends [Self] ?
        [S] extends [Shape<Ops>] ? [Shape<Ops>] extends [S] ? Ops
          : { readonly "Shape differs from the members' shape at": ShapeDifference<S, Shape<Ops>> }
        : { readonly "Shape differs from the members' shape at": ShapeDifference<S, Shape<Ops>> }
      : { readonly "Self differs from the members' identifier at": Exclude<Identifier<Ops>, Self> }
    : { readonly "Self differs from the members' identifier at": Exclude<Self, Identifier<Ops>> }
}
```

It is a `Service`, so `yield*`, `.use`, `.useSync`, `.of`, `.context`, `Context.Service.Shape<typeof FileSystem>` and
`Context.Service.Identifier<typeof FileSystem>` all apply. `Identifier` is written as a mapped type indexed by its
keys rather than a plain indexed access so that a user's alias of it keeps its name in diagnostics; `Shape` is meant
to be named through `interface Shape extends Operations.Shape<typeof members> {}` for the same reason.

### `Context.OperationsTypeId` and `Context.isOperations`

```ts
export type OperationsTypeId = "~effect/Context/Operations"
export const OperationsTypeId: OperationsTypeId
export const isOperations: (u: unknown) => u is Operations<any, any>
```

`isOperations` is a property read, not an `in` check: keys are functions whose prototype has been replaced, and on
those `in` takes a slow path (about 140 ns) while a read is inline-cached (about 15 ns). The difference is the whole
overhead budget of the ordinary-key hot path.

### Existing APIs this touches

Signatures are unchanged. Eight `Context` functions gain a branch for record-service keys; everything else sees
ordinary keys and values.

| API                                                              | Ordinary key                      | Record-service key                                                                                                                                                        |
| ---------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Context.make(key, value)`                                       | one slot                          | one slot per member, under the member's key; nested records spread the same way                                                                                           |
| `Context.add(self, key, value)`                                  | one overlay                       | a flattened copy with one slot per member                                                                                                                                 |
| `Context.get`, `getUnsafe`, `yield* key`, `key.use`, `useSync`   | the slot                          | the record assembled from the members' slots, cached per context; a missing member throws `Service not found: <member key>`; a reference member falls back to its default |
| `Context.getOption`, `getOrElse`, `getOrUndefined`               | the slot or the fallback          | the record when every non-reference member is present, otherwise the fallback                                                                                             |
| `Context.pick(...keys)`, `Context.omit(...keys)`                 | the slot                          | every member's slot                                                                                                                                                       |
| `Context.addUnsafe`, `getOrUndefinedUnsafe` (string-keyed)       | unchanged                         | unchanged: they address slots, and a record service has no slot of its own                                                                                                |
| `Layer.succeed`, `Layer.effect`, `Layer.sync`, `Layer.mock`      | via `Context.make`                | via `Context.make`, so the members' slots                                                                                                                                 |
| `Effect.provideService`, `provideServiceEffect`, `updateService` | via `Context.add` / `Context.get` | via `Context.add` / `Context.get`                                                                                                                                         |
| `Context.merge`, `mergeAll`, equality, `mapUnsafe`               | slots                             | slots: `mapUnsafe.size` is the member count, and no `"effect/FileSystem"` entry exists                                                                                    |
| `Context.isKey`, `isReference`                                   |                                   | `true`, `false`; `isKey(op)` is `false`, `isKey(op.service)` is `true`                                                                                                    |
| `Effect.andThen`, `Effect.tap`, `Effect.flatMap` given `op`      |                                   | a function, so they call it (`isEffect(op)` is `false`)                                                                                                                   |
| `Effect.map(op, …)`, `yield* op`                                 |                                   | a type error: an operation is not an Effect                                                                                                                               |

`Context.ts` gains type-only imports of `Stream` and `Sink` for the signature types, as `Layer.ts` already has, and
imports `isEffect` from `internal/core.ts`, which it already imports from. `Sink.ts` turns its type-only import of
`Context` into a value import, as `Stream.ts` already has. `pnpm circular` is clean.

## Runtime semantics

**Construction.** `Context.Operation(key)` and `Context.Operation<Shape>()(key)` create `service = Service(key)` and a
function `op` whose `name` is `key`, with `op[OperationTypeId]` and `op.service`. `Stream.Operation` and
`Sink.Operation` do the same through the internal `makeOperation`, passing a different `call`.
`Context.Operations(key, members)` creates `Service(key)`, attaches `members`, resolves each member to its slot once
(an operation's `service`, or the key itself; whether it is a nested record; whether it is a reference) and creates
the record cache. Nothing is looked up at construction. All of them are cheap enough to do at module top level for
every export of a contract; what a bundler makes of them is under "Tree-shaking".

**Calling an Effect operation.** `op(...args)` returns `withFiber((fiber) => …)`: an Effect primitive that, when run,
reads the implementation from the running fiber's context and continues with it: if the implementation is an Effect
(a value-shaped operation) it is the continuation; otherwise it is applied to the call's receiver and arguments and
its result is. `Effect.isEffect` of the call result is `true`, `Stream.isStream` is `false`.

**Calling a Stream or Sink operation.** `op(...args)` returns `Stream.unwrap(service.useSync(…))` (`Sink.unwrap`): a
Stream (Sink) that, when run, reads the implementation from the fiber that pulls it and delegates to the Stream (Sink)
it is or returns, by the same rule. `Stream.isStream` is `true` and `Effect.isEffect` is `false`. Both facts are
pinned by a test.

**Lookup timing.** The implementation is read from the running fiber's context each time the call result runs, not
when `op` is called and not when it is constructed. One call value run under two providers runs two implementations;
this holds for value-shaped and Stream operations too and is what makes `Effect.provideService(op.service, fake)` work
on a call built before the override is applied.

**Receiver.** `op` forwards its `this` to the implementation. A shape that declares a `this` parameter keeps it in the
call signature; an ordinary shape has `this: unknown` and ignores it. Implementations written as arrows or `Effect.fn`
are unaffected.

**Function properties.** A shape with properties is rejected at the definition. `op` has its own properties (`service`,
`name`, `length`) and nothing else; an implementation that needs to expose values beside its function exposes them as
a separate service, which can sit in the same record.

**Missing implementation.** The types prevent running a program whose `R` still contains an operation's key or a
record's identity. If the types are bypassed, `getUnsafe` throws the existing `Service not found: <key>` defect when
the call result runs, naming the member key in the record case.

**Record storage.** `make` and `add` with a record-service key write `slot.service.key → value[slot.name]` for each
slot, recursing into nested records; `add` does so on a flattened copy, which keeps the overlay chain short for thirty
entries. `get` and the getters read each slot with the existing `lookup`, substitute a reference's default for an
empty reference slot, and treat any other empty slot as a miss for the whole record. The assembled record is stored in
the record service's `WeakMap` under the context it was read from; a context is immutable, so the cache needs no
invalidation and lives as long as the context. `pick` and `omit` expand a record-service key to its slots' keys. A
record service is never stored under its own key.

**Precedence.** Ordinary `Context` semantics, slot by slot: the provider closest to the call wins. `Effect.provide(a)`
then `Effect.provide(b)` in a pipe means `a` wins over `b` for keys both provide; `Layer.provideMerge(override, live)`
has `override` win; a record provided inside an operation override wins for that member.

**Cost.** Measured by `pnpm --filter tree-shakeable-services-spec bench` (tinybench, Node 26, one run; absolute
numbers vary by half between runs on this machine, ratios do not). The baseline is the branch point's `Context.ts`
loaded beside this one.

| Case                                                      |   ns/op |
| --------------------------------------------------------- | ------: |
| `getUnsafe`, ordinary key, baseline                       |    53.4 |
| `getUnsafe`, ordinary key, this branch                    |    52.5 |
| `getUnsafe`, operation key (1 of 30 slots)                |    54.6 |
| `getUnsafe`, `ReadOnly` record (3 slots), same context    |    58.5 |
| `getUnsafe`, `ReadOnly` record (3 slots), new context     |   638.4 |
| `getUnsafe`, `FileSystem` record (30 slots), same context |    56.0 |
| `getUnsafe`, `FileSystem` record (30 slots), new context  |  4874.1 |
| `add`, ordinary key, baseline                             |    68.9 |
| `add`, ordinary key, this branch                          |    55.3 |
| `add`, `FileSystem` record (30 slots)                     | 11952.7 |
| `make`, `FileSystem` record (30 slots)                    |  1013.5 |
| `runSync`: `yield* Plain` (a one-slot record service)     |  1428.5 |
| `runSync`: `yield* ReadOnly` (3 slots)                    |  2729.7 |
| `runSync`: `yield* FileSystem` (30 slots), cached         |  4664.0 |
| `runSync`: `yield* FileSystem` (30 slots), uncached       |  4936.5 |
| `runSync`: `readFile(path)` operation call                |  2138.1 |
| `runSync`: `(yield* FileSystem).readFile(path)`           |  4806.8 |
| `runSync`: `(yield* Plain).readFile(path)`                |  1503.7 |

Three readings. The ordinary-key paths are at parity: the record check is one property read. An operation call costs
what one slot read plus one Effect primitive costs. Assembling a thirty-member record is the one real cost (about 160
ns per slot, almost all of it V8 building a thirty-property object one keyed store at a time, which no eval-free
construction improves on), paid once per context thanks to the cache; code on a hot path calls operations or yields
the record once per scope. `add` with a thirty-member record copies the map and is a provision-time cost, not a
per-call one. Thresholds for the implementation are under "Implementation plan".

## Hazards, and what the design does about each

- **Callables that are also Effects.** A `Context.Service` key is a function that is also an Effect. If the operation
  itself were the key, `Effect.andThen(x, op)` would type as a call (the function overload is listed first) but run as
  an Effect (`isEffect` is checked first), returning the implementation instead of calling it. The operation is
  therefore a plain function and the key lives on `.service`. `isEffect(op)` and `isKey(op)` are `false`, for
  value-shaped operations too: a value shape is a function of no arguments, not an Effect with a `service` property.
- **`isEffect`-dispatching duals.** `Effect.andThen` and `Effect.tap` dispatch on `isEffect(f)`; every `dual` with an
  `isEffect(args[0])` predicate (thirty-nine sites in `internal/effect.ts`, `Effect.ts`, `Console.ts`, `Runtime.ts`,
  `http/HttpServer.ts`, `internal/layer.ts` and `internal/executionPlan.ts`) decides data-first against data-last the
  same way. With `op` not an Effect, all of them see a function and the types agree with the runtime.
  `Effect.map(op, f)` is rejected at the type level:

  ```
  typetest/errors/not-an-effect.ts(5,34): error TS2345: Argument of type 'Operation<"effect/FileSystem/readFile", (path: string) => Effect<Uint8Array<ArrayBufferLike>, FileSystemError, never>>' is not assignable to parameter of type 'Effect<unknown, unknown, unknown>'.
  typetest/errors/not-an-effect.ts(8,24): error TS2488: Type 'Operation<"effect/FileSystem/readFile", (path: string) => Effect<Uint8Array<ArrayBufferLike>, FileSystemError, never>>' must have a '[Symbol.iterator]()' method that returns an iterator.
  typetest/errors/value-shape.ts(9,17): error TS2488: Type 'Operation<"effect/Terminal/columns", Effect<number, never, never>>' must have a '[Symbol.iterator]()' method that returns an iterator.
  ```

- **Stream-returning operations.** A call result is exactly one kind of value, decided by which constructor defined
  the operation, so the `isStream`/`isEffect` dispatch sites cannot misclassify it: the thirty-five
  `dual((args) => isStream(args[0]))` sites in `Stream.ts`, the streaming-response check in `HttpApiBuilder.ts`, the
  payload check in `HttpApiClient.ts`, `reactivity/Atom.ts` (which distinguishes functions, Effects and Streams),
  `http/Template.ts`, `cluster/Entity.ts` and the child-process spawners all see an Effect for an Effect operation and
  a Stream for a Stream operation. The kind test is pinned so this stays true.
- **An implementation that is the result.** The call applies the implementation unless it already is the result
  (`isEffect`, `isStream`, `isSink`). A function-shaped operation cannot be given an Effect as its implementation
  without a cast, because no Effect in `effect` has a call signature; a value-shaped operation cannot be given a
  function, because `Layer.succeed(columns.service, …)` takes `Effect<number>`. So the check never changes the meaning
  of a well-typed program; it is what lets one constructor serve both shapes.
- **Receivers.** Forwarded, so method-style use (`holder.greet("x")`) reaches an implementation that declares `this`.
  Tested.
- **Function properties.** Rejected at the definition, so a type can never promise a property the runtime value lacks.
- **Key collisions.** Two operations with the same string are the same key, in `R` and in the map; the types and the
  runtime cannot disagree about identity. The `<package>/<Service>/<operation>` convention keeps keys unique. A subset
  record shares its members' keys with the full record on purpose: that is what makes one satisfy the other.
- **An operation defined outside its record.** An operation with the record's prefix that is not in `members` is
  not part of the record: `Layer<FileSystem>` does not claim it and does not provide it. Nothing is unsound; the
  convention is that a record's members are the ones passed to `Context.Operations`.
- **A partial record.** `Layer.succeed(FileSystem, { readFile })` is rejected (`is not assignable to parameter of type
  'Shape'`). The partial-record test convenience is `Layer.mock`, which claims the whole record and dies on the
  members it lacks, exactly as it does for today's record services.
- **A record assembled, not stored.** `yield* FileSystem` returns an object assembled from slots, not the object that
  was provided. Member functions are copied, so an implementation written as a class instance whose methods read
  non-member state through `this` must bind them; `make(impl)` in `effect/FileSystem` builds a plain object and is
  unaffected. Within one context the assembled object is the same object on every read.
- **Override typing.** An override is the shape, so a wrong parameter type and an added requirement are both rejected:

  ```
  typetest/errors/wrong-override.ts(11,3): error TS2345: Argument of type '(path: number) => Effect.Effect<Uint8Array<ArrayBuffer>, never, never>' is not assignable to parameter of type '(path: string) => Effect<Uint8Array<ArrayBufferLike>, FileSystemError, never>'.
    Types of parameters 'path' and 'path' are incompatible.
      Type 'string' is not assignable to type 'number'.
  typetest/errors/wrong-override.ts(16,13): error TS2375: Type 'Effect<Uint8Array<ArrayBuffer>, never, { readonly value: number; }>' is not assignable to type 'Effect<Uint8Array<ArrayBufferLike>, FileSystemError, never>' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
    Type '{ readonly value: number; }' is not assignable to type 'never'.
  ```

- **`Layer.succeed(op, …)` instead of `Layer.succeed(op.service, …)`.** Rejected: an operation is not a `Key`
  (`typetest/errors/layer-succeed-operation.ts`, pasted below).
- **A value-shaped operation called with arguments.** `Terminal.columns(80)` is `Expected 0 arguments, but got 1`.
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
files under `typetest/errors` and checks each fails for its documented reason, with the repository's
`noErrorTruncation: true`. `typetest/ok/signatures.ts` holds the positive assertions and compiles under `pnpm check`.

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

**An accepted limitation: the record program partially provided.** When two of the thirty operations are provided
to a program whose requirement is `FileSystem`, `Exclude` distributes over the union and the alias is gone; the
remaining twenty-eight keys print in full:

```
typetest/errors/record-requires-all.ts(11,3): error TS2379: Argument of type 'Effect<number, FileSystemError, "effect/FileSystem/access" | "effect/FileSystem/chmod" | "effect/FileSystem/chown" | "effect/FileSystem/copy" | "effect/FileSystem/copyFile" | "effect/FileSystem/exists" | "effect/FileSystem/glob" | "effect/FileSystem/link" | "effect/FileSystem/lstat" | "effect/FileSystem/makeDirectory" | "effect/FileSystem/makeTempDirectory" | "effect/FileSystem/makeTempDirectoryScoped" | "effect/FileSystem/makeTempFile" | "effect/FileSystem/makeTempFileScoped" | "effect/FileSystem/readDirectory" | "effect/FileSystem/readDirectoryEntries" | "effect/FileSystem/readFileString" | "effect/FileSystem/readLink" | "effect/FileSystem/realPath" | "effect/FileSystem/remove" | "effect/FileSystem/rename" | "effect/FileSystem/stat" | "effect/FileSystem/stream" | "effect/FileSystem/symlink" | "effect/FileSystem/truncate" | "effect/FileSystem/utimes" | "effect/FileSystem/watch" | "effect/FileSystem/writeFileString">' is not assignable to parameter of type 'Effect<number, FileSystemError, never>' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Type '"effect/FileSystem/access" | "effect/FileSystem/chmod" | … | "effect/FileSystem/writeFileString"' is not assignable to type 'never'.
    Type '"effect/FileSystem/access"' is not assignable to type 'never'.
```

This is the price of the identity being a union, and the union is what lets per-operation layers satisfy the record.
TypeScript cannot keep an alias through `Exclude`. With the default `noErrorTruncation: false` the list is cut at 160
characters with `...`. The mitigation is the subset record: a program that needs three members names `ReadOnly`, and
"provided two of three" prints one key. Accepted.

The record service declared with the wrong identifier, the wrong shape, or no declared type, each pointing at the
difference; the subset not satisfying the full record; a value-shaped operation called with an argument; an
operation given where a key is expected, and a partial record given where the shape is expected:

```
typetest/errors/wrong-self.ts(11,3): error TS2353: Object literal may only specify known properties, and 'readFile' does not exist in type '{ readonly "Self differs from the members' identifier at": "effect/FileSystem/writeFile"; }'.
typetest/errors/wrong-self.ts(18,26): error TS2353: Object literal may only specify known properties, and 'readFile' does not exist in type '{ readonly "Shape differs from the members' shape at": "writeFile"; }'.
typetest/errors/wrong-self.ts(21,69): error TS2353: Object literal may only specify known properties, and 'readFile' does not exist in type '{ readonly "Annotate the declaration: Context.Operations<Self, Shape>": unknown; }'.
typetest/errors/wrong-self.ts(22,55): error TS2345: Argument of type '"test/unannotated"' is not assignable to parameter of type '"Annotate the declaration: Context.Operation<Key, Shape>, or pass the shape: Context.Operation<Shape>()(key)"'.
typetest/errors/subset-not-full.ts(7,14): error TS2375: Type 'Layer<ReadOnly, never, never>' is not assignable to type 'Layer<FileSystem, never, never>' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Type 'FileSystem' is not assignable to type 'ReadOnly'.
    Type '"effect/FileSystem/access"' is not assignable to type 'ReadOnly'. Did you mean '"effect/FileSystem/exists"'?
typetest/errors/value-shape.ts(6,41): error TS2554: Expected 0 arguments, but got 1.
typetest/errors/layer-succeed-operation.ts(7,44): error TS2345: Argument of type 'Operation<"effect/FileSystem/readFile", (path: string) => Effect<Uint8Array<ArrayBufferLike>, FileSystemError, never>>' is not assignable to parameter of type 'Key<unknown, unknown>'.
typetest/errors/layer-succeed-operation.ts(9,67): error TS2345: Argument of type '{ readFile: () => Effect.Effect<Uint8Array<ArrayBuffer>, never, never>; }' is not assignable to parameter of type 'Shape'.
```

In round 2 the last two printed `Identifier<{ thirty operation types }>` and `Shape<{ thirty operation types }>`.
Three changes fixed them: the identifier message prints the set difference instead of the expected union, the shape
message prints the differing member names, and the shape is declared as an interface, which TypeScript always
prints by name.

What compiles (from `typetest/ok/signatures.ts`, abridged):

```ts
const read: Effect<Uint8Array, FileSystemError, "effect/FileSystem/readFile"> = FileSystem.readFile("a.txt")
const scoped: Effect<string, FileSystemError, Scope | "effect/FileSystem/makeTempFileScoped"> = FileSystem.makeTempFileScoped()
const stream: Stream<Uint8Array, FileSystemError, "effect/FileSystem/stream"> = FileSystem.stream("a.txt")
const stable: Effect<number, FileSystemError, FileSystem> = backup("a.txt") // two operations, annotated with the record
const record: Effect<FileSystem.Shape, never, FileSystem> = FileSystem.FileSystem
const underRecord: Effect<number, FileSystemError, never> = backup("a.txt").pipe(Effect.provide(nodeLayer))
const recordUnderOperations: Effect<number, FileSystemError, never> = backupViaRecord("a.txt").pipe(Effect.provide(nodeLayer))
const succeeded: Layer<FileSystem> = Layer.succeed(FileSystem.FileSystem, record)
const mocked: Layer<FileSystem> = Layer.mock(FileSystem.FileSystem, { readFile: () => Effect.succeed(bytes) })
const readOnlyFromFull: Layer<FileSystem.ReadOnly> = nodeLayer                                     // subset facts 1–5
const readOnlyFromMembers: Layer<FileSystem.ReadOnly> = Layer.mergeAll(nodeExists, nodeReadFile, nodeStat)
const memberFromReadOnly: Effect<Uint8Array, FileSystemError, never> = FileSystem.readFile("a").pipe(Effect.provide(readOnlyLayer))
const readOnlyProgram: Effect<number, FileSystemError, FileSystem.ReadOnly> = sizeOf("a")
const width: Effect<number, never, "effect/Terminal/columns"> = Terminal.columns()                 // value shape
const columnsLayer: Layer<"effect/Terminal/columns"> = Layer.succeed(Terminal.columns.service, Effect.succeed(80))
const terminalRecord: Effect<Terminal.Shape, never, Terminal.Terminal> = Terminal.Terminal          // columns: Effect<number>
const separator: Effect<string, never, "test/Path/sep"> = sep                                       // a service member
const pathRecord: Effect<{ readonly sep: string; readonly join: …; readonly fromFileUrl: … }, never, Path> = Path
const platformIdentity: Platform = … as FileSystem.ReadOnly | Terminal.Terminal                     // a nested record
const parsed: Effect<number, never, "test/parse"> = parse(Number, "42")                             // generic shape naming its key
const formattedDate: Effect<string, never, "test/format"> = format(new Date(), "en")                // overloaded shape naming its key
const greeting: Effect<string, never, "test/greet"> = greeter.greet("x")                            // shape with a `this` parameter
const curriedCall: Effect<number, never, "test/curried"> = curried(1)                               // curried form, key inferred
const collected: Sink<Array<string>, string, never, never, "test/collect"> = collect("x")            // Sink.Operation
```

## Tree-shaking: what the bundler needs, and what the prototype shows

Requirements on code, all of which are the ordinary requirements for anything to tree-shake:

1. One implementation per top-level export, in a side-effect-free module. One module per operation is the simplest
   way to get that and is what the prototype does; several exports in one side-effect-free module also work.
2. The composition root imports implementation modules, or reads members off their namespace. It does not import an
   aggregate unless it wants everything.
3. Aggregates (`layer = Layer.mergeAll(...)`) live in their own module or are `/* @__PURE__ */`-annotated, because an
   unused call expression at top level is retained otherwise.
4. Contract modules hold keys only, and each key's constructor call is known to the bundler to be pure. How that is
   established is the subject of the next section.

The types enforce the half that matters: `R` names what to import. Nothing in the design depends on a rule that the
types cannot check except rules 3 and 4, which are the general rules for any top-level call in any bundled code.

### Pure constructor calls: who establishes it

An unannotated contract costs more than its keys. A key is a few bytes, but a retained `Stream.Operation(...)` call
retains `Stream.Operation`, whose closure references `Stream.unwrap`, and with it the Stream runtime: the two-operation
root grows from 227.8 kB to 434.4 kB under esbuild with the contract's annotations removed. The bundle check's last
four roots measure every way of telling the bundler the calls are pure:

| Root (`main.ts`, two operations)                          |     Size | Keys kept           | Stream runtime |
| --------------------------------------------------------- | -------: | ------------------- | -------------- |
| annotated contract, esbuild                               | 227.8 kB | readFile, writeFile | absent         |
| unannotated contract, esbuild                             | 434.4 kB | all 30 + record     | present        |
| unannotated contract, esbuild after `annotate-pure-calls` | 227.8 kB | readFile, writeFile | absent         |
| unannotated contract, Rolldown                            | 877.3 kB | readFile, writeFile | present        |
| annotated contract, Rolldown                              | 424.5 kB | readFile, writeFile | absent         |

What each row establishes:

- **The constructors are declared `/* @__NO_SIDE_EFFECTS__ */`**, and the flat call form exists so that the
  annotation can apply: esbuild and Rolldown honour it only on a direct call of the annotated function, never on
  `Operation<Shape>()(key)`, where the outer call's callee is a call. Rolldown reads it across modules and drops the
  unused keys and the record service; esbuild (0.28) reads it only within one file, so for a contract it does
  nothing. Neither bundler prunes the modules a dropped statement imported: Rolldown keeps the Stream runtime after
  dropping every Stream key. So declaration-level annotations alone are not enough in any bundler, and the spec does
  not rely on them; they are kept because they are free and because they are the half Rolldown does read.
- **The published `effect` package needs nothing from its users.** `packages/effect`'s build runs
  `babel-plugin-annotate-pure-calls` over `dist`, which annotates every top-level call, curried or flat, with
  `/*#__PURE__*/`. The third row simulates that on the stripped contract and recovers the first row exactly. This is
  how every `Context.Service("…")` key in `effect` shakes today, and `effect/FileSystem`'s operations will shake the
  same way with no annotation in the source.
- **A contract bundled from source needs `/* @__PURE__ */` on each constructor call.** That is any contract inside
  this repository consumed by the repository's own bundle tests, and any application-level contract bundled from
  TypeScript by esbuild (Wrangler, tsup, Bun) or Rolldown (Vite). The annotation is therefore a hard requirement,
  not a recommendation, and `scripts/check-annotations.ts` is the rule: it fails if any `Context.Operation`,
  `Stream.Operation`, `Sink.Operation` or `Context.Operations` call in an initializer position lacks it (39
  declarations in the prototype), and runs in `verify`. Issue 2 brings the same rule to `packages/*/src` under
  `pnpm lint`.

### What the prototype shows

The prototype (`specs/tree-shakeable-services/`) models `effect/FileSystem` as 30 operations, three of them
Stream-returning and two needing `Scope`, plus `effect/Terminal` as six members, five of them Effects, with one Node
implementation module each, and nine composition roots. `pnpm --filter tree-shakeable-services-spec bundle` builds
each with esbuild (and the annotation matrix with Rolldown too) and reports which implementation modules and which
`packages/effect/src` modules it contains, by metafile and by a per-implementation marker string:

```
Bundle sizes (esm, unminified)

  main.ts (two operation layers)                                         227.8 kB
  main-namespace.ts (two layers off a namespace)                         227.8 kB
  main-readonly.ts (ReadOnly subset, three member layers)                228.3 kB
  main-stream.ts (one Stream operation)                                  431.8 kB
  main-twenty.ts (twenty operation layers)                               235.3 kB
  main-record.ts (yield* FileSystem, record layer)                       444.7 kB
  main-full.ts (two operations, record layer)                            443.4 kB
  main-terminal.ts (two terminal layers, one value-shaped)               226.9 kB
  main.ts (unannotated contract, esbuild)                                434.4 kB
  main.ts (unannotated contract, esbuild, babel annotate-pure-calls)     227.8 kB
  main.ts (unannotated contract, rolldown)                               877.3 kB
  main.ts (annotated contract, rolldown)                                 424.5 kB

  main.ts              contains 2 of 30 implementations: readFile, writeFile
  main-readonly.ts     contains 3 of 30 implementations: exists, readFile, stat
  main-stream.ts       contains 1 of 30 implementations: stream
  main-twenty.ts       contains 20 of 30 implementations: access, copy, copyFile, exists, lstat, makeDirectory, …
  main-record.ts       contains 30 of 30 implementations: all
  main-terminal.ts     contains 2 of 6: columns, display

Stream runtime modules in each bundle (packages/effect/src)

  main.ts              53 effect modules    Stream runtime absent
  main-readonly.ts     53 effect modules    Stream runtime absent
  main-stream.ts       77 effect modules    Stream runtime present (Stream.ts, Channel.ts, Sink.ts, internal/stream.ts)
  main-twenty.ts       53 effect modules    Stream runtime absent
  main-record.ts       77 effect modules    Stream runtime present (Stream.ts, Channel.ts, Sink.ts, internal/stream.ts)
  main-terminal.ts     53 effect modules    Stream runtime absent

  node dist/main.js <file>: backed up 6 bytes of <file>
  node dist/main-stream.js <file>: <file> has 6 bytes
  node dist/main-readonly.js <file>: <file> is 6 bytes
  node dist/main-terminal.js <file>: displayed at 80 columns

OK: every bundle contains exactly the implementations its program uses, Effect-only roots carry no Stream runtime, and the shaken bundles run
```

The check fails if an unused implementation appears in any bundle, a used one is missing, or a root whose program uses
only Effect operations contains `Stream.ts`, `Channel.ts`, `Sink.ts`, `internal/stream.ts` or `internal/channel.ts`.
(`Pull.ts` is imported by `Queue.ts` and `Schedule.ts`, so every root carries it; it is not evidence either way.) It
then runs four of the bundles against a temporary file.

Three readings of the numbers. The two-operation root and the twenty-operation root differ by 7.5 kB: the
implementations themselves are small, and the 53 `effect` modules they share are the Effect/Layer/Context core that
any program carries. The record roots cost 444 kB not because of thirty implementations but because three of them
return Streams, which pulls the Stream runtime (24 modules, about 200 kB); the Stream root shows the same jump with a
single implementation. And the contract module costs nothing a root does not use: only the two keys the program
references survive in `main.ts`, and the record service is gone.

## Migrating an existing record service: `effect/FileSystem`

`effect/FileSystem` today exports `interface FileSystem` (the record shape, 32 members, with a `[TypeId]` brand),
`const FileSystem: Context.Service<FileSystem, FileSystem>`, `make(impl)` (which derives `exists`, `glob`,
`readFileString`, `stream`, `sink` and `writeFileString` from the primitives), `makeNoop`/`layerNoop`, and the
`WatchBackend` service. Providers: `NodeFileSystem.layer` and `DenoFileSystem.layer`, each `Layer.effect(FileSystem,
Effect.map(serviceOption(WatchBackend), (backend) => make({...}))`, plus `layerNoop` in tests and docs. Consumers: 57
`yield* FileSystem` sites across `effect` (http, cli, persistence, logger, config, schema), and user code. The module
is `@stability unstable`.

The migration has three phases. Each is a PR that is mergeable and verifiable on its own, and nothing in a later phase
is needed for an earlier one to work.

### Phase 1: the contract gains operations, the key becomes the record service

In `packages/effect/src/FileSystem.ts`:

- One operation per member of the interface, exported under the member's name, declared as
  `export const readFile: Context.Operation<"effect/FileSystem/readFile", (path: string) => Effect<…>> = Context.Operation("effect/FileSystem/readFile")`
  with the member's signature. `stream`, `glob` and `watch` use `Stream.Operation`; `sink` uses `Sink.Operation`.
  `open`, `makeTempDirectoryScoped` and `makeTempFileScoped` keep `Scope` in their shapes.
- `export const FileSystem: Context.Operations<FileSystem, Shape> = Context.Operations("effect/FileSystem", members)`
  replaces `Context.Service("effect/FileSystem")`; `export type FileSystem = Context.Operations.Identifier<typeof members>`
  replaces the interface as the identity; `export interface Shape extends Context.Operations.Shape<typeof members> {}`
  is the record shape. The `[TypeId]` brand property is dropped (nothing reads it).
- `make(impl)` keeps its signature and returns a `Shape`; `makeNoop` and `layerNoop` keep theirs.

**What keeps working, unchanged:** every `yield* FileSystem` and `FileSystem.use(...)`; every `Layer<FileSystem>` and
`Effect<_, _, FileSystem>` annotation, because the name `FileSystem` still denotes the identity of the whole service;
`Layer.succeed(FileSystem, make(impl))`, `Layer.effect(FileSystem, …)`, `layerNoop({...})` and `Layer.mock(FileSystem,
{...})`, which now write 32 slots instead of one; `NodeFileSystem.layer` and `DenoFileSystem.layer` without a line
changed, which now also satisfy every operation key.

**Every way the `FileSystem` type identity changes.** Listed so the changeset can be honest:

1. `FileSystem.FileSystem` the _type_ stops being the record and becomes the union of 32 key literals. Code that
   used it as a value type fails to compile and says `FileSystem.Shape` instead: `fs: FileSystem.FileSystem`,
   `FileSystem.FileSystem["readFile"]`, an object literal typed with it. In this repository that is 46 sites in 9
   files (`DenoFileSystem.ts` 24, `NodeFileSystem.ts` 11, `internal/glob.ts` 1, `tools/graphql-generator` 5,
   `tools/docgen` 3, two tests), all mechanical. `Effect<_, _, FileSystem.FileSystem>`, `Layer<FileSystem.FileSystem>`
   and `Effect.fn.Return<_, _, FileSystem.FileSystem | Path.Path>` are requirement positions and do not change.
2. `Context.Service.Identifier<typeof FileSystem>` is the union; `Context.Service.Shape<typeof FileSystem>` is `Shape`.
3. The `[TypeId]` brand is gone from the shape; `make` returns an unbranded `Shape`. Nothing in the repository reads it.
4. The requirement widens: a `Layer` of all 32 member keys, or `Effect<_, _, "effect/FileSystem/readFile">`, is now
   assignable where `FileSystem` is expected. This is the point of the migration and breaks nothing.
5. The identity no longer survives `Exclude` by name: a `FileSystem` program with some members provided prints the
   remaining keys instead of `FileSystem` (the accepted limitation above).
6. At run time a provided file system occupies 32 slots and none under `"effect/FileSystem"`:
   `Context.getOrUndefinedUnsafe(ctx, "effect/FileSystem")` is `undefined`, `Context.omit(FileSystem)` removes 32
   entries, `ctx.mapUnsafe.size` counts 32.
7. `yield* FileSystem` returns a record assembled from slots, not the object that was provided: the members are the
   same functions, the object is not, and it is the same object on every read from one context. A class-based
   implementation whose methods read non-member state through `this` must bind them; `make(impl)` is unaffected.
8. `Layer.mock(FileSystem, partial)` reads every member of the proxy at provision time rather than at first use.
   Unimplemented members still die when called, not when provided, because the proxy returns a dying function.
9. The declaration file shows `type FileSystem = …` and `interface Shape` where it showed `interface FileSystem`.

**Semver.** `FileSystem` is `@stability unstable`, and the repository's policy (README, "Stability") is that unstable
APIs may change in minor releases. Phase 1 ships in a minor under that policy, as a breaking change declared as one.
A deprecation window in which `FileSystem.FileSystem` is still usable as the record type is not possible: one name
cannot denote both the identity and the shape, and keeping the interface as the identity is the "record's identity
as the record interface" alternative rejected below, under which per-operation layers can never satisfy the record.
The change is detected at compile time and the fix is one word; a codemod in `scripts/codemods` that rewrites
`FileSystem.FileSystem` outside requirement positions to `FileSystem.Shape` is offered with the PR.

**Changeset** (`.changeset/filesystem-operations.md`):

````md
---
"effect": minor
---

`effect/FileSystem` is now a record service of operations. Each member is its own key, callable directly, so a program bundles only the operations it calls once the platform packages provide them per operation (next release):

```ts
const bytes = yield * FileSystem.readFile(path) // Effect<Uint8Array, PlatformError, "effect/FileSystem/readFile">
Effect.provideService(FileSystem.readFile.service, () => Effect.succeed(fake)) // override one member in a test
```
````

**Breaking** (`@stability unstable`): `FileSystem.FileSystem` the _type_ is now the identity of the whole service (the union of its 32 operation keys), not the record of implementations. Code that used it as a value type uses `FileSystem.Shape`:

- `fs: FileSystem.FileSystem` → `fs: FileSystem.Shape`
- `FileSystem.FileSystem["readFile"]` → `FileSystem.Shape["readFile"]`

Requirements, layers and `yield*` are unchanged: `Effect<A, E, FileSystem.FileSystem>`, `Layer<FileSystem.FileSystem>`, `yield* FileSystem.FileSystem`, `Layer.succeed(FileSystem.FileSystem, FileSystem.make(impl))`, `NodeFileSystem.layer`, `FileSystem.layerNoop` and `Layer.mock(FileSystem.FileSystem, …)` all compile and behave as before. At run time a provided file system occupies one context slot per member (`effect/FileSystem/readFile`, …) and none under `effect/FileSystem`; `yield* FileSystem.FileSystem` returns a record assembled from those slots, so an implementation written as a class whose methods rely on `this` must bind them.

````
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

### Phase 3: consumers inside `effect` name what they need

`effect/FileSystem` exports the subset records its consumers need, starting with `ReadOnly` over the Effect-returning
readers (`access`, `exists`, `lstat`, `readDirectory`, `readDirectoryEntries`, `readFile`, `readFileString`,
`readLink`, `realPath`, `stat`). The 57 `yield* FileSystem` sites then move, one commit per module:

- Sites that use a few members call them (`ConfigProvider` directory reads, `Logger` file sinks, `cli` completions)
  and expose the precise union, or annotate `FileSystem.ReadOnly` where they want one name.
- Sites that read and stream files (`HttpServerResponse.file`, `HttpStaticServer`) annotate
  `FileSystem.ReadOnly | "effect/FileSystem/stream"`.
- Sites that genuinely use many members, or hand the record to other code, keep `yield* FileSystem`.

Each consumer ends up with one named requirement that a user satisfies with `NodeFileSystem.layer` as before, or
with the member layers it lists. This phase is incremental and nothing depends on it.

### What a user sees at each phase

| User code                                                                                   | Phase 1                 | Phase 2                           | Phase 3                                 |
| ------------------------------------------------------------------------------------------- | ----------------------- | --------------------------------- | --------------------------------------- |
| `yield* FileSystem` + `NodeFileSystem.layer`                                                | unchanged; whole bundle | unchanged; whole bundle           | unchanged; whole bundle                 |
| `FileSystem.readFile(p)` + `NodeFileSystem.layer`                                           | compiles; whole bundle  | compiles; whole bundle            | compiles; whole bundle                  |
| `FileSystem.readFile(p)` + `NodeFileSystem.readFile`                                        | not yet available       | two implementations in the bundle | two implementations in the bundle       |
| `HttpServerResponse.file` + `NodeFileSystem.layer`                                          | whole bundle            | whole bundle                      | compiles; member layers now suffice     |
| test: `Effect.provideService(FileSystem.readFile.service, fake)` on top of any of the above | works                   | works                             | works                                   |
| test: `FileSystem.layerNoop({ readFile })` / `Layer.mock(FileSystem, {...})`                | unchanged               | unchanged                         | unchanged                               |
| `fs: FileSystem.FileSystem` as a record type                                                | `fs: FileSystem.Shape`  |                                   |                                         |

## A second migration: `effect/Terminal`

`effect/Terminal` is the shape `FileSystem` is not: six members, five of them Effects rather than functions
(`columns`, `rows`, `size`, `readInput`, `readLine`) and one function (`display`), one provider
(`NodeTerminal.layer`, a scoped `Effect` that wires `readline` and `stdin` once and builds all six), and ten consumers
in `cli/Prompt.ts` plus sixteen elsewhere in the repository. `@stability unstable`. The prototype's `src/Terminal.ts`
and `src/node/terminal/` are this migration at phase 2, and `main-terminal.ts` is its bundle check: a program that
displays a banner at the terminal's width carries `columns` and `display` and neither reader.

### Phase 1

```ts
export const columns: Context.Operation<"effect/Terminal/columns", Effect.Effect<number>> = Context.Operation("effect/Terminal/columns")
export const rows: Context.Operation<"effect/Terminal/rows", Effect.Effect<number>> = Context.Operation("effect/Terminal/rows")
export const size: Context.Operation<"effect/Terminal/size", Effect.Effect<Queue.Dequeue<Size, Cause.Done>, never, Scope.Scope>> = Context.Operation("effect/Terminal/size")
export const readInput: Context.Operation<"effect/Terminal/readInput", Effect.Effect<Queue.Dequeue<UserInput, Cause.Done>, never, Scope.Scope>> = Context.Operation("effect/Terminal/readInput")
export const readLine: Context.Operation<"effect/Terminal/readLine", Effect.Effect<string, QuitError>> = Context.Operation("effect/Terminal/readLine")
export const display: Context.Operation<"effect/Terminal/display", (text: string) => Effect.Effect<void, PlatformError>> = Context.Operation("effect/Terminal/display")

const members = { columns, rows, size, readInput, readLine, display }
export type Terminal = Context.Operations.Identifier<typeof members>
export interface Shape extends Context.Operations.Shape<typeof members> {}
export const Terminal: Context.Operations<Terminal, Shape> = Context.Operations("effect/Terminal", members)
export const make = (impl: Shape): Shape => impl // was Omit<Terminal, typeof TypeId>; the brand goes
````

A consumer writes `yield* Terminal.columns()` where it wrote `const terminal = yield* Terminal; yield* terminal.columns`,
and `yield* Terminal.display(text)` where it wrote `yield* terminal.display(text)`. The record keeps `columns:
Effect<number>`, so `NodeTerminal.make`, `Terminal.make({...})` in tests and `(yield* Terminal).columns` do not change.
The identity changes exactly as `FileSystem`'s does; the value-type uses are three, all in `cli/Prompt.ts`
(`terminal: Terminal.Terminal`, `Terminal.Terminal["readInput"]`), and become `Terminal.Shape`. Changeset: as above,
with the member list.

### Phase 2

`NodeTerminal` becomes one module per member. `columns`, `rows` and `display` are one-liners over `process.stdout`.
`readInput`, `readLine` and `size` share the `stdin`/`readline` setup that `make(shouldQuit)` does once today; that
setup becomes an internal scoped service, `NodeTerminal/Input` (a `Context.Service` whose layer owns the `readline`
interface and the keypress listener), and each of the three members is `Layer.effect(Terminal.readInput.service,
Effect.map(Input, …))` provided with it. A root that only displays never imports `Input`, so neither `readline` nor
the key-event parser is in its bundle, which is what `main-terminal.ts` measures (226.9 kB, two of six members).
`NodeTerminal.layer` is the merge, annotated `Layer<Terminal>`, with `Input` provided inside; `NodeTerminal.make(shouldQuit)`
keeps its signature as the aggregate builder.

### Phase 3

The ten `Prompt.ts` sites read `columns`, `readInput` and `display`; the prompt runner takes `Terminal.Shape` by
parameter in three places and keeps doing so. Each prompt's requirement becomes `"effect/Terminal/columns" |
"effect/Terminal/readInput" | "effect/Terminal/display"`, or `Terminal.Interactive`, a subset record over those three
exported from `effect/Terminal`, so a CLI that never prompts carries no reader.

### What a user sees

| User code                                                                    | Phase 1                    | Phase 2                  |
| ---------------------------------------------------------------------------- | -------------------------- | ------------------------ |
| `const t = yield* Terminal; yield* t.columns` + `NodeTerminal.layer`         | unchanged                  | unchanged; whole bundle  |
| `yield* Terminal.columns()` + `NodeTerminal.layer`                           | compiles; whole bundle     | compiles; whole bundle   |
| `yield* Terminal.display(s)` + `NodeTerminal.display`                        | not yet available          | one member in the bundle |
| test: `Effect.provideService(Terminal.columns.service, Effect.succeed(120))` | works                      | works                    |
| test: `Terminal.make({...})` / `Layer.mock(Terminal, {...})`                 | unchanged                  | unchanged                |
| `terminal: Terminal.Terminal` as a record type                               | `terminal: Terminal.Shape` |                          |

### And `effect/Path`

`Path` has fifteen members: thirteen synchronous functions and a string, plus `fromFileUrl` and `toFileUrl`, which
return Effects. It can be a record service (`sep` and `join` as `Context.Service<"effect/Path/sep", string>` and
`Context.Service<"effect/Path/join", (...parts: ReadonlyArray<string>) => string>`, the two URL conversions as
operations; the prototype's mixed-record test is this shape), but there is nothing to shake: the implementation is one
module of small functions, and a program that uses `join` wants `normalize` with it. `Path` stays a plain record
service, and the rule under "Which members are operations" is what says so: a service is worth migrating when its
members have implementations worth separating.

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
driver. PR #10369 implemented it and is open; this spec keeps its callable-not-key wrapper and its acceptance of
values beside functions, and replaces the defaulted `Reference` with a required `Service`.

### Bundler-side property shaking (Rolldown)

A third avenue, explored separately: teach the bundler to drop unused properties from service records by tracking
demand from `Context` lookups to provider object literals. The investigation found Rolldown has no property-level
shaking or value-flow machinery to build on, so the analysis has to be Effect-specific and keyed on service identity;
a plugin proof of concept recovered up to 41% on closed-world programs but bailed out on exported entry points,
Streams, forks, reflection and direct `Context` access, and a native fork handles only the `Layer.effect` plus
`yield* Key` base case so far. It is complementary: it attacks existing record services without changing user code,
at the cost of a bundler fork and a list of bailouts. This spec gives library authors a way to make the guarantee
unconditional for the services they choose to expose per operation.

### The previous rounds of this design

The first round had the operation primitive but a call result that was both an Effect and a Stream, and a record form
joined to the operations by hand-written bridges. The second round fixed the result kind at the definition
(`Stream.Operation`) and made the record a key with spread storage (`Context.Operations`), so the two forms share one
store; those two decisions stand. It also left five things this round changes:

- **Only all-operation records.** `Members` admitted operations only, so a record with a plain value or an
  Effect-valued member could not migrate. Now a member is an operation or any key, a shape that is an Effect, Stream
  or Sink is an operation called with no arguments, and the rule for which is which is stated.
- **One call form, and a bundle that depended on call-site annotations the spec called optional.** The curried form
  defeats declaration-level purity annotations in every bundler. The flat form mirrors `Context.Service(key)`, the
  constructors are declared pure, the annotation matrix measures what each bundler does with that, and the call-site
  annotation is a lint-enforced requirement for source-bundled contracts rather than a suggestion.
- **An identifier parameter but an inferred shape.** `Operations<Self, Ops>` printed the thirty members whenever the
  shape appeared in an error. `Operations<Self, Shape>` takes both, as `Context.Service<Self, Shape>()` does, and the
  shape is an interface.
- **Phase 1 described as non-breaking.** The identity change is listed in nine points, the semver decision is made
  under the stability policy, and the changeset is written.
- **Costs asserted, not measured.** The benchmark exists; the record check went from an `in` probe to a property
  read, the slot resolution and the closure in `getUnsafe` moved out of the hot path, and the assembled record is
  cached per context.

### Alternatives rejected within this design

- **The operation is the key** (one object that is both callable and a `Service`). Best possible ergonomics for
  providing, but a callable that is also an Effect is exactly the first hazard above, and every `Effect | function`
  acceptance site in the library and in user code would type one way and run the other. Rejected.
- **An operation accepted wherever a key is** (`Layer.succeed(FileSystem.readFile, impl)`). Removes one dotted
  property at provision sites at the cost of widening eleven signatures across `Layer`, `Effect` and `Context` and a
  runtime unwrapping in each. "What you provide is a key" is one rule; this would be two. Rejected.
- **A value-shaped operation that is itself an Effect** (`yield* Terminal.columns` with no call). The runtime object
  would have to be an Effect for value shapes and a function for function shapes, and the constructor cannot tell the
  shapes apart at run time, so this needs a second constructor (`Effect.Operation`) or a flag, and the same again
  for Streams and Sinks. Calling a value with no arguments keeps one constructor per kind and one rule. Rejected.
- **Effect-valued members as zero-argument function shapes in the record** (`columns: () => Effect<number>`). One
  concept, but it changes the record shape of every migrated service with such members, so `Terminal.make`,
  `(yield* Terminal).columns` and every implementation break for no gain over calling the value. Rejected.
- **Effect-valued members as plain services** (`Context.Service<"…/columns", Effect<number>>`). Nothing new, but
  standalone use is `yield* yield* Terminal.columns`, and a record with such members cannot be used per member without
  that. Rejected in favour of the value shape.
- **A defaulted variant** (`Operation<Shape>()(key, { defaultValue })` backed by `Reference`). One extra overload,
  zero runtime cost, and it brings back all three reasons overridable was set aside. Rejected; `Context.Reference` and
  `yield*` remain for genuinely defaulted values, and a `Reference` may be a record member.
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
- **Inferring the record's identity and shape instead of taking `Self` and `Shape`.** Works, and the class-style
  `Context.Service` has the same two forms, but the inferred union prints as `Identifier<{ thirty operation types }>`
  and the inferred shape as `Shape<{ … }>` in every diagnostic that involves the key. The declared form, with the
  aliases, was kept; the flat constructor takes them from the declaration so nothing is written twice.
- **Only the curried form.** Shorter, and it infers the key, but no bundler can treat `f()(key)` as pure from an
  annotation on `f`, and `effect` annotates every exported key's declaration anyway. Both forms were kept, as
  `Context.Service` has both.
- **Derived call signatures only**, with `op.service.use((f) => f(...))` as the escape hatch for generics. Fully
  general, but it moves the special case to every call site of every generic operation. Naming the key in the shape
  keeps it at the single declaration, and the derivability check makes forgetting impossible. Rejected.
- **Class-style operations** (`class ReadFile extends Context.Operation<…>()("…") {}`). A class cannot be called
  without `new`. Rejected.
- **An identifier type parameter for operations** (`Operation<Self, Shape>`). Two operations with the same shape
  would alias in `R` unless each carried a brand; the key string is already unique and already nominal, and it prints
  better in errors. Rejected.
- **No record cache.** Simpler, and a thirty-member read costs about 5 µs each time. A context is immutable and the
  cache lives in a `WeakMap` keyed by it, so there is no invalidation and no leak; the cost is one `WeakMap` read on
  the hit path and one write on the miss path. Kept.

## Scope

In scope: `Context.Operation`, `Context.Operations` and their types, `Stream.Operation`, `Sink.Operation`,
`isOperation`, `isOperations`, the record-service branches in `Context`, tests, JSDoc, benchmarks, a bundle
regression test, the annotation lint rule, a changeset, the three-phase migration of `effect/FileSystem` with its
Node and Deno providers, and the migration of `effect/Terminal` with `NodeTerminal`. Out of scope: bundler plugins,
migrating other record services (each follows one of the two recipes and is its own issue; `Path` is not worth one),
and the ai-docs example (tracked separately, since the equivalent example was removed from PR #10369 pending a
decision on ai-docs).

## Implementation plan

Eight issues. The first two are the primitive and its guards; each later one is mergeable and verifiable on its own.

1. **`Context.Operation`, `Context.Operations`, `Stream.Operation` and `Sink.Operation`.** The code on this branch in
   `packages/effect/src/Context.ts`, `Stream.ts` and `Sink.ts`, moved from spec quality to release quality: runtime
   tests in `packages/effect/test/Context.test.ts`, type tests in `packages/effect/typetest/Context.tst.ts`, JSDoc
   (already in place and passing `pnpm jsdocs --check` and `pnpm doctest`), a benchmark under
   `packages/effect/benchmark/Context.ts` with the cases above, changeset `effect: minor` with `@stability unstable`.
   Acceptance criteria and test plan below, including the cost thresholds.
2. **Bundle regression test and annotation rule.** An esbuild test in `packages/effect/test` following
   `test/ai/McpServer/Workerd.test.ts`, bundling a fixture like the prototype's `main.ts` and asserting the unused
   implementation markers are absent, the used ones present, and no Stream runtime module is in the output; and the
   rule from `scripts/check-annotations.ts` applied to `packages/*/src` under `pnpm lint` (as an oxlint JS plugin
   rule, or a script in `scripts/` until oxlint's plugin API is stable): every `Context.Operation`,
   `Stream.Operation`, `Sink.Operation` and `Context.Operations` call in an initializer carries `/* @__PURE__ */`.
3. **`effect/FileSystem` phase 1.** Operations for the 32 members, the record service, the `FileSystem.Shape` rename
   at its 46 use sites, `make`/`makeNoop`/`layerNoop` unchanged in signature, the changeset above, the codemod.
   Verified by the existing FileSystem, Node and Deno test suites passing unchanged, plus new tests that an operation
   call runs under `NodeFileSystem.layer` and that `Effect.provideService(FileSystem.readFile.service, fake)`
   overrides one member of it.
4. **`effect/FileSystem` phase 2, Node.** Per-operation modules under `NodeFileSystem/`, derived-operation layers in
   `effect/FileSystem`, the aggregate rebuilt as the merge. Verified by the bundle test from issue 2 run against a
   fixture that provides `NodeFileSystem.readFile` and `NodeFileSystem.writeFile`.
5. **`effect/FileSystem` phase 2, Deno and Bun.** The same layout for `DenoFileSystem`; Bun re-exports Node's.
6. **`effect/FileSystem` phase 3.** `FileSystem.ReadOnly`, and the `yield* FileSystem` sites inside `effect` that use
   few members moved to operation calls or a subset annotation, one commit per module, with the module's tests
   unchanged. Verified by a bundle fixture using `HttpServerResponse.file` with member layers only.
7. **`effect/Terminal` phases 1 and 2.** The contract as above, `Terminal.Shape` at its three use sites, `NodeTerminal`
   as one module per member over an internal `Input` service, `NodeTerminal.layer` as the merge. Verified by the
   existing Terminal and cli test suites, and a bundle fixture that displays without reading.
8. **`effect/Terminal` phase 3.** `Terminal.Interactive` and the `cli/Prompt.ts` sites.

The ai-docs example `ai-docs/src/01_effect/03_services/30_operations.ts` (a contract, one implementation per module, a
root importing two, a test overriding one) is opened only once ai-docs are wanted again.

## Test plan

Runtime tests (`packages/effect/test/Context.test.ts`, `describe("Operation")`, `describe("Operations")` and
`describe("Sink.Operation")`), each mirrored in the prototype's `test/Operation.test.ts`, which passes (32 tests):

1. An operation is a function named after its key; `isOperation` is true; `Effect.isEffect` and `Context.isKey` are
   false; `isKey(op.service)` is true and `op.service.key` is the key. The same for the curried and flat forms.
2. A call runs the implementation provided for `op.service` with `Layer.succeed`, `Layer.effect` and
   `Effect.provideService`.
3. Running a call whose key is unprovided (types bypassed) dies with `Service not found: <key>`.
4. A single operation is overridden in a test with the innermost provider winning, through `Effect.provide`,
   `Effect.provideService` and `Layer.provideMerge`.
5. One call value run under two providers runs two implementations (lookup at run time), for an Effect operation, a
   value-shaped operation and a Stream operation.
6. A Stream operation runs its implementation and an override through `Stream.runCollect`, and `Stream.map` composes
   on the call result. A Sink operation runs through `Stream.run`.
7. An Effect operation's call is an Effect and not a Stream; a Stream operation's call is a Stream and not an Effect;
   a Sink operation's call is a Sink and not an Effect.
8. `Effect.andThen`, `Effect.tap` and `Effect.flatMap` call an operation passed as their function.
9. The receiver is forwarded to the implementation.
10. A generic shape naming its key runs with its signature.
11. `Effect.fn` implementations work unchanged.
12. A value-shaped operation is called with no arguments, runs the Effect provided for it, is a function and not an
    Effect, and keeps the member as an Effect in the record so the record view and `Layer.succeed(record, {...})` are
    unchanged.
13. A record service is a key with `isOperations` true and `members` attached.
14. `Layer.succeed(record, value)` provides every member: the per-operation program and the `yield*` program both run
    under it.
15. `yield* record` assembles the record under per-operation layers; with one member unprovided it dies naming the
    member's key.
16. An operation override on top of a record wins for that member, both directly and through the record view; the
    other order has the record win.
17. `Layer.mock(record, partial)` runs the provided member and dies as unimplemented on the others.
18. `Effect.provideService(record, value)`, `Effect.updateService(record, f)`, `Context.make`, `get`, `getOption`,
    `pick` and `omit` behave as in "Existing APIs this touches"; `Context.get` on a missing member throws naming it.
19. A record is stored under its members' keys and never under its own.
20. A record with a plain value, a synchronous function and an operation as members provides all three, assembles
    from member layers, and an override of one member wins on top of the record.
21. A reference member reads its default when its slot is empty and the provided value otherwise.
22. A record that is a member of a record is spread into its members' slots and read back nested; `omit` of the
    outer record removes them all.
23. A subset record is satisfied by the full record and by its member layers at run time, provides its members, and
    writes exactly its members' slots.
24. Two reads of a record from one context return the same object; a read from a context with a member replaced
    returns a different one with the replacement.

Type tests (`packages/effect/typetest/Context.tst.ts`):

1. A call has the shape's parameters and the shape's result with the key added to `R`; `Scope` in the shape stays in
   `R`; a Stream shape returns a Stream; a Sink shape returns a Sink; a value shape returns the value with the key
   added and takes no arguments.
2. Providing `op.service` removes exactly the key; `Layer.succeed(op.service, impl)` is `Layer<Key>`.
3. An override with a wrong parameter type and an override that adds a requirement are rejected.
4. A shape returning a plain value, a non-function non-Effect, and a Stream shape given to `Context.Operation`, are
   rejected.
5. `op` is not assignable to `Effect`; `yield* op` is rejected; `Layer.succeed(op, …)` is rejected.
6. A generic shape naming its key keeps its type parameter; an overloaded shape naming its key keeps both overloads;
   a generic shape whose parameter is only in its parameters is derived; a generic or overloaded shape not naming its
   key, and a shape with properties, are rejected at the definition with the documented messages.
7. A `this` parameter in the shape is part of the call signature.
8. The flat form takes the key and shape from the declaration; a key that disagrees with the declaration is
   rejected; a flat declaration without a type is rejected with the documented message.
9. The record's identity is the union of its members' identifiers, keys and service identifiers alike; a program
   using two operations is assignable to an `Effect` annotated with it; `Layer<Record>` satisfies a member; a member
   layer does not satisfy the record; the merge of every member layer is a `Layer<Record>` and a merge of some is
   rejected naming the missing keys; a wrong `Self`, a wrong `Shape` and an unannotated declaration are rejected
   naming the difference; a partial record given to `Layer.succeed` is rejected against `Shape`.
10. Subset facts 1 to 6 under "Subset records".
11. A nested record's identity is the union of its members' identities.
12. Displayed-type tests pin `Operation<"…", (path: string) => Effect<…>>`, `Effect<…, "…">`, `Stream<…, "…">`,
    `Layer<Record, never, never>`, `Type 'Record' is not assignable to type 'never'` and
    `is not assignable to parameter of type 'Shape'`.

Doctests: the JSDoc examples for `Context.Operation`, `Context.Operations`, `Stream.Operation` and `Sink.Operation`
run under `pnpm doctest` (they do on this branch: 275 doctests across the three modules).

Benchmarks (`packages/effect/benchmark/Context.ts`, the cases in "Cost"): run in CI for the numbers, with the
thresholds in the acceptance criteria checked by a test that runs the four ratios with a generous bound.

Bundle test (issue 2): fixture root bundled with esbuild; assert each unused implementation marker is absent, each
used one present, no Stream runtime module present, and that the bundle runs. Annotation rule: a fixture with one
unannotated constructor call fails `pnpm lint`.

## Acceptance criteria

- [ ] `Context.Operation`, `Context.Operation<Key, Shape>` with the `Operation` namespace types, `Context.OperationTypeId`,
      `Context.isOperation`, `Context.Operations`, `Context.Operations<Identifier, Shape>` with the `Operations`
      namespace types, `Context.OperationsTypeId` and `Context.isOperations` are exported from `effect/Context`,
      `Stream.Operation` (constructor and type) from `effect/Stream` and `Sink.Operation` (constructor and type) from
      `effect/Sink`, with the signatures in "API".
- [ ] Every constructor has both call forms; the flat form takes key and shape from the declaration and rejects an
      undeclared shape with the documented message; the constructors are declared `/* @__NO_SIDE_EFFECTS__ */`.
- [ ] An operation is a plain function (`isEffect` false, `isKey` false) whose `name` is its key, carrying
      `OperationTypeId` and `service: Context.Service<Key, Shape>`; a value-shaped operation is a function of no
      arguments.
- [ ] A call to an Effect operation is an Effect and not a Stream; a call to a Stream (Sink) operation is a Stream
      (Sink) and not an Effect; `Context.ts` has no run-time import of `Stream`, `Sink` or `Channel`, and a bundle of
      a program using only Effect operations contains no Stream runtime module.
- [ ] The implementation is looked up from the running fiber's context each time the call result runs, with the call's
      receiver forwarded; an implementation that is already the result is used as is.
- [ ] `Operation.KeyFor` accepts a shape that names its key, is derivable, or is a value, and rejects generic and
      overloaded shapes that do not name their key and shapes with properties, with the messages in "Generic,
      overloaded and property-bearing shapes".
- [ ] A record service is a `Context.Service` whose members are operations or keys and whose identity is the union of
      its members' identifiers; `Context.make`, `add`, `get`, `getOption`, `getOrElse`, `getOrUndefined`, `pick` and
      `omit` treat it as in "Existing APIs this touches", including nested records and reference members, and no
      other `Context`, `Layer` or `Effect` export changes behaviour.
- [ ] `Validate` rejects a wrong identifier, a wrong shape and an undeclared type with the three documented messages,
      each naming the difference and none printing the members.
- [ ] The merge of every member layer is assignable to `Layer<Record>`; a subset record satisfies the six facts under
      "Subset records"; `Layer.mock` on a record service dies only on the members it lacks.
- [ ] Cost, by the benchmark, as ratios to the same run's baseline: ordinary-key `getUnsafe` and `add` within 10% of
      the branch point; an operation-key `getUnsafe` within 10% of an ordinary-key one; a cached 30-member record
      read within 2× an ordinary-key read; an uncached 30-member assembly under 10 µs and a 30-member `Context.add`
      under 20 µs on the CI runner.
- [ ] The runtime tests, type tests, doctests and bundle test in "Test plan" pass; `pnpm check`, `pnpm lint` (including
      the annotation rule), `pnpm jsdocs --check` and `pnpm circular` are clean.
- [ ] JSDoc on every new export follows the repository conventions, with "Required, not defaulted", the shape rule
      and "a value is called with no arguments" under **Gotchas**, and `@stability unstable`.
- [ ] Changeset `effect: minor`.
- [ ] PR against `v4/next-minor`.
