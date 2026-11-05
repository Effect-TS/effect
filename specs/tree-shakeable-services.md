# Tree-shakeable services

A program that calls two operations of a fifty-operation service should bundle those two implementations and nothing
else, and a test should still be able to replace one operation. This spec adds one idea to `effect/Context`, at two
granularities, and defines it precisely enough to implement. The implementation is on this branch:
`packages/effect/src/Context.ts`, `Stream.ts` and `Sink.ts`, with runtime tests in `packages/effect/test/Context.test.ts`,
type tests in `packages/effect/typetest/Context.tst.ts`, a benchmark in `packages/effect/benchmark/context/operations.ts`
and a bundle test in `packages/effect/test/FileSystem/treeShaking.test.ts`; `effect/FileSystem` and `effect/Terminal`
carried through the first, non-breaking step of their migrations, with tests, changesets and a codemod; and a prototype
under `specs/tree-shakeable-services/` whose bundle check shows which implementations each composition root carries.

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

The prototype's bundle check, on a 30-operation file system contract and a 6-member terminal contract, with `effect`
bundled as it is published:

```
main.ts (two operation layers)                           94.5 kB    2 of 30 implementations   Stream runtime: 1.4 kB wrapper
main-readonly.ts (ReadOnly subset, three member layers)  95.0 kB    3 of 30 implementations   Stream runtime: 1.4 kB wrapper
main-twenty.ts (twenty operation layers)                100.6 kB   20 of 30 implementations   Stream runtime: 1.4 kB wrapper
main-terminal.ts (two terminal layers)                   89.7 kB    2 of 6 terminal members    Stream runtime: none
main-stream.ts (one Stream operation)                   100.3 kB    1 of 30 implementations   Stream runtime: 3.8 kB used
main-record.ts (yield* FileSystem, record layer)        107.3 kB   30 of 30 implementations   Stream runtime: 3.1 kB used
main-plain.ts (no record, no operation)                  84.3 kB    419 B over the same root with the branch point's Context.ts
```

The 1.4 kB wrapper is what the contract costs with no purity annotation at all: every key is kept, and the kept
Stream keys keep `Stream.Operation` and `Stream.unwrap`. With annotations, or as `effect` publishes its own
contracts, the same root is 87.1 kB with two keys and no Stream code.

At run time, reading the record service returns the object that was provided, in one slot lookup plus one check per
overlay of the context; a member provided on top is an ordinary overlay, and the record read then returns a copy of the
provided object with the override, assembled once per storage and shared by every context derived from it. The paired
benchmark, pasted under "Cost", puts record reads at 1.11× and 1.12× an ordinary key read (same context, context
rebuilt per request), 1.17× with a member overridden underneath, and `yield* FileSystem` at 1.03×, 1.00× and 1.07×
`yield*` of a plain record service; every ordinary read and write is within 1.11× of the branch point in a process
holding records and within 1.09× in one holding none, with the A/A control at 1.01 and 0.99.

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
reading it reads the members and returns the provided object while it still agrees with them. A member is any slot.

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

A contract module exports one key per member and holds no implementations. The result kind of an operation is fixed
where it is defined: `Context.Operation` for function shapes returning an Effect, `Stream.Operation` for function
shapes returning a Stream, `Sink.Operation` for function shapes returning a Sink, and `Context.Operation.value` for a
shape that is an Effect, as a member that is an Effect in today's record (`Terminal.columns: Effect<number>`) is.

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
single call, which is why the form is curried, as `Context.Service<Self, Shape>()("key")` is.) The value form is a
separate constructor because the two kinds of operation are two kinds of runtime value, a function and an Effect, and a
type argument cannot choose between them at run time; a single constructor would have to be both, which is the first
hazard under "Hazards".

The key string is the identity of the operation at both levels: it is the slot the implementation is stored under at
run time, and it is the type that appears in `R` while the operation is unprovided. The convention is
`<package>/<Service>/<operation>`. Two operations with the same key are the same operation, in the types and at run
time, which is the rule `Context.Service` has today. An optional second type argument intersects an existing identity
into the operation's, `Context.Operation<Shape, FileSystem>()("effect/FileSystem/readFile")`; it exists for the
migration of existing record services and is explained there.

Giving a Stream shape to `Context.Operation` is a compile error (`does not satisfy the constraint 'EffectSignature'`);
the fix is `Stream.Operation`. So is giving it a shape that is not a function returning an Effect: a synchronous
function, a plain value, or an Effect value, whose constructor is `Context.Operation.value`; giving that one a
function is `does not satisfy the constraint 'Effect<any, any, any>'`. Each bad shape prints one error: `KeyFor` is the
key when the shape is not a function at all, so the constraint error stands alone. Each result kind with an `unwrap`
has the same ten-line constructor in its own module (`Stream.Operation` over `Stream.unwrap`, `Sink.Operation` over
`Sink.unwrap`); `Context.ts` knows nothing about either at run time.

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

### The library recipe, once

A library contract is five declarations: the shape, one operation per member, the member list, the identity, and the
record. Here it is in full for a three-member service, with what each declaration is for and what it is derived from;
`packages/effect/src/FileSystem.ts` and `Terminal.ts` on this branch are the same recipe at 32 and 6 members (with the
phase 0 brand explained under "Migrating an existing record service").

```ts
import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import * as Stream from "effect/Stream"

// 1. The shape: the interface the service declares today. Each member's type is written here and nowhere else.
export interface Shape {
  readonly readFile: (path: string) => Effect.Effect<Uint8Array, PlatformError>
  readonly writeFile: (path: string, data: Uint8Array) => Effect.Effect<void, PlatformError>
  readonly stream: (path: string) => Stream.Stream<Uint8Array, PlatformError>
}

// 2. One operation per member, its shape taken from the interface, its key the convention `<package>/<Service>/<member>`.
export const readFile = Context.Operation<Shape["readFile"]>()("effect/FileSystem/readFile")
export const writeFile = Context.Operation<Shape["writeFile"]>()("effect/FileSystem/writeFile")
export const stream = Stream.Operation<Shape["stream"]>()("effect/FileSystem/stream")

// 3. The member list, 4. the identity (the union of the members' keys), 5. the record service.
const members = { readFile, writeFile, stream }
export type FileSystem = Context.Operations.Identifier<typeof members>
export const FileSystem = Context.Operations<FileSystem, Shape>()("effect/FileSystem", members)
```

Against today's record service (an interface and a `Context.Service`), this adds declaration 2, which is the point,
and declarations 3 and 4, which are one line each. The constructor checks the three against each other and a mismatch
is a compile error on the key argument that reads as a sentence: `Argument of type '"effect/FileSystem"' is not
assignable to parameter of type '"Self lacks the identifier of \"effect/FileSystem/writeFile\""'`, or `'"Shape differs
from the members' shape at \"writeFile\""'`, or, for a call with no type arguments, `'"Give the record its identifier:
Context.Operations<Self, Shape>()(key, members)"'`. The one-line form, `Context.Operations("effect/FileSystem", { … })`,
infers both and is right for application code; a library declares them so that diagnostics print `FileSystem` and
`Shape` instead of thirty keys or thirty members (`Layer<FileSystem, never, never>`, `is missing the following
properties from type 'Shape': access, chmod, chown, copy, and 25 more`).

What is derived from what, and what cannot be: the operations' shapes come from `Shape`; the identity comes from
`members`; the record comes from both. `members` cannot come from `Shape`, because types are erased: nothing at run
time can enumerate an interface. A runtime helper that took a table of member names and kinds and built the operations
(`Context.Operations.members<Shape>()("effect/FileSystem", { readFile: Context.Operation, stream: Stream.Operation })`)
would remove the key strings and the member list at the cost of the goal: every key would be built inside one call,
so a program that uses one key would keep all thirty, and the `Stream.Operation` reference would keep the Stream
wrapper, which the bundle matrix under "Tree-shaking" measures at 5 kB for an unannotated contract and 0 for a published
one. The identity cannot be declared after the record either: TypeScript attaches an alias to a union only when the
alias declaration creates it, and an alias declared after `Context.Operations(...)` resolves to the union the
constructor already created, which has no name, so every diagnostic prints `Identifier<{ readonly readFile: …; … }>` in
full. Both were probed with `tsc` while writing the spec, and the floor is the recipe above.

A contract that wants to drop declaration 3 can split its module: the operations in `FileSystem/operations.ts`, and
the record module writing `import * as members from "./operations.ts"` and passing the namespace as the member list,
which the constructor checks like any object. The namespace reference keeps every operation in a bundle that uses the
record, which such a bundle keeps anyway, and none in a bundle that uses operations alone. `effect` keeps one module
per service and writes the list.

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
from the full record except which members it lists. This is how a consumer names a short, stable requirement without
asking for the whole service:

