# Tree-shakeable services

A program that calls two operations of a fifty-operation service should bundle those two implementations and nothing
else, and a test should still be able to replace one operation. This spec adds one idea to `effect/Context`, at two
granularities, and defines it precisely enough to implement. This document is normative: the design, the API, the
runtime semantics, the hazards, the migration, the implementation plan, the test plan and the acceptance criteria. The
evidence (benchmark and count tables, the bundle matrix, the compiler output, the compile cost), the later migration
phases and the record of decisions are in [the appendix](./tree-shakeable-services/appendix.md).

The implementation is on this branch: `packages/effect/src/Context.ts`, `Stream.ts` and `Sink.ts`, with runtime tests
in `packages/effect/test/Context.test.ts`, type tests in `packages/effect/typetest/Context.tst.ts`, the cost gate in
`packages/effect/benchmark/context/` and a bundle test in `packages/effect/test/FileSystem/treeShaking.test.ts`;
`effect/FileSystem` and `effect/Terminal` migrated to record services over operations, with tests, changesets and a
codemod; and a prototype under `specs/tree-shakeable-services/` whose bundle check shows which implementations each
composition root carries.

## Summary

An **operation** is a function stored in the context like a service: calling it calls the implementation stored under
its key. A member whose shape is an Effect rather than a function is an operation too: the Effect that runs the
implementation stored under its key. A **record service** is a `Context.Service` whose members are such keys, and it is
its members and nothing else. Everything that provides, reads, overrides, picks or omits a key accepts both, because
all of them accept a `Context.Slot`: the identifier, shape and string every key has, and that an operation has too.

```ts
// contract module: keys only, no implementations; each operation and its shape written once
export const readFile = Context.Operation<(path: string) => Effect.Effect<Uint8Array, PlatformError>>()(
  "effect/FileSystem/readFile"
)
export const stream = Stream.Operation<(path: string) => Stream.Stream<Uint8Array, PlatformError>>()(
  "effect/FileSystem/stream"
)
// a member that is an Effect keeps its shape: the operation is that Effect with the key in R
export const columns = Context.Operation.value<Effect.Effect<number>>()("effect/Terminal/columns")
// … 28 more, then the record: its shape and identity derived from the members, named so diagnostics print the names
const members = { readFile, stream /* … */ }
export interface Shape extends Context.Operations.Shape<typeof members> {}
export type FileSystem = Context.Operations.Identifier<typeof members>
export const FileSystem = Context.Operations<FileSystem, Shape>()("effect/FileSystem", members)
// a record over ten of the same members: a reader's one named requirement
export const ReadOnly = Context.Operations<ReadOnly, ReadOnlyShape>()("effect/FileSystem/ReadOnly", readOnlyMembers)

// a program calls an operation like a function, or yields one that is an Effect; the key lands in R
const bytes = yield* FileSystem.readFile("/etc/hosts")
//    Effect<Uint8Array, PlatformError, "effect/FileSystem/readFile">
const width = yield* Terminal.columns
//    Effect<number, never, "effect/Terminal/columns">
// or yields the record, as it does today; the whole identity lands in R
const fs = yield* FileSystem.FileSystem
//    Effect<FileSystem.Shape, never, FileSystem>

// an implementation module provides one operation like any key
export const readFile = Layer.succeed(FileSystem.readFile, (path) => Effect.tryPromise(...))
// an aggregate provides the record like any key, and that provides every operation
export const layer = Layer.succeed(FileSystem.FileSystem, record) // Layer<FileSystem>
// merging the thirty operation layers is also a Layer<FileSystem>, and ten of them a Layer<ReadOnly>; no helper

// a test replaces one operation like any key, on top of either
program.pipe(Effect.provideService(FileSystem.readFile, () => Effect.succeed(bytes)))
```

Nothing else is new. Providing, overriding, merging, precedence and yielding go through `Context`, `Layer` and
`Effect` as they are today; the key parameter of the functions that take one widens from `Context.Key` to the new
`Context.Slot`, and `Context.Key` itself is unchanged. An operation call returns a plain Effect, or a plain Stream or
Sink when the operation was defined with `Stream.Operation` or `Sink.Operation`; an operation defined with
`Context.Operation.value` is a plain Effect; there is no value that is both a function and an Effect. The
implementation of an operation nobody calls is never imported, so the bundler drops it. A missing implementation is a
compile error naming the key, or the record's name.

At run time a record service is its members: providing it writes one slot per member and nothing else, and reading it
returns a plain object with every member as its own property, read from those slots, so an override provided on top is
in it. It is not the provided object: identity and `instanceof` do not survive a record read, and a method of a
provided class instance is stored bound to the instance. The ordinary path of `Context` is the branch point's code
behind one `typeof` of the key, and the cost gate holds it to parity.

## The problem

A service in Effect is a record. `yield* FileSystem` gives the whole record, and `Layer.succeed(FileSystem, {...})`
provides the whole record. A bundler can delete an unused top-level binding, but it cannot delete a property from an
object it keeps, so every implementation in the record ships even when the program reads two of them. Tests need to
replace a single operation with a fake, and a program that forgets to provide an implementation should not compile.
What a bundler can do: drop a top-level export that nothing references, drop a module that nothing imports, and track
which members of a namespace import are read. So each implementation has to be a binding of its own, the program has
to reference only the bindings it uses, and the types have to say which ones those are.

## The design

### One idea at two granularities

Every key in Effect is a `Context.Slot`: a string identity, a shape, and a position in the context map. A
`Context.Key` is a slot that is also an Effect, which is what lets `yield* Database` read it. An **operation** is a
slot whose implementation is read when its result runs. For a shape that is a function returning an Effect, a Stream
or a Sink, the operation is a function: calling it returns the shape's result with the key in `R`, and the
implementation is called when that result runs. For a shape that is an Effect, the operation is that Effect with the
key in `R`: running it runs the implementation. A **record service** (`Context.Operations`) is a key whose shape is a
record of its members' shapes: providing it writes each member under that member's key, and reading it reads the
members. A member is any slot.

| Form            | Key                                                                 | Shape                  | Use                               | Provide                                  |
| --------------- | ------------------------------------------------------------------- | ---------------------- | --------------------------------- | ---------------------------------------- |
| operation       | `readFile = Context.Operation<(path) => Effect<…>>()("…/readFile")` | `(path) => Effect<…>`  | `yield* readFile(p)`              | `Layer.succeed(readFile, fn)`            |
| value operation | `columns = Context.Operation.value<Effect<number>>()("…/columns")`  | `Effect<number>`       | `yield* columns`                  | `Layer.succeed(columns, Effect.sync(…))` |
| service         | `sep = Context.Service<string>("…/sep")`                            | `string`               | `yield* sep`                      | `Layer.succeed(sep, "/")`                |
| record          | `FileSystem = Context.Operations("…", { readFile, sep, … })`        | `{ readFile, sep, … }` | `(yield* FileSystem).readFile(p)` | `Layer.succeed(FileSystem, record)`      |

The rows are the same storage read at different granularity, and the same one rule for providing: what you provide
is a key, and every row is a key. There is no bridge between them: the record's provider populates the members'
slots, and the members' slots are what the record's read returns. A record over some of another record's members is a
record like any other ("Subset records").

### Defining operations

A contract module exports one key per member and holds no implementations.

```ts
export const readFile = Context.Operation<(path: string) => Effect.Effect<Uint8Array, PlatformError>>()(
  "effect/FileSystem/readFile"
)
export const makeTempFileScoped = Context.Operation<
  (options?: { readonly prefix?: string }) => Effect.Effect<string, PlatformError, Scope.Scope>
>()("effect/FileSystem/makeTempFileScoped")
export const stream = Stream.Operation<
  (path: string, options?: { readonly chunkSize?: number }) => Stream.Stream<Uint8Array, PlatformError>
>()("effect/FileSystem/stream")
// a member that is an Effect keeps its shape
export const columns = Context.Operation.value<Effect.Effect<number>>()("effect/Terminal/columns")
```

Each constructor has one call form: the shape as the type argument, the key as the one value argument, written once;
the type is inferred (`Operation<"effect/FileSystem/readFile", (path: string) => Effect<…>>`). The form is curried, as
`Context.Service<Self, Shape>()("key")` is, because TypeScript cannot take one type argument explicitly and infer
another in one call.

**Why four constructors.** A call to an operation must return exactly one kind of runtime value, because every
function in `effect` that accepts "an Effect or a Stream" decides which it was given by looking at the value, and a
type argument is erased at run time. So the kind is fixed where the operation is defined: `Context.Operation` for a
function returning an Effect, `Stream.Operation` for a Stream, `Sink.Operation` for a Sink, and
`Context.Operation.value` for a shape that is an Effect rather than a function. The three function constructors accept
the same shapes (`Operation.FunctionSignature`) and each rejects the other kinds on the key argument with a message
naming the constructor to use; a shape that is not a function returning one of the three, or a function given to
`Context.Operation.value`, is rejected by the constraint:

```
typetest/errors/stream-shape.ts(5,88): error TS2345: Argument of type '"test/stream"' is not assignable to parameter of type '"The shape returns a Stream: define it with Stream.Operation"'.
typetest/errors/effect-shape.ts(5,89): error TS2345: Argument of type '"test/readFile"' is not assignable to parameter of type '"The shape returns an Effect: define it with Context.Operation"'.
```

The key string is the identity of the operation at both levels: the slot the implementation is stored under at run
time, and the type in `R` while the operation is unprovided; the convention is `<package>/<Service>/<operation>`. Two
operations with the same key are the same operation, which is the rule `Context.Service` has today.

### Which members are operations

A member is an operation when its shape is a function returning an Effect, a Stream or a Sink, or is an Effect: only
such a shape runs later, inside a fiber that has a context, so the key can read its implementation then. A plain value
(`Path.sep`) or a synchronous function (`Path.join`) is a `Context.Service` and is yielded. All of these are slots, so
every record service in `effect` can become a `Context.Operations` without changing its shape:

| Member shape                               | Kind                      | Standalone use                          | In the record                     |
| ------------------------------------------ | ------------------------- | --------------------------------------- | --------------------------------- |
| `(path: string) => Effect<Uint8Array>`     | `Context.Operation`       | `yield* readFile(path)`                 | `fs.readFile(path)`               |
| `Effect<number>`                           | `Context.Operation.value` | `yield* columns`                        | `yield* terminal.columns`         |
| `(path: string) => Stream<Uint8Array>`     | `Stream.Operation`        | `stream(path)`                          | `fs.stream(path)`                 |
| `(…) => Sink<…>`                           | `Sink.Operation`          | `sink(path)`                            | `fs.sink(path)`                   |
| `string`, `(...parts: string[]) => string` | `Context.Service`         | `yield* sep`, `(yield* join)("a", "b")` | `path.sep`, `path.join("a", "b")` |
| a record service                           | `Context.Operations`      | `yield* ReadOnly`                       | `platform.fs.readFile(path)`      |
| a reference                                | `Context.Reference`       | `yield* indent`                         | `path.indent`                     |

