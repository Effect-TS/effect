# Tree-shakeable services

A program that calls two operations of a fifty-operation service should bundle those two implementations and nothing
else, and a test should still be able to replace one operation. This spec adds one idea to `effect/Context`, at two
granularities, and defines it precisely enough to implement. This document is the normative part: the design, the API,
the runtime semantics, the hazards, the migration plan, the implementation plan, the test plan and the acceptance
criteria. The evidence (benchmark and count tables, the bundle matrix, the full compiler output, the compile cost) and
the record of decisions are in [the appendix](./tree-shakeable-services/appendix.md).

The implementation is on this branch: `packages/effect/src/Context.ts`, `Stream.ts` and `Sink.ts`, with runtime tests in
`packages/effect/test/Context.test.ts`, type tests in `packages/effect/typetest/Context.tst.ts`, the cost gate in
`packages/effect/benchmark/context/` and a bundle test in `packages/effect/test/FileSystem/treeShaking.test.ts`;
`effect/FileSystem` and `effect/Terminal` carried through the first, non-breaking step of their migrations, with tests,
changesets and a codemod; and a prototype under `specs/tree-shakeable-services/` whose bundle check shows which
implementations each composition root carries.

## Summary

An **operation** is a function stored in the context like a service: calling it calls the implementation stored under
its key. A member whose shape is an Effect rather than a function is an operation too: the Effect that runs the
implementation stored under its key. A **record service** is a `Context.Service` whose members are such keys. Everything
that provides, reads, overrides, picks or omits a key accepts both, because all of them accept a `Context.Slot`: the
identifier, shape and string every key has, and that an operation has too.

```ts
// contract module: keys only, no implementations; each operation written once
export const readFile = Context.Operation<(path: string) => Effect.Effect<Uint8Array, PlatformError>>()(
  "effect/FileSystem/readFile"
)
export const stream = Stream.Operation<(path: string) => Stream.Stream<Uint8Array, PlatformError>>()(
  "effect/FileSystem/stream"
)
// a member that is an Effect keeps its shape: the operation is that Effect with the key in R
export const columns = Context.Operation.value<Effect.Effect<number>>()("effect/Terminal/columns")
// … 28 more, then the record service, whose identity is the union of the keys above
export const FileSystem = Context.Operations("effect/FileSystem", { readFile, stream /* … */ })
// a record over three of the same members: a reader's one named requirement
export const ReadOnly = Context.Operations("effect/FileSystem/ReadOnly", { exists, readFile, stat })

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
// merging the thirty operation layers is also a Layer<FileSystem>, and three of them a Layer<ReadOnly>; no helper

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

At run time a record service added to a context is one overlay, whatever the context holds; reading it returns the
object that was provided; a member provided on top is an ordinary overlay, and the record read then returns an object
inheriting from the provided one with the override as its own property, built on each read. The cost gate holds
this to counts that do not depend on the machine (a record write performs no map operation and allocates the same bytes
into a context of 33 slots and of 300; an ordinary read performs the same operations as at the branch point) and to
timing ratios with stated limits; both are under "Cost" and in the appendix.

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

Every key in Effect is a `Context.Slot`: a string identity, a shape, and a position in the context map. A
`Context.Key` is a slot that is also an Effect, which is what lets `yield* Database` read it. An **operation** is a
slot whose implementation is read when its result runs. For a shape that is a function returning an Effect, a Stream
or a Sink, the operation is a function: calling it returns the shape's result with the key in `R`, and the
implementation is called when that result runs. For a shape that is an Effect, the operation is that Effect with the
key in `R`: running it runs the implementation. A **record service** (`Context.Operations`) is a key whose shape is a
record of its members' shapes: providing it writes each member under that member's key, and the record under its own;
reading it reads the members and returns the provided object while they still agree with it. A member is any slot.

| Form            | Key                                                                 | Shape                  | Use                               | Provide                                  |
| --------------- | ------------------------------------------------------------------- | ---------------------- | --------------------------------- | ---------------------------------------- |
| operation       | `readFile = Context.Operation<(path) => Effect<…>>()("…/readFile")` | `(path) => Effect<…>`  | `yield* readFile(p)`              | `Layer.succeed(readFile, fn)`            |
| value operation | `columns = Context.Operation.value<Effect<number>>()("…/columns")`  | `Effect<number>`       | `yield* columns`                  | `Layer.succeed(columns, Effect.sync(…))` |
| service         | `sep = Context.Service<string>("…/sep")`                            | `string`               | `yield* sep`                      | `Layer.succeed(sep, "/")`                |
| record          | `FileSystem = Context.Operations("…", { readFile, sep, … })`        | `{ readFile, sep, … }` | `(yield* FileSystem).readFile(p)` | `Layer.succeed(FileSystem, record)`      |

The rows are the same storage read at different granularity, and the same one rule for providing: what you provide
is a key, and every row is a key. There is no bridge between them: the record's provider populates the members'
slots, and the members' providers are what the record's read returns. A record over some of another record's members
is a record like any other; see "Subset records".

### Defining operations

A contract module exports one key per member and holds no implementations.

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

// Terminal.ts: a member that is an Effect keeps its shape
export const columns = Context.Operation.value<Effect.Effect<number>>()("effect/Terminal/columns")
```

Each constructor has one call form: the shape as the type argument, the key as the one value argument, written once.
The type is inferred, `Operation<"effect/FileSystem/readFile", (path: string) => Effect<…>>`, so a declaration carries
no annotation and the key appears once. (TypeScript cannot take one type argument explicitly and infer another in a
single call, which is why the form is curried, as `Context.Service<Self, Shape>()("key")` is.)

**Why four constructors, said once.** A call to an operation must return exactly one kind of runtime value, because
every function in `effect` that accepts "an Effect or a Stream" decides which it was given by looking at the value, and
a type argument is erased at run time. So the kind of the result is fixed where the operation is defined, by the
constructor: `Context.Operation` for a function returning an Effect, `Stream.Operation` for a function returning a
Stream, `Sink.Operation` for a function returning a Sink, and `Context.Operation.value` for a shape that is an Effect
rather than a function (`Terminal.columns: Effect<number>`), whose runtime value is an Effect and not a function. The
three function constructors accept the same shapes (`Operation.FunctionSignature`) and each rejects the other kinds on
the key argument with a message naming the constructor to use:

```
typetest/errors/stream-shape.ts(5,88): error TS2345: Argument of type '"test/stream"' is not assignable to parameter of type '"The shape returns a Stream: define it with Stream.Operation"'.
typetest/errors/effect-shape.ts(5,89): error TS2345: Argument of type '"test/readFile"' is not assignable to parameter of type '"The shape returns an Effect: define it with Context.Operation"'.
```

A shape that is not a function returning one of the three (a synchronous function, a plain value, an Effect value) is
rejected by the constraint (`does not satisfy the constraint 'FunctionSignature'`), one error each, and a function
given to `Context.Operation.value` by its constraint (`'Effect<any, any, any>'`). `Stream.Operation` and
`Sink.Operation` are the same ten lines over `Stream.unwrap` and `Sink.unwrap` in their own modules; `Context.ts` knows
nothing about either at run time.

The key string is the identity of the operation at both levels: it is the slot the implementation is stored under at
run time, and it is the type that appears in `R` while the operation is unprovided. The convention is
`<package>/<Service>/<operation>`. Two operations with the same key are the same operation, in the types and at run
time, which is the rule `Context.Service` has today. An optional second type argument intersects an existing identity
into the operation's, `Context.Operation<Shape, FileSystem>()("effect/FileSystem/readFile")`; it exists for the
migration of existing record services and is explained there.

### Which members are operations, and why

A member is an operation when its shape is a function returning an Effect, a Stream or a Sink, or is an Effect. Only
such a shape can absorb the lookup: the result is run later, inside a fiber that has a context, so the key can read
its implementation at that moment and continue with it. A plain value (`Path.sep: string`) or a synchronous function
(`Path.join: (...parts) => string`) has no later moment; it is a `Context.Service` and is yielded, which is the same
idea at value granularity. A member that is an Effect keeps its shape: `yield* Terminal.columns` standalone reads as
`yield* terminal.columns` through the record, and the implementation is an Effect in both. All of these are per-slot
keys, and a record service accepts any of them as members, so every record service in `effect` can become a
`Context.Operations` without changing its shape:

| Member shape                               | Kind                      | Standalone use                          | In the record                     |
| ------------------------------------------ | ------------------------- | --------------------------------------- | --------------------------------- |
| `(path: string) => Effect<Uint8Array>`     | `Context.Operation`       | `yield* readFile(path)`                 | `fs.readFile(path)`               |
| `Effect<number>`                           | `Context.Operation.value` | `yield* columns`                        | `yield* terminal.columns`         |
| `(path: string) => Stream<Uint8Array>`     | `Stream.Operation`        | `stream(path)`                          | `fs.stream(path)`                 |
| `(…) => Sink<…>`                           | `Sink.Operation`          | `sink(path)`                            | `fs.sink(path)`                   |
| `string`, `(...parts: string[]) => string` | `Context.Service`         | `yield* sep`, `(yield* join)("a", "b")` | `path.sep`, `path.join("a", "b")` |
| a record service                           | `Context.Operations`      | `yield* ReadOnly`                       | `platform.fs.readFile(path)`      |
| a reference                                | `Context.Reference`       | `yield* indent`                         | `path.indent`                     |

A member that is a Stream or a Sink value, rather than a function returning one, has no instance in `effect`; it
would take the same ten lines in `Stream` and `Sink` (`Stream.unwrap` of the slot) and is left out until one exists.
Until then such a member is a `Context.Service`.

Whether a service is _worth_ migrating is a separate question: the gain is one implementation module per member, so
`Path`, whose fifteen members are small synchronous functions sharing one implementation, gains nothing and stays a
plain record service. `FileSystem` and `Terminal`, whose members pull in `node:fs`, `node:readline` and the Stream
runtime, are the worked migrations below.

### The library recipe

A library contract is the shape it declares today, one operation per member, and three lines for the record: the
member list, the identity, and the record. The operations are the point; the shape exists for any service. Here it is
for a three-member service, in one module:

```ts
import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import * as Stream from "effect/Stream"

// The shape: the interface the service declares today. Each member's type is written here and nowhere else.
export interface Shape {
  readonly readFile: (path: string) => Effect.Effect<Uint8Array, PlatformError>
  readonly writeFile: (path: string, data: Uint8Array) => Effect.Effect<void, PlatformError>
  readonly stream: (path: string) => Stream.Stream<Uint8Array, PlatformError>
}

// One operation per member, its shape taken from the interface, its key `<package>/<Service>/<member>`.
export const readFile = Context.Operation<Shape["readFile"]>()("effect/FileSystem/readFile")
export const writeFile = Context.Operation<Shape["writeFile"]>()("effect/FileSystem/writeFile")
export const stream = Stream.Operation<Shape["stream"]>()("effect/FileSystem/stream")

// The record: the member list, the identity (the union of the members' keys), the record service.
const members = { readFile, writeFile, stream }
export type FileSystem = Context.Operations.Identifier<typeof members>
export const FileSystem = Context.Operations<FileSystem, Shape>()("effect/FileSystem", members)
```

A contract whose operations have a module of their own does not write the member list: the record module imports the
operations module as a namespace and passes the namespace, which the constructor checks like any object. This is the
prototype's layout (`src/FileSystem/Shape.ts`, `src/FileSystem/operations.ts`, `src/FileSystem.ts`), and the recipe for
a contract of thirty members:

```ts
// FileSystem.ts
import * as Context from "effect/Context"
import * as members from "./FileSystem/operations.ts"
import type { Shape } from "./FileSystem/Shape.ts"
export * from "./FileSystem/operations.ts"
export * from "./FileSystem/Shape.ts"

export type FileSystem = Context.Operations.Identifier<typeof members>
export const FileSystem = Context.Operations<FileSystem, Shape>()("effect/FileSystem", members)
```

The operations module exports slots and nothing else (its error class and data types live beside the shape), because
every export of the namespace is a member. Bundling is the same as with a written list: the record module's reference
to the namespace keeps every operation in a bundle that uses the record, which such a bundle keeps anyway, and none in
a bundle that uses operations alone; the bundle matrix in the appendix has the row (`main.ts`, contract published,
87.6 kB, two keys kept). `effect/FileSystem` and `effect/Terminal` keep each service in one module and write the list.

The constructor checks the identity, the shape and the members against each other, and a mismatch is a compile error
on the key argument that reads as a sentence: `Argument of type '"effect/FileSystem"' is not assignable to parameter of
type '"Self lacks the identifier of \"effect/FileSystem/writeFile\""'`, or `'"Shape differs from the members' shape at
\"writeFile\""'`, or, for a call with no type arguments, `'"Give the record its identifier: Context.Operations<Self,
Shape>()(key, members)"'`. The one-line form, `Context.Operations("effect/FileSystem", { … })`, infers both and is right
for application code; a library declares them so that diagnostics print `FileSystem` and `Shape` instead of thirty keys
or thirty members (`Layer<FileSystem, never, never>`, `is missing the following properties from type 'Shape': access,
chmod, chown, copy, and 25 more`).