```ts
const readOnlyMembers = { exists, readFile, stat }
export type ReadOnly = Context.Operations.Identifier<typeof readOnlyMembers>
export interface ReadOnlyShape {
  readonly exists: Shape["exists"]
  readonly readFile: Shape["readFile"]
  readonly stat: Shape["stat"]
}
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
6. The subset is a key: `yield* ReadOnly` reads three slots, `Layer.succeed(ReadOnly, {...})` writes three and itself.

At run time the full record and the subset shadow each other slot by slot: a `ReadOnly` provided on top of a
`FileSystem` wins for `readFile`, and `yield* FileSystem` returns a copy of the full record with the subset's
`readFile` and its own `writeFile`; the other order has the full record win for every member, and `yield* ReadOnly`
returns a copy of the subset with the full record's members. Both are tested.

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
`program-twenty.ts`), and the error texts are pasted under "Type-level evidence".

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

If `writeFile` is missing, `runPromise` does not compile and the error names `"effect/FileSystem/writeFile"`. The types
tell the root what to import; no layout rule has to be remembered.

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

`Layer.succeed(FileSystem.FileSystem, record)` writes thirty-one slots: `"effect/FileSystem/access"` through
`"effect/FileSystem/writeFileString"`, each holding that member of `record`, and `"effect/FileSystem"`, holding
`record` itself. The members' slots are the truth; the record's own slot remembers the object that was provided.
`yield* FileSystem.FileSystem` reads the members and returns `record`, the object that was provided, while every
member's slot still holds the member it came with. If a member is then provided on top
(`Effect.provideService(FileSystem.readFile, fake)`), the write is an ordinary overlay, as it is for any key, and the
record read returns a copy of `record` with `readFile: fake`: an object with `record`'s prototype and own properties
and the overriding members as own properties, so an implementation written as a class instance keeps its `this`.
The read is assembled once per storage and remembered, so it stays one lookup; see "Record storage" under "Runtime
semantics" for the exact rule. A record provided on top of a member wins, slot by slot, and is returned as provided.
Because there is only one kind of storage, precedence is ordinary `Context` precedence for every combination of the
forms: the provider closest to the call wins.

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

**What `yield* FileSystem` costs.** Its requirement is `FileSystem`, which only a `Layer<FileSystem>` satisfies, so the
bundle contains every implementation (107.3 kB against 94.5 kB in the prototype). At run time it is one slot read plus
one set lookup per overlay of the context, whenever the record was written into the context: 1.11× an ordinary key
read from the same context, 1.12× from a context rebuilt per request, 1.17× with a member overridden underneath, and
`yield*` of the record in a fiber is 1.03×, 1.00× and 1.07× `yield*` of a plain record service (measured under
"Cost"). A record that was never written, because its members were provided one by one, is assembled from the
members' slots on the first read of each storage, in about 45 ns per later read and about a microsecond for the first;
contexts derived from the same flat map share the object.

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
  <Shape extends Operation.EffectSignature, Brand = unknown>(): <const Id extends string>(
    key: Operation.KeyFor<Id, Shape>
  ) => Operation<Id & Brand, Shape>
  readonly value: <Shape extends Operation.EffectValue, Brand = unknown>() => <const Id extends string>(
    key: Id
  ) => Operation<Id & Brand, Shape>
}
```

One call form each: the shape explicitly, the key inferred as a literal. `Context.Operation<Shape>()(key)` takes a
function shape and returns a function with `name === key`, and `key`, the `OperationTypeId` marker and `toJSON` as own
properties; it carries no `ServiceTypeId`, so `isKey` is false. `KeyFor<Id, Shape>` is `Id` when the shape names its
key or is derivable, and otherwise a string literal type explaining why the definition is rejected; TypeScript infers
`Id` through it and prints the explanation as the parameter type, as pasted above. `Context.Operation.value<Shape>()(key)`
takes an Effect shape and returns an Effect with the same marker and `key`: running it reads the implementation from
the fiber's context and continues with it, so `yield* columns` runs the Effect provided for `columns`. `Brand`, when
given, is intersected into the identifier; see "Migrating an existing record service".

### `Stream.Operation` and `Sink.Operation` (constructors)

```ts
export const Operation: <Shape extends Context.Operation.StreamSignature, Brand = unknown>() => <
  const Id extends string
>(
  key: Context.Operation.KeyFor<Id, Shape>
) => Context.Operation<Id & Brand, Shape>
export type Operation<Id extends string, Shape extends Context.Operation.StreamSignature> = Context.Operation<Id, Shape>
```

`Sink.Operation` is the same with `SinkSignature`. Same key, same type; a call returns `Stream.unwrap` (`Sink.unwrap`)
of the implementation applied to the call's receiver and arguments, looked up from the running fiber. Both are built
on two internals of `Context` (`makeOperation(key, call)`, `applyOperation(operation, receiver, args)`), so
`Context.ts` has no run-time dependency on either module. The type aliases exist so a contract can write
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
  export type Signature = EffectSignature | StreamSignature | SinkSignature | EffectValue

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

  /** The key, or the reason the definition is rejected; the key for a shape that is not a function, so that the constraint error stands alone. */
  export type KeyFor<Id extends string, Shape extends Signature> = Shape extends (...args: any) => infer Result ?
    [keyof Shape] extends [never] ? [Id] extends [Requirements<Result>] ? Id
      : Derivable<Shape> extends true ? Id
      : `The shape of "${Id}" is generic or overloaded: its result must require "${Id}"`
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

Shapes that are not functions returning an Effect, a Stream or a Sink are rejected by the constraint, one error each;
so is a function given to the value constructor, and a value operation called:

```
typetest/errors/not-an-operation.ts(6,39): error TS2344: Type '(path: string) => string' does not satisfy the constraint 'EffectSignature'.
  Type 'string' is not assignable to type 'Effect<any, any, any>'.
typetest/errors/not-an-operation.ts(8,40): error TS2344: Type '{ readonly port: number; }' does not satisfy the constraint 'EffectSignature'.
  Type '{ readonly port: number; }' provides no match for the signature '(...args: any): Effect<any, any, any>'.
typetest/errors/not-an-operation.ts(10,46): error TS2344: Type 'Effect<number, never, never>' does not satisfy the constraint 'EffectSignature'.
  Type 'Effect<number, never, never>' provides no match for the signature '(...args: any): Effect<any, any, any>'.
typetest/errors/stream-shape.ts(5,41): error TS2344: Type '(path: string) => Stream<Uint8Array<ArrayBufferLike>, never, never>' does not satisfy the constraint 'EffectSignature'.
typetest/errors/value-shape.ts(7,32): error TS2349: This expression is not callable.
  Type 'Effect<number, never, "effect/Terminal/columns"> & Slot<"effect/Terminal/columns", Effect<number, never, never>> & { … }' has no call signatures.
typetest/errors/value-shape.ts(9,54): error TS2344: Type '() => Effect<number, never, never>' does not satisfy the constraint 'Effect<any, any, any>'.
```

A value or a synchronous function is a `Context.Service` and is yielded; an Effect value is a `Context.Operation.value`.

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
is how an existing record service keeps its identity while its members become keys. Both forms create the key with
`OperationsTypeId`, `members`, the list of slots it writes, a cache for the objects it has read, and its two methods
(`write`, `read`, under "Record storage"), and record nothing anywhere else.

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
| `Context.make(key, value)`                                     | One slot for an ordinary key, as today. For a record service: one slot per member, member records written the same way, plus the record's own slot holding `value`.                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `Context.add(self, key, value)`, `Effect.provideService`       | An overlay for an ordinary key, as today, and for an operation, and for a member of a record the context holds. For a record service: a fresh flat map with the members' slots and the record's own, which is what providing a layer costs. Which of the two applies comes from the key alone: a record service is the one kind of key that is not a function.                                                                                                                                                                                                                                                          |
| `Context.get`, `getUnsafe`, `yield* key`, `key.use`, `useSync` | One slot lookup, as today, for every key but a record service. A record service reads its members: the provided object when every member's slot still holds the member it came with, otherwise a copy of it with the overriding members, or, for a record never provided whole, an object of the members; assembled once per storage. A missing member that is not a reference throws `Service not found: <member key>`; a reference member falls back to its default.                                                                                                                                                  |
| `Context.getOption`, `getOrElse`, `getOrUndefined`             | The slot or the fallback; for a record service, the record when every non-reference member is present, otherwise the fallback.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `Context.pick(...keys)`, `Context.omit(...keys)`               | Every slot a record service writes: its members', member records' and its own. Omitting a member leaves the record's own slot in the map, which the record key never returns without the members: the record is then absent (`getOption` is none, `get` throws naming the member).                                                                                                                                                                                                                                                                                                                                      |
| `Context.addUnsafe`, `getOrUndefinedUnsafe` (string-keyed)     | One slot, by string, always: a member's string is the member, in the member read and in the record read; a record's string is its own slot, which `getOrUndefinedUnsafe` returns as stored and which a write by string fills without providing any member. `add` for a key that is not a record service is `addUnsafe(self, key.key, value)`, as at the branch point.                                                                                                                                                                                                                                                   |
| `Context.merge`, `mergeAll`, flattening                        | Slot by slot, as at the branch point, with nothing consulted: a record's own slot copies like any other, and the record read checks it against the members' slots of the result.                                                                                                                                                                                                                                                                                                                                                                                                                                        |
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
of `Context` into a value import, as `Stream.ts` already has. `pnpm circular` is clean. `Context.ts` is 2,168 lines
against 1,397 at the branch point: the record storage proper is 106 lines of code under one heading at the end of the
file, and the two constructors with their namespaces and documentation are most of the rest. A bundle that holds no
record carries 419 bytes of it, measured under "Tree-shaking".

## Runtime semantics

**Construction.** `Context.Operation<Shape>()(key)` creates a function named `key` with `key`, the `OperationTypeId`
brand and `toJSON` as own properties, and `Function.prototype` as its prototype, so `.bind` and friends work; it has
no `ServiceTypeId`, so it is a slot and not a key. `Stream.Operation` and `Sink.Operation` do the same through the
internal `makeOperation`, passing a different `call`. `Context.Operation.value<Shape>()(key)` creates an Effect
primitive (an `Effectable` whose evaluation reads the slot from the running fiber's context and continues with the
Effect it finds) carrying `OperationTypeId` and `key`, and no `ServiceTypeId`. `Context.Operations(key, members)`
creates a plain object with `ServiceTypeId`, `OperationsTypeId`, `key`, `members`, the set of every slot it writes, an
empty `WeakMap` for the objects it reads, and the `write` and `read` methods of its prototype; nothing is recorded
anywhere else. All of them are cheap enough to do at module top level for every export of a contract; what a bundler
makes of them is under "Tree-shaking".

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
are unaffected. A method that reads `this` through the instance it was provided on is reached through the record
(`(yield* FileSystem).readFile(p)`), whose `this` is the record; called standalone (`FileSystem.readFile(p)`) it gets
the call's receiver, which is `undefined`; see "Hazards".

**Function properties.** A shape with properties is rejected at the definition. `op` has its own properties (`key`,
`name`, `length`, `toJSON`, the brand) and nothing else; an implementation that needs to expose values beside its
function exposes them as a separate key, which can sit in the same record.