A member that is a Stream or Sink value, rather than a function returning one, has no instance in `effect` and is a
`Context.Service` until one exists. A service is worth migrating when its members have implementations worth
separating: `FileSystem` and `Terminal` (which pull in `node:fs`, `node:readline` and the Stream runtime) are the
worked migrations; `Path`, fifteen small synchronous functions sharing one implementation, stays a plain record.

### The contract recipe

A contract is one operation per member, each with its shape, and three lines for the record: the member list, the
shape, the identity, then the record. Everything after the operations is derived from them; nothing is written twice.

```ts
import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import * as Stream from "effect/Stream"

export const readFile = Context.Operation<(path: string) => Effect.Effect<Uint8Array, PlatformError>>()(
  "effect/FileSystem/readFile"
)
export const writeFile = Context.Operation<(path: string, data: Uint8Array) => Effect.Effect<void, PlatformError>>()(
  "effect/FileSystem/writeFile"
)
export const stream = Stream.Operation<(path: string) => Stream.Stream<Uint8Array, PlatformError>>()(
  "effect/FileSystem/stream"
)

const members = { readFile, writeFile, stream }
export interface Shape extends Context.Operations.Shape<typeof members> {}
export type FileSystem = Context.Operations.Identifier<typeof members>
export const FileSystem = Context.Operations<FileSystem, Shape>()("effect/FileSystem", members)
```