What is derived from what, and what cannot be: the operations' shapes come from `Shape`; the identity comes from the
members; the record comes from both. The members cannot come from `Shape`, because types are erased: nothing at run
time can enumerate an interface. A runtime helper that took a table of member names and kinds and built the operations
would remove the key strings at the cost of the goal: every key would be built inside one call, so a program that uses
one key would keep all thirty (measured in the appendix, "What a kept key costs"). The identity cannot be declared after
the record either: TypeScript attaches an alias to a union only when the alias declaration creates it, and an alias
declared after `Context.Operations(...)` resolves to the union the constructor already created, which has no name, so
every diagnostic would print `Identifier<{ readonly readFile: …; … }>` in full. Both were probed with `tsc`, and the
recipe above is the floor.

Because the identity is the union of the keys, the relationships a user expects hold by ordinary assignability, with
no new rule:

- `Layer<FileSystem>` satisfies `"effect/FileSystem/readFile"`: `Exclude<"…/readFile", FileSystem>` is `never`.
- `Layer<"effect/FileSystem/readFile">` does not satisfy `FileSystem`.
- `Layer.mergeAll(all thirty operation layers)` is assignable to `Layer<FileSystem>`; the prototype's `node/layer.ts`
  is exactly that with the annotation, and a merge of some of them is rejected with the missing keys in the error.
- `Effect<_, _, "…/readFile" | "…/writeFile">` is assignable to `Effect<_, _, FileSystem>`, so an author may annotate a
  function with the record's name.

A record may be a member of a record (`{ fs: FileSystem.ReadOnly, terminal: Terminal }`): its slots are written the
same way, its identity joins the union, and `yield*` reads it nested. A `Context.Reference` may be a member: its
default is read when its slot is empty, as `Context.get` does for it on its own.

### Subset records

A record service over some of another record's members is a record service like any other; nothing distinguishes it
from the full record except which members it lists. Its shape is a `Pick` of the full shape, which TypeScript prints by
its alias name:

```ts
const readOnlyMembers = { exists, readFile, stat }
export type ReadOnly = Context.Operations.Identifier<typeof readOnlyMembers>
export type ReadOnlyShape = Pick<Shape, "exists" | "readFile" | "stat">
export const ReadOnly = Context.Operations<ReadOnly, ReadOnlyShape>()("effect/FileSystem/ReadOnly", readOnlyMembers)

export const sizeOf = (path: string): Effect.Effect<number, PlatformError, FileSystem.ReadOnly> => …
```

```
typetest/errors/partial-subset.ts(6,59): error TS2739: Type '{ readFile: () => Effect.Effect<Uint8Array<ArrayBuffer>, never, never>; }' is missing the following properties from type 'ReadOnlyShape': exists, stat
```

The facts a user needs, all pinned in `typetest/ok/signatures.ts` and `typetest/errors/subset-not-full.ts`, all by
assignability of unions:

1. The full record satisfies the subset: `const a: Layer<ReadOnly> = NodeFileSystem.layer`.
2. The member layers merged satisfy the subset: `const b: Layer<ReadOnly> = Layer.mergeAll(exists, readFile, stat)`.
3. The subset satisfies each of its members: `FileSystem.readFile(p).pipe(Effect.provide(readOnlyLayer))` has `R = never`.
4. A program over three operations is assignable to `Effect<_, _, ReadOnly>` and runs under either provider.
5. The subset does not satisfy the full record: `Layer<ReadOnly>` is not a `Layer<FileSystem>`, and the error names the
   first member it lacks (`Type '"effect/FileSystem/access"' is not assignable to type 'ReadOnly'`).
6. The subset is a key: `yield* ReadOnly` reads three slots, `Layer.succeed(ReadOnly, {...})` writes three and itself.

At run time the full record and the subset shadow each other slot by slot: a `ReadOnly` provided on top of a
`FileSystem` wins for `readFile`, and `yield* FileSystem` returns an object inheriting from the full record with the
subset's `readFile`; the other order has the full record win for every member, and `yield* ReadOnly` returns an object
inheriting from the subset with the full record's members. Both are tested.

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
`Effect.flatMap(_, FileSystem.readFile)` all call it. Because it is a key, `Effect.service(FileSystem.readFile)` and
`Context.get(context, FileSystem.readFile)` give the implementation as a value.

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
`program-twenty.ts`), and the error texts are in the appendix.

### Providing operations

An implementation module provides one operation with the existing layer constructors, and the operation is the key:

```ts
// node/readFile.ts
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

The composition root provides the operations the program requires:

```ts
import { readFile } from "./node/readFile.ts"
import { writeFile } from "./node/writeFile.ts"

Effect.runPromise(backup(path).pipe(Effect.provide(Layer.mergeAll(readFile, writeFile))))
```

If `writeFile` is missing, `runPromise` does not compile and the error names `"effect/FileSystem/writeFile"`:

```
typetest/errors/missing-requirement.ts(5,19): error TS2379: Argument of type 'Effect<number, FileSystemError, "effect/FileSystem/readFile" | "effect/FileSystem/writeFile">' is not assignable to parameter of type 'Effect<number, FileSystemError, never>' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Type '"effect/FileSystem/readFile" | "effect/FileSystem/writeFile"' is not assignable to type 'never'.
    Type '"effect/FileSystem/readFile"' is not assignable to type 'never'.
```

The types tell the root what to import; no layout rule has to be remembered.

The coarse-grained form is a `Layer<FileSystem>`, obtained either by merging every operation layer or by providing the
record: `Layer.succeed(FileSystem.FileSystem, record)`, `Layer.effect(FileSystem.FileSystem, makeRecord)`, as a record
service is provided today. Either bundles every implementation, by construction. A library ships both: one layer per
operation in its own module, and the aggregate in a module of its own so that importing one does not import the
other.

**What you provide is a slot, and an operation is a slot.** `Layer.succeed(FileSystem.FileSystem, record)` and
`Layer.succeed(FileSystem.readFile, fn)` are the one rule applied to two slots, as are `Effect.provideService`,
`Effect.updateService`, `Layer.effect`, `Layer.mock`, `Context.make`, `Context.add`, `Context.get`, `Context.pick` and
`Context.omit`. What makes this possible is one new type, `Context.Slot<Identifier, Shape>`: the identifier, the shape
and the string that every key has. `Context.Key` is unchanged and extends it (a slot that is also an Effect); an
operation is a slot that is a function. The key parameter of every function that provides, reads, picks or omits
widens from `Key` to `Slot`, which accepts every call it accepted before, so `Layer.succeed(readFile, fn)` compiles and
`yield* readFile` is a type error; see "Existing APIs this touches" for the list.

### The record service at run time

`Context.add(context, FileSystem.FileSystem, record)`, which is what `Effect.provideService` does, writes one overlay
onto the context: it holds `record`, the object provided, and the members read off it once, now. Nothing of the
context is copied, so the write costs the same into a context of three hundred slots as into one of thirty-three. A
member read (`FileSystem.readFile(p)`) finds the member in that overlay by position; a record read
(`yield* FileSystem.FileSystem`) finds the overlay and returns `record`. A context built from scratch
(`Context.make`, `Layer.succeed`) or flattened holds the same thirty-three slots in its flat map,
`"effect/FileSystem/access"` through `"effect/FileSystem/writeFileString"` and `"effect/FileSystem"`, and the record
read returns `record` once it has checked, once per map, that the members' slots still hold what the record wrote.

The members' slots are the truth. If a member is then provided on top (`Effect.provideService(FileSystem.readFile,
fake)`), the write is an ordinary overlay, as it is for any key, and the record read returns an object that inherits
from `record` and carries `readFile: fake` as its own property: `Object.getPrototypeOf(view) === record`, `view
instanceof Impl` holds for an implementation written as a class instance, a method that reads `this.readFile` through
the view reads the fake, and `Object.keys(view)` lists the overriding members only. The view is one small object,
built on each read; remembering it would cost more than building it. A record provided on top of a member wins, slot
by slot, and is returned as provided. Because there is only one kind of storage, precedence is
ordinary `Context` precedence for every combination of the forms: the provider closest to the call wins.

```ts
// a record provided live, one member replaced closer to the program: the fake wins, and the record view sees it too
program.pipe(
  Effect.provideService(FileSystem.readFile, fakeRead),
  Effect.provide(NodeFileSystem.layer)
)
// the other order: the record is closer, so its readFile wins, and yield* FileSystem returns it unchanged
program.pipe(Effect.provide(NodeFileSystem.layer), Effect.provideService(FileSystem.readFile, fakeRead))
```

Both orders are tested. `Layer.mock(FileSystem.FileSystem, { readFile })` works unchanged: the proxy it builds is
written member by member, so `readFile` runs and `stat` dies with `effect/FileSystem: Unimplemented method "stat"`.

**A record provided as a class instance.** The members are read off the object when it is written. A member that is a
method found on the object's prototype chain (a class method) is stored bound to the object, so `FileSystem.readFile(p)`
called standalone runs with the instance as `this`, exactly as `(yield* FileSystem).readFile(p)` does; a member that is
the object's own property (an arrow property, a closure in a plain object) is stored as it is. Bound once per object and
method, so a record written twice stores the same functions, and a flat map holding them reads as the instance.

**What `yield* FileSystem` costs.** Its requirement is `FileSystem`, which only a `Layer<FileSystem>` satisfies, so the
bundle contains every implementation. At run time it is a walk of the context's overlays, in which each overlay costs
one comparison and, for an overlay holding one of the record's slots, one set lookup; the walk ends at the overlay that
wrote the record, or at the flat map, where the record is remembered; an override on the way costs one small object.
The limits are under "Cost".

### Overriding one operation in a test

```ts
const fakeRead = Layer.succeed(FileSystem.readFile, () => Effect.succeed(bytes("faked")))

// the override is closer to the program than the live layer, so it wins
backup("a.txt").pipe(Effect.provide(fakeRead), Effect.provide(live))

// or without a layer
backup("a.txt").pipe(Effect.provideService(FileSystem.readFile, () => Effect.succeed(bytes("faked"))))

// or composed into one layer
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

Forgetting to is an error at the definition, not an imprecise type at the call, and each bad shape prints one error:

```
typetest/errors/generic-unnamed.ts(7,3): error TS2345: Argument of type '"test/parse"' is not assignable to parameter of type '"The shape of \"test/parse\" is generic or overloaded: its result must require \"test/parse\""'.
typetest/errors/overloaded-unnamed.ts(8,6): error TS2345: Argument of type '"test/format"' is not assignable to parameter of type '"The shape of \"test/format\" is generic or overloaded: its result must require \"test/format\""'.
typetest/errors/shape-with-properties.ts(6,3): error TS2345: Argument of type '"test/double"' is not assignable to parameter of type '"The shape has properties: an operation is a bare function"'.
```

"As precise as the shape" is checked by round-tripping (`Operation.Derivable`, under "API"): the signature derived by
`infer` must be assignable back to the shape. For `<A>(d: (s: string) => A) => Effect<A>` the derived
`(d: (s: string) => unknown) => Effect<unknown>` is not, because `unknown` is not `A`; for `<A>(value: A) => Effect<void>`
it is, and that shape is accepted and derived without loss (`typetest/ok/signatures.ts`). Nothing changes at call sites
between the two cases; the rule only affects how a contract author writes a generic shape, and breaking it cannot go
unnoticed.

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
  <Shape extends Operation.FunctionSignature, Brand = unknown>(): <const Id extends string>(
    key: Operation.KeyFor<Id, Shape>
  ) => Operation<Id & Brand, Shape>
  readonly value: <Shape extends Operation.EffectValue, Brand = unknown>() => <const Id extends string>(
    key: Id
  ) => Operation<Id & Brand, Shape>
}
```

One call form each: the shape explicitly, the key inferred as a literal. `Context.Operation<Shape>()(key)` takes a
function shape and returns a function with `name === key`, and `key`, the `OperationTypeId` marker and `toJSON` as own
properties; it carries no `ServiceTypeId`, so `isKey` is false. `KeyFor<Id, Shape>` is `Id` when the shape returns an
Effect and names its key or is derivable, and otherwise a string literal type explaining why the definition is
rejected; TypeScript infers `Id` through it where it can and prints the explanation as the parameter type, as pasted
above. `Context.Operation.value<Shape>()(key)` takes an Effect shape and returns an Effect with the same marker and
`key`: running it reads the implementation from the fiber's context and continues with it, so `yield* columns` runs
the Effect provided for `columns`. `Brand`, when given, is intersected into the identifier; see "Migrating an existing
record service".

### `Stream.Operation` and `Sink.Operation` (constructors)

```ts
export const Operation: <Shape extends Context.Operation.FunctionSignature, Brand = unknown>() => <
  const Id extends string