**Missing implementation.** The types prevent running a program whose `R` still contains an operation's key or a
record's identity. If the types are bypassed, the read throws the existing `Service not found: <key>` defect when the
call result runs, naming the member key in the record case.

**Record storage.** A context is what it was at the branch point: a flat base map and a chain of overlays, each one
slot. A record service key carries the list of slots it writes (its members', those of member records, and its own)
and two methods, which are the whole of the record runtime and the only code that knows a record from a slot:

- `write(context, value)`: a fresh flat map, a copy of the context's, with each member of `value` stored under its
  member's slot (a member that is itself a record is written the same way) and `value` under the record's own slot.
  This is `Context.make` and `Context.add` for a record key; a fiber-cached key among the slots starts a new cache
  root, as its own write would.
- `read(context, orThrow)`: the object for the context's storage, assembled on the first read of that storage and
  remembered on the key in a `WeakMap`. The storage is the context's base map when no overlay of the context covers a
  slot the record writes, and the topmost such overlay otherwise, so every context derived from the same flat map, or
  from the same member override, shares one object; a context whose overlays are later flattened into a new base map
  reads a new object with the same members. Assembly reads every member's slot without counting toward the flatten
  heuristic (a member record is read through its own key, so a write deeper down is seen), then: if the record's own
  slot holds an object whose members are those values, that object is returned; otherwise a copy of it (an object with
  its prototype and its own properties) with the differing members set as own properties, or, when the record's own
  slot is empty, a plain object of the members. A missing member that is a reference reads its default; any other
  missing member is `Service not found: <member key>` when `orThrow` is set and `notFound` otherwise, in which case
  nothing is remembered.

`Context.get` and the other getters, `yield*`, `use` and `useSync` ask `typeof key === "object"` (a record service is
the one kind of key that is not a function) and call `read`; `make` and `add` ask the same and call `write`; `pick`
and `omit` use the slot list. Everything else in `Context` is the branch point's code. The invariant this keeps: a
context's flat map holds only the slots that were written into it, a member write is an overlay like any other, and
the record's own slot is never returned without checking the members, so the record and its members cannot disagree.

**Identity.** Every key reads and writes the slot named by its string, and two keys with one string share it whatever
their kind: a second `Context.Operation`, or a `Context.Service`, built with `"effect/FileSystem/readFile"` provides
`FileSystem.readFile` and is seen by `yield* FileSystem`, and `addUnsafe(ctx, "effect/FileSystem/readFile", fn)` does
the same. A record's own string is one more slot, which holds the object provided with the record. The record key
never returns that slot without the members, so a record is present exactly when every member is: a
`Context.Service("effect/FileSystem")`, or `addUnsafe(ctx, "effect/FileSystem", record)`, fills that slot alone, reads
it back alone, and provides no member; `yield* FileSystem` under it is `Service not found: effect/FileSystem/access`.
A record service constructed again under the same string, with the same members, reads and writes what the first
wrote; each key object remembers its own assembled copies, so after a member override the two return equal objects
that are not the same object. All of these are tested in `packages/effect/test/Context.test.ts` and in the prototype.

**Lifecycle.** There is no registry to fill or empty. The only memory outside a context is each record key's
`WeakMap`, keyed by the base maps and overlays it has read, which the collector empties with them. A record constructed
after a context exists reads and writes it like any other. Two copies of `effect` in one process see each other's
keys as slots with strings, and a record key of either copy reads and writes the slots the other copy wrote.

**Precedence.** Ordinary `Context` semantics, slot by slot: the provider closest to the call wins. `Effect.provide(a)`
then `Effect.provide(b)` in a pipe means `a` wins over `b` for keys both provide; `Layer.provideMerge(override, live)`
has `override` win; a record provided inside a member override wins for that member, and the record read returns the
provided object; a member provided inside a record wins for that member, and the record read returns a copy with it.

**Cost.** Measured by `packages/effect/benchmark/context/operations.ts` (`pnpm --filter tree-shakeable-services-spec
bench:check` runs both modes), with the `Context.ts` of the branch point loaded beside this one in the same process.
Every ratio is paired and interleaved: within a round, the two sides run as A, B, B, A in tight loops of a calibrated
iteration count (about 30 ms each), and the round's ratio is the CPU time of the two A loops over the two B loops.
CPU time (`process.cpuUsage`, user plus system) rather than wall time: a loop preempted by another process is not
charged for the time it was off the CPU, which is most of what a loaded machine adds. The number reported is the
median of the per-round ratios over 21 rounds, with the 25th and 75th percentiles beside it. The first pair is an A/A
control, the same loop on both sides; its envelope (the larger of its median's distance from 1.00 and its
interquartile range) is added to every limit, and a run whose control is outside 1.05 is repeated, up to three times,
before the gate is applied, so the gate holds on a loaded runner and fails only on a difference the control does not
explain. Absolute costs are reported and not gated. Both modules are warmed to the same six key shapes before
measuring (V8 compiles a property load for up to four receiver shapes), and every per-request pair keeps the derived
context where the optimiser can see it escape.

The two runs below are the final code of this round, on a shared machine with a load average between seven and
thirteen on eight cores, both passing:

```
$ node benchmark/context/operations.ts --check
baseline: 5cd5d29096; 21 rounds, each loop about 30 ms of CPU time, A/B/B/A within a round; ns/op; records held and read in this process

  case                                                                            median       min       max
  control A: getUnsafe, ordinary key, this branch                                   12.8      11.7      90.1
  control B: getUnsafe, ordinary key, this branch                                   12.7      12.1      86.2
  getUnsafe, ordinary key, this branch                                              13.0      12.4      42.2
  getUnsafe, ordinary key, baseline                                                 12.6      11.9      50.3
  getUnsafe, mixed key kinds, this branch                                           21.8      21.2      39.1
  getUnsafe, mixed key kinds, baseline                                              19.6      19.0      34.5
  getUnsafe, reference default, this branch                                         15.7      13.6      39.1
  getUnsafe, reference default, baseline                                            15.0      13.9      75.6
  add, ordinary key, this branch                                                    30.8      23.4      92.5
  add, ordinary key, baseline                                                       30.7      25.0      63.9
  add, mixed key kinds, this branch                                                 36.8      34.3      55.7
  add, mixed key kinds, baseline                                                    35.9      30.8      54.3
  add then getUnsafe, ordinary key, this branch                                     40.9      38.8     178.6
  add then getUnsafe, ordinary key, baseline                                        37.7      34.5     115.6
  mergeAll, 33 contexts, this branch                                              2171.5    1587.6    3088.9
  mergeAll, 33 contexts, baseline                                                 2598.1    1626.2    2994.8
  getUnsafe, record provided whole, same context                                    15.9      13.3      72.1
  getUnsafe, ordinary key (record context)                                          15.3      12.3      43.7
  add then getUnsafe, record provided whole                                         49.4      41.8     170.6
  add then getUnsafe, ordinary key (record pair)                                    42.1      38.2     231.8
  add then getUnsafe, record with a member overridden underneath                    48.5      42.8     128.8
  add then getUnsafe, ordinary key (override pair)                                  41.3      39.1      98.0
  add, member override to the record context                                        31.2      29.6      57.1
  add, ordinary key (override pair)                                                 30.6      28.2      78.1
  add member override then getUnsafe record, per request                          1072.4    1014.6    1822.9
  add then 32 getUnsafe and a copy                                                3260.1    3001.6    5827.2
  add then getUnsafe, record from 32 member layers (assembled)                      48.1      42.6     105.0
  add then 32 getUnsafe, ordinary keys                                             528.2     520.7    1028.6
  runSync: yield* FileSystem (record service)                                      506.2     484.4    1424.1
  runSync: yield* Plain (today's record service)                                   491.9     477.6     976.9
  runSync: yield* FileSystem, context rebuilt per request                          681.3     654.8    1076.0
  runSync: yield* Plain, context rebuilt per request                               679.7     651.8     772.8
  runSync: yield* FileSystem with a member overridden underneath, per request      737.7     700.1     941.4
  runSync: yield* Plain, context rebuilt per request (override pair)               691.6     636.7     860.5
  runSync: provideService(readFile) then yield* FileSystem                        1946.3    1836.9    3655.0
  runSync: yield* Plain, context rebuilt per request (per-request override pair)     725.1     652.8     980.7
  runSync: yield* FileSystem from member layers, per request                       709.3     662.5    1305.6
  runSync: yield* Plain, context rebuilt per request (members pair)                683.1     664.3     889.8
  runSync: readFile(path) operation call                                           493.8     480.0     657.4
  runSync: (yield* Plain).readFile(path)                                           586.4     572.6     678.6
  runSync: (yield* FileSystem).readFile(path)                                      589.3     568.8    1134.4
  runSync: (yield* Plain).readFile(path) (record pair)                             590.9     564.0     790.1
  getUnsafe, operation key (1 of 33 slots)                                          15.6      14.1      41.1
  make, record (32 members)                                                       1720.1    1668.2    3153.5
  add, record (32 members) to 33 slots                                            3616.2    3506.9    5995.4
  add a member override to a context holding the record (overlay)                   31.2      29.9      49.8
  first record read after a member override (32 reads and a copy)                 1120.8    1048.5    2291.1
  first record read of a record never written (32 reads, a new object)              43.7      39.8     292.9

  ratio (median of per-round ratios)                                                                median     p25     p75   limit
  control, getUnsafe ordinary key: this branch / this branch                                          1.01    0.98    1.03    1.05
  getUnsafe, ordinary key: this branch / baseline                                                     1.04    1.01    1.06    1.19
  getUnsafe, mixed key kinds: this branch / baseline                                                  1.11    1.10    1.12    1.19
  getUnsafe, reference default (slot absent): this branch / baseline                                  1.04    1.01    1.09    1.19
  add, ordinary key to 33 slots: this branch / baseline                                               1.02    1.00    1.05    1.19
  add, mixed key kinds: this branch / baseline                                                        1.02    1.01    1.05    1.19
  add then getUnsafe, ordinary key: this branch / baseline                                            1.09    0.96    1.12    1.19
  mergeAll, 33 one-slot contexts: this branch / baseline                                              0.89    0.80    1.20    1.19
  record read (provided whole) / ordinary key read, same context                                      1.11    1.09    1.17    1.19
  record read (provided whole) / ordinary key read, context rebuilt per request                       1.12    1.06    1.17    1.19
  record read (member overridden underneath) / ordinary key read, context rebuilt per request         1.17    1.13    1.22    1.54
  member override into a context holding the record / ordinary add                                    1.02    0.99    1.04    1.19
  member override then record read, per request / 32 ordinary reads and a copy                        0.31    0.30    0.36    2.04
  record assembled from 32 member layers / 32 ordinary key reads, context rebuilt per request         0.10    0.10    0.11    2.04
  yield* FileSystem / yield* Plain, same context                                                      1.03    0.98    1.05    1.19
  yield* FileSystem / yield* Plain, context rebuilt per request                                       1.00    1.00    1.02    1.19
  yield* FileSystem, member overridden underneath / yield* Plain, context rebuilt per request         1.07    1.04    1.11    1.54
  yield* FileSystem, member overridden per request / yield* Plain, context rebuilt per request        2.41    2.35    2.78    4.04
  yield* FileSystem from member layers (assembled) / yield* Plain, context rebuilt per request        1.16    1.10    1.18    3.04
  operation call / method call on a yielded plain record                                              0.84    0.84    0.86    1.04
  method call on the record service / on a plain record                                               1.01    0.99    1.03    1.19

  control envelope: 0.04 (added to every limit)

  absolute (median ns, reported, not gated)                                                         median     p25     p75
  getUnsafe, operation key (1 of 33 slots)                                                              16      15      16
  make, record (32 members)                                                                           1720    1695    2052
  add, record (32 members) to 33 slots                                                                3616    3539    3857
  add a member override to a context holding the record (overlay)                                       31      31      34
  first record read after a member override (32 reads and a copy)                                     1121    1070    1385
  first record read of a record never written (32 reads, a new object)                                  44      42     207

OK: every median ratio is within its limit
```

```
$ node benchmark/context/operations.ts --ordinary --check
baseline: 5cd5d29096; 21 rounds, each loop about 30 ms of CPU time, A/B/B/A within a round; ns/op; ordinary keys only (no record is held or read in this process)

  case                                                                            median       min       max
  control A: getUnsafe, ordinary key, this branch                                   11.9      11.4      23.0
  control B: getUnsafe, ordinary key, this branch                                   12.0      11.4      22.0
  getUnsafe, ordinary key, this branch                                              12.1      11.6      22.1
  getUnsafe, ordinary key, baseline                                                 12.2      11.6      22.3
  getUnsafe, mixed key kinds, this branch                                           19.3      18.6      36.7
  getUnsafe, mixed key kinds, baseline                                              19.5      18.5      37.5
  getUnsafe, reference default, this branch                                         15.3      14.2      23.3
  getUnsafe, reference default, baseline                                            14.9      13.5      24.8
  add, ordinary key, this branch                                                    30.2      28.3      67.6
  add, ordinary key, baseline                                                       31.5      28.6      46.0
  add, mixed key kinds, this branch                                                 36.9      35.7      63.7
  add, mixed key kinds, baseline                                                    36.7      34.9      59.1
  add then getUnsafe, ordinary key, this branch                                     40.7      38.3      72.1
  add then getUnsafe, ordinary key, baseline                                        37.4      35.8      74.9
  mergeAll, 33 contexts, this branch                                              1739.8    1688.0    2803.1
  mergeAll, 33 contexts, baseline                                                 1743.7    1702.8    3001.8

  ratio (median of per-round ratios)                                                                median     p25     p75   limit
  control, getUnsafe ordinary key: this branch / this branch                                          0.99    0.98    1.03    1.05
  getUnsafe, ordinary key: this branch / baseline                                                     1.00    0.98    1.01    1.20
  getUnsafe, mixed key kinds: this branch / baseline                                                  0.99    0.98    1.00    1.20
  getUnsafe, reference default (slot absent): this branch / baseline                                  1.04    0.99    1.06    1.20
  add, ordinary key to 33 slots: this branch / baseline                                               0.96    0.94    1.19    1.20
  add, mixed key kinds: this branch / baseline                                                        1.00    0.99    1.03    1.20
  add then getUnsafe, ordinary key: this branch / baseline                                            1.09    1.06    1.12    1.20
  mergeAll, 33 one-slot contexts: this branch / baseline                                              1.00    0.99    1.01    1.20

  control envelope: 0.05 (added to every limit)

OK: every median ratio is within its limit
```

Readings. The ordinary paths are the branch point's code: `add` and `mergeAll` read 0.96–1.02, and the getters, which
gained one `typeof` per read, 1.00–1.11 (the mixed-kind read is the highest, because the record service adds a
non-function key shape to a load site that already had four). `add` then `getUnsafe` reads 1.09 in both runs, which is
that `typeof` on a 40 ns operation. A record read is one lookup plus one set lookup per overlay above the record's
storage: 1.11× and 1.12× an ordinary read, 1.17× with a member overridden underneath, and `yield* FileSystem` costs
what `yield* Plain` costs (1.03, 1.00, 1.07). A member override written into a context holding the record is an
ordinary overlay (31 ns, 1.02× an ordinary `add`), and the first record read after it assembles a copy: 1.1 µs, 0.31×
the thirty-two reads and the copy it performs, after which every context derived from the override shares the object.
The one row that is not near parity is an override that is new on every request and is followed by a record read on
every request (`provideService(readFile, fake)` then `yield* FileSystem` inside one request): 2.41× a plain `yield*`,
the price of one assembly per request, where round 6 paid 9–17 µs at write time instead. A record provided as member
layers is assembled once per flat map and shared: 0.10× the thirty-two reads it performs, 1.16× a plain `yield*` per
request.

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
  a Stream for a Stream operation. The kind test is pinned so this stays true.
- **Receivers.** Forwarded, so method-style use (`holder.greet("x")`) reaches an implementation that declares `this`.
  Tested. The consequence for a record provided as a class instance: its methods are stored in the members' slots as
  they are read off the instance, unbound, so `FileSystem.readFile(p)` called standalone runs the method with the
  call's receiver, `undefined`. A method that reads `this` is reached through the record view, `(yield*
  FileSystem).readFile(p)`, whose `this` is the record and keeps working after a member override (next item); a class
  whose methods must also work as standalone operations binds them in its constructor, or writes them as arrow
  properties, as any JavaScript method passed as a callback must. `make(impl)` in `effect/FileSystem` and
  `effect/Terminal` builds a plain object and is unaffected.
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
  top, the read returns a copy: an object with the instance's prototype and own properties and the override as an own
  property, so `instanceof` holds and a method that reads `this.prefix` or calls `this.readFile` keeps working; the
  copy is not the instance, so a class with private (`#`) fields, which belong to the instance and not to its
  properties, cannot have one member overridden and must be overridden whole. Tested with a class whose `stat` calls
  `this.readFile` after `writeFile` is overridden, in `Context.test.ts` and in the prototype.