A contract whose operations have a module of their own passes the module imported as a namespace instead of writing
the list (the prototype's layout, `src/FileSystem/operations.ts` and `src/FileSystem.ts`); `effect/FileSystem` and
`effect/Terminal` keep each service in one module and write the list. Bundling is the same either way: the record
module's reference to the namespace keeps every operation in a bundle that uses the record, which such a bundle keeps
anyway, and none in a bundle that uses operations alone.

The one-line form, `Context.Operations("app/Users", { find, create })`, infers the shape and the identity and is right
for application code; in both forms the key exposes its members as properties, so `Users.find(id)` is the operation. A
library declares the names so that diagnostics print `FileSystem` and `Shape` instead of thirty keys or thirty
members. The constructor checks the identity, the shape and the members against each other, and a mismatch is a
compile error on the key argument that reads as a sentence; a member whose name is a property of every key (`use`,
`key`, `members`, `pipe`, `of`, `context`, `useSync`, `toJSON`, `toString`, `Service`, `Identifier`, the type ids:
`Operations.Reserved`) is rejected the same way, and at run time with a defect:

```
typetest/errors/wrong-self.ts(11,82): error TS2345: Argument of type '"test/Partial"' is not assignable to parameter of type '"Self lacks the identifier of \"effect/FileSystem/writeFile\""'.
typetest/errors/wrong-self.ts(19,5): error TS2345: Argument of type '"test/WrongShape"' is not assignable to parameter of type '"Shape is not the members' shape: declare it as interface Shape extends Context.Operations.Shape<typeof members> {}"'.
typetest/errors/wrong-self.ts(21,45): error TS2345: Argument of type '"test/Unknown"' is not assignable to parameter of type '"Give the record its identifier: Context.Operations<Self, Shape>()(key, members)"'.
```

**What is derived from what, and what cannot be.** The members cannot come from the shape, because types are erased.
A runtime helper building the operations from a table of names would keep every key in every bundle (appendix, "What
a kept key costs"). The names cannot be declared after the record either: TypeScript attaches a name to a type only
when the declaration creates it. The recipe above is the floor. One price remains: TypeScript reports an interface
that has no members of its own by its one base type when it lists missing members, so a partial record prints the
parameter by name and the list by the members' shape (`typeof import(…)` with the operations in a module of their own;
the member list, truncated, otherwise):

```
typetest/errors/partial-record.ts(6,67): error TS2345: Argument of type '{ readFile: () => Effect.Effect<Uint8Array<ArrayBuffer>, never, never>; }' is not assignable to parameter of type 'Shape'.
  Type '{ readFile: () => Effect.Effect<Uint8Array<ArrayBuffer>, never, never>; }' is missing the following properties from type 'Shape<typeof import("…/src/FileSystem/operations")>': access, chmod, chown, copy, and 25 more.
```

Because the identity is the union of the keys, the relationships a user expects hold by ordinary assignability:
`Layer<FileSystem>` satisfies `"effect/FileSystem/readFile"`; `Layer<"effect/FileSystem/readFile">` does not satisfy
`FileSystem`; `Layer.mergeAll(all thirty operation layers)` is assignable to `Layer<FileSystem>` and a merge of some
is rejected with the missing keys; `Effect<_, _, "…/readFile" | "…/writeFile">` is assignable to `Effect<_, _,
FileSystem>`. A record may be a member of a record (`{ fs: FileSystem.ReadOnly, terminal: Terminal }`): its slots are
written the same way, its identity joins the union, and `yield*` reads it nested. A `Context.Reference` may be a
member: its default is read when its slot is empty.

### Subset records

A record service over some of another record's members is a record service like any other; nothing distinguishes it
from the full record except which members it lists. Its shape is derived the same way:

```ts
const readOnlyMembers = { exists, readFile, stat }
export interface ReadOnlyShape extends Context.Operations.Shape<typeof readOnlyMembers> {}
export type ReadOnly = Context.Operations.Identifier<typeof readOnlyMembers>
export const ReadOnly = Context.Operations<ReadOnly, ReadOnlyShape>()("effect/FileSystem/ReadOnly", readOnlyMembers)

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
6. The subset is a key: `yield* ReadOnly` reads its members' slots, `Layer.succeed(ReadOnly, {...})` writes them.

At run time the full record and the subset shadow each other slot by slot: a `ReadOnly` provided on top of a
`FileSystem` wins for `readFile`, and `yield* FileSystem` returns the subset's members among the rest; the other order
has the full record win for every member. Both are tested.

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

A call has the shape's parameters and the shape's result with the operation's key added to its requirements; a Stream
operation returns a Stream; `Scope` in the shape stays in `R`. Because an operation is a function and not an Effect,
`Effect.andThen(getPath, FileSystem.readFile)`, `Effect.tap` and `Effect.flatMap` call it; because it is a key,
`Effect.service(FileSystem.readFile)` and `Context.get(context, FileSystem.readFile)` give the implementation as a
value. From the consumer's side the module is the service (`import * as FileSystem`, then `FileSystem.readFile(path)`):
member access on a namespace import is the one object-property pattern bundlers shake. Inferred requirements list
every operation a function calls, which is what lets a composition root provide exactly that; an author who wants a
shorter or more stable public type annotates with a subset record (`FileSystem.ReadOnly`, satisfied by its member
layers or by the whole file system) or with the full record (`FileSystem`). All three forms are in the prototype.

### Providing operations

An implementation module provides one operation with the existing layer constructors, and the operation is the key:

```ts
export const readFile = Layer.succeed(
  FileSystem.readFile,
  (path) => Effect.tryPromise({ try: () => fs.readFile(path), catch: toPlatformError })
)
// a value operation is implemented by the Effect itself
export const columns = Layer.succeed(Terminal.columns, Effect.sync(() => process.stdout.columns ?? 80))
// an implementation that needs another service declares it in the layer, never in the shape
export const makeTempDirectoryScoped = Layer.effect(
  FileSystem.makeTempDirectoryScoped,
  Effect.map(Pool, (pool) => (options) => Effect.acquireRelease(pool.mkdtemp(options), pool.rm))
)
```

The composition root provides the operations the program requires; if one is missing, `runPromise` does not compile
and the error names its key, so the types tell the root what to import:

```
typetest/errors/missing-requirement.ts(5,19): error TS2379: Argument of type 'Effect<number, FileSystemError, "effect/FileSystem/readFile" | "effect/FileSystem/writeFile">' is not assignable to parameter of type 'Effect<number, FileSystemError, never>' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Type '"effect/FileSystem/readFile" | "effect/FileSystem/writeFile"' is not assignable to type 'never'.
    Type '"effect/FileSystem/readFile"' is not assignable to type 'never'.
```

The coarse-grained form is a `Layer<FileSystem>`: every operation layer merged, or the record provided
(`Layer.succeed(FileSystem.FileSystem, record)`, `Layer.effect(FileSystem.FileSystem, makeRecord)`). Either bundles
every implementation, by construction; a library ships both, each in a module of its own.

**What you provide is a slot, and an operation is a slot.** `Layer.succeed(FileSystem.FileSystem, record)` and
`Layer.succeed(FileSystem.readFile, fn)` are the one rule applied to two slots, as are `Effect.provideService`,
`Effect.updateService`, `Layer.effect`, `Layer.mock`, `Context.make`, `Context.add`, `Context.get`, `Context.pick` and
`Context.omit`. `Context.Slot<Identifier, Shape>` is the identifier, the shape and the string that every key has;
`Context.Key` is unchanged and extends it; an operation is a slot that is a function. The key parameter of every
function that provides, reads, picks or omits widens from `Key` to `Slot`, which accepts every call it accepted
before, so `Layer.succeed(readFile, fn)` compiles and `yield* readFile` is a type error.

### The record service at run time

A record is its members. `Context.add(context, FileSystem.FileSystem, record)`, which is what `Effect.provideService`
does, reads the members off `record` once, now, and writes one ordinary overlay per member onto the context, counting
as one addition toward the overlay depth; nothing of the context is copied, so the write costs the same into a context
of three hundred slots as into one of thirty-two. `Context.make` and `Layer.succeed` write the same members into a
flat map. A member `record` lacks is a defect at the write, naming the member's key.

A record read (`yield* FileSystem.FileSystem`, `Context.get`) returns a plain object with every member as its own
property, read from the members' slots: the provided members, with any member provided on top in their place. It is
assembled once per storage (the topmost overlay holding one of the record's slots, or the base map) and remembered, so
a context read twice returns the same object, contexts derived from it by unrelated writes share it, and an override
provided on top (one per request, say) costs one copy of the object beneath it. It is a plain object on every path:
the same slots read through overlays and through a flat map give the same keys in the same order and the same values,
which a test pins. It is not the provided object. `instanceof` and reference identity do not survive a record read; a
non-member property of the provided object is not in it; a method found on a provided class instance's prototype is
stored bound to the instance, so `FileSystem.readFile(p)` standalone, `(yield* FileSystem).readFile(p)` and a method
that reads a private field all run with the instance as `this`. A method that calls a sibling through `this` reads the
instance's member, not an override of it, as a closure in a plain object that calls a sibling closure does.
`FileSystem` and `Terminal` are `@stability unstable` and nothing in the repository depended on identity.

Because there is only one kind of storage, precedence is ordinary `Context` precedence for every combination of the
forms: the provider closest to the call wins, slot by slot. Both orders below are tested, as are `Layer.mock`
(the proxy it builds is read member by member, so `readFile` runs and `stat` dies with `effect/FileSystem:
Unimplemented method "stat"`) and the spread decorators `Effect.updateService(FileSystem, (fs) => ({ ...fs, stat }))`
and `Layer.effect(FileSystem, Effect.map(FileSystem, (fs) => ({ ...fs })))`, which keep every member and the override.

```ts
// a record provided live, one member replaced closer to the program: the fake wins, and the record read has it
program.pipe(Effect.provideService(FileSystem.readFile, fakeRead), Effect.provide(NodeFileSystem.layer))
// the other order: the record is closer, so its readFile wins
program.pipe(Effect.provide(NodeFileSystem.layer), Effect.provideService(FileSystem.readFile, fakeRead))
```

### Overriding one operation in a test

```ts
const fakeRead = Layer.succeed(FileSystem.readFile, () => Effect.succeed(bytes("faked")))
backup("a.txt").pipe(Effect.provide(fakeRead), Effect.provide(live)) // the override is closer, so it wins
backup("a.txt").pipe(Effect.provideService(FileSystem.readFile, () => Effect.succeed(bytes("faked"))))
Layer.provideMerge(fakeRead, live)
```

`live` may be two operation layers or the whole record; the override is the same. A test provides the operations the
program uses; if it forgets one, the test does not compile:

```
typetest/errors/forgotten-override.ts(7,3): error TS2379: Argument of type 'Effect<number, FileSystemError, "effect/FileSystem/writeFile">' is not assignable to parameter of type 'Effect<number, FileSystemError, never>' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Type '"effect/FileSystem/writeFile"' is not assignable to type 'never'.
```

An override is the shape, so a wrong parameter type and an added requirement are both rejected:

```
typetest/errors/wrong-override.ts(11,3): error TS2345: Argument of type '(path: number) => Effect.Effect<Uint8Array<ArrayBuffer>, never, never>' is not assignable to parameter of type '(path: string) => Effect<Uint8Array<ArrayBufferLike>, FileSystemError, never>'.
  Types of parameters 'path' and 'path' are incompatible.
    Type 'string' is not assignable to type 'number'.
typetest/errors/wrong-override.ts(16,13): error TS2375: Type 'Effect<Uint8Array<ArrayBuffer>, never, { readonly value: number; }>' is not assignable to type 'Effect<Uint8Array<ArrayBufferLike>, FileSystemError, never>' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Type '{ readonly value: number; }' is not assignable to type 'never'.
```

### Required, not defaulted

An operation has no default implementation. This is a position, taken for three reasons: a default is bundled with
the key, so a library operation with a default keeps its default in every bundle, including bundles that override it;
platform operations have no universal default (`readFile` on Node, Bun, Deno and a browser are four implementations
and none is the default); and a default hides a missing implementation, so a forgotten override runs the default and
nothing appears in `R`, where without one it is the compile error above. A library that wants "sensible out of the
box" ships a layer and the root imports it. Code that wants a silently replaceable value keeps using
`Context.Reference`, which may be a member of a record service with exactly its own semantics. Both halves of the
earlier objection to defaults ("this will always keep the base impl even when it gets replaced, also it doesn't work
for things that don't have a default") are answered by not having one.

### Generic, overloaded and property-bearing shapes

The call signature of an operation is derived from its shape: the shape's `this` and parameters, and the shape's
result with the key added to `R`. TypeScript cannot rewrite the result of a generic function type without
instantiating its type parameters at their constraints, cannot see past the last overload, and cannot carry a
function's properties onto a value that does not have them at run time. So the constructor checks, at the definition:

> If the shape's result already requires the key, the shape is the call signature, unchanged. Otherwise the derived
> signature must be as precise as the shape (`Operation.Derivable`: the signature derived by `infer` is assignable
> back to the shape), and the shape must be a bare function. Anything else does not compile.

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

`<A>(value: A) => Effect<void>` derives without loss and is accepted; `<A>(d: (s: string) => A) => Effect<A>` does not
(`unknown` is not `A`) and must name its key. Nothing changes at call sites between the two.

## API

Additions live in `effect/Context`, `effect/Stream` and `effect/Sink`. One type is new (`Context.Slot`), the key
parameter of every function that takes a key widens to it, and two existing functions change implementation
(`Effect.service`, `Layer.updateService`); all are under "Existing APIs this touches". No existing type changes.

### `Context.Slot<Identifier, Shape>` (type)

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

The supertype of every key: what `Context.make`, `Context.add`, `Context.get`, `Layer.succeed`, `Effect.provideService`
and the other key-taking functions accept. `Context.Key` is unchanged in its members and its supertypes; it now names
`Slot` as the one it gets `Service`, `Identifier` and `key` from. A `Slot` has no runtime brand of its own: a key is
recognised by `isKey` (`ServiceTypeId`), an operation by `isOperation` (`OperationTypeId`) and a record service by
`isOperations` (`OperationsTypeId`). `Context.Service.Identifier<T>` and `Context.Service.Shape<T>` extract from any
`Slot`. `@stability stable`, since the stable functions are written against it.

### `Context.Operation` (constructor)

```ts
export const Operation: {
  <Shape extends Operation.FunctionSignature>(): <const Id extends string>(
    key: Operation.KeyFor<Id, Shape>
  ) => Operation<Id, Shape>
  readonly value: <Shape extends Operation.EffectValue>() => <const Id extends string>(key: Id) => Operation<Id, Shape>
}
```

One call form each: the shape explicitly, the key inferred as a literal. `Context.Operation<Shape>()(key)` takes a
function shape and returns a function with `name === key`, and `key`, the `OperationTypeId` marker and `toJSON` as own
properties; it carries no `ServiceTypeId`, so `isKey` is false. `KeyFor<Id, Shape>` is `Id` when the shape returns an
Effect and names its key or is derivable, and otherwise a string literal type explaining why the definition is
rejected; TypeScript infers `Id` through it where it can and prints the explanation as the parameter type.
`Context.Operation.value<Shape>()(key)` takes an Effect shape and returns an Effect with the same marker and `key`:
running it reads the implementation from the fiber's context and continues with it.

### `Stream.Operation` and `Sink.Operation` (constructors)

```ts
export const Operation: <Shape extends Context.Operation.FunctionSignature>() => <const Id extends string>(
  key: Context.Operation.KeyFor<Id, Shape, "Stream">
) => Context.Operation<Id, Shape>
export type Operation<Id extends string, Shape extends Context.Operation.StreamSignature> = Context.Operation<Id, Shape>
```

`Sink.Operation` is the same with `"Sink"` and `SinkSignature`. Same key, same type; a call returns `Stream.unwrap`
(`Sink.unwrap`) of the implementation applied to the call's receiver and arguments, looked up from the running fiber.
Both are built on two internals of `Context` (`makeOperation(key, call)`, `applyOperation(operation, receiver, args)`),
so `Context.ts` has no run-time dependency on either module.

### `Context.Operation<Id, Shape>` (type)

```ts
export type Operation<Id extends string, Shape extends Operation.Signature> =
  & Operation.Call<Id, Shape>
  & Slot<Id, Shape>
  & {
    readonly [OperationTypeId]: OperationTypeId
    readonly key: Id
  }

export declare namespace Operation {
  export type EffectSignature = (...args: any) => Effect<any, any, any>
  export type StreamSignature = (...args: any) => Stream<any, any, any>
  export type SinkSignature = (...args: any) => Sink<any, any, any, any, any>
  export type EffectValue = Effect<any, any, any>
  /** What the three function constructors accept; each rejects the other kinds through `KeyFor`. */
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

  /** The kind of value a result is, fixed by the constructor that defines the operation. */
  export type ResultKind = "Effect" | "Stream" | "Sink"
  export type KindOf<Result> = Result extends Effect<any, any, any> ? "Effect"
    : Result extends Stream<any, any, any> ? "Stream"
    : Result extends Sink<any, any, any, any, any> ? "Sink"
    : never
  /** The message for a shape given to the constructor of another kind. */
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

`Operation` is a type alias, not an interface, because its call signature is conditional on the shape. Because an
operation is a `Slot`, `Context.Service.Identifier<typeof readFile>` is its key literal and
`Context.Service.Shape<typeof readFile>` its shape. TypeScript keeps the alias name in diagnostics
(`Operation<"effect/FileSystem/readFile", (path: string) => Effect<…>>`; the appendix has the output). The kind
mismatch message does not repeat the key: TypeScript infers `Id` only from a branch that is `Id` itself.

### `Context.OperationTypeId` and `Context.isOperation`

```ts
export type OperationTypeId = "~effect/Context/Operation"
export const OperationTypeId: OperationTypeId
export const isOperation: (u: unknown) => u is Operation.Any
```

### `Context.Operations` (constructor)

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
```

The two call forms `Context.Service` has. The plain form infers the identifier (the union of the members' identifiers)
and the shape (the record of their shapes). The curried form takes the identifier, and optionally the shape, from the
author: `KeyFor<Self, Shape, Ops>` is `string` when `Self` contains every member's identifier and `Shape`, if given, is
the members' shape, and otherwise a string literal type whose text is the message, so the error lands on the key
argument. `ShapeOf` is the declared shape, or the members' shape when none was declared. A `Self` wider than the
members' union is accepted. `members` is any object whose properties are slots, a module namespace included. Both
forms return the key with the members as its properties (`& Ops`); `Key<Ops>` rejects a member named like a property
of the key. Both forms create a plain object with `ServiceTypeId`, `OperationsTypeId`, `key`, `members`, the members
as properties, and the private state under "Record storage"; nothing is recorded anywhere else.

### `Context.Operations<Identifier, Shape>` (type)

```ts
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
  /** The member names that are also properties of every key, which a record cannot expose as properties of its own. */
  export type Reserved<Ops extends Members> = keyof Ops & keyof Operations<any, any>
  export type Key<Ops extends Members> = [Reserved<Ops>] extends [never] ? string
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
```

It is a `Service`, so `yield*`, `.use`, `.useSync`, `.of`, `.context`, `Context.Service.Shape<typeof FileSystem>` and
`Context.Service.Identifier<typeof FileSystem>` all apply. A member is any slot: an operation, a service, a reference,
or a record service. At run time it is a plain object, not a function like every other key; that is what lets `add`
and the getters recognise it in one `typeof` before any property of the key is read ("Record storage").

### `Context.OperationsTypeId` and `Context.isOperations`

```ts
export type OperationsTypeId = "~effect/Context/Operations"
export const OperationsTypeId: OperationsTypeId
export const isOperations: (u: unknown) => u is Operations<any, any>
```

### Existing APIs this touches

The widening and the two implementation changes are the first three rows; the rest is what each existing function does
with the two new kinds of slot.

| API                                                            | What changes                                                                                                                  |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| The key parameter, `Context.Key<I, S>` → `Context.Slot<I, S>`  | In every key-taking function of `Context`, `Effect`, `Layer`, `Stream`, `Sink` and `Channel` (list below); `Key` is unchanged |
| `Effect.service(key)`                                          | Was `(key) => key`; now reads the key from the fiber's context. Same result for every existing key                            |
| `Layer.updateService(layer, key, f)`                           | Mapped over `key` as an Effect; now maps over `Effect.service(key)`. Same result for every existing key                       |
| `Context.make(key, value)`                                     | A record: a flat map of its members' slots; a member missing from `value` is a defect naming its key                          |
| `Context.add(self, key, value)`, `Effect.provideService`       | A record: one ordinary overlay per member, counting as one addition; a flat map into an empty context or one at `maxDepth`    |
| `Context.get`, `getUnsafe`, `yield* key`, `key.use`, `useSync` | A record: a plain object of the members, or `Service not found: <member key>` for a missing member (reference: its default)   |
| `Context.getOption`, `getOrElse`, `getOrUndefined`             | A record: present when every non-reference member is present, otherwise the fallback                                          |
| `Context.pick(...keys)`, `Context.omit(...keys)`               | A record: every slot it writes. Omitting a member makes the record absent                                                     |
| `Context.addUnsafe`, `getOrUndefinedUnsafe` (string-keyed)     | One slot, by string, always: a member's string is the member; a record's string is no slot of the record                      |
| `Context.merge`, `mergeAll`, flattening, `mapUnsafe`           | Slot by slot, as at the branch point; nothing knows what a record is                                                          |
| `Context.makeUnsafe(map)`                                      | Unchanged; the record is assembled from the map on the first read and remembered for it                                       |
| `Layer.succeed`, `Layer.effect`, `Layer.sync`, `Layer.mock`    | Via `Context.make`: an operation is one slot, a record its members' slots                                                     |
| `Context.isKey`, `isReference`, `isOperation`, `isOperations`  | `isKey(op)` false, `isOperation(op)` true; `isKey(record)` and `isOperations(record)` true; `isReference` false for all three |
| `Effect.andThen`, `Effect.tap`, `Effect.flatMap` given `op`    | A function operation is called (`isEffect(op)` false); a value operation is run (`isEffect(columns)` true), as its type says  |
| `Effect.map(op, …)`, `yield* op`, `Layer.succeed(op, …)`       | Function operation: the first two are type errors, the third is accepted; value operation: all three accepted, not callable   |

The widened functions: `Context.make`, `add`, `addOrOmit`, `get`, `getUnsafe`, `getOption`, `getOrElse`,
`getOrUndefined`, `pick`, `omit`, `isReference`; `Effect.service`, `serviceOption`, `serviceOptional`, `provideService`,
`provideServiceEffect`, `updateService`; `Layer.succeed`, `sync`, `effect`, `mock`, `updateService`; `Stream.service`,
`serviceOption`, `provideService`, `provideServiceEffect`, `updateService`; `Sink.provideService`;
`Channel.provideService`, `provideServiceEffect`, `updateService`. A parameter widened to a supertype accepts every call
it accepted before.

**Why a new type and not a change to `Key`.** `Key` is `@stability stable` and is an Effect, so a user helper
`<I, S>(k: Context.Key<I, S>) => Effect.gen(function*() { return yield* k })` compiles today and must keep compiling in
a minor. Making `Key` the non-Effect brand broke exactly that; adding `Slot` above it breaks nothing. The only
behaviour that moves is in two internal implementations, `Effect.service` and `Layer.updateService`, which return the
same value as before for every existing key; a type test pins that a value typed `Key` is still an Effect.

`Context.ts` gains type-only imports of `Stream` and `Sink` for the signature types, as `Layer.ts` already has, and
imports `withFiberSucceed` from `internal/core.ts`, which it already imports from. `Sink.ts` turns its type-only import
of `Context` into a value import, as `Stream.ts` already has. `pnpm circular` is clean. A bundle that holds no record
carries 275 bytes of `Context.ts` over the branch point once minified (408 bytes as esbuild prints it): the `typeof`
dispatch in `make`, `add`, `pick`, `omit` and the getters; the record code proper hangs off the record key's prototype,
which such a bundle drops. Gated at 512 bytes minified by the prototype's bundle check.

## Runtime semantics

**Construction.** `Context.Operation<Shape>()(key)` creates a function named `key` with `key`, the `OperationTypeId`
brand and `toJSON` as own properties, and `Function.prototype` as its prototype; it has no `ServiceTypeId`.
`Stream.Operation` and `Sink.Operation` do the same through the internal `makeOperation`, passing a different `call`.
`Context.Operation.value<Shape>()(key)` creates an Effect primitive (an `Effectable` whose evaluation reads the slot
from the running fiber's context and continues with the Effect it finds) carrying `OperationTypeId` and `key`.
`Context.Operations(key, members)` creates a plain object with `ServiceTypeId`, `OperationsTypeId`, `key`, `members`,
the members as its own properties (a name already a property of the key is a defect), the private state under
"Record storage", and the prototype's `evaluate`, `use`, `useSync` and `toJSON`. All are cheap enough to do at module
top level for every export of a contract.

**Calling an Effect operation.** `op(...args)` returns `withFiber((fiber) => …)`: an Effect primitive that, when run,
reads the implementation from the running fiber's context and applies it to the call's receiver and arguments; the
result is the continuation. `Effect.isEffect` of the call result is `true`, `Stream.isStream` is `false`.

**Running a value operation.** `yield* columns` evaluates the operation: it reads the implementation, an Effect, from
the running fiber's context and continues with it. `Effect.isEffect(columns)` is `true`, `typeof columns` is `"object"`.

**Calling a Stream or Sink operation.** `op(...args)` returns `Stream.unwrap(applyOperation(op, this, args))`
(`Sink.unwrap`): a Stream (Sink) that, when run, reads the implementation from the fiber that pulls it and delegates to
the Stream (Sink) it returns. `Stream.isStream` is `true` and `Effect.isEffect` is `false`. All three facts are pinned.

**Lookup timing.** The implementation is read from the running fiber's context each time the call result, or the value
operation, runs, not when `op` is called and not when it is constructed. One call value run under two providers runs
two implementations; this holds for Stream operations too and is what makes `Effect.provideService(op, fake)` work on a
call built before the override is applied.

**Receiver.** `op` forwards its `this` to the implementation. A shape that declares a `this` parameter keeps it in the
call signature; an ordinary shape has `this: unknown` and ignores it. A method provided through a record as a class
instance is stored bound to the instance, so standalone and through-the-record calls agree.

**Function properties.** A shape with properties is rejected at the definition. `op` has its own properties (`key`,
`name`, `length`, `toJSON`, the brand) and nothing else; an implementation that needs to expose values beside its
function exposes them as a separate key, which can sit in the same record.

**Missing implementation.** The types prevent running a program whose `R` still contains an operation's key or a
record's identity. If the types are bypassed, the read throws the existing `Service not found: <key>` defect when the
call result runs, naming the member key in the record case.

**Record storage.** A context is what it was at the branch point: a flat base map and a chain of overlays, each
`{ key, value, parent }` with a string key, read by the branch point's `lookup`. Nothing in the context, the overlays,
`lookup`, the flatten or the merge knows what a record is. `make`, `add`, `pick`, `omit` and the getters test the key
with one `typeof` (a record key is the one kind of key that is a plain object) before any property of the key is read,
and send a record to the methods its key carries; every other key takes the branch point's path. The record key holds
its members in order (`slots`: name and slot), the set of every slot it writes (`index`, a member record's slots
included), the member name of each slot that is not a record's (`plain`), and a `WeakMap` of the objects it has
assembled by storage with the last one read in front. That state, the two methods below and the one-line dispatch are
the whole of the record runtime.

```
write(context, value):                             // Context.make, Context.add, Effect.provideService, Layer.succeed
  members = collect(value)                         // a plain object: every member read off value once, now; a method
                                                   // found on value's prototype bound to value; a member that is a
                                                   // record collected the same way; a member value lacks is a defect
                                                   // naming its slot
  if context is empty or at maxDepth: new flat map = context's map + one entry per slot      // as addUnsafe does
  else: one ordinary overlay { key: slot, value, parent } per slot, depth + 1              // nothing of the context copied
  remember members for the storage created (the map, or the topmost overlay)
  return the new context

read(context):                                     // Context.get, yield*, use, useSync, getOption, …
  storage = the topmost overlay whose key is in index, or the base map when none is
  if storage is the last one read: return its object                      // the one-entry cache
  if storage is remembered: return its object                             // the WeakMap
  return remember(storage, build(storage))         // a missing member: notFound, nothing remembered

build(storage):                                    // the members as seen from storage down
  if storage is an overlay holding one plain member and the record below it is known (no throw):
    return a copy of that record with the member replaced                 // the same object the slots give
  members = each member's slot read from storage down (a member that is a record: read(storage) of it)
  a missing member: its default for a reference; otherwise Service not found: <member key>, or absent for the
  optional getters
  return a plain object with every member as its own property, in the record's order
```

Invariants, each pinned by a test:

1. A context holds only the slots that were written into it; a record write is one ordinary overlay per member, or
   one flat map, and performs no `Map` operation; a member override is an overlay like any other.
2. A record is its members: it has no slot of its own, a record read never returns anything but the members' slots,
   and a record is present exactly when every member is.
3. A record read is a plain object with every member as its own property, assembled once per storage and the same
   object on every read of that storage; the same slots read through overlays and through a flat map give the same
   keys, in the same order, and the same values.
4. Precedence is ordinary `Context` precedence, slot by slot, for every mix of member overlays, record writes and flat
   maps.
5. Nothing outside the record key and the contexts it reads is written: no registry, no flag on `Context`, no field on
   overlays; the ordinary path is the branch point's code behind one `typeof`.

**Identity.** Every key reads and writes the slot named by its string, and two keys with one string share it whatever
their kind: a second `Context.Operation`, or a `Context.Service`, built with `"effect/FileSystem/readFile"` provides
`FileSystem.readFile` and is seen by `yield* FileSystem`, and `addUnsafe(ctx, "effect/FileSystem/readFile", fn)` does
the same. A record's own string is not a slot of the record: a `Context.Service("effect/FileSystem")`, or
`addUnsafe(ctx, "effect/FileSystem", record)`, fills one slot of its own, reads it back alone, and provides no member;
`yield* FileSystem` under it alone is `Service not found: effect/FileSystem/access`, and
`getOrUndefinedUnsafe(ctx, "effect/FileSystem")` after a record write is `undefined`. This is what
`packages/effect/test/cli/services/MockTerminal.ts` ran into (a `Context.Service` built with `Terminal.Terminal.key`),
so the migration gives the mock its own key and a layer that provides the terminal record beside it. A record service
constructed again under the same string, with the same members, reads and writes what the first wrote. The record read
is not the provided object and no identity is promised between the objects two storages return.

**Lifecycle.** There is no registry to fill or empty. The memory outside a context is each record key's `WeakMap` of
assembled objects, keyed by the base maps and overlays it has assembled for; the collector empties it with its keys.
Two copies of `effect` in one process see each other's keys as slots with strings, and a record key of either copy
reads and writes the slots the other copy wrote.

**Precedence.** Ordinary `Context` semantics, slot by slot: the provider closest to the call wins. `Effect.provide(a)`
then `Effect.provide(b)` in a pipe means `a` wins over `b` for keys both provide; `Layer.provideMerge(override, live)`
has `override` win; a record provided inside a member override wins for that member; a member provided inside a record
wins for that member, and the record read has it.

**Cost.** The cost gate is `pnpm --filter tree-shakeable-services-spec bench:check`, which runs three modes in order
and never stops at a skipped one: the counts, then the timing benchmark for ordinary keys, then for records. Its
tables, method and readings are in the appendix; the gate is:

- Counts (`packages/effect/benchmark/context/counts.ts --check`), which do not depend on the machine: every
  ordinary-key operation (`getUnsafe` on a flat context, through an overlay, with a reference default, `getOption` of
  an absent key, `add`, `add` then `getUnsafe`, `make`, `mergeAll`) performs the same `Map`, `Set` and `WeakMap`
  operations on this branch as at the branch point and allocates the same bytes; a record written into a context
  performs no `Map` operation and one `WeakMap.set`, and allocates the same bytes into 33 slots and into 300; a member
  read through a record's overlays performs no `Map` operation; a record read performs one `Set.has` per overlay walked
  above its storage and nothing else once the storage is remembered, with nothing allocated; a new override followed by
  a record read is one copy of the record below it, remembered.
- Timing (`operations.ts --ordinary` and `operations.ts`), paired CPU-time ratios against the branch point's
  `Context.ts`, the median of 21 rounds, every case run a little round-robin before any is optimised, each mode run in
  three orders of the pairs and gated on the median of the three, every limit widened by the largest A/A control
  envelope, a run whose control is outside 1.05 repeated once with ten more rounds and reported SKIPPED, not failed,
  when it still is. Ordinary reads and writes within 1.05× the branch point in the process that holds no record, where
  both modules serve the same calls, and within 1.25× in the process that holds and reads records and runs fibers,
  where this branch's module serves the whole runtime while the copy of the branch point serves the benchmark alone;
  there the same rows against a pristine copy of this branch's own `Context.ts` are reported beside them, and show
  the same gap for identical code (the appendix has the readings). Records against ordinary keys on this branch, in
  both modes: a record read within 1.25× an ordinary read from the same context and within 1.5× from a context
  rebuilt per request, with or without a member overridden underneath or assembled from member layers; a new override
  followed by a record read within 5× an ordinary write followed by a read; a record write within two ordinary writes
  per slot it writes (one overlay and one property of the assembled object each), into 33 slots and into 300, within
  1.15× of itself between the two sizes, and within 1.25× `mergeAll` of 33 one-slot contexts; `yield*` of a record
  service within 1.25× `yield*` of a plain record service from the same context, within 1.5× from a context rebuilt
  per request or from member layers, with or without a member overridden underneath, within 3× with the override per
  request, and within 5× when the whole record is provided per request; an operation call no slower than a method
  call on a yielded plain record, and a method call on a record read within 1.25× one on a plain record.

## Hazards, and what the design does about each

- **Callables that are also Effects.** If the operation were an Effect, `Effect.andThen(x, op)` would type as a call
  (the function overload is listed first) but run as an Effect (`isEffect` is checked first). The operation is a
  `Slot` that is not a `Key`: `isEffect(op)` false, `isKey(op)` false, `isOperation(op)` true.
- **`isEffect`-dispatching duals.** Every `dual` with an `isEffect(args[0])` predicate (thirty-nine sites in
  `internal/effect.ts`, `Effect.ts`, `Console.ts`, `Runtime.ts`, `http/HttpServer.ts`, `internal/layer.ts` and
  `internal/executionPlan.ts`) sees a function; `Effect.map(op, f)` and `yield* op` are type errors (appendix C).
- **Stream-returning operations.** A call result is exactly one kind of value, fixed by the constructor, so the
  thirty-five `isStream` dispatch sites in `Stream.ts`, the checks in `HttpApiBuilder.ts`, `HttpApiClient.ts`,
  `reactivity/Atom.ts`, `http/Template.ts`, `cluster/Entity.ts` and the child-process spawners cannot misclassify it.
  A Stream shape given to `Context.Operation` is the compile error naming `Stream.Operation`. Pinned by a test.
- **Receivers.** Forwarded, so method-style use reaches an implementation that declares `this`; a class instance's
  prototype methods are stored bound to it, private fields included; a sibling call through `this` reads the
  instance's member in every form, as a closure in a plain object does. Tested.
- **Function properties.** Rejected at the definition, so a type can never promise a property the runtime value lacks.
- **Key collisions.** Two operations with one string are one key, in `R` and in the map; the
  `<package>/<Service>/<operation>` convention keeps keys unique. A subset record shares its members' keys with the
  full record on purpose.
- **An operation defined outside its record.** Not part of the record: `Layer<FileSystem>` neither claims nor provides
  it. A record's members are the ones passed to `Context.Operations`.
- **A partial record.** `Layer.succeed(FileSystem, { readFile })` is rejected against `Shape`; with the types bypassed,
  the write is the defect `Service not found: effect/FileSystem/writeFile (the object provided for effect/FileSystem
  has no member "writeFile")`, where the layer is built. `Layer.mock` is the partial-record convenience and dies on the
  members it lacks; `FileSystem.makeNoop({})` is the complete no-op record.
- **Identity and `instanceof`.** A record read is a plain object of the members, never the provided object, so
  `fs === provided`, `fs instanceof Impl` and non-member properties do not hold after a read, override or not. Code
  that needs the instance keeps it as a separate key and makes the record from it. Stated and tested.
- **Reflection on a record read.** Every member is an own enumerable property, so `Object.keys`, `JSON.stringify` and
  a spread list every member, overrides in place. Pinned.
- **A member named like a key property.** Rejected on the key argument naming the member, and a defect at construction
  when the types are bypassed.
- **Override typing.** An override is the shape: a wrong parameter type and an added requirement are rejected.
- **A value operation called.** `Terminal.columns()` is `This expression is not callable`. **A constructor called
  without a shape.** `Context.Operation("key")` is `Expected 0 arguments, but got 1`.
- **Error text under `exactOptionalPropertyTypes`.** TypeScript appends its optional-properties hint to every `Effect`
  assignability error; the line that matters is the indented one naming the key.
- **String-keyed unsafe access.** `addUnsafe(ctx, "effect/FileSystem/readFile", fn)` is the member, seen by the call
  and by `yield* FileSystem`; `addUnsafe(ctx, "effect/FileSystem", record)` fills a slot the record never reads or
  writes, and `getOrUndefinedUnsafe(ctx, "effect/FileSystem")` is `undefined` unless something wrote that string. Code
  that reaches into contexts by string cannot make a record disagree with its members.
- **A map given to `makeUnsafe`, or a provided object, mutated afterwards.** A map mutated after `makeUnsafe` is read
  live by member reads while a record already assembled for it stays what it was; a provided object is read once, at
  the write. Stated; the first is pinned.
- **Two key objects with one string.** A second `Context.Operation`, or a `Context.Service`, with a member's string
  is that member; one with a record's string is a plain key over a slot of its own; a second `Context.Operations` with
  a record's string and members reads and writes what the first does. All tested.
- **Two copies of `effect`.** A record key is recognised by `OperationsTypeId`, a string property, so both copies read
  and write the same slots.
- **Code that gates on `isKey`.** An operation is not a `Context.Key`; `isOperation` is the test. No site in the
  repository outside `Context` needs it.
- **A record provided per request.** Reads the members off the object, allocates one overlay per member and the
  object the read returns; the context is not copied. Measured and gated ("Cost").
- **Overlay depth.** A record write counts as one addition toward `maxDepth` and writes as many overlays as it has
  members; past `maxDepth` it flattens as `addUnsafe` does. A read of a slot below walks them, one comparison each,
  until the branch point's flatten-after-enough-base-hits rule applies.
- **A requirement union written as a type alias.** The codemod cannot tell `type Environment = FileSystem.FileSystem
  | Path.Path` from a value type and rewrites it; two such aliases in the repository were restored by hand, and a user
  reviews the codemod's diff for the same shape.

## Type-level evidence

The compiler output this spec relies on is pasted where it applies: a missing requirement and a forgotten override
under "Providing operations" and "Overriding one operation in a test"; a wrong override there too; the definition
errors under "Defining operations" and "Generic, overloaded and property-bearing shapes"; the record diagnostics
under "The contract recipe". The whole output of `pnpm --filter tree-shakeable-services-spec check-errors`, which
compiles the nineteen files under `typetest/errors` and checks each fails for its documented reason, is in the
appendix with `typetest/ok/signatures.ts` abridged.

Two more facts. The record program run unprovided prints the record's name (`Type 'FileSystem' is not assignable to
type 'never'`); the record program _partially_ provided prints the remaining keys in full, because `Exclude`
distributes over the union and the alias is gone. This is the price of the identity being a union, and the union is
what lets per-operation layers satisfy the record. The mitigation ships with the migration: `FileSystem.ReadOnly`, so
a program that reads names one requirement and "provided nine of ten" prints one key. Accepted, and pasted in the
appendix.

## Tree-shaking: what the bundler needs, and what the prototype shows

Three ordinary requirements: one implementation per top-level export in a side-effect-free module; a composition root
that imports implementation modules, or reads members off their namespace, and never an aggregate unless it wants
everything; aggregates (`Layer.mergeAll(...)`) in their own module or `/* @__PURE__ */`-annotated, because an unused
top-level call is retained otherwise. The types enforce the half that matters: `R` names what to import. A key the
bundler keeps costs about 4 kB for an unannotated thirty-key contract and nothing once published, because
`packages/effect`'s build annotates every top-level declaration pure (appendix, "What a kept key costs").

The prototype (`specs/tree-shakeable-services/`) models `effect/FileSystem` as 30 operations (three Stream-returning,
two needing `Scope`) and `effect/Terminal` as six (five value operations), one Node implementation module each, and
nine composition roots. `pnpm --filter tree-shakeable-services-spec bundle` builds each with esbuild (and the
annotation matrix with Rolldown), with `effect` bundled as published, and reports which implementation modules and how
many bytes of the Stream runtime each contains, by metafile and by a per-implementation marker. It fails if an unused
implementation appears, a used one is missing, a root's Stream bytes fall outside its band, or the no-record root is
more than 512 bytes larger, minified, than with the branch point's `Context.ts`; then it runs five of the bundles. The
two-operation root carries two of thirty implementations, the twenty-operation root twenty, the record roots all
thirty, the terminal root two of six members and no Stream code, and the no-record root 275 bytes of `Context.ts` over
the branch point.

`packages/effect/test/FileSystem/treeShaking.test.ts` is the regression test for the real module: it bundles a root
that calls `FileSystem.readFile` and `FileSystem.writeFile` and provides two of three implementation layers read off a
namespace, with `effect` as published (`esbuild.transform` and `babel-plugin-annotate-pure-calls` over
`packages/effect/src`), and asserts that the `readFile` and `writeFile` markers are in the bundle and `stat` is not,
that the two keys are in and `"effect/FileSystem/stat"`, `"effect/FileSystem/stream"` and `"effect/FileSystem"` are
not, that the bundle holds zero bytes of `Stream.ts`, `Channel.ts`, `Sink.ts` and their internals, and that it runs.

## Migrating `effect/FileSystem` and `effect/Terminal`

Both modules are `@stability unstable`, and `MIGRATION.md` lets a minor change their identity, so the migration ships
the identity change in one release with the codemod and the subset record.

**Phase 1, on this branch.** `packages/effect/src/FileSystem.ts`: one operation per member, exported under the
member's name with its shape and documentation (`stream` and `watch` with `Stream.Operation`, `sink` with
`Sink.Operation`; `open`, `makeTempDirectoryScoped` and `makeTempFileScoped` keep `Scope`); `interface Shape extends
Context.Operations.Shape<typeof members> {}`; `type FileSystem = Context.Operations.Identifier<typeof members>`; the
record `Context.Operations<FileSystem, Shape>()("effect/FileSystem", members)`; `ReadOnly` over the ten reading
operations with `ReadOnlyShape` derived the same way; `make`, `makeNoop` and `layerNoop` unchanged but for the `Shape`
type and the removed `[TypeId]` brand, which nothing read. `packages/effect/src/Terminal.ts` the same with five value
operations and one function operation; the shape does not change, so `NodeTerminal.make`, `Terminal.make({...})` and
the ten `yield* terminal.columns` sites in `cli/Prompt.ts` did not change a line beyond the codemod, and a user may
now write `yield* Terminal.columns` under any `Layer<Terminal>`.

**What changes for users.** The _type_ `FileSystem.FileSystem` becomes the union of 32 key literals; code that used
it as a value type says `FileSystem.Shape`, which the codemod does; requirement positions do not change. A `Layer` of
all 32 member keys is now assignable where `FileSystem` is expected. The identity no longer survives `Exclude` by name
("Type-level evidence"). `yield* FileSystem` returns an object of the members rather than the object the layer
provided. Everything else stays: every `yield* FileSystem`, `Effect<_, _, FileSystem>`, `Layer<FileSystem>`,
`Layer.succeed(FileSystem, make(impl))` and `Layer.mock(FileSystem, …)` in the repository and in user code.

**Codemod**, `scripts/codemods/record-shape.ts` with `pnpm codemod:shape [--module FileSystem|Terminal] <paths>`: a
`jscodeshift` transform that rewrites `FileSystem.FileSystem` to `FileSystem.Shape` in type positions, except type
arguments of `Effect`, `Layer`, `Stream`, `Sink`, `Channel`, `Context` and `Effect.fn.Return`; value positions are
untouched. Over `packages` and `tools` it rewrote 56 sites in 11 files; two requirement-union aliases and four
platform `Terminal` re-exports were restored by hand. Beside the modules: `test/cli/services/MockTerminal.ts` is its
own service with a layer that provides the terminal record beside it (a `Context.Service` built with the record's
string provides no member); `test/http/HttpPlatform.test.ts` provides `FileSystem.makeNoop({})` instead of `{} as any`.

**Evidence on this branch**: `pnpm check` over every package is clean; the whole `packages/effect` suite passes
(411 files; several `cli` suites fail to load when run from the package directory, on this branch and at the branch
point alike, because they import `effect/cli/internal/*`, which the package's `exports` map hides; from the repository
root they pass); `FileSystem.test.ts`, `Terminal.test.ts` and `typetest/FileSystem.tst.ts` pin the migrations; the
compile cost is in the appendix. Changesets: `.changeset/context-operation.md`, `filesystem-operations.md` and
`terminal-operations.md`, the last two marked **Breaking** under `@stability unstable`.

**Phases 2 and 3.** Phase 2 splits each provider into one module per operation (`NodeFileSystem/readFile.ts`, …) with
the aggregate rebuilt as their merge, gives `effect/FileSystem` layers for the derived operations over the primitives
they are derived from, and makes `NodeTerminal` one module per member over an internal `Input` service. Phase 3 moves
the consumers inside `effect` that use a few members to operation calls or a subset annotation (`FileSystem.ReadOnly`,
`FileSystem.ReadOnly | "effect/FileSystem/stream"` for the static file servers, `Terminal.Interactive` for the
prompts). Each is incremental; the layouts and the consumer list are in the appendix.

| User code                                                                           | Phase 1 (this branch)            | Phase 2                           | Phase 3                             |
| ----------------------------------------------------------------------------------- | -------------------------------- | --------------------------------- | ----------------------------------- |
| `yield* FileSystem` + `NodeFileSystem.layer`                                        | unchanged; whole bundle          | unchanged; whole bundle           | unchanged; whole bundle             |
| `FileSystem.readFile(p)` + `NodeFileSystem.layer`                                   | compiles; whole bundle           | compiles; whole bundle            | compiles; whole bundle              |
| `FileSystem.readFile(p)` + `NodeFileSystem.readFile`                                | not yet available                | two implementations in the bundle | two implementations in the bundle   |
| `yield* FileSystem` + member layers                                                 | compiles                         | compiles                          | compiles                            |
| `HttpServerResponse.file` + `NodeFileSystem.layer`                                  | whole bundle                     | whole bundle                      | compiles; member layers now suffice |
| test: `Effect.provideService(FileSystem.readFile, fake)` on top of any of the above | works                            | works                             | works                               |
| test: `FileSystem.layerNoop({ readFile })` / `Layer.mock(FileSystem, {...})`        | unchanged                        | unchanged                         | unchanged                           |
| `fs: FileSystem.FileSystem` as a record type                                        | `fs: FileSystem.Shape` (codemod) |                                   |                                     |

`effect/Path` stays a plain record service: fifteen members, thirteen synchronous, one implementation module, nothing
to shake.

## Earlier designs considered

**Service slices: `Context.Only<S, K>`.** Keep the record service and let a program depend on, and a layer provide,
one member of it: `Only<S, K>` is a subtype of the identifier `S` carrying the member name, a full `Layer<FileSystem>`
satisfies every slice by variance, each slice has a derived key (`effect/FileSystem#readFile`) that lookup tries before
falling back to the full service, and access and provision are `FileSystem.only("readFile")` and `Layer.only(FileSystem,
"writeFile", impl)`. A forgotten mock is a compile error, which this spec keeps. Set aside because it is a type algebra
(seven assignability properties, a distributive conditional, intersections that print badly) and a second provisioning
API over the record abstraction, when the goal only needs the implementations in separate bindings; and the fallback
rule breaks precedence, since a slice provided outside a full service wins over it. This spec keeps the one thing
slices got right, that a full-service layer satisfies a member requirement by plain assignability, from the identity
being a union. PR #10319 was closed.

**Context-overridable functions: `Context.overridable`.** Each operation a module-level function with a default
implementation that a `Context.Reference` can replace: `Context.overridable("app/processItem", (item) => …)` returns
the function plus `.reference`, calls look the reference up when the result runs, and `Effect.provideService(fn.reference,
fake)` overrides. Set aside because of the default: a forgotten override silently runs it and nothing shows in `R`,
the default is bundled even when overridden, and platform operations with no universal default have to be written
against a lower-level driver, which moves what tests mock. PR #10369 implemented it and is open; this spec keeps its
callable wrapper, makes the wrapper the key itself now that a key need not be an Effect, and replaces the defaulted
`Reference` with a required slot.

**Bundler-side property shaking (Rolldown).** Teach the bundler to drop unused properties from service records by
tracking demand from `Context` lookups to provider literals. Rolldown has no property-level shaking to build on; a
plugin proof of concept recovered up to 41% on closed-world programs but bailed out on exported entry points, Streams,
forks, reflection and direct `Context` access. Complementary: it attacks existing records without changing user code,
at the cost of a bundler fork and a list of bailouts.

The decisions taken inside this design, and the alternatives rejected within it, are recorded in the appendix.

## Scope

In scope: `Context.Operation`, `Context.Operation.value`, `Context.Operations` and their types, `Stream.Operation`,
`Sink.Operation`, `isOperation`, `isOperations`, `Context.Slot` with the parameter widening and the two implementation
fixes, the record storage in `Context`, tests, JSDoc, the cost gate, the bundle test, changesets, the codemod, the
migration of `effect/FileSystem` with its Node and Deno providers (phase 1 on this branch), and the migration of
`effect/Terminal` with `NodeTerminal` (phase 1 on this branch). Out of scope: bundler plugins, migrating other record
services (each follows the recipe and is its own issue; `Path` is not worth one), and the ai-docs example (tracked
separately).

## Implementation plan

Thirteen issues, each mergeable on its own and verifiable by the tests named with it; the code for the first eight is
on this branch, passing `pnpm check`, `pnpm test-types`, `pnpm lint`, `pnpm circular` and `pnpm jsdocs --check`, and
splitting it into PRs is a matter of cutting the diff at the seams named below. Runtime test numbers refer to "Test
plan"; type test numbers to its second list.

1. **`Context.Slot` and the widening.** The `Slot` interface, `Key extends Slot`, the key parameter of every function
   under "Existing APIs this touches" widened, `Effect.service` reading from the context and `Layer.updateService`
   mapping over it, `Context.Service.Identifier`/`Shape` extracting from any slot.
   - Every existing test passes unchanged.
   - Type test 2 (a value typed `Context.Key` is still an Effect); runtime test 33 (a key built structurally works
     with one-slot semantics).
   - `Effect.service(key)` and `Layer.updateService` return what they returned for every existing key.
   - No runtime file but `Context.ts`, `internal/effect.ts` and `Layer.ts` changes behaviour; the ordinary rows of
     the counts gate are identical to the branch point.
2. **Function operations: `Context.Operation`.** The constructor with its one call form, the `Operation` type and
   namespace (`Call`, `Requirements`, `Require`, `Derivable`, `KeyFor` with `ResultKind`, `KindOf` and `Fix`,
   `FunctionSignature`, `Any`), `OperationTypeId`, `isOperation`, the internal `makeOperation` and `applyOperation`.
   - Runtime tests 1 to 5, 7 and 8; type tests 1, 3 to 6 and 13 for Effect shapes, with the four definition messages
     (generic, overloaded, properties, wrong kind) printed as pasted.
   - A Stream shape given to `Context.Operation` is the error naming `Stream.Operation`.
3. **Value, Stream and Sink operations: `Context.Operation.value`, `Stream.Operation`, `Sink.Operation`.** The
   `Effectable` value operation, the two constructors over `Stream.unwrap` and `Sink.unwrap`, `Sink.ts`'s value import
   of `Context`.
   - Runtime tests 6, 9, 27 and 28; type tests 1, 8 and 9.
   - `Context.ts` has no run-time import of `Stream`, `Sink` or `Channel`; `pnpm circular` is clean.
   - An Effect shape given to `Stream.Operation` is the error naming `Context.Operation`.
4. **Record services: the key, storage, write and read.** `Context.Operations` with both forms, the `Operations` type
   and namespace (`Members`, `Identifier`, `Shape`, `Reserved`, `Key`, `KeyFor`, `ShapeOf`), `OperationsTypeId`,
   `isOperations`, the `typeof` dispatch in `make`, `add` and the getters, `write` (overlays or a flat map, the
   missing-member defect, the fiber-cache root), `read` (the storage walk, the one-entry cache and the `WeakMap`),
   `build` (from the slots, incrementally over a plain member overlay), the record's own `evaluate`/`use`/`useSync`.
   - Runtime tests 10 to 16, 18, 22, 24 and 25; type tests 10 to 12.
   - Invariants 1 to 5 under "Record storage"; the counts gate's record rows; the records timing run within its
     limits (or SKIPPED on an unreadable machine, with the counts gate passing).
   - The prototype's bundle check within 512 bytes minified of `Context.ts` for the no-record root.
   - `pnpm jsdocs --check` clean, with the **Gotchas** named under "Acceptance criteria".
5. **Record services: provided objects, class instances and the key's members.** `collect` binding prototype
   methods at the write, `Layer.mock`'s proxy read member by member, spread decorators, the members as properties of
   the key with the `Reserved` rule at the type level and the defect at construction.
   - Runtime tests 10, 17, 19, 20 and 26; type test 10 (the `Reserved` message).
   - A method reading a private field runs through the record read, standalone and through a spread copy; the record
     read is not an instance of the class.
6. **Record services: `pick`/`omit`, string semantics, nested, subset and reference members.** `pick` and `omit` over
   the record's slot list; the identity rule for member strings and a record's string; a record as a member, a
   reference as a member, subset records shadowing slot by slot.
   - Runtime tests 21, 23 and 29 to 32; type test 12.
   - `getOrUndefinedUnsafe(ctx, record.key)` is `undefined` after a record write; `addUnsafe` with a member's string
     is seen by the record read.
7. **Bundle regression test.** `packages/effect/test/FileSystem/treeShaking.test.ts` with its fixture under
   `test/fixtures/tree-shaking/`, as described under "Tree-shaking".
   - The four assertions pass with `effect` bundled as published.
8. **`effect/FileSystem` and `effect/Terminal` phase 1.** The changes on this branch to `FileSystem.ts` and
   `Terminal.ts`, their tests, the codemod `scripts/codemods/record-shape.ts` with its runner, the repository's sites
   rewritten by it (and the two hand-restored aliases), `MockTerminal` as its own service, the two changesets.
   - Every existing suite passes; `FileSystem.test.ts` (4 tests), `Terminal.test.ts` (5 tests) and
     `typetest/FileSystem.tst.ts` pass; type test 14.
   - `pnpm check` over every package is clean after the codemod.
9. **`effect/FileSystem` phase 2, Node.** Per-operation modules under `NodeFileSystem/`, derived-operation layers in
   `effect/FileSystem`, the aggregate rebuilt as the merge.
   - The bundle test from issue 7 passes against a fixture that provides `NodeFileSystem.readFile` and
     `NodeFileSystem.writeFile`.
10. **`effect/FileSystem` phase 2, Deno and Bun.** The same layout for `DenoFileSystem`; Bun re-exports Node's.
    - The Deno and Bun suites pass; a bundle fixture over `DenoFileSystem.readFile` carries one implementation.
11. **`effect/FileSystem` phase 3.** The `yield* FileSystem` sites inside `effect` that use few members moved to
    operation calls or a subset annotation, one commit per module, with the module's tests unchanged.
    - A bundle fixture using `HttpServerResponse.file` with member layers only compiles and carries those members.
12. **`effect/Terminal` phase 2.** `NodeTerminal` as one module per member over an internal `Input` service, with
    `NodeTerminal.layer` as the record layer.
    - The Terminal and cli suites pass; a bundle fixture that displays without reading carries `display` alone.
13. **`effect/Terminal` phase 3.** `Terminal.Interactive` and the `cli/Prompt.ts` sites.
    - The cli suites pass; `Prompt` programs name `Terminal.Interactive` as their requirement.

## Test plan

Runtime tests (`packages/effect/test/Context.test.ts`, `describe("Operation")` with `describe("Operations")`,
`describe("Operation.value")` and `describe("same string, same key")` inside it, 33 tests on this branch, 53 in the
file), each mirrored in the prototype's `test/Operation.test.ts` (42 tests). One line each, in the file's order:

1. An operation is a function named after its key, a slot and not a key, not an Effect, with `Function.prototype` in
   its chain.
2. A call runs the implementation provided with `Layer.succeed`, `Layer.effect` and `Effect.provideService`, the
   innermost provider winning, through `Effect.provide`, `Effect.provideService` and `Layer.provideMerge`.
3. `Context.make`, `get`, `getOption`, `getOrUndefined`, `pick`, `omit` and `Effect.service` treat an operation as
   one slot.
4. Running a call whose key is unprovided (types bypassed) dies with `Service not found: <key>`.
5. One call value run under two providers runs two implementations, for an Effect and a Stream operation.
6. An Effect operation's call is an Effect and not a Stream; a Stream operation's call is a Stream and runs through
   `Stream.runCollect`; a Sink operation's call is a Sink and runs through `Stream.run`.
7. `Effect.andThen`, `Effect.tap` and `Effect.flatMap` call an operation passed as their function, and the receiver
   is forwarded to the implementation.
8. A generic shape naming its key runs with its signature, and `Effect.fn` implementations work unchanged.
9. An operation of no arguments reads the same standalone and through a record.
10. A record service is a key with `isOperations` true, `Effect.isEffect` true, `members` attached, and its members as
    its own properties; a member named like a property of the key is a defect at construction.
11. `Layer.succeed(record, value)` provides every member for the per-operation program and the `yield*` program; the
    read is a plain object with every member as its own property, equal to the provided members and not the provided
    object; the context holds one slot per member and no slot of the record's string, before and after flattening.
12. `yield* record` assembles the record under per-operation layers; with one member unprovided it dies naming the
    member's key, and `getOption`, `getOrUndefined` and `getOrElse` report it absent.
13. An override on top of a record wins for that member, directly and through the record read; the other order has
    the record win; `Layer.mock(record, partial)` runs the provided member and dies as unimplemented on the others.
14. `Effect.updateService`, `Context.getOption`, `pick` and `omit` behave as in "Existing APIs this touches"; omitting
    a member makes the record absent.
15. A member write is an overlay of the branch point's shape; the record read is a plain object with every member, the
    override among them, the same object on a second read and from contexts derived by unrelated writes; the same slots
    read through the overlay and through a flat map have the same keys in the same order and the same values; `merge`
    and `mergeAll` take the right-hand member or record slot by slot; no flat map holds a marker.
16. A record added to a context of one slot and of three hundred is one ordinary overlay per member over the same base
    map, counting as one addition; an empty context and a context at `maxDepth` take it as a flat map; `pick`, `omit`,
    `merge` and the string-keyed readers see the overlays as slots.
17. A method found on a provided object's prototype is stored bound to it and an own arrow property as it is; a
    standalone call and a call through the record keep `this`; the record read is a plain object that is not the
    instance, has the members and nothing else, and reads the same through overlays, after flattening and in a fiber;
    a bound method calling a sibling through `this` reads the instance's member; `Layer.mock`'s proxy is stored as it
    returns.
18. A map given to `makeUnsafe` is the context's storage: a copy of a context's map reads as the original; a slot
    changed behind it is read by the member and not by a record already assembled for that map; a map changed before
    the first read is read as it stands.
19. A record with a plain value, a reference and a record as members provides all three, reads the reference's default
    from member layers, and a member written deeper down shadows the nested record and the outer record; a nested
    record written on top replaces the nested members; `omit` of the outer record removes every slot.
20. A subset record is satisfied by the full record and by its member layers, provides its members, and shadows the
    full record slot by slot in both orders.
21. A record never written has no slot before or after it is read, is assembled once per storage, the same object on
    every read and from a derived context, and again for a context where a member changed.
22. Members provided as separate overlays assemble in every mix: two overlays over an empty context, a flat map and an
    overlay, a member above a record's overlays and below them, a subset above the full record and the reverse, and in
    a fiber through `provideService` chains with no record ever provided and on top of member layers.
23. A record read spreads, copies and re-provides as the record it stands for: `Effect.updateService(record, (fs) =>
    ({ ...fs, stat }))` and `Layer.effect(record, Effect.map(record, (fs) => ({ ...fs })))` keep every member and the
    override, and a standalone call afterwards sees the override.
24. A class with private fields keeps working after one member is overridden, through the record read, standalone and
    through a spread copy; the record read is not an instance of the class.
25. A record provided without one of its members, or as `null`, is a defect naming the member's key, from
    `Context.make`, `Context.add`, `Layer.succeed` (where the layer is built) and `Layer.effect`.
26. What a context does depends only on the slots it holds: a member written before any record is a plain slot a
    record written later wins over; a record constructed after a context exists reads it; constructing fifty subset
    records changes nothing; writes into a context holding one record leave a context holding another untouched.
27. A value operation is an Effect and a slot, not a function and not a key.
28. A value operation yielded runs the Effect provided for it; through the record the member is that Effect; an
    override on top of the record is seen standalone and through the record; unprovided, it dies naming its key.
29. A second operation object built with a member's string provides that member and is seen by the record read.
30. A `Context.Service` built with a member's string is that member; one built with a record's string reads back what
    it wrote, is not the record, and written over a stored record adds a slot the record does not read.
31. A record constructed again under its string reads and writes what the first does, and both return equal objects
    after a member override.
32. `addUnsafe` with a member's string is that member in the member read and the record read; with a record's string
    it fills one slot the record never reads; `getOrUndefinedUnsafe` by a record's string is `undefined` after a
    record write.
33. A key built structurally (`{ key } as Context.Service<…>`) is made, read, added, picked and omitted as one slot.

`packages/effect/test/FileSystem.test.ts` (4 tests) and `test/Terminal.test.ts` (5 tests) pin the migrations: an
operation call under a `Layer<Record>` with `yield* Record` returning an object of the members, a one-member override
seen by the call and by the record read, `Layer.mock`, the unprovided defect naming the member, and one slot per member
with the members as properties of the key. `test/FileSystem/treeShaking.test.ts` (4 tests) is the bundle test.

Type tests (`packages/effect/typetest/Context.tst.ts`, 13 tests, and `FileSystem.tst.ts`, 3 tests, with the
diagnostics' text pinned by the prototype's `check-errors` over its 19 fixtures):

1. A call has the shape's parameters and the shape's result with the key added to `R`; `Scope` in the shape stays in
   `R`; a Stream shape returns a Stream; a Sink shape returns a Sink.
2. An operation is assignable to `Context.Slot<Id, Shape>` and not to `Context.Key` or `Effect`; `key` is its
   literal; `Service.Identifier` and `Service.Shape` extract its parts; providing it removes exactly the key;
   `Layer.succeed(op, impl)` is `Layer<Id>`; `Effect.service(op)` is `Effect<Shape, never, Id>`; a record service is
   assignable to `Context.Key`; a value typed `Context.Key` is still an Effect.
3. An override with a wrong parameter type and an override that adds a requirement are rejected.
4. A shape returning a plain value, a non-function and an Effect value given to `Context.Operation` are rejected by
   the constraint; a function shape given to `Context.Operation.value` is rejected.
5. `op` is not assignable to `Effect`; `yield* op` is rejected; `Context.Operation("key")` is rejected.
6. A generic shape naming its key keeps its type parameter; an overloaded shape keeps both overloads; a generic shape
   whose parameter is only in its parameters is derived; a generic or overloaded shape not naming its key, and a shape
   with properties, are rejected with the documented messages.
7. A `this` parameter in the shape is part of the call signature.
8. `KeyFor` is the kind message for a Stream or Sink shape given to `Context.Operation`, and for an Effect shape given
   to `Stream.Operation`, and the key for a Stream shape given to `Stream.Operation`.
9. A value operation is assignable to `Effect<A, E, Id>` and to `Context.Slot<Id, Effect<A, E>>`, not to
   `Context.Key`; `Effect.map` and `Effect.provideService` apply to it; `Layer.succeed(columns, Effect)` is
   `Layer<Id>` and rejects a function; in a record the member is the Effect and the identity includes the key.
10. The record's identity is the union of its members' identifiers; the key is `Operations<Id, Shape> & Ops` and its
    members are its properties with their types; a program using two operations is assignable to an `Effect` annotated
    with the record; `Layer<Record>` satisfies a member; a member layer does not satisfy the record; the merge of every
    member layer is a `Layer<Record>` and a merge of some is rejected; `Context.Operations<Self, Shape>()` is not
    callable with an identifier lacking a member, a wrong shape, no identifier, or a member named like a key property,
    and `KeyFor` and `Key` are the documented messages; a partial record given to `Layer.succeed` is rejected against
    `Shape`.
11. The plain form infers the identifier and shape; `Context.Operations<Self>()` takes the identifier and infers the
    shape; a declared identifier wider than the union is accepted, its layer satisfies every member, and member layers
    do not satisfy it; a `Pick` of the shape is accepted as a subset's shape and kept by name.
12. Subset facts 1 to 6 under "Subset records"; a nested record's identity is the union of its members' identities.
13. Displayed-type tests pin `Operation<"…", (path: string) => Effect<…>>`, `Effect<…, "…">`, `Stream<…, "…">`,
    `Layer<Record, never, never>`, `Type 'Record' is not assignable to type 'never'`, `is not assignable to parameter
    of type 'Shape'` and `This expression is not callable` for a value operation.
14. `FileSystem.FileSystem` is the union of the 32 operation keys, `Context.Service.Shape<typeof FileSystem>` is
    `Shape`, a layer of some operations is not a `Layer<FileSystem>` and a `Layer<FileSystem>` satisfies any of them;
    `ReadOnly` is satisfied by the full record and not the reverse, satisfies its members and not `writeFile`
    (`FileSystem.tst.ts`).

Doctests: the JSDoc examples for `Context.Slot`, `Context.Operation`, `Context.Operation.value`, `Context.Operations`,
`Stream.Operation`, `Sink.Operation`, the `FileSystem` operations and the `Terminal` operations run under `pnpm
doctest`. Cost gate: `pnpm --filter tree-shakeable-services-spec bench:check`, the three modes under "Cost". Bundle
test: `packages/effect/test/FileSystem/treeShaking.test.ts`.

## Acceptance criteria

- [ ] `Context.Operation`, `Context.Operation.value`, `Context.Operation<Id, Shape>` with the `Operation` namespace
      types, `Context.OperationTypeId`, `Context.isOperation`, `Context.Operations`, `Context.Operations<Identifier,
      Shape>` with the `Operations` namespace types, `Context.OperationsTypeId` and `Context.isOperations` are exported
      from `effect/Context`, `Stream.Operation` from `effect/Stream` and `Sink.Operation` from `effect/Sink`, with the
      signatures in "API".
- [ ] `Context.Slot<Identifier, Shape>` is exported from `effect/Context` and is the key parameter of every function
      listed under "Existing APIs this touches"; `Context.Key` is unchanged and extends it.
- [ ] `Effect.service` and `Layer.updateService` read through the context and return what they returned for every
      existing key; a value typed `Context.Key` is still an Effect; a key built structurally works with one-slot
      semantics.
- [ ] Each operation constructor has one call form; the three function constructors accept `FunctionSignature` and
      each rejects the other two kinds on the key argument with its `Fix` message; `Context.Operation.value` takes
      Effect shapes and rejects functions.
- [ ] A function operation is a function (`isEffect` false) and a slot that is not a key, whose `name` and `key` are its
      key string, carrying `OperationTypeId`; a value operation is an Effect (`isEffect` true, `isStream` false) that is
      a slot, not a key and not callable.
- [ ] A call to an Effect operation is an Effect and not a Stream; a call to a Stream (Sink) operation is a Stream
      (Sink) and not an Effect; `Context.ts` has no run-time import of `Stream`, `Sink` or `Channel`.
- [ ] The implementation is looked up from the running fiber's context each time the call result, or the value
      operation, runs, with the call's receiver and arguments forwarded.
- [ ] `Operation.KeyFor` accepts a shape of the constructor's kind that names its key or is derivable, and rejects
      generic and overloaded shapes that do not, shapes with properties, and shapes of another kind, with the messages
      pasted under "Defining operations" and "Generic, overloaded and property-bearing shapes".
- [ ] `Context.Operations` has the plain form and the curried form, `Shape` optional, `members` any object of slots
      including a module namespace; both return the key with the members as its properties.
- [ ] `Operations.KeyFor` rejects an identifier lacking a member, a shape that is not the members' shape, a missing
      identifier and a member named like a key property with the four documented messages on the key argument; a
      member named like a key property is a defect at construction.
- [ ] `interface Shape extends Context.Operations.Shape<typeof members> {}` is accepted as the record's shape, prints
      `Shape` as the parameter type of `Layer.succeed(Record, …)`, and a partial record lists the missing members.
- [ ] A record write into a non-empty context below `maxDepth` is one ordinary overlay per slot it writes, counting as
      one addition; into an empty context or one at `maxDepth` it is a flat map; `Context.make` writes a flat map.
- [ ] A record write performs no `Map` operation and allocates the same bytes into 33 slots and into 300 (counts gate).
- [ ] A record has no slot of its own: `mapUnsafe` after a record write holds the members' strings only, and
      `getOrUndefinedUnsafe(ctx, record.key)` is `undefined`.
- [ ] A member missing from the provided object, or a provided value that is not an object, is a defect naming the
      member's key, from `Context.make`, `Context.add`, `Layer.succeed` and `Layer.effect`.
- [ ] A method found on the provided object's prototype is stored bound to the object; an own property is stored as it
      is; `Layer.mock`'s proxy is read member by member.
- [ ] A record read returns a plain object with every member as its own enumerable property, in the record's order,
      read from the members' slots, and not the provided object.
- [ ] A record read is assembled once per storage and returns the same object on every read of that storage and from
      contexts derived by unrelated writes; a new override followed by a read is one copy of the record below it.
- [ ] The same slots read through overlays and through a flat map give the same keys, in the same order, and the same
      values (runtime test 15).
- [ ] A missing member is `Service not found: <member key>` from `get`, `getUnsafe`, `yield*`, `use` and `useSync`, and
      the fallback from `getOption`, `getOrElse` and `getOrUndefined`; a reference member reads its default.
- [ ] `Context.pick(record)` keeps every slot the record writes and `Context.omit(record)` removes them; omitting a
      member makes the record absent.
- [ ] `addUnsafe` with a member's string is seen by the member read and the record read; with a record's string it is
      a slot the record never reads.
- [ ] A record as a member writes its slots with the outer record's and reads nested; a subset record shadows the full
      record slot by slot in both orders.
- [ ] Ordinary overlays keep the branch point's shape; `lookup`, the flatten and `merge` are the branch point's code;
      `Context` keeps no registry, flag or index outside the record key's own state.
- [ ] Every ordinary-key row of the counts gate is identical to the branch point.
- [ ] Every ordinary-key timing row is within 1.05× the branch point on the median of three orders in the process
      holding no record, and within 1.25× in the process holding records, or the mode is SKIPPED with its control
      envelopes printed; the twin rows are reported beside the latter.
- [ ] Every record timing row is within the limit under "Cost" on the median of three orders, or the mode is SKIPPED.
- [ ] The prototype's bundle check passes, with the no-record root within 512 bytes minified of the branch point.
- [ ] `packages/effect/test/FileSystem/treeShaking.test.ts` passes.
- [ ] The 33 runtime tests, 16 type tests (110 assertions), doctests and bundle test in "Test plan" pass.
- [ ] `pnpm check`, `pnpm lint`, `pnpm jsdocs --check` and `pnpm circular` are clean.
- [ ] JSDoc on every new export follows the repository conventions, with "Required, not defaulted", the shape rule, "a
      member that is an Effect is defined with `Context.Operation.value`", and "a record read is an object of the
      members, not the provided object" under **Gotchas**, and `@stability unstable`.
- [ ] Changesets: `effect: minor` for `Context` naming `Context.Slot` and the parameters widened to it, and one each for
      the FileSystem and Terminal migrations, marked breaking under `@stability unstable`.
- [ ] The codemod `scripts/codemods/record-shape.ts` runs with `pnpm codemod:shape` and rewrites value positions only.
- [ ] `effect/FileSystem` and `effect/Terminal` phase 1: `pnpm check` over every package is clean after the codemod,
      every existing suite passes, and `tsc --extendedDiagnostics` on `packages/effect` grows by about 1 % in types and
      instantiations.
- [ ] PR against `v4/next-minor`.