>(
  key: Context.Operation.KeyFor<Id, Shape, "Stream">
) => Context.Operation<Id & Brand, Shape>
export type Operation<Id extends string, Shape extends Context.Operation.StreamSignature> = Context.Operation<Id, Shape>
```

`Sink.Operation` is the same with `"Sink"` and `SinkSignature`. Same key, same type; a call returns `Stream.unwrap`
(`Sink.unwrap`) of the implementation applied to the call's receiver and arguments, looked up from the running fiber.
Both are built on two internals of `Context` (`makeOperation(key, call)`, `applyOperation(operation, receiver, args)`),
so `Context.ts` has no run-time dependency on either module. The type aliases exist so a contract can write
`Stream.Operation<"…", Shape>` where it needs the type.

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

  /**
   * The key, or the reason the definition is rejected; the key for a shape that is not a function, so that the
   * constraint error stands alone.
   */
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

`Operation` is a type alias, not an interface, because its call signature is conditional on the shape; for an Effect
shape it is the Effect with the key added to `R`, and the value is an Effect. Because an operation is a `Slot`,
`Context.Service.Identifier<typeof readFile>` is its key literal and `Context.Service.Shape<typeof readFile>` its
shape; no operation-specific extractors are needed. TypeScript keeps the alias name in diagnostics:

```
typetest/errors/displayed-type.ts(4,14): error TS2322: Type 'Operation<"effect/FileSystem/readFile", (path: string) => Effect<Uint8Array<ArrayBufferLike>, FileSystemError, never>>' is not assignable to type 'string'.
typetest/errors/displayed-type.ts(6,14): error TS2322: Type 'Effect<Uint8Array<ArrayBufferLike>, FileSystemError, "effect/FileSystem/readFile">' is not assignable to type 'string'.
typetest/errors/displayed-type.ts(8,14): error TS2322: Type 'Stream<Uint8Array<ArrayBufferLike>, FileSystemError, "effect/FileSystem/stream">' is not assignable to type 'string'.
```

The kind-mismatch message does not repeat the key: TypeScript infers `Id` only from a branch that is `Id` itself, so a
message built from `Id` would print `${string}` in its place.

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
    key: string,
    members: Ops
  ): Operations<Operations.Identifier<Ops>, Operations.Shape<Ops>>
  <Self, Shape = Types.unassigned>(): <const Ops extends Operations.Members>(
    key: Operations.KeyFor<Self, Shape, Ops>,
    members: Ops
  ) => Operations<Self, Operations.ShapeOf<Shape, Ops>>
}
```