- **Override typing.** An override is the shape, so a wrong parameter type and an added requirement are both rejected:

  ```
  typetest/errors/wrong-override.ts(11,3): error TS2345: Argument of type '(path: number) => Effect.Effect<Uint8Array<ArrayBuffer>, never, never>' is not assignable to parameter of type '(path: string) => Effect<Uint8Array<ArrayBufferLike>, FileSystemError, never>'.
    Types of parameters 'path' and 'path' are incompatible.
      Type 'string' is not assignable to type 'number'.
  typetest/errors/wrong-override.ts(16,13): error TS2375: Type 'Effect<Uint8Array<ArrayBuffer>, never, { readonly value: number; }>' is not assignable to type 'Effect<Uint8Array<ArrayBufferLike>, FileSystemError, never>' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
    Type '{ readonly value: number; }' is not assignable to type 'never'.
  ```

- **A value operation called.** `Terminal.columns()` is `This expression is not callable`; the operation is the Effect.
- **A constructor called without a shape.** `Context.Operation("key")` is `Expected 0 arguments, but got 1`: the key
  goes to the second call.
- **Error text under `exactOptionalPropertyTypes`.** TypeScript appends "with 'exactOptionalPropertyTypes: true'.
  Consider adding 'undefined'…" to every `Effect` assignability error because `Effect` has optional `Unify` members.
  This is the same for every missing requirement in v4 today and is not specific to operations; the line that matters
  is the indented one naming the key.
- **String-keyed unsafe access.** `Context.getOrUndefinedUnsafe(ctx, "effect/FileSystem")` returns the record's own
  slot: the object provided with the record, whether or not a member has since been provided on top, and `undefined`
  for a record never provided whole; a member's string returns the member's slot. `addUnsafe(ctx, "effect/FileSystem/readFile", fn)`
  is the member, seen by `FileSystem.readFile(p)` and by `yield* FileSystem`; `addUnsafe(ctx, "effect/FileSystem", record)`
  fills the record's own slot and provides no member, and `yield* FileSystem` under it alone is `Service not found:
  effect/FileSystem/access`. Code that reaches into contexts by string therefore cannot make a record disagree with its
  members: the members are what the record key reads.
- **Two key objects with one string.** A second `Context.Operation`, or a `Context.Service`, built with a member's
  string reads and writes that member's slot, and the record read sees it. One built with a record's string is a
  plain key over the record's own slot: it reads back what it wrote and provides no member. A second
  `Context.Operations` built with a record's string and members reads and writes what the first does, and returns its
  own copy after a member override. All three are tested, in the prototype and in `packages/effect/test/Context.test.ts`.
- **A map copied out and back.** `Context.makeUnsafe(new Map(ctx.mapUnsafe))` carries every slot, the record's own
  included, and the record key reads the copy exactly as it read the original. The three sites in the repository that
  copy a context's map this way (`RcMap`, `RpcGroup`, `McpServer`) build contexts of their own keys.
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
- **A per-request member override followed by a record read.** Each request's override is a new overlay, so each
  request assembles the record once (1.1 µs for thirty-two members, 2.41× a plain `yield*` per request, measured under
  "Cost"). A test that does this pays it; a server that overrides a member per request and reads the whole record per
  request is the one pattern this design makes slower than the branch point, and it provides the override once, at the
  root, to avoid it.

## Type-level evidence

All of the following is the output of `pnpm --filter tree-shakeable-services-spec check-errors`, which compiles the
eighteen files under `typetest/errors` and checks each fails for its documented reason, with the repository's
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

The record service declared with an identifier lacking a member, with the wrong shape, or with no identifier, each a
sentence on the key argument; a constructor given the key where the shape goes; the subset not satisfying the full
record; a value operation called, and a function shape given to the value constructor; and a partial record given
where the shape is expected:

```
typetest/errors/wrong-self.ts(11,82): error TS2345: Argument of type '"test/Partial"' is not assignable to parameter of type '"Self lacks the identifier of \"effect/FileSystem/writeFile\""'.
typetest/errors/wrong-self.ts(19,5): error TS2345: Argument of type '"test/WrongShape"' is not assignable to parameter of type '"Shape differs from the members' shape at \"writeFile\""'.
typetest/errors/wrong-self.ts(21,45): error TS2345: Argument of type '"test/Unknown"' is not assignable to parameter of type '"Give the record its identifier: Context.Operations<Self, Shape>()(key, members)"'.
typetest/errors/wrong-self.ts(23,42): error TS2554: Expected 0 arguments, but got 1.
typetest/errors/subset-not-full.ts(7,14): error TS2375: Type 'Layer<ReadOnly, never, never>' is not assignable to type 'Layer<FileSystem, never, never>' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Type 'FileSystem' is not assignable to type 'ReadOnly'.
    Type '"effect/FileSystem/access"' is not assignable to type 'ReadOnly'. Did you mean '"effect/FileSystem/exists"'?
typetest/errors/value-shape.ts(7,32): error TS2349: This expression is not callable.
typetest/errors/value-shape.ts(9,54): error TS2344: Type '() => Effect<number, never, never>' does not satisfy the constraint 'Effect<any, any, any>'.
typetest/errors/partial-record.ts(6,67): error TS2740: Type '{ readFile: () => Effect.Effect<Uint8Array<ArrayBuffer>, never, never>; }' is missing the following properties from type 'Shape': access, chmod, chown, copy, and 25 more.
```

The last diagnostic names the interface and the members it lacks, and nothing else, because `Shape` declares its
members directly; an interface that extended `Context.Operations.Shape<typeof members>` would print the thirty member
types of its base instead.

Phase 0 of a migration, where operations are branded with an existing record service's identity
(`typetest/errors/branded.ts`): a program over a branded operation run unprovided prints the brand with the key, a
member layer does not provide the record's identity, and does not provide another branded member:

```
typetest/errors/branded.ts(18,16): error TS2379: Argument of type 'Effect<string, never, "test/Legacy/readFile" & Legacy>' is not assignable to parameter of type 'Effect<string, never, never>' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Type '"test/Legacy/readFile" & Legacy' is not assignable to type 'never'.
typetest/errors/branded.ts(21,14): error TS2375: Type 'Layer<"test/Legacy/readFile" & Legacy, never, never>' is not assignable to type 'Layer<Legacy, never, never>' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Type 'Legacy' is not assignable to type '"test/Legacy/readFile" & Legacy'.
    Type 'Legacy' is not assignable to type '"test/Legacy/readFile"'.