The two call forms `Context.Service` has. The plain form infers the identifier (the union of the members' identifiers)
and the shape (the record of their shapes). The curried form takes the identifier, and optionally the shape, from the
author, as `Context.Service<Self, Shape>()("key")` does: `KeyFor<Self, Shape, Ops>` is `string` when `Self` contains
every member's identifier and `Shape`, if given, is exactly the members' shape, and otherwise a string literal type
whose text is the message, so the error lands on the key argument and reads as a sentence. `ShapeOf` is the declared
shape, or the members' shape when none was declared. A `Self` wider than the members' union is allowed on purpose: it
is how an existing record service keeps its identity while its members become keys. `members` is any object whose
properties are slots, a module namespace included. Both forms create the key with `OperationsTypeId`, `members`, the
positions of the slots it writes, and a cache for the objects it has read (under "Record storage"), and record nothing
anywhere else.

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
  /** The names at which two record shapes differ: present in one only, or present in both with types that are not mutually assignable. */
  export type ShapeDifference<A, B> = {
    [K in keyof A | keyof B]: K extends keyof A ?
      K extends keyof B ? [A[K]] extends [B[K]] ? [B[K]] extends [A[K]] ? never
          : K
        : K
      : K
      : K
  }[keyof A | keyof B]
  export type KeyFor<Self, S, Ops extends Members> = unknown extends Self ?
    "Give the record its identifier: Context.Operations<Self, Shape>()(key, members)"
    : [Identifier<Ops>] extends [Self] ? [S] extends [Types.unassigned] ? string
      : [S] extends [Shape<Ops>] ? [Shape<Ops>] extends [S] ? string
        : `Shape differs from the members' shape at "${ShapeDifference<S, Shape<Ops>> & string}"`
      : `Shape differs from the members' shape at "${ShapeDifference<S, Shape<Ops>> & string}"`
    : `Self lacks the identifier of "${Exclude<Identifier<Ops>, Self> & string}"`
  export type ShapeOf<S, Ops extends Members> = [S] extends [Types.unassigned] ? Shape<Ops> : S
}
```

It is a `Service`, so `yield*`, `.use`, `.useSync`, `.of`, `.context`, `Context.Service.Shape<typeof FileSystem>` and
`Context.Service.Identifier<typeof FileSystem>` all apply. A member is any slot: an operation, a service, a reference,
or a record service. At run time it is a plain object, not a function like every other key; that is what lets `add`
and the getters recognise it in one `typeof` (see "Record storage").

### `Context.OperationsTypeId` and `Context.isOperations`

```ts
export type OperationsTypeId = "~effect/Context/Operations"
export const OperationsTypeId: OperationsTypeId
export const isOperations: (u: unknown) => u is Operations<any, any>
```

### Existing APIs this touches

The widening and the two implementation changes are the first three rows; the rest describes what each existing
function does with the two new kinds of slot.

| API                                                            | What changes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The key parameter, `Context.Key<I, S>` → `Context.Slot<I, S>`  | In `Context.make`, `add`, `addOrOmit`, `get`, `getUnsafe`, `getOption`, `getOrElse`, `getOrUndefined`, `pick`, `omit`, `isReference`; `Effect.service`, `serviceOption`, `serviceOptional`, `provideService`, `provideServiceEffect`, `updateService`; `Layer.succeed`, `sync`, `effect`, `mock`, `updateService`; `Stream.service`, `serviceOption`, `provideService`, `provideServiceEffect`, `updateService`; `Sink.provideService`; `Channel.provideService`, `provideServiceEffect`, `updateService`. A parameter widened to a supertype accepts every call it accepted before. `Context.Key` itself is unchanged. |
| `Effect.service(key)`                                          | Was `(key) => key`, which only works for a key that is an Effect; now reads the key from the fiber's context. Same result for every existing key.                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `Layer.updateService(layer, key, f)`                           | Mapped over `key` as an Effect; now maps over `Effect.service(key)`. Same result for every existing key.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `Context.make(key, value)`                                     | One slot for an ordinary key, as today. For a record service: a flat map with one slot per member, member records written the same way, plus the record's own slot holding `value`.                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `Context.add(self, key, value)`, `Effect.provideService`       | An overlay for an ordinary key, as today, and for an operation, and for a member of a record the context holds. For a record service: one overlay holding `value` and its members, read by position; into an empty context, or one whose overlays have reached `maxDepth`, a flat map as for any key. Which of the two applies comes from the key alone: a record service is the one kind of key that is not a function.                                                                                                                                                                                                |
| `Context.get`, `getUnsafe`, `yield* key`, `key.use`, `useSync` | One slot lookup, as today, for every key but a record service. A record service reads the provided object from the overlay that wrote it, or from the flat map once the members' slots have been checked against it; with a member provided on top, an object inheriting from it with the overriding members as own properties, built on each read; for a record never provided whole, a plain object of the members, assembled once per storage. A missing member that is not a reference throws `Service not found: <member key>`; a reference member falls back to its default.                                      |
| `Context.getOption`, `getOrElse`, `getOrUndefined`             | The slot or the fallback; for a record service, the record when every non-reference member is present, otherwise the fallback.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `Context.pick(...keys)`, `Context.omit(...keys)`               | Every slot a record service writes: its members', member records' and its own. Omitting a member leaves the record's own slot in the map, which the record key never returns without the members: the record is then absent (`getOption` is none, `get` throws naming the member).                                                                                                                                                                                                                                                                                                                                      |
| `Context.addUnsafe`, `getOrUndefinedUnsafe` (string-keyed)     | One slot, by string, always: a member's string is the member, in the member read and in the record read; a record's string is its own slot, which `getOrUndefinedUnsafe` returns as stored and which a write by string fills without providing any member. `add` for a key that is not a record service is `addUnsafe(self, key.key, value)`, as at the branch point.                                                                                                                                                                                                                                                   |
| `Context.merge`, `mergeAll`, flattening, `mapUnsafe`           | Slot by slot, as at the branch point, with nothing consulted: a record overlay flattens into its slots, a record's own slot copies like any other, and the record read checks it against the members' slots of the result.                                                                                                                                                                                                                                                                                                                                                                                              |
| `Context.makeUnsafe(map)`                                      | Unchanged. The map is the context's storage, as it is today; a record view is assembled from it on the first read and remembered for it. A map must not be mutated after it is given to `makeUnsafe`; see "Hazards".                                                                                                                                                                                                                                                                                                                                                                                                    |
| `Layer.succeed`, `Layer.effect`, `Layer.sync`, `Layer.mock`    | Via `Context.make`, so an operation is one slot and a record is its members' slots and its own.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `Context.isKey`, `isReference`, `isOperation`, `isOperations`  | `isKey(op)` is `false` for both kinds of operation (a slot, not a key); `isOperation(op)` is `true`; `isKey(record)` and `isOperations(record)` are `true`; `isReference` is `false` for all three.                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `Effect.andThen`, `Effect.tap`, `Effect.flatMap` given `op`    | A function operation is a function, so they call it (`isEffect(op)` is `false`); a value operation is an Effect, so they run it (`isEffect(columns)` is `true`), which is what its type says.                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `Effect.map(op, …)`, `yield* op`, `Layer.succeed(op, …)`       | For a function operation the first two are type errors (not an Effect) and the third is accepted (a key); for a value operation all three are accepted, and `columns()` is `This expression is not callable`.                                                                                                                                                                                                                                                                                                                                                                                                           |

**Why a new type and not a change to `Key`.** `Key` is `@stability stable` and is an Effect, so a user helper
`<I, S>(k: Context.Key<I, S>) => Effect.gen(function*() { return yield* k })` compiles today and must keep compiling in
a minor. Making `Key` the non-Effect brand broke exactly that for a one-word fix; adding `Slot` above it breaks
nothing: every `Key` is a `Slot`, every function that took a `Key` takes a `Slot`, and a value typed `Key` is still
yielded. The only behaviour that moves is in two internal implementations, `Effect.service` and `Layer.updateService`,
which return the same value as before for every existing key; a type test pins that a value typed `Key` is still an
Effect.

`Context.ts` gains type-only imports of `Stream` and `Sink` for the signature types, as `Layer.ts` already has, and
imports `withFiberSucceed` from `internal/core.ts`, which it already imports from. `Sink.ts` turns its type-only import
of `Context` into a value import, as `Stream.ts` already has. `pnpm circular` is clean. A bundle that holds no record
carries 837 bytes of `Context.ts` over the branch point: the `record` check in `lookup` and in the flatten, the write
of a record overlay into a flat map, and the `typeof` dispatch in `make`, `add` and the getters; the record code proper
hangs off the record key's prototype, which such a bundle drops. Gated at 1 kB by the prototype's bundle check.

## Runtime semantics

**Construction.** `Context.Operation<Shape>()(key)` creates a function named `key` with `key`, the `OperationTypeId`
brand and `toJSON` as own properties, and `Function.prototype` as its prototype, so `.bind` and friends work; it has
no `ServiceTypeId`, so it is a slot and not a key. `Stream.Operation` and `Sink.Operation` do the same through the
internal `makeOperation`, passing a different `call`. `Context.Operation.value<Shape>()(key)` creates an Effect
primitive (an `Effectable` whose evaluation reads the slot from the running fiber's context and continues with the
Effect it finds) carrying `OperationTypeId` and `key`, and no `ServiceTypeId`. `Context.Operations(key, members)`
creates a plain object with `ServiceTypeId`, `OperationsTypeId`, `key`, `members`, the positions of the slots it writes
(`index`, every slot but its own; `spanned`, every slot; `names`, the member each slot belongs to), an empty `WeakMap`
for the objects it reads with a one-entry cache in front of it, and the `write` and `read` methods of its prototype;
nothing is recorded anywhere else. All of them are cheap enough to do at module top level for every export of a
contract; what a bundler makes of them is under "Tree-shaking".

**Calling an Effect operation.** `op(...args)` returns `withFiber((fiber) => …)`: an Effect primitive that, when run,
reads the implementation from the running fiber's context and applies it to the call's receiver and arguments; the
result is the continuation. `Effect.isEffect` of the call result is `true`, `Stream.isStream` is `false`.

**Running a value operation.** `yield* columns` evaluates the operation: it reads the implementation, an Effect, from
the running fiber's context and continues with it. `Effect.isEffect(columns)` is `true`, `Stream.isStream` is `false`,
`typeof columns` is `"object"`.

**Calling a Stream or Sink operation.** `op(...args)` returns `Stream.unwrap(applyOperation(op, this, args))`
(`Sink.unwrap`): a Stream (Sink) that, when run, reads the implementation from the fiber that pulls it and delegates to
the Stream (Sink) it returns. `Stream.isStream` is `true` and `Effect.isEffect` is `false`. All three facts are pinned
by a test.

**Lookup timing.** The implementation is read from the running fiber's context each time the call result, or the value
operation, runs, not when `op` is called and not when it is constructed. One call value run under two providers runs
two implementations; this holds for Stream operations too and is what makes `Effect.provideService(op, fake)` work on a
call built before the override is applied.

**Receiver.** `op` forwards its `this` to the implementation. A shape that declares a `this` parameter keeps it in the
call signature; an ordinary shape has `this: unknown` and ignores it. Implementations written as arrows or `Effect.fn`
are unaffected. A method provided through a record as a class instance is stored bound to the instance (next section),
so standalone and through-the-record calls agree.

**Function properties.** A shape with properties is rejected at the definition. `op` has its own properties (`key`,
`name`, `length`, `toJSON`, the brand) and nothing else; an implementation that needs to expose values beside its
function exposes them as a separate key, which can sit in the same record.

**Missing implementation.** The types prevent running a program whose `R` still contains an operation's key or a
record's identity. If the types are bypassed, the read throws the existing `Service not found: <key>` defect when the
call result runs, naming the member key in the record case.

**Record storage.** A context is what it was at the branch point: a flat base map and a chain of overlays, each one
slot, with one addition: an overlay may be a _record overlay_, holding beside its key and value the record key that
wrote it and the members it wrote, as an array in the record key's slot order. `lookup`, which every member read goes
through, compares each overlay's key as before and, for a record overlay, looks the key up in the record's `index` and
reads the member by position: one more field check per overlay walked. Flattening writes a record overlay into the new
map as its slots. A record service key carries its slot positions and two methods, which with these two checks are the
whole of the record runtime:

- `write(context, value)`: the members of `value`, read once, now, in slot order (a member that is itself a record
  contributes its own members and itself; a method found on `value`'s prototype chain is stored bound to `value`, the
  same bound function for the same object and method on every write); then one record overlay holding `value` and the
  members, with the context's base map and overlays as they were. Into an empty context, or one whose overlays have
  reached `maxDepth`, a flat map instead, as `addUnsafe` makes for any key at that depth: the context's map copied with
  the members' slots and the record's own. This is `Context.make` and `Context.add` for a record key. A fiber-cached key
  among the slots starts a new cache root, as its own write would.
- `read(context, orThrow)`: a walk down the overlays. The first overlay that touches the record decides: a record
  overlay that wrote this record, whole or as a member of an outer record, holds the provided object; a plain overlay
  holding one of the record's members is an override, and is collected; an overlay holding the record's own key by
  string, or a record overlay sharing some of its members (a subset or an overlapping record), stops the walk and the
  record is _assembled_ from that overlay down; when no overlay touches it, from the base map. With no override
  collected, the result is what was found. Otherwise it is an object inheriting from it with the overriding members as
  own properties (an overriding member that is itself a record is read as one, from the top, so its own overrides
  apply), built on each read and not remembered: one object with the overrides as its properties, which costs less
  than a cache entry would. Assembly, remembered on the key per overlay or base map: the provided object when every
  member's slot holds what the record stores for it (the
  object's property, or the bound method), otherwise an object inheriting from it with the differing members as own
  properties, or, when the record's own slot is empty, a plain object of the members. A missing member that is a
  reference reads its default; any other missing member is `Service not found: <member key>` when `orThrow` is set and
  `notFound` otherwise, in which case nothing is remembered. Assembly reads through the overlays without counting toward
  the flatten heuristic.

`Context.get` and the other getters, `yield*`, `use` and `useSync` ask `typeof key === "object"` (a record service is
the one kind of key that is not a function) and call `read`; `make` and `add` ask the same and call `write`; `pick`
and `omit` use the slot list. Everything else in `Context` is the branch point's code, plus the record-overlay check
in `lookup` and in the flatten. The invariant this keeps: a context holds only the slots that were written into it, a
member write is an overlay like any other, a record write is one overlay, and the record's own slot is never returned
without the members having been checked against it, so the record and its members cannot disagree.

**View identity.** With no override, a record read returns the provided object itself, from any storage, so its
identity is stable across reads, contexts and flattens. With an override, every read returns a new object with the
same prototype and the same own properties; two reads are equal in members and not by reference, and the spec does not
promise otherwise. An assembled object (a record never provided whole, or a flat map whose members no longer match the
provided object) is remembered per storage and is the same object on every read of that storage.

**Identity.** Every key reads and writes the slot named by its string, and two keys with one string share it whatever
their kind: a second `Context.Operation`, or a `Context.Service`, built with `"effect/FileSystem/readFile"` provides
`FileSystem.readFile` and is seen by `yield* FileSystem`, and `addUnsafe(ctx, "effect/FileSystem/readFile", fn)` does
the same. A record's own string is one more slot, which holds the object provided with the record. The record key
never returns that slot without the members, so a record is present exactly when every member is: a
`Context.Service("effect/FileSystem")`, or `addUnsafe(ctx, "effect/FileSystem", record)`, fills that slot alone, reads
it back alone, and provides no member; `yield* FileSystem` under it is `Service not found: effect/FileSystem/access`.
A record service constructed again under the same string, with the same members, reads and writes what the first
wrote; each key object remembers its own views, so after a member override the two return equal objects that are not
the same object. All of these are tested in `packages/effect/test/Context.test.ts` and in the prototype.

**Lifecycle.** There is no registry to fill or empty. The memory outside a context is each record key's `WeakMap` of
assembled objects, keyed by the base maps and overlays it has assembled for, and one module-level `WeakMap` of methods bound to the objects
they were found on; the collector empties both with their keys. A record constructed after a context exists reads and
writes it like any other. Two copies of `effect` in one process see each other's keys as slots with strings, and a
record key of either copy reads and writes the slots the other copy wrote; a record overlay written by one copy is read
by the other through the record key it names.

**Precedence.** Ordinary `Context` semantics, slot by slot: the provider closest to the call wins. `Effect.provide(a)`
then `Effect.provide(b)` in a pipe means `a` wins over `b` for keys both provide; `Layer.provideMerge(override, live)`
has `override` win; a record provided inside a member override wins for that member, and the record read returns the
provided object; a member provided inside a record wins for that member, and the record read returns a view with it.

**Cost.** The cost gate is `pnpm --filter tree-shakeable-services-spec bench:check`, which runs three modes in order
and never stops at a skipped one: the counts, then the timing benchmark for ordinary keys, then for records. Its
tables, method and readings are in the appendix; the gate is:

- Counts (`packages/effect/benchmark/context/counts.ts --check`), which do not depend on the machine: every
  ordinary-key operation (`getUnsafe` on a flat context, through an overlay, with a reference default, `getOption` of
  an absent key, `add`, `add` then `getUnsafe`, `make`, `mergeAll`) performs the same `Map` and `WeakMap` operations
  on this branch as at the branch point and allocates the same bytes, except `add`, whose overlay carries one more
  field (8 bytes); a record written into a context performs no `Map` operation and allocates the same bytes into 33
  slots and into 300; a member read through a record overlay is one `Map.get`; a record read from a record overlay
  performs no lookup and allocates nothing; a record read from a flat map, with or without a member overridden
  underneath, is one `Map.has` per overlay walked, plus one name lookup and one small object when an override is
  found; a new override followed by a record read is one slot check, one name lookup and one small object, with no
  member read and nothing remembered.
- Timing (`operations.ts --ordinary --check` and `--check`), paired CPU-time ratios against the branch point's
  `Context.ts`, the median of 21 rounds, every limit widened by an A/A control's envelope, repeated once with ten more
  rounds when the control is outside 1.05 and reported SKIPPED, not failed, when it still is: ordinary reads and
  writes within 1.25× the branch point (one `typeof` per read, one field check per overlay walked); a record read
  within 1.25× an ordinary read from the same context and from a context rebuilt per request, and within 2× with a
  member overridden underneath (one slot check per overlay, one name lookup and one small object per read); a member
  override into a context holding the record within 1.25× an ordinary write; a new override followed by a record read
  within 3× an ordinary write followed by a read; a
  record write within one ordinary write per slot it writes, into 33 slots and into 300, within 1.15× of itself between
  the two sizes, and no slower than `mergeAll` of 33 one-slot contexts; `yield*` of a record service within 1.25×
  `yield*` of a plain record service from the same context and rebuilt per request, within 1.5× with a member overridden
  underneath, per request, or from member layers, and within 3× when the whole record is provided per request; an
  operation call no slower than a method call on a yielded plain record; a method call on the record service within
  1.25× of one on a plain record.

## Hazards, and what the design does about each

- **Callables that are also Effects.** A `Context.Service` key is a function that is also an Effect. If the operation
  were an Effect too, `Effect.andThen(x, op)` would type as a call (the function overload is listed first) but run as
  an Effect (`isEffect` is checked first), returning the implementation instead of calling it. The operation is
  therefore a `Slot` that is not a `Key`: it has the string and the slot and no Effect behaviour. `isEffect(op)` is
  `false`; `isKey(op)` is `false`; `isOperation(op)` is `true`.
- **`isEffect`-dispatching duals.** `Effect.andThen` and `Effect.tap` dispatch on `isEffect(f)`; every `dual` with an
  `isEffect(args[0])` predicate (thirty-nine sites in `internal/effect.ts`, `Effect.ts`, `Console.ts`, `Runtime.ts`,
  `http/HttpServer.ts`, `internal/layer.ts` and `internal/executionPlan.ts`) decides data-first against data-last the
  same way. With `op` not an Effect, all of them see a function and the types agree with the runtime.
  `Effect.map(op, f)` is rejected at the type level:

  ```
  typetest/errors/not-an-effect.ts(5,34): error TS2345: Argument of type 'Operation<"effect/FileSystem/readFile", (path: string) => Effect<Uint8Array<ArrayBufferLike>, FileSystemError, never>>' is not assignable to parameter of type 'Effect<unknown, unknown, unknown>'.
  typetest/errors/not-an-effect.ts(8,24): error TS2488: Type 'Operation<"effect/FileSystem/readFile", (path: string) => Effect<Uint8Array<ArrayBufferLike>, FileSystemError, never>>' must have a '[Symbol.iterator]()' method that returns an iterator.
  ```

- **Stream-returning operations.** A call result is exactly one kind of value, decided by which constructor defined
  the operation, so the `isStream`/`isEffect` dispatch sites cannot misclassify it: the thirty-five
  `dual((args) => isStream(args[0]))` sites in `Stream.ts`, the streaming-response check in `HttpApiBuilder.ts`, the
  payload check in `HttpApiClient.ts`, `reactivity/Atom.ts` (which distinguishes functions, Effects and Streams),
  `http/Template.ts`, `cluster/Entity.ts` and the child-process spawners all see an Effect for an Effect operation and
  a Stream for a Stream operation. A Stream shape given to `Context.Operation` is the compile error naming
  `Stream.Operation`. The kind test is pinned so this stays true.
- **Receivers.** Forwarded, so method-style use (`holder.greet("x")`) reaches an implementation that declares `this`.
  Tested. A record provided as a class instance stores its prototype methods bound to the instance, so
  `FileSystem.readFile(p)` standalone and `(yield* FileSystem).readFile(p)` both run with the instance as `this`. The
  one difference between the two forms: a bound method that calls another member through `this` reads the instance's
  member, while the same method called through a view with that member overridden reads the override. A closure in a
  plain object that calls a sibling closure has the first behaviour in both forms. Tested in `Context.test.ts`.
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
- **A record stored, then shadowed.** `yield* FileSystem` returns the provided object while no member has been
  provided on top, so an implementation written as a class instance keeps its identity. Once a member is provided on
  top, the read returns an object inheriting from the provided one with the override as its own property, so
  `instanceof` holds and a method that reads `this.prefix` or calls `this.readFile` keeps working; the view is not the
  instance, so a class with private (`#`) fields, which belong to the instance and not to its properties, cannot have
  one member overridden and must be overridden whole. Tested with a class whose `stat` calls `this.readFile` after
  `writeFile` is overridden, in `Context.test.ts` and in the prototype.