typetest/errors/branded.ts(24,14): error TS2375: Type 'Effect<void, never, "test/Legacy/writeFile" & Legacy>' is not assignable to type 'Effect<void, never, never>' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Type '"test/Legacy/writeFile" & Legacy' is not assignable to type 'never'.
```

What compiles (from `typetest/ok/signatures.ts`, abridged):

```ts
const read: Effect<Uint8Array, FileSystemError, "effect/FileSystem/readFile"> = FileSystem.readFile("a.txt")
const scoped: Effect<string, FileSystemError, Scope | "effect/FileSystem/makeTempFileScoped"> = FileSystem.makeTempFileScoped()
const stream: Stream<Uint8Array, FileSystemError, "effect/FileSystem/stream"> = FileSystem.stream("a.txt")
const asSlot: Context.Slot<"effect/FileSystem/readFile", (path: string) => Effect<…>> = FileSystem.readFile // an operation is a slot, not a Key
const recordAsKey: Context.Key<FileSystem, FileSystem.Shape> = FileSystem.FileSystem                // a record service is a Key
const keyString: "effect/FileSystem/readFile" = FileSystem.readFile.key
const layer: Layer<"effect/FileSystem/readFile"> = Layer.succeed(FileSystem.readFile, () => Effect.succeed(bytes))
const fromContext: (path: string) => Effect<…> = Context.get(context, FileSystem.readFile)
const implementation: Effect<(path: string) => Effect<…>, never, "effect/FileSystem/readFile"> = Effect.service(FileSystem.readFile)
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
const width: Effect<number, never, "effect/Terminal/columns"> = Terminal.columns                   // a value operation is the Effect
const widthSlot: Context.Slot<"effect/Terminal/columns", Effect<number>> = Terminal.columns          // and a slot
const columnsMember: Terminal.Shape["columns"] = Effect.succeed(80)                                // the same Effect in the record
const columnsLayer: Layer<"effect/Terminal/columns"> = Layer.succeed(Terminal.columns, Effect.succeed(80))
const terminalRecord: Effect<Terminal.Shape, never, Terminal.Terminal> = Terminal.Terminal
const pathRecord: Effect<{ readonly sep: string; readonly join: …; readonly fromFileUrl: … }, never, Path> = Path // a mixed record
const platformIdentity: Platform = … as FileSystem.ReadOnly | Terminal.Terminal                     // a nested record
const Inferred = Context.Operations("test/Inferred", { readFile, exists })                          // no names declared
const inferredFromMembers: Layer<Context.Service.Identifier<typeof Inferred>> = Layer.mergeAll(nodeReadFile, nodeExists)
const Named = Context.Operations<Named>()("test/Named", namedMembers)                               // the identity declared, the shape inferred
const Legacy = Context.Operations<Legacy | FileSystem.ReadOnly, FileSystem.ReadOnlyShape>()("test/Legacy", {…}) // a wider identity
const legacySatisfiesMember: Effect<Uint8Array, FileSystemError, never> = FileSystem.readFile("a").pipe(Effect.provide(legacyLayer))
const parsed: Effect<number, never, "test/parse"> = parse(Number, "42")                             // generic shape naming its key
const formattedDate: Effect<string, never, "test/format"> = format(new Date(), "en")                // overloaded shape naming its key
const greeting: Effect<string, never, "test/greet"> = greeter.greet("x")                            // shape with a `this` parameter
const collected: Sink<Array<string>, string, never, never, "test/collect"> = collect("x")            // Sink.Operation
```

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
rule for the contract module: a key the bundler keeps costs bytes, as the next section measures.

### What a kept key costs

A contract's declarations are calls (`Context.Operation<…>()("…")`), and a bundler keeps a top-level call it cannot
prove pure. The bundle check's annotation matrix measures the two-operation root with the contract as written, with
`/* @__PURE__ */` added to each declaration, and with `babel-plugin-annotate-pure-calls` run over the contract as
publishing it does, under esbuild and Rolldown, with `effect` itself bundled as it is published:

| Root (`main.ts`, two operations)                              |     Size | Keys kept           | Stream code |
| ------------------------------------------------------------- | -------: | ------------------- | ----------: |
| contract as written, esbuild                                  |  94.5 kB | all 30 + record     |      1456 B |
| contract annotated `@__PURE__`, esbuild                       |  87.1 kB | readFile, writeFile |         0 B |
| contract published (`annotate-pure-calls`), esbuild           |  87.1 kB | readFile, writeFile |         0 B |
| contract as written, Rolldown                                 |  85.0 kB | all 30 + record     |      1564 B |
| contract annotated `@__PURE__`, Rolldown                      |  77.5 kB | readFile, writeFile |         0 B |
| contract as written, `effect` from source, esbuild            | 435.9 kB | all 30 + record     |    103.8 kB |
| contract annotated `@__PURE__`, `effect` from source, esbuild | 229.3 kB | readFile, writeFile |         0 B |

What the rows establish:

- **An unannotated contract costs 7 kB: the thirty keys, the record, and a 1.4 kB wrapper.** The wrapper is
  `Stream.Operation`, `streamCall` and the `Stream.unwrap` they close over, kept because the three Stream keys are
  kept; it is not the Stream runtime, which in a published `effect` is itself tree-shaken function by function (the
  one-Stream-operation root carries 3.8 kB of it). Nothing in the program's behaviour changes, so no rule is needed
  for shaking to work; annotations are an optimisation worth 7 kB.
- **Published contracts shake without user action.** `packages/effect`'s build runs `babel-plugin-annotate-pure-calls`
  over `dist`, which annotates the outer call of every top-level declaration, curried or not, and esbuild drops the
  whole expression; the third row equals the second. This is how every `Context.Service("…")` key in `effect` shakes
  today, and `effect/FileSystem`'s operations shake the same way with no annotation in the source, which the bundle
  test in `packages/effect` checks against the real module.
- **Bundling `effect` from source is a different measurement.** The last two rows are the repository's own layout:
  `packages/effect/src/*.ts` has no annotations, so once a module is imported its whole body is kept, and importing
  anything from `Stream.ts` costs 104 kB. That is a property of unannotated module bodies, not of the design, and it
  is the same for any `Stream` import today. The matrix keeps the two rows so the difference is on record.

### What the prototype shows

The prototype (`specs/tree-shakeable-services/`) models `effect/FileSystem` as 30 operations, three of them
Stream-returning and two needing `Scope`, plus `effect/Terminal` as six operations, five of them value operations,
with one Node implementation module each, and nine composition roots. `pnpm --filter tree-shakeable-services-spec bundle`
builds each with esbuild (and the annotation matrix with Rolldown too), with `effect` bundled as published, and reports
which implementation modules and how many bytes of `Stream.ts`, `Channel.ts`, `Sink.ts` and their internals each
contains, by metafile and by a per-implementation marker string:

```
Bundle sizes (esm, unminified; effect as published unless noted)

  main.ts (two operation layers)                                               94.5 kB
  main-namespace.ts (two layers off a namespace)                               94.5 kB
  main-readonly.ts (ReadOnly subset, three member layers)                      95.0 kB
  main-stream.ts (one Stream operation)                                       100.3 kB
  main-twenty.ts (twenty operation layers)                                    100.6 kB
  main-record.ts (yield* FileSystem, record layer)                            107.3 kB
  main-full.ts (two operations, record layer)                                 107.2 kB
  main-terminal.ts (two terminal layers)                                       89.7 kB
  main-plain.ts (no record, no operation)                                      84.3 kB
  main-plain.ts (no record, no operation, branch point Context.ts)             83.9 kB

  main.ts              contains 2 of 30 implementations: readFile, writeFile
  main-readonly.ts     contains 3 of 30 implementations: exists, readFile, stat
  main-stream.ts       contains 1 of 30 implementations: stream
  main-twenty.ts       contains 20 of 30 implementations: access, copy, copyFile, exists, lstat, makeDirectory, …
  main-record.ts       contains 30 of 30 implementations: all
  main-terminal.ts     contains 2 of 6: columns, display

Stream runtime bytes in each bundle (Stream.ts, Channel.ts, Sink.ts and their internals; wrapper = under 2 kB)

  main.ts              31 effect modules     1456 B  expected wrapper
  main-readonly.ts     31 effect modules     1456 B  expected wrapper
  main-stream.ts       35 effect modules     3838 B  expected used
  main-twenty.ts       31 effect modules     1456 B  expected wrapper
  main-record.ts       32 effect modules     3092 B  expected used
  main-terminal.ts     28 effect modules        0 B  expected none
  main-plain.ts        27 effect modules        0 B  expected none

What Context.ts costs a bundle with no record and no operation

  this branch            84.3 kB
  branch point           83.9 kB
  difference               419 B  limit 512 B

  node dist/main.js <file>: backed up 6 bytes of <file>
  node dist/main-stream.js <file>: <file> has 6 bytes
  node dist/main-readonly.js <file>: <file> is 6 bytes
  node dist/main-terminal.js <file>: displayed at 80 columns
  node dist/main-plain.js <file>: hello, <file>

OK: every bundle contains exactly the implementations its program uses, Effect-only roots carry at most a retained wrapper of the Stream runtime, and the shaken bundles run
```

The check fails if an unused implementation appears in any bundle, a used one is missing, a root's Stream bytes fall
outside its band (none, the wrapper, or in use), or the plain root is more than 512 bytes larger than the same root
bundled with the branch point's `Context.ts`. It then runs five of the bundles.

Readings. The two-operation root and the twenty-operation root differ by 6 kB: the implementations themselves are
small, and the 28 to 31 `effect` modules they share are the Effect/Layer/Context core that any program carries. The
record roots cost 12.8 kB more than the two-operation root: twenty-eight more implementations with their `node:fs`
bindings, and 3 kB of Stream code for the three that return Streams. The contract module costs the program 7 kB at
most, with the bundler left to its own devices, and nothing once the contract is published. And a program that uses
no operation and no record pays 419 bytes for `Context.ts`: the `typeof` dispatch in `make`, `add` and the getters,
and the record key's type id; the record code itself hangs off the record key's prototype, which such a bundle drops
(the prototype objects are built with `Object.assign` and literal property names rather than spreads and computed
keys, which a bundler keeps as possible side effects).

### The bundle test in `packages/effect`

`packages/effect/test/FileSystem/treeShaking.test.ts` is the regression test for the real module: it bundles
`test/fixtures/tree-shaking/main.ts`, a root that calls `FileSystem.readFile` and `FileSystem.writeFile` from
`effect/FileSystem` and provides two of three implementation layers read off a namespace (`node/index.ts`, one module
per operation), with `effect` as published (`packages/effect/src` passed through `esbuild.transform` and
`babel-plugin-annotate-pure-calls` in an `onLoad` plugin), and asserts four things: the `readFile` and `writeFile`
markers are in the bundle and the `stat` marker is not; the two keys `"effect/FileSystem/readFile"` and
`"effect/FileSystem/writeFile"` are in the bundle and `"effect/FileSystem/stat"`, `"effect/FileSystem/stream"` and
`"effect/FileSystem"` are not; the bundle contains zero bytes of `Stream.ts`, `Channel.ts`, `Sink.ts` and their
internals; and the bundle runs, backing up a temporary file. It passes on this branch (4 tests, about two seconds).

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
provide `FileSystem`. That is the one thing phase 1 changes.

**What stays exactly as it was.** Every `yield* FileSystem`, `Effect<_, _, FileSystem>`, `Layer<FileSystem>`,
`Layer.succeed(FileSystem, make(impl))`, `fs: FileSystem.FileSystem` and `FileSystem.FileSystem["readFile"]` in the
repository and in user code, and `yield* FileSystem` returns the object the layer provided. The evidence on this
branch: `pnpm check` over every package is clean; the `FileSystem`, `ConfigProvider`, `cli`, `HttpStaticServer`,
`HttpPlatform` and `Logger` suites pass unchanged; `make`'s callers in `NodeFileSystem.ts` and `DenoFileSystem.ts` did
not change a line; and `packages/effect/test/FileSystem.test.ts` gains four tests: an operation call under a
`Layer<FileSystem>` with `yield* FileSystem` returning the provided object, a one-member override on top of
`layerNoop` seen by the call and by the record view, `Layer.mock`, and the 33-slot storage. At run time a provided
file system occupies 33 slots (32 members and the record), which shows in `ctx.mapUnsafe.size` and in
`Context.omit(FileSystem)`; nothing else is observable.

**Compile cost.** `tsc --extendedDiagnostics` (the repository's TypeScript, 7.0.2 with the `effect-tsgo` patch,
`packages/effect/tsconfig.json`, `--noEmit`) at the branch point and on this branch, which carries `Context`, the
FileSystem and Terminal phase 0 and their tests:

| Metric         |    before |     after |  change |
| -------------- | --------: | --------: | ------: |
| Types          | 1,046,147 | 1,058,458 | +1.18 % |
| Instantiations | 3,801,864 | 3,871,631 | +1.83 % |
| Check time     |     5.9 s |     5.2 s |   noise |

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
mechanical; none of them needs to change in phase 0, which is why none did on this branch, and issue 4 runs it.

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
identity is the alternative rejected below, under which per-operation layers can never satisfy the record.

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
bundle, which is what `main-terminal.ts` measures (89.7 kB, two of six members). `NodeTerminal.layer` keeps its form, a
record layer, with `Input` provided inside; `NodeTerminal.make(shouldQuit)` keeps its signature as the aggregate
builder.

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

### Decisions, and why

The design went through seven rounds of review. What each settled, in the order an implementer meets it:

- **An operation is a `Context.Slot` that is a function, not a `Context.Key`.** A key is an Effect, and a value that
  is both callable and an Effect types one way and runs the other under every `isEffect` dispatch (the first hazard).
  Providing through a property of the operation (`op.service`) was tried and rejected as a second rule for providing;
  so was making `Key` the non-Effect brand, which broke a stable type. `Slot` is a supertype, so widening to it
  breaks nothing.
- **The result kind is fixed at the definition** (`Context.Operation`, `Stream.Operation`, `Sink.Operation`,
  `Context.Operation.value`), because a type argument is erased and a call result must be exactly one kind of value.
  One constructor dispatching on `isEffect` of the implementation, and Effect-valued members rewritten as functions of
  no arguments, were both tried; the first was the hazard again, the second changed `Terminal`'s shape.
- **The key is written once, in the one place it is used.** A flat form taking the key from an annotation wrote it
  twice; the curried form is what `Context.Service<Self, Shape>()("key")` already does.
- **A generic or overloaded shape names its key in its result**, checked by `Derivable` at the definition, rather
  than an escape hatch at every call site.
- **The record's identity is the union of its members' keys**, declared by the author for libraries so that
  diagnostics keep the name. A prefix type (`` `effect/FileSystem/${string}` ``) prints short but cannot be shown to
  be covered by a merge of member layers; the record interface as the identity, with branded member keys, keeps
  today's names but member layers can never satisfy it, so it is used for exactly one release as phase 0.
- **A record service is stored as its members' slots plus one slot holding the provided object, and a member
  override is an ordinary overlay.** Rounds 3 to 6 tried assembling on every read (three to six times a plain read),
  write behaviour on the key object (two keys with one string behaved differently), a module-level registry of
  records (a `Context` whose behaviour depended on what the process had constructed), and a per-context record index
  with the record rebuilt on every member write (a second storage system, 3.5 kB in every bundle, a flat copy per
  override, and class instances losing `this`). What survives is the least of each: the key knows its slots, the
  context knows nothing, the record's slot is checked against the members on the first read of each storage and the
  result is remembered. The one cost, measured and gated, is an override that is new on every request followed by a
  record read on every request.
- **No defaults.** Every reason the overridable design was set aside is a reason not to add a defaulted variant;
  `Context.Reference` remains for values that want one, and may be a member.
- **The cost gate measures CPU time, pairs every ratio, and derives its limits from an A/A control in the same run,
  with retries.** Earlier gates took ratios of separately run medians, then wall-clock paired ratios with fixed limits
  that failed on a loaded runner without a regression in the code.

### Alternatives rejected within this design

- **A `members` helper** that builds the operations from a table of names and kinds. Removes the key strings and the
  member list from a contract, and keeps every key and the Stream wrapper in every bundle that uses one; measured
  under "What a kept key costs". The recipe under "The library recipe, once" is the floor.
- **Storing the record only under its own key, with members reading through it.** Would let `Layer.succeed(FileSystem,
  record)` write one slot, but a member read would walk every record spanning it and a member provided outside a
  record would lose to it: the precedence bug of slices.
- **Writing a record as one overlay node** instead of a fresh flat map. Every slot read would then have to look inside
  record nodes, a branch in `lookup` for every key. `Effect.provide` already copies the flat map per layer, so the
  copy on a record `add` (3.6 µs for thirty-two members into thirty-three slots) costs what providing a layer costs.
- **Rebuilding the record on every member write** (round 6) instead of checking on read. Keeps the record read at
  one lookup with no overlay scan, at the price of a flat copy and a thirty-member rebuild on every override, a
  per-context index of records, and a record read that was not the provided object after any override.
- **Class-style operations** (`class ReadFile extends Context.Operation<…>()("…") {}`). A class cannot be called
  without `new`.
- **An identifier type parameter for operations** (`Operation<Self, Shape>`). Two operations with the same shape
  would alias in `R` unless each carried a brand; the key string is already unique and already nominal, and it prints
  better in errors. The optional `Brand` argument covers the migration case without making it the rule.

## Scope

In scope: `Context.Operation`, `Context.Operation.value`, `Context.Operations` and their types, `Stream.Operation`,
`Sink.Operation`, `isOperation`, `isOperations`, `Context.Slot` with the parameter widening and the two implementation
fixes, the record storage in `Context`, tests, JSDoc, the benchmark, the bundle test, changesets, the codemod, the
four-phase migration of `effect/FileSystem` with its Node and Deno providers (phase 0 on this branch), and the
migration of `effect/Terminal` with `NodeTerminal` (phase 0 on this branch). Out of scope: bundler plugins, migrating
other record services (each follows one of the two recipes and is its own issue; `Path` is not worth one), and the
ai-docs example (tracked separately, since the equivalent example was removed from PR #10369 pending a decision on
ai-docs).

## Implementation plan

Nine issues. The first two are the primitive and its guards; each later one is mergeable and verifiable on its own.

1. **`Context.Slot`, `Context.Operation`, `Context.Operation.value`, `Context.Operations`, `Stream.Operation` and
   `Sink.Operation`.** The code on this branch in `packages/effect/src/Context.ts`, `Stream.ts`, `Sink.ts`,
   `Channel.ts`, `Layer.ts`, `Effect.ts` and `internal/effect.ts`, with its runtime tests
   (`packages/effect/test/Context.test.ts`, 27 tests under `describe("Operation")`, 47 in the file), type tests
   (`packages/effect/typetest/Context.tst.ts`, 12 tests, 77 assertions), the benchmark
   (`packages/effect/benchmark/context/operations.ts`) and the changeset `.changeset/context-operation.md`, all on the
   branch and passing with `pnpm check`, `pnpm test-types`, `pnpm lint`, `pnpm circular` and `pnpm jsdocs --check`.
   Acceptance criteria and test plan below, including the cost limits.
2. **Bundle regression test.** `packages/effect/test/FileSystem/treeShaking.test.ts` with its fixture under
   `test/fixtures/tree-shaking/`, on the branch and passing; described under "The bundle test in `packages/effect`".
3. **`effect/FileSystem` phase 0.** The change on this branch to `packages/effect/src/FileSystem.ts` and its four
   tests in `test/FileSystem.test.ts`, the codemod `scripts/codemods/record-shape.ts` with its runner, and the
   changeset, all on the branch, plus one test that an operation call runs under `NodeFileSystem.layer`. Verified by
   every existing suite passing unchanged.
4. **`effect/FileSystem` phase 1.** The identity flip, the five listed changes, the changeset, and the repository's
   46 value-type sites rewritten by `pnpm codemod:shape --module FileSystem`. Verified by the FileSystem, Node and
   Deno suites passing unchanged, plus a type test that the merge of 32 member layers is a `Layer<FileSystem>`.
5. **`effect/FileSystem` phase 2, Node.** Per-operation modules under `NodeFileSystem/`, derived-operation layers in
   `effect/FileSystem`, the aggregate rebuilt as the merge. Verified by the bundle test from issue 2 run against a
   fixture that provides `NodeFileSystem.readFile` and `NodeFileSystem.writeFile`.
6. **`effect/FileSystem` phase 2, Deno and Bun.** The same layout for `DenoFileSystem`; Bun re-exports Node's.
7. **`effect/FileSystem` phase 3.** `FileSystem.ReadOnly`, and the `yield* FileSystem` sites inside `effect` that use
   few members moved to operation calls or a subset annotation, one commit per module, with the module's tests
   unchanged. Verified by a bundle fixture using `HttpServerResponse.file` with member layers only.
8. **`effect/Terminal` phases 0 to 2.** Phase 0 is on this branch (`packages/effect/src/Terminal.ts`,
   `test/Terminal.test.ts`, its changeset, the cli and Terminal suites unchanged); then the identity flip with `pnpm
   codemod:shape --module Terminal`, then `NodeTerminal` as one module per member over an internal `Input` service
   with `NodeTerminal.layer` as the record layer. Verified by the existing Terminal and cli test suites, and a bundle
   fixture that displays without reading.
9. **`effect/Terminal` phase 3.** `Terminal.Interactive` and the `cli/Prompt.ts` sites.

The ai-docs example `ai-docs/src/01_effect/03_services/30_operations.ts` (a contract, one implementation per module, a
root importing two, a test overriding one) is opened only once ai-docs are wanted again.

## Test plan

Runtime tests (`packages/effect/test/Context.test.ts`, `describe("Operation")` with `describe("Operations")`,
`describe("Operation.value")` and `describe("same string, same key")` inside it, 27 tests on this branch, 47 in the
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
17. An operation override on top of a record wins for that member, directly and through the record view, which is a
    copy with the override and the other members unchanged; the other order has the record win and the record read
    return the provided object.
18. `Layer.mock(record, partial)` runs the provided member and dies as unimplemented on the others.
19. `Effect.provideService(record, value)`, `Effect.updateService(record, f)`, `Context.make`, `get`, `getOption`,
    `pick` and `omit` behave as in "Existing APIs this touches"; `Context.get` on a missing member throws naming it;
    omitting a member leaves the record's own slot and makes the record absent.
20. A record is stored under its own key and its members' keys.
21. A member write into a context holding the record is an overlay and leaves the record's slot holding the provided
    object; the record read is a copy with the override, the same object on every read of that context and of
    contexts derived from it by unrelated writes; the original context still reads the provided object; a context
    rebased into a new flat map reads the same members; a `merge` with a member on the right overrides the record on
    the left, a record on the right wins over a member on the left, `mergeAll` likewise; no flat map holds a marker of
    any kind.
22. A record provided as a class instance keeps working after one member is overridden: the record view is an
    instance of the class with the instance's own properties, a method that reads `this` and calls another method
    runs, and with nothing overridden the read is the instance itself.
23. A record with a plain value, a synchronous function and an operation as members provides all three, assembles
    from member layers, and an override of one member wins on top of the record.
24. A reference member reads its default when its slot is empty and the provided value otherwise.
25. A record that is a member of a record is stored with its own slot and its members', read back as the provided
    object, read as a copy when a member is written deeper down (both records), and replaced by a nested record
    written on top; `omit` of the outer record removes them all.
26. A subset record is satisfied by the full record and by its member layers at run time, provides its members, writes
    its members' slots and its own, and shadows the full record slot by slot in both orders.
27. A record never written has no slot before or after it is read; it is assembled once per storage, the same object
    on every read of that context, shared by a derived context whose members are the same values, and a copy with the
    replacement for a context where a member changed, while the original context keeps its object.
28. What a context does depends only on the slots it holds: a member written before any record is held is a plain
    slot that a record written later wins over; a record constructed after a context exists reads and writes it like
    any other; constructing fifty subset records over a member changes nothing for a context holding another record;
    writes into a context holding one record leave a context holding another untouched.
29. `addUnsafe` with a member's string is that member, in the member read and in the record read; with a record's
    string it fills one slot, which `getOrUndefinedUnsafe` returns and which provides no member; `getOrUndefinedUnsafe`
    by a record's string returns the provided object whether or not a member was overridden, and `undefined` for a
    record never written.
30. A key built structurally (`{ key } as Context.Service<…>`) is made, read, added, picked and omitted as one slot.
31. A second operation object built with a member's string provides that member, and written on top of a record it
    is seen by the record view and the member read.
32. A `Context.Service` built with a member's string does the same; one built with a record's string reads back what
    it wrote, is not the record (`getOption` none, `get` throws naming the first member), and written over a stored
    record replaces the record's slot while the record read keeps returning the members.
33. A record constructed again under its string is the same record: both objects read what either wrote, and after a
    member override both return equal copies.

`packages/effect/test/FileSystem.test.ts` (4 tests) and `test/Terminal.test.ts` (5 tests) pin phase 0 of each
migration as described under the migrations; `test/FileSystem/treeShaking.test.ts` (4 tests) is the bundle test.

Type tests (`packages/effect/typetest/Context.tst.ts`, 12 tests and 77 assertions on this branch, with the
diagnostics' text pinned by the prototype's `check-errors` over its 18 fixtures):

1. A call has the shape's parameters and the shape's result with the key added to `R`; `Scope` in the shape stays in
   `R`; a Stream shape returns a Stream; a Sink shape returns a Sink.
2. An operation is assignable to `Context.Slot<Id, Shape>` and not to `Context.Key` or `Effect`; `key` is its
   literal; `Service.Identifier` and `Service.Shape` extract its parts; providing it removes exactly the key;
   `Layer.succeed(op, impl)` is `Layer<Id>`; `Effect.service(op)` is `Effect<Shape, never, Id>`; a record service is
   assignable to `Context.Key`.
3. An override with a wrong parameter type and an override that adds a requirement are rejected.
4. A shape returning a plain value, a non-function, an Effect value, and a Stream shape given to `Context.Operation`,
   are rejected, one error each; a function shape given to `Context.Operation.value` is rejected.
5. `op` is not assignable to `Effect`; `yield* op` is rejected; `Context.Operation("key")` is rejected.
6. A generic shape naming its key keeps its type parameter; an overloaded shape naming its key keeps both overloads;
   a generic shape whose parameter is only in its parameters is derived; a generic or overloaded shape not naming its
   key, and a shape with properties, are rejected at the definition with the documented messages.
7. A `this` parameter in the shape is part of the call signature.
8. A value operation is assignable to `Effect<A, E, Id>` and to `Context.Slot<Id, Effect<A, E>>`, not to
   `Context.Key`; `Effect.map` and `Effect.provideService` apply to it; `Layer.succeed(columns, Effect)` is
   `Layer<Id>` and rejects a function; `Effect.service(columns)` is the Effect as a value; in a record the member is the
   Effect and the identity includes the key; a shape that already requires the key is kept.
9. The record's identity is the union of its members' identifiers, keys and service identifiers alike; a program
   using two operations is assignable to an `Effect` annotated with it; `Layer<Record>` satisfies a member; a member
   layer does not satisfy the record; the merge of every member layer is a `Layer<Record>` and a merge of some is
   rejected naming the missing keys; `Context.Operations<Self, Shape>()` is not callable with an identifier lacking a
   member, a wrong shape, or no identifier, and the key argument carries the message; a partial record given to
   `Layer.succeed` is rejected against `Shape`.
10. The plain form infers the identifier and shape; `Context.Operations<Self>()` takes the identifier and infers the
    shape; a declared identifier wider than the union is accepted, its layer satisfies every member and the old
    requirement, and member layers do not satisfy it.
11. Subset facts 1 to 6 under "Subset records"; a nested record's identity is the union of its members' identities.
12. Displayed-type tests pin `Operation<"…", (path: string) => Effect<…>>`, `Effect<…, "…">`, `Stream<…, "…">`,
    `Layer<Record, never, never>`, `Type 'Record' is not assignable to type 'never'`, `is missing the following
    properties from type 'Shape': …` and `This expression is not callable` for a value operation; a branded operation
    (`Context.Operation<Shape, FileSystem>()`) is satisfied by `Layer<FileSystem>`, is not satisfied by another branded
    operation's layer, and does not satisfy `FileSystem`.

Doctests: the JSDoc examples for `Context.Slot`, `Context.Operation`, `Context.Operation.value`, `Context.Operations`,
`Stream.Operation`, `Sink.Operation`, the `FileSystem` operations and the `Terminal` operations run under `pnpm
doctest` (285 doctests across `Context`, `FileSystem`, `Terminal`, `Stream` and `Sink` pass on this branch).

Benchmark (`packages/effect/benchmark/context/operations.ts`, the pairs under "Cost"): paired A/B/B/A loops of CPU
time, the median of per-round ratios over 21 rounds, an A/A control whose envelope widens every limit, up to three
attempts on a noisy control, both modules warmed to the same key shapes, run in two modes (the full run, a process
holding records; `--ordinary`, one holding none), with `--check` enforcing the limits in the acceptance criteria.

Bundle test: `packages/effect/test/FileSystem/treeShaking.test.ts`, as described.

## Acceptance criteria

- [ ] `Context.Operation`, `Context.Operation.value`, `Context.Operation<Id, Shape>` with the `Operation` namespace
      types, `Context.OperationTypeId`, `Context.isOperation`, `Context.Operations`, `Context.Operations<Identifier,
      Shape>` with the `Operations` namespace types, `Context.OperationsTypeId` and `Context.isOperations` are exported
      from `effect/Context`, `Stream.Operation` (constructor and type) from `effect/Stream` and `Sink.Operation`
      (constructor and type) from `effect/Sink`, with the signatures in "API".
- [ ] `Context.Slot<Identifier, Shape>` is exported from `effect/Context` and is the key parameter of every function
      listed under "Existing APIs this touches"; `Context.Key` is unchanged and extends it; `Effect.service` and
      `Layer.updateService` read through the context; every existing key behaves as before, and a value typed
      `Context.Key` is still an Effect; a key built structurally with `key` alone works with one-slot semantics.
- [ ] Each operation constructor has one call form, the shape as the type argument and the key as the one value
      argument, with an optional `Brand` intersected into the identifier: `Context.Operation` for function shapes,
      `Context.Operation.value` for Effect shapes. `Context.Operations` has the plain form and the curried
      `Context.Operations<Self, Shape>()(key, members)` form, `Shape` optional.
- [ ] A function operation is a function (`isEffect` false) and a slot that is not a key (`isKey` false, `isOperation`
      true) whose `name` and `key` are its key string, carrying `OperationTypeId` as an own property, with
      `Function.prototype` as its prototype. A value operation is an Effect (`isEffect` true, `isStream` false) and a
      slot that is not a key, not callable, carrying `OperationTypeId` and `key`.
- [ ] A call to an Effect operation is an Effect and not a Stream; a call to a Stream (Sink) operation is a Stream
      (Sink) and not an Effect; `Context.ts` has no run-time import of `Stream`, `Sink` or `Channel`.
- [ ] The implementation is looked up from the running fiber's context each time the call result, or the value
      operation, runs, with the call's receiver and arguments forwarded.
- [ ] `Operation.KeyFor` accepts a shape that names its key or is derivable, rejects generic and overloaded shapes
      that do not name their key and shapes with properties, with the messages in "Generic, overloaded and
      property-bearing shapes", and is the key for a shape that is not a function, so that the constraint error is the
      only one printed; the constraint of `Context.Operation` rejects synchronous functions, plain values, Effect values
      and Stream shapes, and that of `Context.Operation.value` rejects functions.
- [ ] A record service is a `Context.Service` whose members are keys and whose identity is the union of its members'
      identifiers or a declared superset of it; at run time it is a plain object carrying its member list and the set
      of slots it writes; `Context.make` and `add` write its members' slots and its own; a member provided on top is an
      overlay; reading it returns the provided object while every member's slot holds the member it came with, a copy
      with the overriding members otherwise (same prototype, same own properties), and an object of the members for a
      record never provided whole, assembled once per storage and shared by every context with that storage; a missing
      member is `Service not found: <member key>` or the optional getters' fallback; `Context.pick`, `omit`, `merge`,
      `mergeAll`, `addUnsafe` and `getOrUndefinedUnsafe` behave as in "Existing APIs this touches", including for
      nested records and reference members; the identity rule under "Runtime semantics" holds for member strings and
      for a record's string; `Context` keeps no index, registry or flag outside the record key's own cache, and no
      other `Context`, `Layer` or `Effect` export changes behaviour.
- [ ] `Operations.KeyFor` rejects an identifier lacking a member, a wrong shape and a missing identifier with the three
      documented messages on the key argument, each naming the difference and none printing the members.
- [ ] The merge of every member layer is assignable to `Layer<Record>`; a subset record satisfies the six facts under
      "Subset records"; `Layer.mock` on a record service dies only on the members it lacks.
- [ ] Cost, by `packages/effect/benchmark/context/operations.ts --check` and `--ordinary --check` (CPU-time paired
      ratios, median of 21 rounds, limits widened by the A/A control's envelope, three attempts on a control outside
      1.05): in the full run, a process holding records, the control within 1.05; ordinary-key, mixed-kind and
      reference-default `getUnsafe`, ordinary-key and mixed-kind `add`, `add` then `getUnsafe`, and `mergeAll` of 33
      one-slot contexts within 1.15× of the branch point (1.04, 1.11, 1.04, 1.02, 1.02, 1.09, 0.89); a record read with
      the record provided whole within 1.15× an ordinary key read from the same context and from a context rebuilt per
      request (1.11, 1.12), and within 1.5× with a member overridden underneath (1.17); a member override into a
      context holding the record within 1.15× an ordinary `add` (1.02); the first record read after a member override
      within 2× the thirty-two reads and the copy it performs (0.31); a record assembled from thirty-two member layers
      within 2× the thirty-two reads it performs (0.10); `yield*` of a record service within 1.15× `yield*` of a plain
      record service from the same context and rebuilt per request (1.03, 1.00), within 1.5× with a member overridden
      underneath (1.07), within 4× with a member overridden per request (2.41) and within 3× from member layers (1.16);
      an operation call no slower than a method call on a yielded plain record (0.84); a method call on the record
      service within 1.15× of one on a plain record (1.01). In the `--ordinary` run, the control and the seven ordinary
      rows within the same limits (0.99; 1.00, 0.99, 1.04, 0.96, 1.00, 1.09, 1.00). Absolute costs reported, not gated:
      a thirty-two-member record made (1.7 µs), added to a thirty-three slot context (3.6 µs), a member override into
      a context holding it (31 ns), the first record read after it (1.1 µs) and a later read of a record never
      provided whole (44 ns).
- [ ] Bundle: the prototype's check passes, including the plain root within 512 bytes of the same root bundled with
      the branch point's `Context.ts` (419 B); the `packages/effect` bundle test passes.
- [ ] The runtime tests, type tests, doctests and bundle test in "Test plan" pass; `pnpm check`, `pnpm lint`,
      `pnpm jsdocs --check` and `pnpm circular` are clean.
- [ ] JSDoc on every new export follows the repository conventions, with "Required, not defaulted", the shape rule
      and "a member that is an Effect is defined with `Context.Operation.value`" under **Gotchas**, and `@stability
      unstable`.
- [ ] Changesets on the branch: `effect: minor` for `Context` naming `Context.Slot` and the parameters widened to it,
      and one each for the FileSystem and Terminal phase 0; the codemod `scripts/codemods/record-shape.ts` with
      `pnpm codemod:shape`.
- [ ] `effect/FileSystem` and `effect/Terminal` phase 0: every existing consumer compiles unchanged, every existing
      suite passes unchanged, the new `FileSystem` and `Terminal` tests pass, and `tsc --extendedDiagnostics` on
      `packages/effect` grows by under 2 % in types and instantiations (measured +1.18 % and +1.83 %).
- [ ] PR against `v4/next-minor`.