- **Reflection on a view.** Because a view inherits the members it does not override, `Object.keys(view)`,
  `Object.entries`, `JSON.stringify` and a spread `{ ...view }` list the overriding members only, while `name in view`,
  `view.name` and `for … in` see every member; and two reads return two such objects, equal and not identical. Code
  that copies a service record by spreading it copies the overrides alone, and code that compares two reads by
  reference sees them differ. Pinned by a test. The alternative, a copy with every member as an own property, was the
  round 7 design; it cost a read of every member and a copy on the first read after every new override, and the view
  is what makes a per-request override cost one small object (measured in the appendix).
- **Override typing.** An override is the shape, so a wrong parameter type and an added requirement are both rejected,
  as pasted under "Overriding one operation in a test".
- **A value operation called.** `Terminal.columns()` is `This expression is not callable`; the operation is the Effect.
- **A constructor called without a shape.** `Context.Operation("key")` is `Expected 0 arguments, but got 1`: the key
  goes to the second call.
- **Error text under `exactOptionalPropertyTypes`.** TypeScript appends "with 'exactOptionalPropertyTypes: true'.
  Consider adding 'undefined'…" to every `Effect` assignability error because `Effect` has optional `Unify` members.
  This is the same for every missing requirement in v4 today and is not specific to operations; the line that matters
  is the indented one naming the key.
- **String-keyed unsafe access.** `Context.getOrUndefinedUnsafe(ctx, "effect/FileSystem")` returns the record's own
  slot: the object provided with the record, whether or not a member has since been provided on top, and `undefined`
  for a record never provided whole; a member's string returns the member's slot, through a record overlay too.
  `addUnsafe(ctx, "effect/FileSystem/readFile", fn)` is the member, seen by `FileSystem.readFile(p)` and by `yield*
  FileSystem`; `addUnsafe(ctx, "effect/FileSystem", record)` fills the record's own slot and provides no member, and
  `yield* FileSystem` under it alone is `Service not found: effect/FileSystem/access`. Code that reaches into contexts
  by string therefore cannot make a record disagree with its members: the members are what the record key reads.
- **A map given to `makeUnsafe`, or a provided object, mutated afterwards.** A context owns the map it was made from,
  and a record owns the object provided through it: both are read when the context is written or first read, and
  neither is mutated afterwards. This is the contract today (`mapUnsafe` is the live map). A map mutated after
  `makeUnsafe` is read live by member reads and by `mapUnsafe`, while a record view already assembled for that map
  stays what it was; a provided object mutated after provision is returned as it is by the record read while member
  reads return what was read at provision. Both are stated and the first is pinned by a test
  (`Context.makeUnsafe(new Map(ctx.mapUnsafe))` reads as the original; a slot changed behind it is read by the member
  and not by the assembled view). The three sites in the repository that copy a context's map (`RcMap`, `RpcGroup`,
  `McpServer`) build contexts of their own keys and mutate nothing afterwards.
- **Two key objects with one string.** A second `Context.Operation`, or a `Context.Service`, built with a member's
  string reads and writes that member's slot, and the record read sees it. One built with a record's string is a
  plain key over the record's own slot: it reads back what it wrote and provides no member. A second
  `Context.Operations` built with a record's string and members reads and writes what the first does, and returns its
  own view after a member override. All three are tested, in the prototype and in `packages/effect/test/Context.test.ts`.
- **Two copies of `effect`.** A record key is recognised by `OperationsTypeId`, a string property, so a record key
  from one copy is a record key to the other copy's `Context.add` and `Context.get`, and both copies read and write
  the same slots. Each copy's operations and record keys are its own objects; nothing else is shared or needs to be.
- **Code that gates on `isKey`.** An operation of either kind is not a `Context.Key`, so a function that accepts "a key
  or a value" by testing `isKey` sees an operation as a value. The repository has no such site outside `Context` itself,
  and the typed APIs take `Slot`, so the case is confined to code that inspects unknown values; `isOperation` is the
  test for it.
- **A value operation and `Effect.isEffect`.** `isEffect(columns)` is `true`, and so it should be: the type says
  `Effect<number, never, "effect/Terminal/columns">`, and every `isEffect`-dispatching dual treats it as the Effect it
  is. The hazard the function operation avoids (a value typed as a function that runs as an Effect) cannot arise,
  because a value operation is not callable in the types or at run time.
- **A record provided per request.** `Effect.provideService(FileSystem.FileSystem, impl)` inside a request reads the
  thirty-two members off `impl` and allocates one overlay and one array each time, about one ordinary write per member;
  it does not copy the context. A server that builds a record per request pays that; one that provides it at the root
  pays it once. Measured and gated in the appendix.
- **Overlay depth.** A record overlay counts as one toward `maxDepth` (default 8), like any `add`; past it, the write
  flattens into a new map as `addUnsafe` does. A record read walks the overlays above the record, so a context with
  many overlays above a record read on every request pays one comparison per overlay, as every key does, plus one set
  lookup for each overlay that holds one of the record's slots.

## Type-level evidence

The compiler output this spec relies on is pasted where it applies: a program run without its operations and a
forgotten override under "Providing operations" and "Overriding one operation in a test"; a wrong override there too;
the definition errors for generic, overloaded, property-bearing and wrong-kind shapes under "Defining operations" and
"Generic, overloaded and property-bearing shapes"; the record and subset diagnostics under "The library recipe" and
"Subset records". The whole output of `pnpm --filter tree-shakeable-services-spec check-errors`, which compiles the
twenty files under `typetest/errors` and checks each fails for its documented reason, is in the appendix, with
`typetest/ok/signatures.ts`, the positive assertions, abridged.

Two more facts an implementer should know. The record program run unprovided prints the record's name
(`Type 'FileSystem' is not assignable to type 'never'`), and a partial merge annotated as the record prints what is
missing. But the record program _partially_ provided prints the remaining keys in full: `Exclude` distributes over the
union and the alias is gone, so a `FileSystem` program with two of thirty operations provided prints twenty-eight keys.
This is the price of the identity being a union, and the union is what lets per-operation layers satisfy the record.
The mitigation is the subset record: a program that needs three members names `ReadOnly`, and "provided two of three"
prints one key. Accepted, and pasted in the appendix.

## Tree-shaking: what the bundler needs, and what the prototype shows

Requirements on code, all of which are the ordinary requirements for anything to tree-shake:

1. One implementation per top-level export, in a side-effect-free module. One module per operation is the simplest
   way to get that and is what the prototype and the bundle test do; several exports in one side-effect-free module
   also work.
2. The composition root imports implementation modules, or reads members off their namespace. It does not import an
   aggregate unless it wants everything.
3. Aggregates (`layer = Layer.mergeAll(...)`) live in their own module or are `/* @__PURE__ */`-annotated, because an
   unused call expression at top level is retained otherwise.

The types enforce the half that matters: `R` names what to import. Nothing in the design depends on a rule that the
types cannot check except rule 3, which is the general rule for any top-level call in any bundled code. There is no
rule for the contract module: a key the bundler keeps costs bytes, which the appendix measures ("What a kept key
costs"): about 7 kB for an unannotated thirty-key contract with three Stream keys under esbuild, and nothing once the
contract is published, because `packages/effect`'s build annotates every top-level declaration pure, as it does for
every `Context.Service` key today.

The prototype (`specs/tree-shakeable-services/`) models `effect/FileSystem` as 30 operations, three of them
Stream-returning and two needing `Scope`, plus `effect/Terminal` as six operations, five of them value operations,
with one Node implementation module each, and nine composition roots. `pnpm --filter tree-shakeable-services-spec bundle`
builds each with esbuild (and the annotation matrix with Rolldown too), with `effect` bundled as published, and reports
which implementation modules and how many bytes of the Stream runtime each contains, by metafile and by a
per-implementation marker string. The check fails if an unused implementation appears in any bundle, a used one is
missing, a root's Stream bytes fall outside its band (none, the wrapper, or in use), or the plain root is more than
1 kB larger than the same root bundled with the branch point's `Context.ts`. It then runs five of the bundles. The
two-operation root carries two of thirty implementations, the twenty-operation root twenty, the record roots all
thirty, the terminal root two of six members and no Stream code, and the no-record root 837 bytes of `Context.ts` over
the branch point; the full table is in the appendix.

`packages/effect/test/FileSystem/treeShaking.test.ts` is the regression test for the real module: it bundles
`test/fixtures/tree-shaking/main.ts`, a root that calls `FileSystem.readFile` and `FileSystem.writeFile` from
`effect/FileSystem` and provides two of three implementation layers read off a namespace (`node/index.ts`, one module
per operation), with `effect` as published (`packages/effect/src` passed through `esbuild.transform` and
`babel-plugin-annotate-pure-calls` in an `onLoad` plugin), and asserts four things: the `readFile` and `writeFile`
markers are in the bundle and the `stat` marker is not; the two keys `"effect/FileSystem/readFile"` and
`"effect/FileSystem/writeFile"` are in the bundle and `"effect/FileSystem/stat"`, `"effect/FileSystem/stream"` and
`"effect/FileSystem"` are not; the bundle contains zero bytes of `Stream.ts`, `Channel.ts`, `Sink.ts` and their
internals; and the bundle runs, backing up a temporary file. It passes on this branch.

## Migrating an existing record service: `effect/FileSystem`

`effect/FileSystem` today exports `interface FileSystem` (the record shape, 32 members), `const FileSystem:
Context.Service<FileSystem, FileSystem>`, `make(impl)` (which derives `exists`, `glob`, `readFileString`, `stream`,
`sink` and `writeFileString` from the primitives), `makeNoop`/`layerNoop`, and the `WatchBackend` service. Providers:
`NodeFileSystem.layer` and `DenoFileSystem.layer`, each `Layer.effect(FileSystem, Effect.map(serviceOption(WatchBackend),
(backend) => make({...}))`, plus `layerNoop` in tests and docs. Consumers: 57 `yield* FileSystem` sites across `effect`
(http, cli, persistence, logger, config, schema), and user code. The module is `@stability unstable`.

The migration has four phases. Each is a PR that is mergeable and verifiable on its own, and nothing in a later phase
is needed for an earlier one to work. Phase 0 is implemented on this branch, as a dry run of the claim that it breaks
nothing.

### Phase 0: operations arrive under the existing identity

In `packages/effect/src/FileSystem.ts`, implemented here:

- One operation per member of the interface, exported under the member's name, taking its shape from the interface
  and the interface as its brand: `export const readFile = Context.Operation<FileSystem["readFile"], FileSystem>()("effect/FileSystem/readFile")`,
  so each member's type stays written once, in the interface. Its requirement is `"effect/FileSystem/readFile" &
  FileSystem`. `stream` and `watch` use `Stream.Operation`; `sink` uses `Sink.Operation`; `open`,
  `makeTempDirectoryScoped` and `makeTempFileScoped` keep `Scope` in their shapes.
- `export const FileSystem = Context.Operations<FileSystem, FileSystem>()("effect/FileSystem", members)` replaces
  `Context.Service("effect/FileSystem")`. The identity is still the interface; the constructor accepts it because it
  contains every member's branded identifier.
- `export type Shape = FileSystem`: the name that phase 1 makes the record type, available now so that value-type
  uses of `FileSystem.FileSystem` can move ahead of time.
- The `[TypeId]` brand goes from the interface, from `make` and from `makeNoop`. Nothing read it, and a record of
  member slots cannot carry it.
- `make`, `makeNoop` and `layerNoop` keep their signatures.

**What a user gets.** `FileSystem.readFile(path)` compiles and runs under `NodeFileSystem.layer`, `layerNoop` and
`Layer.mock(FileSystem.FileSystem, …)`, because `Layer<FileSystem>` satisfies `"…/readFile" & FileSystem` by
assignability of the intersection to its constituent. `Effect.provideService(FileSystem.readFile, fake)` on top of any
of them overrides that one member, in the operation call and in `yield* FileSystem`, and leaves the other members'
requirements in place, because `"…/stat" & FileSystem` is not assignable to `"…/readFile" & FileSystem`. What a user
cannot do yet is satisfy `yield* FileSystem` with member layers alone: `Layer<"…/readFile" & FileSystem>` does not
provide `FileSystem`. That is the one thing phase 1 changes. The brand is the price of one release: in phase 0 a
program's `R` shows `"effect/FileSystem/readFile" & FileSystem`; in phase 1 it shows `"effect/FileSystem/readFile"`.

**What stays exactly as it was.** Every `yield* FileSystem`, `Effect<_, _, FileSystem>`, `Layer<FileSystem>`,
`Layer.succeed(FileSystem, make(impl))`, `fs: FileSystem.FileSystem` and `FileSystem.FileSystem["readFile"]` in the
repository and in user code, and `yield* FileSystem` returns the object the layer provided. The evidence on this
branch: `pnpm check` over every package is clean; the `FileSystem`, `ConfigProvider`, `cli`, `HttpStaticServer`,
`HttpPlatform` and `Logger` suites pass unchanged; `make`'s callers in `NodeFileSystem.ts` and `DenoFileSystem.ts` did
not change a line; and `packages/effect/test/FileSystem.test.ts` gains four tests: an operation call under a
`Layer<FileSystem>` with `yield* FileSystem` returning the provided object, a one-member override on top of
`layerNoop` seen by the call and by the record view, `Layer.mock`, and the 33-slot storage. At run time a provided
file system occupies 33 slots (32 members and the record), which shows in `ctx.mapUnsafe.size` and in
`Context.omit(FileSystem)`; nothing else is observable. The compile cost of the branch (`Context`, both phase 0s,
their tests) is under 2 % in types and instantiations; the measurement is in the appendix.

**Changeset**, on the branch as `.changeset/filesystem-operations.md` (`"effect": minor`): "`effect/FileSystem`
exports one operation per member (`FileSystem.readFile(path)`, `Effect.provideService(FileSystem.readFile, fake)`),
all satisfied by any `Layer<FileSystem>`, and `FileSystem.Shape` as the name of the record type. Write
`FileSystem.Shape` where you use `FileSystem.FileSystem` as the type of an implementation; the next minor makes
`FileSystem.FileSystem` the identity of the whole service. The `[TypeId]` brand is gone from the interface; nothing
read it." The `Context` additions have their own changeset, `.changeset/context-operation.md`.

**Codemod**, on the branch as `scripts/codemods/record-shape.ts` with the runner `pnpm codemod:shape [--module
FileSystem|Terminal] <paths>`: a `jscodeshift` transform that rewrites `FileSystem.FileSystem` in type positions to
`FileSystem.Shape`, except in requirement positions, which it recognises as type arguments of `Effect`, `Layer`,
`Stream`, `Sink`, `Channel`, `Context` and `Effect.fn.Return`; value positions (`yield* FileSystem.FileSystem`, the
key argument of `Layer.succeed` and `Effect.provideService`) are never type positions and are untouched:

```ts
// before
export const use = (fs: FileSystem.FileSystem): Effect.Effect<boolean, never, FileSystem.FileSystem> => fs.exists("a")
const fs: FileSystem.FileSystem = yield* FileSystem.FileSystem
// after
export const use = (fs: FileSystem.Shape): Effect.Effect<boolean, never, FileSystem.FileSystem> => fs.exists("a")
const fs: FileSystem.Shape = yield* FileSystem.FileSystem
```

The sites it rewrites in the repository, found by grep, are 46 in 9 files (`DenoFileSystem.ts` 24,
`NodeFileSystem.ts` 11, `internal/glob.ts` 1, `tools/graphql-generator` 5, `tools/docgen` 3, two tests), all
mechanical; none of them needs to change in phase 0, which is why none did on this branch, and issue 7 runs it.

### Phase 1: the identity becomes the union

- Each operation drops its brand: `Context.Operation<Shape["readFile"]>()("effect/FileSystem/readFile")`.
- `export type FileSystem = Context.Operations.Identifier<typeof members>` replaces the interface as the identity;
  `export interface Shape { … }` is the interface, renamed; `export const FileSystem = Context.Operations<FileSystem,
  Shape>()("effect/FileSystem", members)`.
- `make(impl)` returns `Shape`; `makeNoop` and `layerNoop` keep their signatures.

**Every way the `FileSystem` type identity changes.** Listed so the changeset can be honest:

1. `FileSystem.FileSystem` the _type_ stops being the record and becomes the union of 32 key literals. Code that
   used it as a value type fails to compile and says `FileSystem.Shape` instead; the phase 0 codemod does so for the
   repository's 46 sites and for any user who ran it. `Effect<_, _, FileSystem.FileSystem>`,
   `Layer<FileSystem.FileSystem>` and `Effect.fn.Return<_, _, FileSystem.FileSystem | Path.Path>` are requirement
   positions and do not change.
2. `Context.Service.Identifier<typeof FileSystem>` is the union; `Context.Service.Shape<typeof FileSystem>` is `Shape`.
3. The requirement widens: a `Layer` of all 32 member keys, or `Effect<_, _, "effect/FileSystem/readFile">`, is now
   assignable where `FileSystem` is expected. This is the point of the migration and breaks nothing.
4. The identity no longer survives `Exclude` by name: a `FileSystem` program with some members provided prints the
   remaining keys instead of `FileSystem` (the accepted limitation above).
5. The declaration file shows `type FileSystem = …` and `interface Shape` where it showed `interface FileSystem`.

Run time does not change at phase 1: the storage, the 33 slots, `yield* FileSystem` returning the provided object, and
`Layer.mock` all arrived in phase 0.

**Semver.** `FileSystem` is `@stability unstable`, and the repository's policy (`MIGRATION.md`, "Stability": "`@stability
unstable` means an API may receive new features in patch releases and breaking changes in minor releases"; restated for
changesets in `.agents/skills/changesets/authoring.md`) is that unstable APIs may break in minor releases. Phase 1 ships
in a minor under that policy, as a breaking change declared as one, one release after phase 0 gave every user the name
to move to and the codemod to move with. A deprecation window in which `FileSystem.FileSystem` is still usable as the
record type is not possible: one name cannot denote both the identity and the shape, and keeping the interface as the
identity is the alternative rejected in the appendix, under which per-operation layers can never satisfy the record.

**Changeset** (`"effect": minor`): "**Breaking** (`@stability unstable`): `FileSystem.FileSystem` the _type_ is now
the identity of the whole service (the union of its 32 operation keys), not the record of implementations. Code that
used it as a value type uses `FileSystem.Shape` (available since the previous release; `pnpm codemod:shape --module
FileSystem` rewrites it). Requirements, layers and `yield*` are unchanged. A merge of per-operation layers now
satisfies `Layer<FileSystem.FileSystem>`."

### Phase 2: per-operation implementation modules

In `packages/platform/node-shared` (and `deno`, then `bun` through its re-export): one module per primitive operation,
`src/NodeFileSystem/<op>.ts`, each exporting `Layer.succeed(FileSystem.<op>, impl)` built from the function
`NodeFileSystem.ts` already has for that member (`watch` is `Layer.effect` over `serviceOption(WatchBackend)`); a
barrel `src/NodeFileSystem/index.ts` with `export *` so `import * as NodeFileSystem from
"@effect/platform-node-shared/NodeFileSystem"` and `NodeFileSystem.readFile` shake as the fixture's `node/index.ts`
does. The derived operations (`exists`, `glob`, `readFileString`, `stream`, `sink`, `writeFileString`) are
platform-independent: `effect/FileSystem` ships each as a layer over the primitives it needs, for example
`layerReadFileString: Layer<"effect/FileSystem/readFileString", never, "effect/FileSystem/readFile">`, and each
platform's module for a derived operation is that layer provided with the platform's primitive.

`NodeFileSystem.layer` keeps its name, type, module and form: `Layer.effect(FileSystem, make({...}))` built from the
same per-operation functions, which provides the record whole, and lives apart from the barrel so importing one
operation does not import thirty. A user who merges member layers instead gets the shaken bundle and a `yield*
FileSystem` assembled once per flat map.

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

| User code                                                                           | Phase 0                                      | Phase 1                 | Phase 2                           | Phase 3                             |
| ----------------------------------------------------------------------------------- | -------------------------------------------- | ----------------------- | --------------------------------- | ----------------------------------- |
| `yield* FileSystem` + `NodeFileSystem.layer`                                        | unchanged; whole bundle                      | unchanged; whole bundle | unchanged; whole bundle           | unchanged; whole bundle             |
| `FileSystem.readFile(p)` + `NodeFileSystem.layer`                                   | compiles; whole bundle                       | compiles; whole bundle  | compiles; whole bundle            | compiles; whole bundle              |
| `FileSystem.readFile(p)` + `NodeFileSystem.readFile`                                | not yet available                            | not yet available       | two implementations in the bundle | two implementations in the bundle   |
| `yield* FileSystem` + member layers                                                 | does not compile (`FileSystem` not provided) | compiles                | compiles                          | compiles                            |
| `HttpServerResponse.file` + `NodeFileSystem.layer`                                  | whole bundle                                 | whole bundle            | whole bundle                      | compiles; member layers now suffice |
| test: `Effect.provideService(FileSystem.readFile, fake)` on top of any of the above | works                                        | works                   | works                             | works                               |
| test: `FileSystem.layerNoop({ readFile })` / `Layer.mock(FileSystem, {...})`        | unchanged                                    | unchanged               | unchanged                         | unchanged                           |
| `fs: FileSystem.FileSystem` as a record type                                        | works; `fs: FileSystem.Shape` recommended    | `fs: FileSystem.Shape`  |                                   |                                     |

## A second migration: `effect/Terminal`

`effect/Terminal` is the shape `FileSystem` is not: six members, five of them Effects rather than functions
(`columns`, `rows`, `size`, `readInput`, `readLine`) and one function (`display`), one provider
(`NodeTerminal.layer`, a scoped `Effect` that wires `readline` and `stdin` once and builds all six), and ten consumers
in `cli/Prompt.ts` plus sixteen elsewhere in the repository. `@stability unstable`. The prototype's `src/Terminal.ts`
and `src/node/terminal/` are this migration at phase 2, and `main-terminal.ts` is its bundle check: a program that
displays a banner at the terminal's width carries `columns` and `display` and neither reader.

**Phase 0, implemented on this branch.** In `packages/effect/src/Terminal.ts`: five value operations and one function
operation, each taking its shape from the interface and branded with it
(`Context.Operation.value<Terminal["columns"], Terminal>()("effect/Terminal/columns")`,
`Context.Operation<Terminal["display"], Terminal>()("effect/Terminal/display")`); `Terminal = Context.Operations<Terminal,
Terminal>()("effect/Terminal", members)`; `export type Shape = Terminal`; `make(impl: Terminal): Terminal` returns the
record; the `[TypeId]` brand goes from the interface, as nothing read it. The shape does not change: `columns` is still
`Effect<number>`, so `NodeTerminal.make`, `Terminal.make({...})` in tests and the ten `yield* terminal.columns` sites in
`cli/Prompt.ts` did not change a line, and the `cli` and `Terminal` suites pass unchanged. A user may now write
`yield* Terminal.columns` and `Effect.provideService(Terminal.columns, Effect.succeed(80))` under any
`Layer<Terminal>`. `packages/effect/test/Terminal.test.ts` (five tests) pins it: a value operation yielded under a
`Layer<Terminal>` with `yield* Terminal` returning the provided object and the member being the same Effect through
the record, a one-member override seen standalone and through the record view, `Layer.mock`, the unprovided defect
naming the member, and the 7-slot storage. Changeset: `.changeset/terminal-operations.md`; the codemod is `pnpm
codemod:shape --module Terminal` for the three value-type uses (`terminal: Terminal.Terminal`,
`Terminal.Terminal["readInput"]`, all in `cli/Prompt.ts`).

**Phase 1.** The six operations drop their brand and take their shapes from `Shape`, the interface renamed;
`type Terminal = Context.Operations.Identifier<typeof members>`; `Terminal = Context.Operations<Terminal, Shape>()("effect/Terminal", members)`.
A consumer may write `yield* Terminal.columns` where it wrote `const terminal = yield* Terminal; yield* terminal.columns`.
The identity changes exactly as `FileSystem`'s does in its phase 1, under the same policy.

**Phase 2.** `NodeTerminal` becomes one module per member. `columns`, `rows` and `display` are one-liners over
`process.stdout`: `Layer.succeed(Terminal.columns, Effect.sync(() => process.stdout.columns ?? 80))`. `readInput`,
`readLine` and `size` share the `stdin`/`readline` setup that `make(shouldQuit)` does once today; that setup becomes an
internal scoped service, `NodeTerminal/Input` (a `Context.Service` whose layer owns the `readline` interface and the
keypress listener), and each of the three members is `Layer.effect(Terminal.readInput, Effect.map(Input, …))` provided
with it. A root that only displays never imports `Input`, so neither `readline` nor the key-event parser is in its
bundle, which is what `main-terminal.ts` measures (two of six members). `NodeTerminal.layer` keeps its form, a record
layer, with `Input` provided inside; `NodeTerminal.make(shouldQuit)` keeps its signature as the aggregate builder.

**Phase 3.** The ten `Prompt.ts` sites read `columns`, `readInput` and `display`; the prompt runner takes
`Terminal.Shape` by parameter in three places and keeps doing so. Each prompt's requirement becomes
`"effect/Terminal/columns" | "effect/Terminal/readInput" | "effect/Terminal/display"`, or `Terminal.Interactive`, a
subset record over those three exported from `effect/Terminal`, so a CLI that never prompts carries no reader.

**And `effect/Path`.** `Path` has fifteen members: thirteen synchronous functions and a string, plus `fromFileUrl`
and `toFileUrl`, which return Effects. It can be a record service (the prototype's mixed-record test is this shape),
but there is nothing to shake: the implementation is one module of small functions, and a program that uses `join`
wants `normalize` with it. `Path` stays a plain record service, and the rule under "Which members are operations" is
what says so: a service is worth migrating when its members have implementations worth separating.

Both phase 0s are on this branch and both are non-breaking in the same way: the operations arrive under the existing
identity, the shape is unchanged, every consumer in the repository compiles untouched, and `pnpm check` over every
package is clean. Any record service in `effect` whose members are functions returning Effects, Streams or Sinks, or
Effects, can take the same step.

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
being a union rather than from a subtype relation. Its branded subtype is what phase 0 of a migration uses, for the
one release in which the old identity must still satisfy the new keys. PR #10319 was closed without merging.

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
driver. PR #10369 implemented it and is open; this spec keeps its callable wrapper, makes the wrapper the key itself
now that a key need not be an Effect, and replaces the defaulted `Reference` with a required slot.

### Bundler-side property shaking (Rolldown)

A third avenue, explored separately: teach the bundler to drop unused properties from service records by tracking
demand from `Context` lookups to provider object literals. The investigation found Rolldown has no property-level
shaking or value-flow machinery to build on, so the analysis has to be Effect-specific and keyed on service identity;
a plugin proof of concept recovered up to 41% on closed-world programs but bailed out on exported entry points,
Streams, forks, reflection and direct `Context` access, and a native fork handles only the `Layer.effect` plus
`yield* Key` base case so far. It is complementary: it attacks existing record services without changing user code,
at the cost of a bundler fork and a list of bailouts. This spec gives library authors a way to make the guarantee
unconditional for the services they choose to expose per operation.

The decisions taken inside this design, and the alternatives rejected within it, are recorded in the appendix.

## Scope

In scope: `Context.Operation`, `Context.Operation.value`, `Context.Operations` and their types, `Stream.Operation`,
`Sink.Operation`, `isOperation`, `isOperations`, `Context.Slot` with the parameter widening and the two implementation
fixes, the record storage in `Context`, tests, JSDoc, the cost gate, the bundle test, changesets, the codemod, the
four-phase migration of `effect/FileSystem` with its Node and Deno providers (phase 0 on this branch), and the
migration of `effect/Terminal` with `NodeTerminal` (phase 0 on this branch). Out of scope: bundler plugins, migrating
other record services (each follows one of the two recipes and is its own issue; `Path` is not worth one), and the
ai-docs example (tracked separately, since the equivalent example was removed from PR #10369 pending a decision on
ai-docs).

## Implementation plan

Twelve issues. The first four are the primitive, each mergeable on its own and verifiable by the tests named with it;
the rest follow. The code for the first four is on this branch in `packages/effect/src/Context.ts`, `Stream.ts`,
`Sink.ts`, `Channel.ts`, `Layer.ts`, `Effect.ts` and `internal/effect.ts`, with its runtime tests
(`packages/effect/test/Context.test.ts`), type tests (`packages/effect/typetest/Context.tst.ts`), the cost gate
(`packages/effect/benchmark/context/`) and the changeset `.changeset/context-operation.md`, passing `pnpm check`,
`pnpm test-types`, `pnpm lint`, `pnpm circular` and `pnpm jsdocs --check`; splitting it into four PRs is a matter of
cutting the diff at the seams named below.

1. **`Context.Slot` and the widening.** The `Slot` interface, `Key extends Slot`, the key parameter of every function
   under "Existing APIs this touches" widened, `Effect.service` reading from the context and `Layer.updateService`
   mapping over it, `Context.Service.Identifier`/`Shape` extracting from any slot. Acceptance: every existing test
   passes unchanged; a type test pins that a value typed `Context.Key` is still an Effect and that a key built
   structurally with `key` alone works with one-slot semantics; `Effect.service(key)` and `Layer.updateService` return
   what they returned for every existing key; no runtime file but `Context.ts`, `internal/effect.ts` and `Layer.ts`
   changes behaviour; the `--ordinary` timing run and the ordinary rows of the counts are unchanged from the branch
   point.
2. **Function operations: `Context.Operation`.** The constructor with its one call form and optional `Brand`, the
   `Operation` type and namespace (`Call`, `Requirements`, `Require`, `Derivable`, `KeyFor` with `ResultKind`, `KindOf`
   and `Fix`, `FunctionSignature`, `Any`), `OperationTypeId`, `isOperation`, the internal `makeOperation` and
   `applyOperation`. Acceptance: test plan items 1 to 5 and 8 to 11; type test items 1 to 7 for Effect shapes, with
   the four definition messages (generic, overloaded, properties, wrong kind) printed as pasted; a Stream shape given
   to `Context.Operation` is the error naming `Stream.Operation`.
3. **Value, Stream and Sink operations: `Context.Operation.value`, `Stream.Operation`, `Sink.Operation`.** The
   `Effectable` value operation, the two ten-line constructors over `Stream.unwrap` and `Sink.unwrap`, `Sink.ts`'s
   value import of `Context`. Acceptance: test plan items 6, 7 and 12; type test items 1 and 8; `Context.ts` has no
   run-time import of `Stream`, `Sink` or `Channel`; `pnpm circular` clean; an Effect shape given to
   `Stream.Operation` is the error naming `Context.Operation`.
4. **Record services: `Context.Operations` and the record storage.** The constructor with both forms, the `Operations`
   type and namespace, `OperationsTypeId`, `isOperations`, the record overlay (`Overlay.record`, the check in `lookup`
   and in the flatten), `write`, `read`, assembly, the views cache, the bound-method cache, `pick`/`omit` over the
   slot list. Acceptance: test plan items 13 to 35; type test items 9 to 12; the counts gate's record rows; the
   records timing run within its limits (or SKIPPED on an unreadable machine, with the counts gate passing); the
   prototype's bundle check within 1 kB of `Context.ts` for the no-record root; `pnpm jsdocs --check` clean with the
   **Gotchas** named under "Acceptance criteria".
5. **Bundle regression test.** `packages/effect/test/FileSystem/treeShaking.test.ts` with its fixture under
   `test/fixtures/tree-shaking/`, on the branch and passing; described under "Tree-shaking".
6. **`effect/FileSystem` phase 0.** The change on this branch to `packages/effect/src/FileSystem.ts` and its four
   tests in `test/FileSystem.test.ts`, the codemod `scripts/codemods/record-shape.ts` with its runner, and the
   changeset, all on the branch, plus one test that an operation call runs under `NodeFileSystem.layer`. Verified by
   every existing suite passing unchanged.
7. **`effect/FileSystem` phase 1.** The identity flip, the five listed changes, the changeset, and the repository's
   46 value-type sites rewritten by `pnpm codemod:shape --module FileSystem`. Verified by the FileSystem, Node and
   Deno suites passing unchanged, plus a type test that the merge of 32 member layers is a `Layer<FileSystem>`.
8. **`effect/FileSystem` phase 2, Node.** Per-operation modules under `NodeFileSystem/`, derived-operation layers in
   `effect/FileSystem`, the aggregate rebuilt as the merge. Verified by the bundle test from issue 5 run against a
   fixture that provides `NodeFileSystem.readFile` and `NodeFileSystem.writeFile`.
9. **`effect/FileSystem` phase 2, Deno and Bun.** The same layout for `DenoFileSystem`; Bun re-exports Node's.
10. **`effect/FileSystem` phase 3.** `FileSystem.ReadOnly`, and the `yield* FileSystem` sites inside `effect` that use
    few members moved to operation calls or a subset annotation, one commit per module, with the module's tests
    unchanged. Verified by a bundle fixture using `HttpServerResponse.file` with member layers only.
11. **`effect/Terminal` phases 0 to 2.** Phase 0 is on this branch (`packages/effect/src/Terminal.ts`,
    `test/Terminal.test.ts`, its changeset, the cli and Terminal suites unchanged); then the identity flip with `pnpm
    codemod:shape --module Terminal`, then `NodeTerminal` as one module per member over an internal `Input` service
    with `NodeTerminal.layer` as the record layer. Verified by the existing Terminal and cli test suites, and a bundle
    fixture that displays without reading.
12. **`effect/Terminal` phase 3.** `Terminal.Interactive` and the `cli/Prompt.ts` sites.

The ai-docs example `ai-docs/src/01_effect/03_services/30_operations.ts` (a contract, one implementation per module, a
root importing two, a test overriding one) is opened only once ai-docs are wanted again.

## Test plan

Runtime tests (`packages/effect/test/Context.test.ts`, `describe("Operation")` with `describe("Operations")`,
`describe("Operation.value")` and `describe("same string, same key")` inside it, 30 tests on this branch, 50 in the
file), each mirrored in the prototype's `test/Operation.test.ts` (42 tests):

1. An operation is a function named after its key, a slot and not a key (`isOperation` true, `isKey` false; `key` is
   the string), and not an Effect (`Effect.isEffect` false); `Function.prototype` is in its chain.
2. A call runs the implementation provided for the operation with `Layer.succeed`, `Layer.effect` and
   `Effect.provideService`; `Context.make`, `get`, `getOption`, `getOrUndefined`, `pick`, `omit` and `Effect.service`
   treat it as one slot.
3. Running a call whose key is unprovided (types bypassed) dies with `Service not found: <key>`.
4. A single operation is overridden in a test with the innermost provider winning, through `Effect.provide`,
   `Effect.provideService` and `Layer.provideMerge`.
5. One call value run under two providers runs two implementations (lookup at run time), for an Effect operation and
   a Stream operation.
6. A Stream operation runs its implementation and an override through `Stream.runCollect`, and `Stream.map` composes
   on the call result. A Sink operation runs through `Stream.run`.
7. An Effect operation's call is an Effect and not a Stream; a Stream operation's call is a Stream and not an Effect;
   a Sink operation's call is a Sink and not an Effect.
8. `Effect.andThen`, `Effect.tap` and `Effect.flatMap` call an operation passed as their function.
9. The receiver is forwarded to the implementation.
10. A generic shape naming its key runs with its signature.
11. `Effect.fn` implementations work unchanged.
12. A value operation is an Effect and a slot, not a function and not a key (`Effect.isEffect` true, `isOperation`
    true, `isKey` false, `typeof` not `"function"`); yielded, it runs the Effect provided for it through `Layer.succeed`
    and `Effect.provideService`; through the record the member is that Effect; an override on top of the record is
    seen standalone and through the record; unprovided, it dies naming its key.
13. A record service is a key with `isOperations` true, `Effect.isEffect` true and `members` attached.
14. `Layer.succeed(record, value)` provides every member: the per-operation program and the `yield*` program both run
    under it.
15. `yield* record` returns the provided object, through a layer, through `provideService`, through `Context.get`, and
    after unrelated additions deep enough to rebase the overlays; `getOrUndefinedUnsafe` by the record's string
    returns it too.
16. `yield* record` assembles the record under per-operation layers; with one member unprovided it dies naming the
    member's key; the optional getters report it absent.
17. An operation override on top of a record wins for that member, directly and through the record view, which
    inherits from the provided object and carries the override as its own property; the other order has the record
    win and the record read return the provided object.
18. `Layer.mock(record, partial)` runs the provided member and dies as unimplemented on the others.
19. `Effect.provideService(record, value)`, `Effect.updateService(record, f)`, `Context.make`, `get`, `getOption`,
    `pick` and `omit` behave as in "Existing APIs this touches"; `Context.get` on a missing member throws naming it;
    omitting a member leaves the record's own slot and makes the record absent.
20. A record is stored under its own key and its members' keys.
21. A member write into a context holding the record is a plain overlay and leaves the record's slot holding the
    provided object; the record read inherits from the provided object (`Object.getPrototypeOf(view) === provided`),
    has the override as its only own property (`Object.keys(view)`, `{ ...view }`), and two reads are two such
    objects; contexts derived from it by unrelated writes read the same members; the original context still reads the
    provided object; a context rebased into a new flat map reads the same members from an object assembled once per
    map; a `merge` with a
    member on the right overrides the record on the left, a record on the right wins over a member on the left,
    `mergeAll` likewise; no flat map holds a marker of any kind.
22. A record provided as a class instance keeps working after one member is overridden: the record view is an
    instance of the class inheriting from the instance, a method that reads `this` and calls another method runs,
    and with nothing overridden the read is the instance itself.
23. A method found on a provided object's prototype is stored bound to it: the slot holds a function that is not the
    prototype's, an own arrow property is stored as it is, a standalone call and a call through the record both keep
    `this`; with no override the record read is the instance, through a flat map, through a record overlay, and
    after the overlay is flattened; a bound method calling a sibling through `this` reads the instance's member
    standalone and the override through a view; `Layer.mock`'s proxy is stored as the proxy returns it.
24. A record added to a context is one overlay (`overlay.record.key` is the record, `overlay.value` the provided
    object, the base map the one of the context added to) into a context of one slot and of three hundred; its
    members and the record read through it; `mapUnsafe`, `pick`, `omit`, `merge` and the string-keyed readers see it
    as a flat write; an empty context and a context at `maxDepth` take it as a flat map.
25. A map given to `makeUnsafe` is the context's storage: a copy of a context's map reads as the original; a slot
    changed behind it is read by the member and not by a record view already assembled for that map; a map changed
    before the first read is read as it stands.
26. A record with a plain value, a synchronous function and an operation as members provides all three, assembles
    from member layers, and an override of one member wins on top of the record.
27. A reference member reads its default when its slot is empty and the provided value otherwise.
28. A record that is a member of a record is stored with its own slot and its members', read back as the provided
    object, read as a view when a member is written deeper down (both records), and replaced by a nested record
    written on top; `omit` of the outer record removes them all.
29. A subset record is satisfied by the full record and by its member layers at run time, provides its members, writes
    its members' slots and its own, and shadows the full record slot by slot in both orders.
30. A record never written has no slot before or after it is read; it is assembled once per storage, the same object
    on every read of that context, shared by a derived context whose members are the same values, and a view over it
    with the replacement for a context where a member changed, while the original context keeps its object.
31. What a context does depends only on the slots it holds: a member written before any record is held is a plain
    slot that a record written later wins over; a record constructed after a context exists reads and writes it like
    any other; constructing fifty subset records over a member changes nothing for a context holding another record;
    writes into a context holding one record leave a context holding another untouched.
32. `addUnsafe` with a member's string is that member, in the member read and in the record read; with a record's
    string it fills one slot, which `getOrUndefinedUnsafe` returns and which provides no member; `getOrUndefinedUnsafe`
    by a record's string returns the provided object whether or not a member was overridden, and `undefined` for a
    record never written.
33. A key built structurally (`{ key } as Context.Service<…>`) is made, read, added, picked and omitted as one slot.
34. A second operation object built with a member's string provides that member, and written on top of a record it
    is seen by the record view and the member read; a `Context.Service` built with a member's string does the same;
    one built with a record's string reads back what it wrote, is not the record (`getOption` none, `get` throws
    naming the first member), and written over a stored record replaces the record's slot while the record read keeps
    returning the members.
35. A record constructed again under its string is the same record: both objects read what either wrote, and after a
    member override both return equal views.

`packages/effect/test/FileSystem.test.ts` (4 tests) and `test/Terminal.test.ts` (5 tests) pin phase 0 of each
migration as described under the migrations; `test/FileSystem/treeShaking.test.ts` (4 tests) is the bundle test.

Type tests (`packages/effect/typetest/Context.tst.ts`, 14 tests and 88 assertions on this branch, with the
diagnostics' text pinned by the prototype's `check-errors` over its 20 fixtures):

1. A call has the shape's parameters and the shape's result with the key added to `R`; `Scope` in the shape stays in
   `R`; a Stream shape returns a Stream; a Sink shape returns a Sink.
2. An operation is assignable to `Context.Slot<Id, Shape>` and not to `Context.Key` or `Effect`; `key` is its
   literal; `Service.Identifier` and `Service.Shape` extract its parts; providing it removes exactly the key;
   `Layer.succeed(op, impl)` is `Layer<Id>`; `Effect.service(op)` is `Effect<Shape, never, Id>`; a record service is
   assignable to `Context.Key`.
3. An override with a wrong parameter type and an override that adds a requirement are rejected.
4. A shape returning a plain value, a non-function and an Effect value given to `Context.Operation` are rejected by
   the constraint, one error each; a function shape given to `Context.Operation.value` is rejected.
5. `op` is not assignable to `Effect`; `yield* op` is rejected; `Context.Operation("key")` is rejected.
6. A generic shape naming its key keeps its type parameter; an overloaded shape naming its key keeps both overloads;
   a generic shape whose parameter is only in its parameters is derived; a generic or overloaded shape not naming its
   key, and a shape with properties, are rejected at the definition with the documented messages.
7. A `this` parameter in the shape is part of the call signature.
8. `KeyFor` is the kind message for a Stream or Sink shape given to `Context.Operation`, and for an Effect shape given
   to `Stream.Operation`, and the key for a Stream shape given to `Stream.Operation`; the constructors are not callable
   with those shapes.
9. A value operation is assignable to `Effect<A, E, Id>` and to `Context.Slot<Id, Effect<A, E>>`, not to
   `Context.Key`; `Effect.map` and `Effect.provideService` apply to it; `Layer.succeed(columns, Effect)` is
   `Layer<Id>` and rejects a function; `Effect.service(columns)` is the Effect as a value; in a record the member is the
   Effect and the identity includes the key; a shape that already requires the key is kept.
10. The record's identity is the union of its members' identifiers, keys and service identifiers alike; a program
    using two operations is assignable to an `Effect` annotated with it; `Layer<Record>` satisfies a member; a member
    layer does not satisfy the record; the merge of every member layer is a `Layer<Record>` and a merge of some is
    rejected naming the missing keys; `Context.Operations<Self, Shape>()` is not callable with an identifier lacking a
    member, a wrong shape, or no identifier, and the key argument carries the message; a partial record given to
    `Layer.succeed` is rejected against `Shape`.
11. The plain form infers the identifier and shape; `Context.Operations<Self>()` takes the identifier and infers the
    shape; a declared identifier wider than the union is accepted, its layer satisfies every member and the old
    requirement, and member layers do not satisfy it; a `Pick` of the shape is accepted as a subset record's shape and
    kept by name in the record's type.
12. Subset facts 1 to 6 under "Subset records"; a nested record's identity is the union of its members' identities.
13. Displayed-type tests pin `Operation<"…", (path: string) => Effect<…>>`, `Effect<…, "…">`, `Stream<…, "…">`,
    `Layer<Record, never, never>`, `Type 'Record' is not assignable to type 'never'`, `is missing the following
    properties from type 'Shape': …`, `is missing the following properties from type 'ReadOnlyShape': …` and `This
    expression is not callable` for a value operation.
14. A branded operation (`Context.Operation<Shape, FileSystem>()`) is satisfied by `Layer<FileSystem>`, is not
    satisfied by another branded operation's layer, and does not satisfy `FileSystem`.

Doctests: the JSDoc examples for `Context.Slot`, `Context.Operation`, `Context.Operation.value`, `Context.Operations`,
`Stream.Operation`, `Sink.Operation`, the `FileSystem` operations and the `Terminal` operations run under `pnpm
doctest`.

Cost gate (`pnpm --filter tree-shakeable-services-spec bench:check`, the three modes under "Cost"): the counts always
gated; the timing runs gated when the control is readable and SKIPPED otherwise, never stopping the next mode.

Bundle test: `packages/effect/test/FileSystem/treeShaking.test.ts`, as described.

## Acceptance criteria

- [ ] `Context.Operation`, `Context.Operation.value`, `Context.Operation<Id, Shape>` with the `Operation` namespace
      types (`EffectSignature`, `StreamSignature`, `SinkSignature`, `EffectValue`, `FunctionSignature`, `Signature`,
      `Call`, `Requirements`, `Require`, `Derivable`, `ResultKind`, `KindOf`, `Fix`, `KeyFor`, `Any`),
      `Context.OperationTypeId`, `Context.isOperation`, `Context.Operations`, `Context.Operations<Identifier, Shape>`
      with the `Operations` namespace types, `Context.OperationsTypeId` and `Context.isOperations` are exported from
      `effect/Context`, `Stream.Operation` (constructor and type) from `effect/Stream` and `Sink.Operation`
      (constructor and type) from `effect/Sink`, with the signatures in "API".
- [ ] `Context.Slot<Identifier, Shape>` is exported from `effect/Context` and is the key parameter of every function
      listed under "Existing APIs this touches"; `Context.Key` is unchanged and extends it; `Effect.service` and
      `Layer.updateService` read through the context; every existing key behaves as before, and a value typed
      `Context.Key` is still an Effect; a key built structurally with `key` alone works with one-slot semantics.
- [ ] Each operation constructor has one call form, the shape as the type argument and the key as the one value
      argument, with an optional `Brand` intersected into the identifier: the three function constructors accept
      `FunctionSignature` and each rejects the other two kinds on the key argument with its `Fix` message;
      `Context.Operation.value` takes Effect shapes. `Context.Operations` has the plain form and the curried
      `Context.Operations<Self, Shape>()(key, members)` form, `Shape` optional, `members` any object of slots including
      a module namespace.
- [ ] A function operation is a function (`isEffect` false) and a slot that is not a key (`isKey` false, `isOperation`
      true) whose `name` and `key` are its key string, carrying `OperationTypeId` as an own property, with
      `Function.prototype` as its prototype. A value operation is an Effect (`isEffect` true, `isStream` false) and a
      slot that is not a key, not callable, carrying `OperationTypeId` and `key`.
- [ ] A call to an Effect operation is an Effect and not a Stream; a call to a Stream (Sink) operation is a Stream
      (Sink) and not an Effect; `Context.ts` has no run-time import of `Stream`, `Sink` or `Channel`.
- [ ] The implementation is looked up from the running fiber's context each time the call result, or the value
      operation, runs, with the call's receiver and arguments forwarded.
- [ ] `Operation.KeyFor` accepts a shape of the constructor's kind that names its key or is derivable, rejects generic
      and overloaded shapes that do not name their key, shapes with properties, and shapes of another kind, with the
      messages in "Defining operations" and "Generic, overloaded and property-bearing shapes", and is the key for a
      shape that is not a function, so that the constraint error is the only one printed; the constraint of the function
      constructors rejects synchronous functions, plain values and Effect values, and that of `Context.Operation.value`
      rejects functions.
- [ ] A record service is a `Context.Service` whose members are keys and whose identity is the union of its members'
      identifiers or a declared superset of it; at run time it is a plain object carrying its member list and the
      positions of the slots it writes; `Context.make` writes a flat map of its members' slots and its own;
      `Context.add` writes one overlay holding the provided object and its members, read by position, into any
      non-empty context below `maxDepth`, and a flat map otherwise; a method found on the provided object's prototype
      is stored bound to it, once per object and method; a member provided on top is an overlay; reading it returns
      the provided object while every member's slot holds what the record stores for it, an object inheriting from it
      with the overriding members as own properties otherwise (built on each read), and an object of the members for a
      record never provided whole (assembled once per storage and shared by every context with that storage); a missing member is
      `Service not found: <member key>` or the optional getters' fallback; `Context.pick`, `omit`, `merge`, `mergeAll`,
      `makeUnsafe`, `addUnsafe` and `getOrUndefinedUnsafe` behave as in "Existing APIs this touches", including for
      nested records and reference members; the identity rule under "Runtime semantics" holds for member strings and
      for a record's string; `Context` keeps no index, registry or flag outside the record key's own caches and the
      bound-method cache, and no other `Context`, `Layer` or `Effect` export changes behaviour.
- [ ] `Operations.KeyFor` rejects an identifier lacking a member, a wrong shape and a missing identifier with the three
      documented messages on the key argument, each naming the difference and none printing the members; a `Pick` of
      the shape is accepted as a subset's shape and printed by its alias in diagnostics.
- [ ] The merge of every member layer is assignable to `Layer<Record>`; a subset record satisfies the six facts under
      "Subset records"; `Layer.mock` on a record service dies only on the members it lacks.
- [ ] Cost, by `pnpm --filter tree-shakeable-services-spec bench:check`: the counts gate passes (the rows under "Cost");
      the two timing runs pass their limits (the limits under "Cost") or report SKIPPED with the control's envelope
      printed, and a SKIPPED run never prevents the next mode from running; absolute costs are reported, not gated.
- [ ] Bundle: the prototype's check passes, including the plain root within 1 kB of the same root bundled with the
      branch point's `Context.ts` (837 B); the `packages/effect` bundle test passes.
- [ ] The runtime tests, type tests, doctests and bundle test in "Test plan" pass; `pnpm check`, `pnpm lint`,
      `pnpm jsdocs --check` and `pnpm circular` are clean.
- [ ] JSDoc on every new export follows the repository conventions, with "Required, not defaulted", the shape rule,
      "a member that is an Effect is defined with `Context.Operation.value`", and "a view after an override inherits
      the members it does not override" under **Gotchas**, and `@stability unstable`.
- [ ] Changesets on the branch: `effect: minor` for `Context` naming `Context.Slot` and the parameters widened to it,
      and one each for the FileSystem and Terminal phase 0; the codemod `scripts/codemods/record-shape.ts` with
      `pnpm codemod:shape`.
- [ ] `effect/FileSystem` and `effect/Terminal` phase 0: every existing consumer compiles unchanged, every existing
      suite passes unchanged, the new `FileSystem` and `Terminal` tests pass, and `tsc --extendedDiagnostics` on
      `packages/effect` grows by under 2 % in types and instantiations.
- [ ] PR against `v4/next-minor`.
