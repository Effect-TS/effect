# Tree-shakeable services

A program that calls two operations of a fifty-operation service should bundle those two implementations and nothing
else, and a test should still be able to replace one operation. This spec adds one idea to `effect/Context`, at two
granularities, defines it precisely enough to implement, implements it in `packages/effect/src/Context.ts`,
`packages/effect/src/Stream.ts` and `packages/effect/src/Sink.ts` on this branch, carries `effect/FileSystem` through
the first, non-breaking step of its migration in `packages/effect/src/FileSystem.ts`, and ships a prototype under
`specs/tree-shakeable-services/` whose bundle check shows the unused implementations are absent from the bundle.

## Summary

An **operation** is a `Context.Key` that is a function: calling it calls the implementation stored under it. A **record
service** is a `Context.Service` whose members are keys, stored one slot each beside the record itself. Both are
ordinary keys. Everything that provides, reads, overrides, picks or omits a key accepts them unchanged.

```ts
// contract module: keys only, no implementations; each operation written once
export const readFile = Context.Operation<(path: string) => Effect.Effect<Uint8Array, PlatformError>>()(
  "effect/FileSystem/readFile"
)
export const stream = Stream.Operation<(path: string) => Stream.Stream<Uint8Array, PlatformError>>()(
  "effect/FileSystem/stream"
)
// … 28 more, then the record service, whose identity is the union of the keys above
export const FileSystem = Context.Operations("effect/FileSystem", { readFile, stream /* … */ })
// a record over three of the same members: a reader's one named requirement
export const ReadOnly = Context.Operations("effect/FileSystem/ReadOnly", { exists, readFile, stat })

// a program calls an operation like a function; the key lands in R
const bytes = yield* FileSystem.readFile("/etc/hosts")
//    Effect<Uint8Array, PlatformError, "effect/FileSystem/readFile">
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
`Effect` as they are today, with no signature changed. An operation call returns a plain Effect, or a plain Stream or
Sink when the operation was defined with `Stream.Operation` or `Sink.Operation`; there is no value that is both. The
implementation of an operation nobody calls is never imported, so the bundler drops it. A missing implementation is a
compile error naming the key, or the record's name.

The prototype's bundle check, on a 30-operation file system contract and a 6-member terminal contract, with `effect`
bundled as it is published:

```
main.ts (two operation layers)                           95.2 kB    2 of 30 implementations   Stream runtime: 1.4 kB wrapper
main-readonly.ts (ReadOnly subset, three member layers)  95.7 kB    3 of 30 implementations   Stream runtime: 1.4 kB wrapper
main-twenty.ts (twenty operation layers)                101.3 kB   20 of 30 implementations   Stream runtime: 1.4 kB wrapper
main-terminal.ts (two terminal layers)                   90.4 kB    2 of 6 terminal members    Stream runtime: none
main-stream.ts (one Stream operation)                   101.0 kB    1 of 30 implementations   Stream runtime: 3.8 kB used
main-record.ts (yield* FileSystem, record layer)        107.9 kB   30 of 30 implementations   Stream runtime: 3.1 kB used
```

The 1.4 kB wrapper is what the contract costs with no purity annotation at all: every key is kept, and the kept
Stream keys keep `Stream.Operation` and `Stream.unwrap`. With annotations, or as `effect` publishes its own
contracts, the same root is 90.2 kB with two keys and no Stream code.

At run time, reading the record service returns the object that was provided, in one slot lookup; the benchmark puts
record reads at 0.97× an ordinary key read from the same context and 1.12× from a context rebuilt per request, and
`yield* FileSystem` at 1.05× `yield*` of a plain record service.

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

A `Context.Key` has a string identity, a shape, and a slot in the context map. An **operation** is a key whose shape
is a function returning an Effect, a Stream or a Sink, plus the one thing such a shape needs to read well: you can
call the key, and the lookup of the implementation happens when the result runs. A **record service**
(`Context.Operations`) is a key whose shape is a record of its members' shapes and which is stored twice over:
providing it writes the record under its own key and each member under that member's key, and reading it returns the
record when it is current and otherwise assembles one from the members' slots. A member is any key.

| Form      | Key                                                                 | Shape                  | Use                               | Provide                             |
| --------- | ------------------------------------------------------------------- | ---------------------- | --------------------------------- | ----------------------------------- |
| operation | `readFile = Context.Operation<(path) => Effect<…>>()("…/readFile")` | `(path) => Effect<…>`  | `yield* readFile(p)`              | `Layer.succeed(readFile, fn)`       |
| service   | `sep = Context.Service<string>("…/sep")`                            | `string`               | `yield* sep`                      | `Layer.succeed(sep, "/")`           |
| record    | `FileSystem = Context.Operations("…", { readFile, sep, … })`        | `{ readFile, sep, … }` | `(yield* FileSystem).readFile(p)` | `Layer.succeed(FileSystem, record)` |

The rows are the same storage read at different granularity, and the same one rule for providing: what you provide
is a key, and every row is a key. There is no bridge between them: the record's provider populates the members'
slots, and the members' providers populate the record's view. A record over some of another record's members is a
record like any other; see "Subset records".

### Defining operations

A contract module exports one key per member and holds no implementations. The result kind of an operation is fixed
where it is defined: `Context.Operation` for shapes returning an Effect, `Stream.Operation` for shapes returning a
Stream, `Sink.Operation` for shapes returning a Sink. A shape is a function; a member that is an Effect in today's
record (`Terminal.columns: Effect<number>`) is written as a function of no arguments.

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

// Terminal.ts: a member that is an Effect today is a function of no arguments
export const columns = Context.Operation<() => Effect.Effect<number>>()("effect/Terminal/columns")
```

Each constructor has one call form: the shape as the type argument, the key as the one value argument, written once.
The type is inferred, `Operation<"effect/FileSystem/readFile", (path: string) => Effect<…>>`, so a declaration carries
no annotation and the key appears once. (TypeScript cannot take one type argument explicitly and infer another in a
single call, which is why the form is curried, as `Context.Service<Self, Shape>()("key")` is.)

The key string is the identity of the operation at both levels: it is the slot the implementation is stored under at
run time, and it is the type that appears in `R` while the operation is unprovided. The convention is
`<package>/<Service>/<operation>`. Two operations with the same key are the same operation, in the types and at run
time, which is the rule `Context.Service` has today. An optional second type argument intersects an existing identity
into the operation's, `Context.Operation<Shape, FileSystem>()("effect/FileSystem/readFile")`; it exists for the
migration of existing record services and is explained there.

Giving a Stream shape to `Context.Operation` is a compile error (`does not satisfy the constraint 'EffectSignature'`);
the fix is `Stream.Operation`. So is giving it a shape that is not a function returning an Effect: a synchronous
function, a plain value, or an Effect value. Each result kind with an `unwrap` has the same ten-line constructor in its
own module (`Stream.Operation` over `Stream.unwrap`, `Sink.Operation` over `Sink.unwrap`); `Context.ts` knows nothing
about either at run time.

### Which members are operations, and why

A member is an operation when its shape is a function returning an Effect, a Stream or a Sink. Only such a shape can
absorb the lookup: the result is run later, inside a fiber that has a context, so the key can read its implementation
at that moment and continue with it. A plain value (`Path.sep: string`) or a synchronous function
(`Path.join: (...parts) => string`) has no later moment; it is a `Context.Service` and is yielded, which is the same
idea at value granularity. A member that is an Effect value today becomes a function of no arguments, so that it reads
the same standalone and through the record and its implementation is a function in both. Both kinds are per-slot
keys, and a record service accepts both as members, so every record service in `effect` can become a
`Context.Operations`:

| Member shape                                  | Kind                 | Standalone use                          | In the record                     |
| --------------------------------------------- | -------------------- | --------------------------------------- | --------------------------------- |
| `(path: string) => Effect<Uint8Array>`        | `Context.Operation`  | `yield* readFile(path)`                 | `fs.readFile(path)`               |
| `() => Effect<number>` (was `Effect<number>`) | `Context.Operation`  | `yield* columns()`                      | `yield* terminal.columns()`       |
| `(path: string) => Stream<Uint8Array>`        | `Stream.Operation`   | `stream(path)`                          | `fs.stream(path)`                 |
| `(…) => Sink<…>`                              | `Sink.Operation`     | `sink(path)`                            | `fs.sink(path)`                   |
| `string`, `(...parts: string[]) => string`    | `Context.Service`    | `yield* sep`, `(yield* join)("a", "b")` | `path.sep`, `path.join("a", "b")` |
| a record service                              | `Context.Operations` | `yield* ReadOnly`                       | `platform.fs.readFile(path)`      |
| a reference                                   | `Context.Reference`  | `yield* indent`                         | `path.indent`                     |

Whether a service is _worth_ migrating is a separate question: the gain is one implementation module per member, so
`Path`, whose fifteen members are small synchronous functions sharing one implementation, gains nothing and stays a
plain record service. `FileSystem` and `Terminal`, whose members pull in `node:fs`, `node:readline` and the Stream
runtime, are the worked migrations below.

### Defining the record service

The record service is built from the members, after them, in the same module. The one-line form infers everything:

```ts
export const FileSystem = Context.Operations("effect/FileSystem", { access, chmod, /* … */ writeFileString })
// Operations<"effect/FileSystem/access" | … | "effect/FileSystem/writeFileString", { readonly access: …; … }>
```

A library contract adds two declarations so that diagnostics print names instead of thirty keys or thirty members:

```ts
const members = { access, chmod, /* … */ readFile, stream, /* … */ writeFileString }

export type FileSystem = Context.Operations.Identifier<typeof members>
export interface Shape extends Context.Operations.Shape<typeof members> {}
export const FileSystem: Context.Operations<FileSystem, Shape> = Context.Operations("effect/FileSystem", members)
```

`FileSystem` the type is the union of the thirty keys, and the alias gives that union a name that TypeScript keeps in
diagnostics (`Layer<FileSystem, never, never>`, `Type 'FileSystem' is not assignable to type 'never'`). `Shape` is the
record of the members' shapes, declared as an interface so that diagnostics print `Shape` rather than thirty members.
The constructor takes both from the declaration, and checks them against the members: an identifier that lacks a
member or a shape that differs from the members' is a compile error naming where it differs
(`"Self lacks the identifier of": "effect/FileSystem/writeFile"`, `"Shape differs from the members' shape at":
"writeFile"`). The names have to be declared by the author because TypeScript attaches an alias to a type when the
alias creates it: a union inferred inside the constructor's signature prints as `Identifier<{ thirty operation types }>`
however it is named afterwards.

Because the identity is the union of the keys, the relationships a user expects hold by ordinary assignability, with
no new rule:

- `Layer<FileSystem>` satisfies `"effect/FileSystem/readFile"`: `Exclude<"…/readFile", FileSystem>` is `never`.
- `Layer<"effect/FileSystem/readFile">` does not satisfy `FileSystem`.
- `Layer.mergeAll(all thirty operation layers)` is assignable to `Layer<FileSystem>`; the prototype's `node/layer.ts`
  is exactly that with the annotation, and a merge of some of them is rejected with the missing keys in the error.
- `Effect<_, _, "…/readFile" | "…/writeFile">` is assignable to `Effect<_, _, FileSystem>`, so an author may annotate a
  function with the record's name.

A record may be a member of a record (`{ fs: FileSystem.ReadOnly, terminal: Terminal }`): its slots are spread the
same way, its identity joins the union, and `yield*` reads it nested. A `Context.Reference` may be a member: its
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
6. The subset is a key: `yield* ReadOnly` reads three slots, `Layer.succeed(ReadOnly, {...})` writes three and itself.

At run time the full record and the subset shadow each other slot by slot: a `ReadOnly` provided on top of a
`FileSystem` wins for `readFile`, and the `FileSystem` view then assembles with the subset's `readFile` and its own
`writeFile`; the other order has the full record win. Both are tested.

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

// an operation of no arguments is implemented by a function of no arguments
export const columns = Layer.succeed(Terminal.columns, () => Effect.sync(() => process.stdout.columns ?? 80))

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

**What you provide is a key, and an operation is a key.** `Layer.succeed(FileSystem.FileSystem, record)` and
`Layer.succeed(FileSystem.readFile, fn)` are the one rule applied to two keys, as are `Effect.provideService`,
`Effect.updateService`, `Layer.effect`, `Layer.mock`, `Context.make`, `Context.add`, `Context.get`, `Context.pick` and
`Context.omit`. What makes this possible is a change to `Context.Key`: it is now the brand every key shares, and
`Context.Service` is the key that is also an Effect. An operation satisfies `Key` and not `Service`, so `Layer.succeed`
accepts it and `yield* readFile` is a type error; see "Existing APIs this touches" for what that change costs.

### The record service at run time

`Layer.succeed(FileSystem.FileSystem, record)` writes thirty-one slots: `"effect/FileSystem/access"` through
`"effect/FileSystem/writeFileString"`, and `record` itself under `"effect/FileSystem"`. `yield* FileSystem.FileSystem`
reads the slot `"effect/FileSystem"` and returns `record`, the object that was provided, in one lookup. If a member
is then provided on top (`Effect.provideService(FileSystem.readFile, fake)`), the stored record is no longer current:
the member write also marks the record's slot, and a read assembles `{ access, …, readFile: fake, … }` from the
members' slots, with a missing member dying as `Service not found: effect/FileSystem/stat`. A record provided on top
of a member wins, slot by slot, and is current again. Because there is only one kind of storage, precedence is
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
stored and spread member by member, so `readFile` runs and `stat` dies with `effect/FileSystem: Unimplemented method
"stat"`.

**What `yield* FileSystem` costs.** Its requirement is `FileSystem`, which only a `Layer<FileSystem>` satisfies, so the
bundle contains every implementation (107.9 kB against 95.2 kB in the prototype). At run time it is one slot read when
the record was provided whole, which is every existing program: 0.97× an ordinary key read from the same context,
1.12× from a context rebuilt per request, and `yield*` of the record in a fiber is 1.05× `yield*` of a plain record
service (measured below). A record provided as thirty member layers is assembled once per base context and shared by
every context derived from it, so a server that adds a request-scoped service per request assembles it once, not per
request; a record with a member overridden on top is assembled once per such context.

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

Additions live in `effect/Context`, `effect/Stream` and `effect/Sink`. No existing export changes signature. One
existing type changes its supertype (`Context.Key`), and two existing functions change implementation
(`Effect.service`, `Layer.updateService`); all three are under "Existing APIs this touches".

### `Context.Operation` (constructor)

```ts
export const Operation: <Shape extends Operation.EffectSignature, Brand = unknown>() => <const Id extends string>(
  key: Operation.KeyFor<Id, Shape>
) => Operation<Id & Brand, Shape>
```

One call form: the shape explicitly, the key inferred as a literal. Returns a function with `name === key`, the
`OperationTypeId` marker, and the `Key` members (`[ServiceTypeId]`, `key`). `KeyFor<Id, Shape>` is `Id` when the
shape names its key or is derivable, and otherwise a string literal type explaining why the definition is rejected;
TypeScript infers `Id` through it and prints the explanation as the parameter type, as pasted above. `Brand`, when
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
  & Key<Id, Shape>
  & {
    readonly [OperationTypeId]: OperationTypeId
    readonly key: Id
  }

export declare namespace Operation {
  export type EffectSignature = (...args: any) => Effect<any, any, any>
  export type StreamSignature = (...args: any) => Stream<any, any, any>
  export type SinkSignature = (...args: any) => Sink<any, any, any, any, any>
  export type Signature = EffectSignature | StreamSignature | SinkSignature

  /** The shape when its result requires the key; a derived signature otherwise. */
  export type Call<Id extends string, Shape extends Signature> = Shape extends
    (this: infer This, ...args: infer Args) => infer Result ? [Id] extends [Requirements<Result>] ? Shape
    : (this: This, ...args: Args) => Require<Result, Id>
    : never

  export type Requirements<Result> = Result extends Effect<infer _A, infer _E, infer R> ? R
    : Result extends Stream<infer _A, infer _E, infer R> ? R
    : Result extends Sink<infer _A, infer _In, infer _L, infer _E, infer R> ? R
    : never
  export type Require<Result, Id> = Result extends Effect<infer A, infer E, infer R> ? Effect<A, E, R | Id>
    : Result extends Stream<infer A, infer E, infer R> ? Stream<A, E, R | Id>
    : Result extends Sink<infer A, infer In, infer L, infer E, infer R> ? Sink<A, In, L, E, R | Id>
    : never

  /** True when the derived signature is assignable back to the shape. */
  export type Derivable<Shape extends Signature> = …

  /** The key, or the reason the definition is rejected. */
  export type KeyFor<Id extends string, Shape extends Signature> = [keyof Shape] extends [never] ?
    Shape extends (...args: any) => infer Result ? [Id] extends [Requirements<Result>] ? Id
      : Derivable<Shape> extends true ? Id
      : `The shape of "${Id}" is generic or overloaded: its result must require "${Id}"`
    : never
    : "The shape has properties: an operation is a bare function"

  export interface Any extends Key<any, any> {
    readonly [OperationTypeId]: OperationTypeId
  }
}
```

`Operation` is a type alias, not an interface, because its call signature is conditional on the shape. Because an
operation is a `Key`, `Context.Service.Identifier<typeof readFile>` is its key literal and
`Context.Service.Shape<typeof readFile>` its shape; no operation-specific extractors are needed. TypeScript keeps the
alias name in diagnostics:

```
typetest/errors/displayed-type.ts(4,14): error TS2322: Type 'Operation<"effect/FileSystem/readFile", (path: string) => Effect<Uint8Array<ArrayBufferLike>, FileSystemError, never>>' is not assignable to type 'string'.
typetest/errors/displayed-type.ts(6,14): error TS2322: Type 'Effect<Uint8Array<ArrayBufferLike>, FileSystemError, "effect/FileSystem/readFile">' is not assignable to type 'string'.
typetest/errors/displayed-type.ts(8,14): error TS2322: Type 'Stream<Uint8Array<ArrayBufferLike>, FileSystemError, "effect/FileSystem/stream">' is not assignable to type 'string'.
```

Shapes that are not functions returning an Effect, a Stream or a Sink are rejected by the constraint:

```
typetest/errors/not-an-operation.ts(6,39): error TS2344: Type '(path: string) => string' does not satisfy the constraint 'EffectSignature'.
  Type 'string' is not assignable to type 'Effect<any, any, any>'.
typetest/errors/not-an-operation.ts(8,40): error TS2344: Type '{ readonly port: number; }' does not satisfy the constraint 'EffectSignature'.
typetest/errors/not-an-operation.ts(10,46): error TS2344: Type 'Effect<number, never, never>' does not satisfy the constraint 'EffectSignature'.
typetest/errors/stream-shape.ts(5,41): error TS2344: Type '(path: string) => Stream<Uint8Array<ArrayBufferLike>, never, never>' does not satisfy the constraint 'EffectSignature'.
```

A value or a synchronous function is a `Context.Service` and is yielded; an Effect value is written as a function of
no arguments.

### `Context.OperationTypeId` and `Context.isOperation`

```ts
export type OperationTypeId = "~effect/Context/Operation"
export const OperationTypeId: OperationTypeId
export const isOperation: (u: unknown) => u is Operation.Any
```

### `Context.Operations` (constructor)

```ts
export const Operations: <
  const Ops extends Operations.Members,
  Self = Operations.Identifier<Ops>,
  Shape = Operations.Shape<Ops>
>(
  key: string,
  members: Operations.Validate<Self, Shape, Ops>
) => Operations<Self, Shape>
```

One call form. `Self` and `Shape` are taken from the declaration's type annotation when there is one and default to the
members' identifier and shape otherwise. `Validate<Self, Shape, Ops>` is `Ops` when `Self` contains every member's
identifier and `Shape` is exactly the members' shape, and otherwise an object type whose one property names the
difference, so the error lands on the members argument. A `Self` wider than the members' union is allowed on
purpose: it is how an existing record service keeps its identity while its members become keys. Creates a
`Service(key)` and attaches `OperationsTypeId`, `members` and, internally, one resolved slot per member and the two
assembly caches.

### `Context.Operations<Identifier, Shape>` (type)

```ts
export interface Operations<in out Identifier, in out Shape> extends Service<Identifier, Shape> {
  readonly [OperationsTypeId]: OperationsTypeId
  readonly members: { readonly [K in keyof Shape]: Key<any, Shape[K]> }
}

export declare namespace Operations {
  export interface Members {
    readonly [name: string]: Key<any, any>
  }
  export type Identifier<Ops extends Members> = { [K in keyof Ops]: Service.Identifier<Ops[K]> }[keyof Ops]
  export type Shape<Ops extends Members> = { readonly [K in keyof Ops]: Service.Shape<Ops[K]> }
  /** The names at which two record shapes differ. */
  export type ShapeDifference<A, B> = …
  export type Validate<Self, S, Ops extends Members> = unknown extends Self ?
    { readonly "Annotate the declaration: Context.Operations<Self, Shape>": Self }
    : [Identifier<Ops>] extends [Self] ? [S] extends [Shape<Ops>] ? [Shape<Ops>] extends [S] ? Ops
        : { readonly "Shape differs from the members' shape at": ShapeDifference<S, Shape<Ops>> }
      : { readonly "Shape differs from the members' shape at": ShapeDifference<S, Shape<Ops>> }
    : { readonly "Self lacks the identifier of": Exclude<Identifier<Ops>, Self> }
}
```

It is a `Service`, so `yield*`, `.use`, `.useSync`, `.of`, `.context`, `Context.Service.Shape<typeof FileSystem>` and
`Context.Service.Identifier<typeof FileSystem>` all apply. A member is any key: an operation, a service, a reference,
or a record service.

### `Context.OperationsTypeId` and `Context.isOperations`

```ts
export type OperationsTypeId = "~effect/Context/Operations"
export const OperationsTypeId: OperationsTypeId
export const isOperations: (u: unknown) => u is Operations<any, any>
```

Neither guard is consulted on any hot path; see "Record storage".

### Existing APIs this touches

Signatures are unchanged. The one type change and the two implementation changes are the first three rows; the rest
describes what each existing function does with the two new kinds of key, which it does without a branch of its own.

| API                                                            | What changes                                                                                                                                                                                                                                                                                                                                |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Context.Key<I, S>` (type)                                     | No longer extends `Effect<S, never, I>`; it is the brand every key shares (`[ServiceTypeId]`, `key`, `Service`, `Identifier`). `Context.Service<I, S>` extends `Key<I, S>` and `Effect<S, never, I>` and is unchanged for every key built today. Only code that yields a value typed as `Key` rather than `Service` is affected; see below. |
| `Effect.service(key)`                                          | Was `(key) => key`, which only works for a key that is an Effect; now reads the key from the fiber's context. Same result for every existing key.                                                                                                                                                                                           |
| `Layer.updateService(layer, key, f)`                           | Mapped over `key` as an Effect; now maps over `Effect.service(key)`. Same result for every existing key.                                                                                                                                                                                                                                    |
| `Context.make(key, value)`                                     | One slot for an ordinary key; one slot per member plus the record's own for a record service, nested records spread the same way.                                                                                                                                                                                                           |
| `Context.add(self, key, value)`, `Effect.provideService`       | One overlay for an ordinary key, as today. For a member of a record service: the member's overlay, then one marker overlay per record spanning it. For a record service: a fresh flat map with the members' slots and the record's own.                                                                                                     |
| `Context.get`, `getUnsafe`, `yield* key`, `key.use`, `useSync` | One slot lookup, as today. A record service whose slot holds the record returns it; whose slot is marked or empty assembles the record from the members' slots, a missing member throwing `Service not found: <member key>` and a reference member falling back to its default.                                                             |
| `Context.getOption`, `getOrElse`, `getOrUndefined`             | The slot or the fallback; for a record service, the record when every non-reference member is present, otherwise the fallback.                                                                                                                                                                                                              |
| `Context.pick(...keys)`, `Context.omit(...keys)`               | A record service's own slot and every member's slot. Omitting a member also drops the slot of every record that spans it.                                                                                                                                                                                                                   |
| `Context.addUnsafe`, `getOrUndefinedUnsafe` (string-keyed)     | `getOrUndefinedUnsafe(ctx, "effect/FileSystem")` returns the record when it was provided whole and is current. `addUnsafe` with a record's string spreads it and with a member's string marks the records spanning it, so string-keyed writes keep the same invariants as keyed ones.                                                       |
| `Context.merge`, `mergeAll`, flattening                        | Slot by slot, as today; a slot write drops the slot of every record spanning it, so a flat map never holds a record that disagrees with its members' slots.                                                                                                                                                                                 |
| `Layer.succeed`, `Layer.effect`, `Layer.sync`, `Layer.mock`    | Via `Context.make`, so an operation is one slot and a record is its members' slots and its own.                                                                                                                                                                                                                                             |
| `Context.isKey`, `isReference`, `isOperation`, `isOperations`  | `isKey(op)` is `true`; `isOperation(op)` is `true`; `isOperations(record)` is `true`; `isReference` is `false` for both.                                                                                                                                                                                                                    |
| `Effect.andThen`, `Effect.tap`, `Effect.flatMap` given `op`    | A function, so they call it (`isEffect(op)` is `false`).                                                                                                                                                                                                                                                                                    |
| `Effect.map(op, …)`, `yield* op`, `Layer.succeed(op, …)`       | The first two are type errors (an operation is not an Effect); the third is accepted (an operation is a key).                                                                                                                                                                                                                               |

**The `Key` change.** `Key` was an `Effect` so that `yield* key` worked on anything typed `Key`. Every key the library
constructs is a `Service` or a `Reference`, both still Effects, so every `yield* Database`, `Effect.map(Database, …)`
and class-style `yield* Config` is unchanged. What stops compiling is a value declared with the abstract type and then
yielded, `const k: Context.Key<I, S> = …; yield* k`. The repository had three such sites, all internal
(`Effect.service`'s implementation, `Layer.updateService`, and the `Command` Effect in `cli/internal/command.ts`), and
all three were made correct for any key by reading through the context instead; none of them changed signature. `Key`
is `@stability stable`, so the changeset for issue 1 calls the change out, with the one-word fix (`Service` for `Key`)
for anyone it reaches. The alternative, keeping `Key` an Effect and adding `op.service` for provision, was round 3's
design and is the seam this round closes; see "Alternatives rejected within this design".

`Context.ts` gains type-only imports of `Stream` and `Sink` for the signature types, as `Layer.ts` already has, and
imports `withFiberSucceed` from `internal/core.ts`, which it already imports from. `Sink.ts` turns its type-only import
of `Context` into a value import, as `Stream.ts` already has. `pnpm circular` is clean.

## Runtime semantics

**Construction.** `Context.Operation<Shape>()(key)` creates a function named `key` whose prototype carries the `Key`
brand and `OperationTypeId` (and still `Function.prototype`, so `.bind` and friends work), with `key` as an own
property. `Stream.Operation` and `Sink.Operation` do the same through the internal `makeOperation`, passing a
different `call`. `Context.Operations(key, members)` creates `Service(key)`, attaches `members`, resolves each member
to its slot once and registers itself with every slot it spans (see "Record storage"). Nothing is looked up at
construction. All of them are cheap enough to do at module top level for every export of a contract; what a bundler
makes of them is under "Tree-shaking".

**Calling an Effect operation.** `op(...args)` returns `withFiber((fiber) => …)`: an Effect primitive that, when run,
reads the implementation from the running fiber's context and applies it to the call's receiver and arguments; the
result is the continuation. `Effect.isEffect` of the call result is `true`, `Stream.isStream` is `false`.

**Calling a Stream or Sink operation.** `op(...args)` returns `Stream.unwrap(applyOperation(op, this, args))`
(`Sink.unwrap`): a Stream (Sink) that, when run, reads the implementation from the fiber that pulls it and delegates to
the Stream (Sink) it returns. `Stream.isStream` is `true` and `Effect.isEffect` is `false`. Both facts are pinned by a
test.

**Lookup timing.** The implementation is read from the running fiber's context each time the call result runs, not
when `op` is called and not when it is constructed. One call value run under two providers runs two implementations;
this holds for Stream operations too and is what makes `Effect.provideService(op, fake)` work on a call built before
the override is applied.

**Receiver.** `op` forwards its `this` to the implementation. A shape that declares a `this` parameter keeps it in the
call signature; an ordinary shape has `this: unknown` and ignores it. Implementations written as arrows or `Effect.fn`
are unaffected.

**Function properties.** A shape with properties is rejected at the definition. `op` has its own properties (`key`,
`name`, `length`) and nothing else; an implementation that needs to expose values beside its function exposes them as
a separate key, which can sit in the same record.

**Missing implementation.** The types prevent running a program whose `R` still contains an operation's key or a
record's identity. If the types are bypassed, the read throws the existing `Service not found: <key>` defect when the
call result runs, naming the member key in the record case.

**Record storage.** Every key knows how to write itself, and every write to a flat map keeps one invariant: a record
service's own slot is present only while it agrees with its members' slots.

- `make` and `add` with a record service write each member's slot (recursing into nested records) and then the record
  under its own key; `add` does so in a fresh flat map, as `Effect.provide` already does for every layer.
- `add` with a member of one or more record services writes the member's overlay and then, above it, one overlay per
  record spanning the member whose value is a private `assembling` marker. A later `add` of the record itself replaces
  the marker. `add` learns which of the three a key is from one property on the key, set at construction, which also
  carries whether fibers cache the key; it replaces the set lookup `add` did for that.
- Flattening overlays into a base, `merge`, `mergeAll`, `pick` and `omit` write slots through one function that drops
  the record slot of every record spanning the slot written or deleted, and drops a record slot when it meets a
  marker. `mapUnsafe` therefore never shows a marker or a stale record.
- A read is one `lookup` of the key's slot, for every kind of key. A value is returned as is. A record service whose
  lookup finds the marker assembles the record from its members' slots and caches it by context; whose lookup finds
  nothing (the members were provided individually) assembles it and caches it by base map, since no overlay touched a
  member, so every context derived from that base shares the assembly. A missing non-reference member makes the read
  throw, or the record absent for the optional getters; a reference member falls back to its default.
- The registry of spans (slot string to the record stored under it and the records spanning it) is a module-level map
  filled at record construction and consulted by string-keyed writes and flat-map writes only. Keyed reads and
  ordinary keyed writes never touch it.
- A key built structurally (`{ key } as Context.Service<…>`, which `internal/core.ts` does for two cause-annotation
  keys) has none of the per-key methods and gets one-slot semantics through the same code paths.

**Precedence.** Ordinary `Context` semantics, slot by slot: the provider closest to the call wins. `Effect.provide(a)`
then `Effect.provide(b)` in a pipe means `a` wins over `b` for keys both provide; `Layer.provideMerge(override, live)`
has `override` win; a record provided inside an operation override wins for that member, and the record read returns
the provided object; a member provided inside a record wins for that member, and the record read assembles.

**Cost.** Measured by `pnpm --filter tree-shakeable-services-spec bench`: tight loops with a calibrated iteration
count (about 100 ms per case), 11 rounds, the order of cases rotated each round, median and minimum over rounds. The
baseline is the branch point's `Context.ts` loaded beside this one in the same process. Both modules are exercised
through a mix of key kinds (function-style services, references, class-style services) so that neither is measured
with a monomorphic inline cache the other lacks. The fiber cases run under `Effect.runSyncWith(context)`, so a run is
the fiber and the read, not a merge of the context into a fresh fiber. The machine is shared; the minimums are the
floor and the medians carry the noise.

| Case                                                           | median |    min |
| -------------------------------------------------------------- | -----: | -----: |
| `getUnsafe`, mixed key kinds, baseline                         |   28.5 |   21.9 |
| `getUnsafe`, mixed key kinds, this branch                      |   26.1 |   21.2 |
| `add`, mixed key kinds, baseline                               |   60.6 |   40.4 |
| `add`, mixed key kinds, this branch                            |   52.2 |   41.4 |
| `getUnsafe`, ordinary key, baseline                            |   18.5 |   16.3 |
| `getUnsafe`, ordinary key, this branch                         |   24.1 |   18.5 |
| `add`, ordinary key, baseline                                  |   43.7 |   39.2 |
| `add`, ordinary key, this branch                               |   42.9 |   32.3 |
| `getUnsafe`, operation key (1 of 31 slots)                     |   21.1 |   14.4 |
| `getUnsafe`, record provided whole, same context               |   23.4 |   13.9 |
| `add` then `getUnsafe`, ordinary key, baseline                 |   47.6 |   40.4 |
| `add` then `getUnsafe`, ordinary key, this branch              |   49.5 |   36.4 |
| `add` then `getUnsafe`, record provided whole                  |   55.3 |   43.3 |
| `add` then `getUnsafe`, record from 30 member layers           |   67.9 |   42.3 |
| `add` then `getUnsafe`, ReadOnly (3 of 30) from the record     |   66.6 |   49.2 |
| `add` a member override, then `getUnsafe` record               | 4358.4 | 3082.9 |
| `make`, record (30 members)                                    | 2172.4 | 1683.8 |
| `add`, record (30 members) to 31 slots                         | 4679.1 | 3676.0 |
| `runSync`: `yield* Plain` (a one-slot record service)          |  663.7 |  487.3 |
| `runSync`: `yield* FileSystem` (record service)                |  694.6 |  506.6 |
| `runSync`: `yield* Plain`, context rebuilt per request         |  984.4 |  766.9 |
| `runSync`: `yield* FileSystem`, context rebuilt per request    |  899.2 |  733.8 |
| `runSync`: `yield* FileSystem` from member layers, per request | 1001.6 |  761.9 |
| `runSync`: `readFile(path)` operation call                     |  600.3 |  484.3 |
| `runSync`: `(yield* Plain).readFile(path)`                     |  815.2 |  582.8 |
| `runSync`: `(yield* FileSystem).readFile(path)`                |  834.4 |  658.6 |

| Ratio (this branch / baseline unless stated)                      | median |  min |
| ----------------------------------------------------------------- | -----: | ---: |
| mixed-kind `getUnsafe`                                            |   0.92 | 0.97 |
| mixed-kind `add`                                                  |   0.86 | 1.02 |
| ordinary-key `getUnsafe`                                          |   1.31 | 1.14 |
| ordinary-key `add`                                                |   0.98 | 0.82 |
| record read (provided whole) / ordinary key read, same context    |   0.97 | 0.75 |
| record read (provided whole) / ordinary key read, context rebuilt |   1.12 | 1.19 |
| record read (from member layers) / ordinary key read, rebuilt     |   1.37 | 1.16 |
| `yield* FileSystem` / `yield* Plain`, same context                |   1.05 | 1.04 |
| `yield* FileSystem` / `yield* Plain`, context rebuilt per request |   0.91 | 0.96 |
| operation call / method call on a plain record                    |   0.74 | 0.83 |
| method call on the record service / on a plain record             |   1.02 | 1.13 |

Four readings. The ordinary-key paths are the same code as before: a read is one `lookup` and two compares, and a
write is one property read where there was a set lookup, which is why mixed-kind reads and writes come out at 0.92×
and 0.86×. The single-kind read row is the one that moves between runs (0.74× to 1.31× across the runs taken while
writing this); the three rows beneath it, which run the identical code path, span 14 to 24 ns in the same run, which
is the noise floor on this machine for a 20 ns operation. A record read is one slot lookup, so `yield* FileSystem`
costs what `yield* Plain` costs and an operation call costs less than a method call on a yielded record. The two real
costs are provision-time: writing a thirty-member record is 1.7 µs into a fresh map and 3.7 µs into a context of
thirty-one slots (a flat copy, which `Effect.provide` already pays per layer), and assembling a record after a member
override is 3 µs, once per context. Thresholds for the implementation are under "Acceptance criteria".

## Hazards, and what the design does about each

- **Callables that are also Effects.** A `Context.Service` key is a function that is also an Effect. If the operation
  were an Effect too, `Effect.andThen(x, op)` would type as a call (the function overload is listed first) but run as
  an Effect (`isEffect` is checked first), returning the implementation instead of calling it. The operation is
  therefore a `Key` that is not a `Service`: it has the brand and the slot and no Effect behaviour. `isEffect(op)` is
  `false`; `isKey(op)` is `true`.
- **`isEffect`-dispatching duals.** `Effect.andThen` and `Effect.tap` dispatch on `isEffect(f)`; every `dual` with an
  `isEffect(args[0])` predicate (thirty-nine sites in `internal/effect.ts`, `Effect.ts`, `Console.ts`, `Runtime.ts`,
  `http/HttpServer.ts`, `internal/layer.ts` and `internal/executionPlan.ts`) decides data-first against data-last the
  same way. With `op` not an Effect, all of them see a function and the types agree with the runtime.
  `Effect.map(op, f)` is rejected at the type level:

  ```
  typetest/errors/not-an-effect.ts(5,34): error TS2345: Argument of type 'Operation<"effect/FileSystem/readFile", (path: string) => Effect<Uint8Array<ArrayBufferLike>, FileSystemError, never>>' is not assignable to parameter of type 'Effect<unknown, unknown, unknown>'.
  typetest/errors/not-an-effect.ts(8,24): error TS2488: Type 'Operation<"effect/FileSystem/readFile", (path: string) => Effect<Uint8Array<ArrayBufferLike>, FileSystemError, never>>' must have a '[Symbol.iterator]()' method that returns an iterator.
  typetest/errors/value-shape.ts(9,17): error TS2488: Type 'Operation<"effect/Terminal/columns", () => Effect<number, never, never>>' must have a '[Symbol.iterator]()' method that returns an iterator.
  ```

- **Stream-returning operations.** A call result is exactly one kind of value, decided by which constructor defined
  the operation, so the `isStream`/`isEffect` dispatch sites cannot misclassify it: the thirty-five
  `dual((args) => isStream(args[0]))` sites in `Stream.ts`, the streaming-response check in `HttpApiBuilder.ts`, the
  payload check in `HttpApiClient.ts`, `reactivity/Atom.ts` (which distinguishes functions, Effects and Streams),
  `http/Template.ts`, `cluster/Entity.ts` and the child-process spawners all see an Effect for an Effect operation and
  a Stream for a Stream operation. The kind test is pinned so this stays true.
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
- **A record stored, then shadowed.** `yield* FileSystem` returns the provided object, so an implementation written
  as a class instance keeps its identity and its `this`. Once a member is provided on top, the read is an assembled
  object whose member functions are copied, so such a class would have to bind the methods it reads non-member state
  through; `make(impl)` in `effect/FileSystem` builds a plain object and is unaffected. Within one context the
  assembled object is the same object on every read.
- **Override typing.** An override is the shape, so a wrong parameter type and an added requirement are both rejected:

  ```
  typetest/errors/wrong-override.ts(11,3): error TS2345: Argument of type '(path: number) => Effect.Effect<Uint8Array<ArrayBuffer>, never, never>' is not assignable to parameter of type '(path: string) => Effect<Uint8Array<ArrayBufferLike>, FileSystemError, never>'.
    Types of parameters 'path' and 'path' are incompatible.
      Type 'string' is not assignable to type 'number'.
  typetest/errors/wrong-override.ts(16,13): error TS2375: Type 'Effect<Uint8Array<ArrayBuffer>, never, { readonly value: number; }>' is not assignable to type 'Effect<Uint8Array<ArrayBufferLike>, FileSystemError, never>' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
    Type '{ readonly value: number; }' is not assignable to type 'never'.
  ```

- **An operation of no arguments called with one.** `Terminal.columns(80)` is `Expected 0 arguments, but got 1`.
- **A constructor called without a shape.** `Context.Operation("key")` is `Expected 0 arguments, but got 1`: the key
  goes to the second call.
- **Error text under `exactOptionalPropertyTypes`.** TypeScript appends "with 'exactOptionalPropertyTypes: true'.
  Consider adding 'undefined'…" to every `Effect` assignability error because `Effect` has optional `Unify` members.
  This is the same for every missing requirement in v4 today and is not specific to operations; the line that matters
  is the indented one naming the key.
- **String-keyed unsafe access.** `Context.getOrUndefinedUnsafe(ctx, "effect/FileSystem")` returns the record when it
  was provided whole and no member has been provided on top, and `undefined` otherwise; a member's string returns the
  member's slot. `addUnsafe` by string keeps the storage invariants, so code that reaches into contexts by string
  cannot leave a record disagreeing with its members.
- **A record written by string without its members.** Not possible: `addUnsafe(ctx, "effect/FileSystem", record)`
  spreads the record exactly as `add` does.

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

The record service declared with an identifier lacking a member, with the wrong shape, or with `unknown` as its
identifier, each pointing at the difference; a constructor given the key where the shape goes; the subset not
satisfying the full record; an operation of no arguments called with one; and a partial record given where the shape
is expected:

```
typetest/errors/wrong-self.ts(12,3): error TS2353: Object literal may only specify known properties, and 'readFile' does not exist in type '{ readonly "Self lacks the identifier of": "effect/FileSystem/writeFile"; }'.
typetest/errors/wrong-self.ts(19,45): error TS2353: Object literal may only specify known properties, and 'readFile' does not exist in type '{ readonly "Shape differs from the members' shape at": "writeFile"; }'.
typetest/errors/wrong-self.ts(21,97): error TS2353: Object literal may only specify known properties, and 'readFile' does not exist in type '{ readonly "Annotate the declaration: Context.Operations<Self, Shape>": unknown; }'.
typetest/errors/wrong-self.ts(23,42): error TS2554: Expected 0 arguments, but got 1.
typetest/errors/subset-not-full.ts(7,14): error TS2375: Type 'Layer<ReadOnly, never, never>' is not assignable to type 'Layer<FileSystem, never, never>' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Type 'FileSystem' is not assignable to type 'ReadOnly'.
    Type '"effect/FileSystem/access"' is not assignable to type 'ReadOnly'. Did you mean '"effect/FileSystem/exists"'?
typetest/errors/value-shape.ts(6,41): error TS2554: Expected 0 arguments, but got 1.
typetest/errors/partial-record.ts(6,67): error TS2345: Argument of type '{ readFile: () => Effect.Effect<Uint8Array<ArrayBuffer>, never, never>; }' is not assignable to parameter of type 'Shape'.
  Type '{ readFile: () => Effect.Effect<Uint8Array<ArrayBuffer>, never, never>; }' is missing the following properties from type 'Shape<{ access: Operation<"effect/FileSystem/access", …>; … }>': access, chmod, chown, copy, and 25 more.
```

The last diagnostic's first line names the interface (`'Shape'`); its elaboration names the base the interface
extends, members and all, because that is where TypeScript finds the missing properties. With the default
`noErrorTruncation: false` the elaboration is cut at 160 characters.

What compiles (from `typetest/ok/signatures.ts`, abridged):

```ts
const read: Effect<Uint8Array, FileSystemError, "effect/FileSystem/readFile"> = FileSystem.readFile("a.txt")
const scoped: Effect<string, FileSystemError, Scope | "effect/FileSystem/makeTempFileScoped"> = FileSystem.makeTempFileScoped()
const stream: Stream<Uint8Array, FileSystemError, "effect/FileSystem/stream"> = FileSystem.stream("a.txt")
const asKey: Context.Key<"effect/FileSystem/readFile", (path: string) => Effect<…>> = FileSystem.readFile // an operation is a key
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
const width: Effect<number, never, "effect/Terminal/columns"> = Terminal.columns()                 // an operation of no arguments
const columnsMember: Terminal.Shape["columns"] = () => Effect.succeed(80)                          // the same function in the record
const terminalRecord: Effect<Terminal.Shape, never, Terminal.Terminal> = Terminal.Terminal
const pathRecord: Effect<{ readonly sep: string; readonly join: …; readonly fromFileUrl: … }, never, Path> = Path // a mixed record
const platformIdentity: Platform = … as FileSystem.ReadOnly | Terminal.Terminal                     // a nested record
const Inferred = Context.Operations("test/Inferred", { readFile, exists })                          // no names declared
const inferredFromMembers: Layer<Context.Service.Identifier<typeof Inferred>> = Layer.mergeAll(nodeReadFile, nodeExists)
const Legacy: Context.Operations<Legacy | FileSystem.ReadOnly, FileSystem.ReadOnlyShape> = Context.Operations("test/Legacy", {…}) // a wider identity
const legacySatisfiesMember: Effect<Uint8Array, FileSystemError, never> = FileSystem.readFile("a").pipe(Effect.provide(legacyLayer))
const parsed: Effect<number, never, "test/parse"> = parse(Number, "42")                             // generic shape naming its key
const formattedDate: Effect<string, never, "test/format"> = format(new Date(), "en")                // overloaded shape naming its key
const greeting: Effect<string, never, "test/greet"> = greeter.greet("x")                            // shape with a `this` parameter
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
| contract as written, esbuild                                  |  95.2 kB | all 30 + record     |      1456 B |
| contract annotated `@__PURE__`, esbuild                       |  90.2 kB | readFile, writeFile |         0 B |
| contract published (`annotate-pure-calls`), esbuild           |  90.2 kB | readFile, writeFile |         0 B |
| contract as written, Rolldown                                 |  85.3 kB | all 30 + record     |      1564 B |
| contract annotated `@__PURE__`, Rolldown                      |  79.0 kB | readFile, writeFile |         0 B |
| contract as written, `effect` from source, esbuild            | 436.6 kB | all 30 + record     |    103.8 kB |
| contract annotated `@__PURE__`, `effect` from source, esbuild | 229.9 kB | readFile, writeFile |         0 B |

What the rows establish:

- **An unannotated contract costs 5 kB: the thirty keys, the record, and a 1.4 kB wrapper.** The wrapper is
  `Stream.Operation`, `streamCall` and the `Stream.unwrap` they close over, kept because the three Stream keys are
  kept; it is not the Stream runtime, which in a published `effect` is itself tree-shaken function by function (the
  one-Stream-operation root carries 3.8 kB of it). Nothing in the program's behaviour changes, so no rule is needed
  for shaking to work; annotations are an optimisation worth 5 kB.
- **Published contracts shake without user action.** `packages/effect`'s build runs `babel-plugin-annotate-pure-calls`
  over `dist`, which annotates the outer call of every top-level declaration, curried or not, and esbuild drops the
  whole expression; the third row equals the second. This is how every `Context.Service("…")` key in `effect` shakes
  today, and `effect/FileSystem`'s operations shake the same way with no annotation in the source.
- **Bundling `effect` from source is a different measurement.** The last two rows are the repository's own layout:
  `packages/effect/src/*.ts` has no annotations, so once a module is imported its whole body is kept, and importing
  anything from `Stream.ts` costs 104 kB. That is a property of unannotated module bodies, not of the design, and it
  is the same for any `Stream` import today. The bundle regression test in issue 2 bundles `effect` as published for
  this reason; the matrix keeps the two rows so the difference is on record.

### What the prototype shows

The prototype (`specs/tree-shakeable-services/`) models `effect/FileSystem` as 30 operations, three of them
Stream-returning and two needing `Scope`, plus `effect/Terminal` as six operations, five of no arguments, with one Node
implementation module each, and eight composition roots. `pnpm --filter tree-shakeable-services-spec bundle` builds
each with esbuild (and the annotation matrix with Rolldown too), with `effect` bundled as published, and reports which
implementation modules and how many bytes of `Stream.ts`, `Channel.ts`, `Sink.ts` and their internals each contains,
by metafile and by a per-implementation marker string:

```
Bundle sizes (esm, unminified; effect as published unless noted)

  main.ts (two operation layers)                                               95.2 kB
  main-namespace.ts (two layers off a namespace)                               95.2 kB
  main-readonly.ts (ReadOnly subset, three member layers)                      95.7 kB
  main-stream.ts (one Stream operation)                                       101.0 kB
  main-twenty.ts (twenty operation layers)                                    101.3 kB
  main-record.ts (yield* FileSystem, record layer)                            107.9 kB
  main-full.ts (two operations, record layer)                                 107.9 kB
  main-terminal.ts (two terminal layers)                                       90.4 kB

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

  node dist/main.js <file>: backed up 6 bytes of <file>
  node dist/main-stream.js <file>: <file> has 6 bytes
  node dist/main-readonly.js <file>: <file> is 6 bytes
  node dist/main-terminal.js <file>: displayed at 80 columns

OK: every bundle contains exactly the implementations its program uses, Effect-only roots carry at most a retained wrapper of the Stream runtime, and the shaken bundles run
```

The check fails if an unused implementation appears in any bundle, a used one is missing, or a root's Stream bytes
fall outside its band (none, the wrapper, or in use). It then runs four of the bundles against a temporary file.

Three readings of the numbers. The two-operation root and the twenty-operation root differ by 6 kB: the
implementations themselves are small, and the 28 to 31 `effect` modules they share are the Effect/Layer/Context core
that any program carries. The record roots cost 12.7 kB more than the two-operation root: twenty-eight more
implementations with their `node:fs` bindings, and 3 kB of Stream code for the three that return Streams. And the
contract module costs the program 5 kB at most, with the bundler left to its own devices, and nothing once the contract
is published.

## Migrating an existing record service: `effect/FileSystem`

`effect/FileSystem` today exports `interface FileSystem` (the record shape, 32 members, with a `[TypeId]` brand),
`const FileSystem: Context.Service<FileSystem, FileSystem>`, `make(impl)` (which derives `exists`, `glob`,
`readFileString`, `stream`, `sink` and `writeFileString` from the primitives), `makeNoop`/`layerNoop`, and the
`WatchBackend` service. Providers: `NodeFileSystem.layer` and `DenoFileSystem.layer`, each `Layer.effect(FileSystem,
Effect.map(serviceOption(WatchBackend), (backend) => make({...}))`, plus `layerNoop` in tests and docs. Consumers: 57
`yield* FileSystem` sites across `effect` (http, cli, persistence, logger, config, schema), and user code. The module
is `@stability unstable`.

The migration has four phases. Each is a PR that is mergeable and verifiable on its own, and nothing in a later phase
is needed for an earlier one to work. Phase 0 is implemented on this branch, as a dry run of the claim that it breaks
nothing.

### Phase 0: operations arrive under the existing identity

In `packages/effect/src/FileSystem.ts`, implemented here:

- One operation per member of the interface, exported under the member's name, with the interface as its brand:
  `export const readFile = Context.Operation<(path: string) => Effect<…>, FileSystem>()("effect/FileSystem/readFile")`.
  Its requirement is `"effect/FileSystem/readFile" & FileSystem`. `stream` and `watch` use `Stream.Operation`; `sink`
  uses `Sink.Operation`; `open`, `makeTempDirectoryScoped` and `makeTempFileScoped` keep `Scope` in their shapes.
- `export const FileSystem: Context.Operations<FileSystem, FileSystem> = Context.Operations("effect/FileSystem", members)`
  replaces `Context.Service("effect/FileSystem")`. The identity is still the interface; the constructor accepts it
  because it contains every member's branded identifier.
- `export type Shape = FileSystem`: the name that phase 1 makes the record type, available now so that value-type
  uses of `FileSystem.FileSystem` can move ahead of time.
- The `[TypeId]` brand goes from the interface, from `make` and from `makeNoop`. Nothing read it, and a record of
  member slots cannot carry it.
- `make`, `makeNoop` and `layerNoop` keep their signatures. `Stream` and `Sink` were already value imports.

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
not change a line. At run time a provided file system occupies 33 slots (32 members and the record), which shows in
`ctx.mapUnsafe.size` and in `Context.omit(FileSystem)`; nothing else is observable.

**Compile cost.** `tsc --extendedDiagnostics` (TypeScript 5.9, `packages/effect`, `--noEmit`) before and after phase 0:

| Metric         |    before |     after |                                        change |
| -------------- | --------: | --------: | --------------------------------------------: |
| Types          |   624,997 |   626,542 |                                       +0.25 % |
| Instantiations | 2,259,979 | 2,266,448 |                                       +0.29 % |
| Check time     |    20.6 s |    22.7 s | within run-to-run noise on the shared machine |

**Changeset** (`.changeset/filesystem-operations.md`, `"effect": minor`): "`effect/FileSystem` exports one operation
per member (`FileSystem.readFile(path)`, `Effect.provideService(FileSystem.readFile, fake)`), all satisfied by any
`Layer<FileSystem>`, and `FileSystem.Shape` as the name of the record type. Write `FileSystem.Shape` where you use
`FileSystem.FileSystem` as the type of an implementation; the next minor makes `FileSystem.FileSystem` the identity of
the whole service. The `[TypeId]` brand is gone from the interface; nothing read it." Issue 3 ships a codemod in
`scripts/codemods` beside it, rewriting `FileSystem.FileSystem` outside requirement positions (`Effect<_, _, _>`,
`Layer<_>`, `yield*`, and the first argument of `Layer.succeed`/`Layer.effect`/`Layer.mock`/`Effect.provideService`)
to `FileSystem.Shape`. The sites it would rewrite in the repository, found by grep, are 46 in 9 files
(`DenoFileSystem.ts` 24, `NodeFileSystem.ts` 11, `internal/glob.ts` 1, `tools/graphql-generator` 5, `tools/docgen` 3,
two tests), all mechanical; none of them needs to change in phase 0, which is why none did on this branch.

### Phase 1: the identity becomes the union

- Each operation drops its brand: `Context.Operation<(path: string) => Effect<…>>()("effect/FileSystem/readFile")`.
- `export type FileSystem = Context.Operations.Identifier<typeof members>` replaces the interface as the identity;
  `export interface Shape extends Context.Operations.Shape<typeof members> {}` replaces the `Shape` alias;
  `export const FileSystem: Context.Operations<FileSystem, Shape>`.
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

**Semver.** `FileSystem` is `@stability unstable`, and the repository's policy (README, "Stability") is that unstable
APIs may change in minor releases. Phase 1 ships in a minor under that policy, as a breaking change declared as one,
one release after phase 0 gave every user the name to move to and the codemod to move with. A deprecation window in
which `FileSystem.FileSystem` is still usable as the record type is not possible: one name cannot denote both the
identity and the shape, and keeping the interface as the identity is the "record's identity as the record interface"
alternative rejected below, under which per-operation layers can never satisfy the record.

**Changeset** (`"effect": minor`): "**Breaking** (`@stability unstable`): `FileSystem.FileSystem` the _type_ is now
the identity of the whole service (the union of its 32 operation keys), not the record of implementations. Code that
used it as a value type uses `FileSystem.Shape` (available since the previous release; `pnpm codemod
filesystem-shape` rewrites it). Requirements, layers and `yield*` are unchanged. A merge of per-operation layers now
satisfies `Layer<FileSystem.FileSystem>`."

### Phase 2: per-operation implementation modules

In `packages/platform/node-shared` (and `deno`, then `bun` through its re-export): one module per primitive operation,
`src/NodeFileSystem/<op>.ts`, each exporting `Layer.succeed(FileSystem.<op>, impl)` built from the function
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

### Phase 0

An operation is a function, so the five Effect members become functions of no arguments in the record shape:
`columns: () => Effect<number>`. That is a change to the shape, and so to `NodeTerminal.make`, `Terminal.make({...})`
in tests and the ten `yield* terminal.columns` sites in `cli/Prompt.ts` (`yield* terminal.columns()`), all in the
repository, all mechanical. `Terminal` therefore has no step that is both non-breaking and adds operations; its phase
0 is the shape change alone, with `Shape` exported as an alias of the interface and the codemod for the three
value-type uses (`terminal: Terminal.Terminal`, `Terminal.Terminal["readInput"]`, all in `cli/Prompt.ts`), under the
same unstable-minor policy. The alternative, keeping `columns: Effect<number>` as a plain `Context.Service` member, is
rejected because its standalone read is `yield* yield* Terminal.columns`.

### Phase 1

```ts
export const columns = Context.Operation<() => Effect.Effect<number>>()("effect/Terminal/columns")
export const rows = Context.Operation<() => Effect.Effect<number>>()("effect/Terminal/rows")
export const size = Context.Operation<() => Effect.Effect<Queue.Dequeue<Size, Cause.Done>, never, Scope.Scope>>()(
  "effect/Terminal/size"
)
export const readInput = Context.Operation<
  () => Effect.Effect<Queue.Dequeue<UserInput, Cause.Done>, never, Scope.Scope>
>()("effect/Terminal/readInput")
export const readLine = Context.Operation<() => Effect.Effect<string, QuitError>>()("effect/Terminal/readLine")
export const display = Context.Operation<(text: string) => Effect.Effect<void, PlatformError>>()(
  "effect/Terminal/display"
)

const members = { columns, rows, size, readInput, readLine, display }
export type Terminal = Context.Operations.Identifier<typeof members>
export interface Shape extends Context.Operations.Shape<typeof members> {}
export const Terminal: Context.Operations<Terminal, Shape> = Context.Operations("effect/Terminal", members)
export const make = (impl: Shape): Shape => impl
```

A consumer writes `yield* Terminal.columns()` where it wrote `const terminal = yield* Terminal; yield* terminal.columns`,
and `yield* Terminal.display(text)` where it wrote `yield* terminal.display(text)`. The identity changes exactly as
`FileSystem`'s does in its phase 1.

### Phase 2

`NodeTerminal` becomes one module per member. `columns`, `rows` and `display` are one-liners over `process.stdout`.
`readInput`, `readLine` and `size` share the `stdin`/`readline` setup that `make(shouldQuit)` does once today; that
setup becomes an internal scoped service, `NodeTerminal/Input` (a `Context.Service` whose layer owns the `readline`
interface and the keypress listener), and each of the three members is `Layer.effect(Terminal.readInput,
Effect.map(Input, …))` provided with it. A root that only displays never imports `Input`, so neither `readline` nor
the key-event parser is in its bundle, which is what `main-terminal.ts` measures (90.4 kB, two of six members).
`NodeTerminal.layer` is the merge, annotated `Layer<Terminal>`, with `Input` provided inside; `NodeTerminal.make(shouldQuit)`
keeps its signature as the aggregate builder.

### Phase 3

The ten `Prompt.ts` sites read `columns`, `readInput` and `display`; the prompt runner takes `Terminal.Shape` by
parameter in three places and keeps doing so. Each prompt's requirement becomes `"effect/Terminal/columns" |
"effect/Terminal/readInput" | "effect/Terminal/display"`, or `Terminal.Interactive`, a subset record over those three
exported from `effect/Terminal`, so a CLI that never prompts carries no reader.

### And `effect/Path`

`Path` has fifteen members: thirteen synchronous functions and a string, plus `fromFileUrl` and `toFileUrl`, which
return Effects. It can be a record service (`sep` and `join` as `Context.Service<string>("effect/Path/sep")` and
`Context.Service<(...parts: ReadonlyArray<string>) => string>("effect/Path/join")`, the two URL conversions as
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

### The previous rounds of this design

The first round had the operation primitive but a call result that was both an Effect and a Stream, and a record form
joined to the operations by hand-written bridges. The second round fixed the result kind at the definition
(`Stream.Operation`) and made the record a key with spread storage (`Context.Operations`), so the two forms share one
store. The third round let any key be a member, took the record's identifier and shape from the declaration so that
diagnostics print names, measured costs, and wrote the migrations. Those decisions stand. The third round also left
five things this round changes:

- **Record reads assembled a new object from thirty slots on every new context**, at three to six times the cost of
  a plain record service, and the object was not the one provided. The record is now stored beside its slots, a read
  is one lookup returning the provided object, and a member written on top marks the record so the read assembles,
  once per context; a record provided as member layers is assembled once per base and shared by every context
  derived from it.
- **The record branch sat in eight `Context` paths**, as an `isOperations` check per call, and the benchmark could
  not show parity. Each key now knows how to write itself and what to do when its slot is not current, so the
  ordinary paths are one lookup and one property read, as before, and the benchmark runs tight loops with both
  modules under the same mix of key kinds.
- **Shaking of a source-bundled contract depended on `/* @__PURE__ */` at every declaration**, or a kept Stream key
  dragged in the Stream runtime. Measured with `effect` bundled as published, a kept key costs bytes and the kept
  Stream keys cost a 1.4 kB wrapper; the lint rule is gone and the matrix has an unannotated row.
- **An operation was provided through `op.service`, a value member was `columns()` standalone and `columns` in the
  record, and one constructor served both shapes through an `isEffect` dispatch.** An operation is now a key, so it
  is provided as itself; a member that is an Effect is a function of no arguments in both places; and the constructor
  applies the implementation, nothing else.
- **The key was written twice per operation, four constructors had two call forms each, and phase 1 of the migration
  had no non-breaking step before it.** Each constructor has one form and the key is written once; a record is one
  line, with two optional declarations for names; and phase 0 ships the operations under the existing identity, with
  `Shape` and the codemod, implemented on this branch.

### Alternatives rejected within this design

- **The operation is a `Service`** (one object that is callable and an Effect). Best possible ergonomics for providing
  and the first hazard above: every `Effect | function` acceptance site in the library and in user code would type
  one way and run the other. Rejected.
- **The operation carries its key on a property** (`op.service`, round 3). Keeps `Context.Key` an Effect at the cost
  of a second rule for providing ("a record as itself, an operation through `.service`") and a dotted property at
  every provision site. Rejected in favour of making `Key` the brand and `Service` the Effect, which costs one
  internal type change and gives one rule.
- **Value-shaped operations** (`Context.Operation<Effect<number>>`, called as `columns()`, round 3). One constructor
  for two runtime shapes needs an `isEffect` dispatch on the implementation, and the member reads `columns()`
  standalone and `columns` in the record. Rejected in favour of writing such members as functions of no arguments,
  which costs the five `Terminal` members a shape change and nothing else in the repository.
- **A flat call form taking the key from the declaration** (`const readFile: Context.Operation<"…", Shape> =
  Context.Operation("…")`, round 3). It let Rolldown drop unused keys from a `@__NO_SIDE_EFFECTS__` annotation on the
  constructor, and it wrote the key twice. With kept keys costing bytes, the saving does not pay for the second form.
  Rejected.
- **Storing the record only under its own key, with members reading through it** (lookup through the record with a
  fallback). Would let `Layer.succeed(FileSystem, record)` write one slot, but reintroduces the precedence bug of
  slices, and a member read would walk every record spanning it. Rejected; one slot per member keeps one rule.
- **Detecting a shadowed record by walking the overlays against a set of member keys** instead of marking it at write
  time. Correct, but it puts a set lookup per overlay into every record read and needs a `Set` per record; the marker
  is one overlay per spanning record at the time of the member write, and the read stays one lookup. Rejected.
- **Writing a record as one overlay node** instead of a fresh flat map. It would make `Context.add` of a record O(1),
  but every slot read would then have to look inside record nodes, which is a branch in `lookup` for every key, or
  every member key would need a read of its own. `Effect.provide` already copies the flat map per layer, so the copy
  on a record `add` (3.7 µs for thirty-one slots) costs what providing a layer costs. Rejected.
- **Inferring the record's identity and shape instead of taking `Self` and `Shape` from the declaration.** Works, and
  is the one-line form, but the inferred union prints as `Identifier<{ thirty operation types }>` and the inferred
  shape as `Shape<{ … }>` in every diagnostic that involves the key. Both forms are kept; the declared one is
  recommended for library contracts.
- **A defaulted variant** (`Operation<Shape>()(key, { defaultValue })` backed by `Reference`). One extra overload,
  zero runtime cost, and it brings back all three reasons overridable was set aside. Rejected; `Context.Reference` and
  `yield*` remain for genuinely defaulted values, and a `Reference` may be a record member.
- **The record's identity as a prefix type** (`` `effect/FileSystem/${string}` ``). Prints short and needs no alias,
  but a merge of the thirty operation layers cannot be shown to cover it, so the per-operation form could never
  satisfy a whole-record requirement without a cast or a helper. The union identity has that property for free.
  Rejected.
- **The record's identity as the record interface, with operations as branded subtypes**
  (`"effect/FileSystem/readFile" & FileSystem`) as the final design. Keeps today's type names with no rename, but
  member layers can never satisfy the record. Kept for exactly one release, as phase 0 of a migration, where that is
  the desired property; rejected as the destination.
- **Derived call signatures only**, with `Effect.service(op)` as the escape hatch for generics. Fully general, but it
  moves the special case to every call site of every generic operation. Naming the key in the shape keeps it at the
  single declaration, and the derivability check makes forgetting impossible. Rejected.
- **Class-style operations** (`class ReadFile extends Context.Operation<…>()("…") {}`). A class cannot be called
  without `new`. Rejected.
- **An identifier type parameter for operations** (`Operation<Self, Shape>`). Two operations with the same shape
  would alias in `R` unless each carried a brand; the key string is already unique and already nominal, and it prints
  better in errors. Rejected; the optional `Brand` argument covers the migration case without making it the rule.

## Scope

In scope: `Context.Operation`, `Context.Operations` and their types, `Stream.Operation`, `Sink.Operation`,
`isOperation`, `isOperations`, the `Key`/`Service` split and the two implementation fixes it entails, the record
storage in `Context`, tests, JSDoc, benchmarks, a bundle regression test, changesets, the four-phase migration of
`effect/FileSystem` with its Node and Deno providers (phase 0 on this branch), and the migration of `effect/Terminal`
with `NodeTerminal`. Out of scope: bundler plugins, migrating other record services (each follows one of the two
recipes and is its own issue; `Path` is not worth one), and the ai-docs example (tracked separately, since the
equivalent example was removed from PR #10369 pending a decision on ai-docs).

## Implementation plan

Nine issues. The first two are the primitive and its guards; each later one is mergeable and verifiable on its own.

1. **`Context.Operation`, `Context.Operations`, `Stream.Operation` and `Sink.Operation`.** The code on this branch in
   `packages/effect/src/Context.ts`, `Stream.ts`, `Sink.ts`, `Layer.ts`, `internal/effect.ts` and
   `cli/internal/command.ts`, moved from spec quality to release quality: runtime tests in
   `packages/effect/test/Context.test.ts`, type tests in `packages/effect/typetest/Context.tst.ts`, JSDoc (in place
   and passing `pnpm jsdocs --check` and `pnpm doctest`), a benchmark under `packages/effect/benchmark/Context.ts`
   with the cases above, changeset `effect: minor` with `@stability unstable` for the additions and a note on the
   `Context.Key` supertype change. Acceptance criteria and test plan below, including the cost thresholds.
2. **Bundle regression test.** An esbuild test in `packages/effect/test` following `test/ai/McpServer/Workerd.test.ts`,
   bundling `effect` as published (the `annotate-pure-calls` transform from `scripts/check-bundle.ts` in an `onLoad`
   plugin) and a fixture like the prototype's `main.ts`, asserting the unused implementation markers are absent, the
   used ones present, and the bytes from `Stream.ts`, `Channel.ts`, `Sink.ts` and their internals under 2 kB.
3. **`effect/FileSystem` phase 0.** The change on this branch to `packages/effect/src/FileSystem.ts`, with the
   codemod in `scripts/codemods/filesystem-shape.ts`, the changeset above, and tests that an operation call runs under
   `NodeFileSystem.layer` and `layerNoop`, that `Effect.provideService(FileSystem.readFile, fake)` overrides one
   member of each, and that `yield* FileSystem` returns the provided object. Verified by every existing suite passing
   unchanged.
4. **`effect/FileSystem` phase 1.** The identity flip, the five listed changes, the changeset, and the repository's
   46 value-type sites rewritten by the codemod. Verified by the FileSystem, Node and Deno suites passing unchanged,
   plus a type test that the merge of 32 member layers is a `Layer<FileSystem>`.
5. **`effect/FileSystem` phase 2, Node.** Per-operation modules under `NodeFileSystem/`, derived-operation layers in
   `effect/FileSystem`, the aggregate rebuilt as the merge. Verified by the bundle test from issue 2 run against a
   fixture that provides `NodeFileSystem.readFile` and `NodeFileSystem.writeFile`.
6. **`effect/FileSystem` phase 2, Deno and Bun.** The same layout for `DenoFileSystem`; Bun re-exports Node's.
7. **`effect/FileSystem` phase 3.** `FileSystem.ReadOnly`, and the `yield* FileSystem` sites inside `effect` that use
   few members moved to operation calls or a subset annotation, one commit per module, with the module's tests
   unchanged. Verified by a bundle fixture using `HttpServerResponse.file` with member layers only.
8. **`effect/Terminal` phases 0 to 2.** The shape change with `Terminal.Shape` and the codemod, then the contract as
   above, then `NodeTerminal` as one module per member over an internal `Input` service with `NodeTerminal.layer` as
   the merge. Verified by the existing Terminal and cli test suites, and a bundle fixture that displays without
   reading.
9. **`effect/Terminal` phase 3.** `Terminal.Interactive` and the `cli/Prompt.ts` sites.

The ai-docs example `ai-docs/src/01_effect/03_services/30_operations.ts` (a contract, one implementation per module, a
root importing two, a test overriding one) is opened only once ai-docs are wanted again.

## Test plan

Runtime tests (`packages/effect/test/Context.test.ts`, `describe("Operation")`, `describe("Operations")` and
`describe("Sink.Operation")`), each mirrored in the prototype's `test/Operation.test.ts`, which passes (36 tests):

1. An operation is a function named after its key, a key (`isKey`, `isOperation` true; `key` is the string), and not
   an Effect (`Effect.isEffect` false); `Function.prototype` is in its chain.
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
12. An operation of no arguments runs the function provided for it, standalone and through the record, and the record
    member is that function.
13. A record service is a key with `isOperations` true, `Effect.isEffect` true and `members` attached.
14. `Layer.succeed(record, value)` provides every member: the per-operation program and the `yield*` program both run
    under it.
15. `yield* record` returns the provided object, through a layer, through `provideService`, through `Context.get`, and
    after unrelated additions deep enough to flatten the overlays; `getOrUndefinedUnsafe` by the record's string
    returns it too.
16. `yield* record` assembles the record under per-operation layers; with one member unprovided it dies naming the
    member's key.
17. An operation override on top of a record wins for that member, both directly and through the record view, which
    is assembled with the override and the other members unchanged; the other order has the record win and the record
    read return the provided object.
18. `Layer.mock(record, partial)` runs the provided member and dies as unimplemented on the others.
19. `Effect.provideService(record, value)`, `Effect.updateService(record, f)`, `Context.make`, `get`, `getOption`,
    `pick` and `omit` behave as in "Existing APIs this touches"; `Context.get` on a missing member throws naming it;
    omitting a member drops the record's own slot.
20. A record is stored under its own key and its members' keys.
21. A flattened context, a `merge` and a `mergeAll` drop a record that disagrees with its slots, and keep one that
    agrees; a record on the right of a `merge` replaces a member on the left.
22. A record with a plain value, a synchronous function and an operation as members provides all three, assembles
    from member layers, and an override of one member wins on top of the record.
23. A reference member reads its default when its slot is empty and the provided value otherwise.
24. A record that is a member of a record is stored with its own slot and its members', read back as the provided
    object, shadowed by a member written deeper down, and replaced by a nested record written on top; `omit` of the
    outer record removes them all.
25. A subset record is satisfied by the full record and by its member layers at run time, provides its members, writes
    its members' slots and its own, and shadows the full record slot by slot in both orders.
26. An assembled record is shared across contexts derived from one base, and rebuilt with the replacement once a
    member changes.
27. `addUnsafe` by a record's string spreads the record, and by a member's string marks the records spanning it;
    `getOrUndefinedUnsafe` by the record's string returns the record only while it is current.
28. A key built structurally (`{ key } as Context.Service<…>`) is made, read, added, picked and omitted as one slot.

Type tests (`packages/effect/typetest/Context.tst.ts`):

1. A call has the shape's parameters and the shape's result with the key added to `R`; `Scope` in the shape stays in
   `R`; a Stream shape returns a Stream; a Sink shape returns a Sink; a shape of no arguments takes none.
2. An operation is assignable to `Context.Key<Id, Shape>`; `key` is its literal; `Service.Identifier` and
   `Service.Shape` extract its parts; providing it removes exactly the key; `Layer.succeed(op, impl)` is `Layer<Id>`;
   `Effect.service(op)` is `Effect<Shape, never, Id>`.
3. An override with a wrong parameter type and an override that adds a requirement are rejected.
4. A shape returning a plain value, a non-function, an Effect value, and a Stream shape given to `Context.Operation`,
   are rejected.
5. `op` is not assignable to `Effect`; `yield* op` is rejected; `Context.Operation("key")` is rejected.
6. A generic shape naming its key keeps its type parameter; an overloaded shape naming its key keeps both overloads;
   a generic shape whose parameter is only in its parameters is derived; a generic or overloaded shape not naming its
   key, and a shape with properties, are rejected at the definition with the documented messages.
7. A `this` parameter in the shape is part of the call signature.
8. The record's identity is the union of its members' identifiers, keys and service identifiers alike; a program
   using two operations is assignable to an `Effect` annotated with it; `Layer<Record>` satisfies a member; a member
   layer does not satisfy the record; the merge of every member layer is a `Layer<Record>` and a merge of some is
   rejected naming the missing keys; an identifier lacking a member, a wrong shape and an `unknown` identifier are
   rejected naming the difference; a partial record given to `Layer.succeed` is rejected against `Shape`.
9. The one-line form infers the identifier and shape; a declared identifier wider than the union is accepted, its
   layer satisfies every member and the old requirement, and member layers do not satisfy it.
10. Subset facts 1 to 6 under "Subset records".
11. A nested record's identity is the union of its members' identities.
12. Displayed-type tests pin `Operation<"…", (path: string) => Effect<…>>`, `Effect<…, "…">`, `Stream<…, "…">`,
    `Layer<Record, never, never>`, `Type 'Record' is not assignable to type 'never'` and
    `is not assignable to parameter of type 'Shape'`.
13. A branded operation (`Context.Operation<Shape, FileSystem>()`) is satisfied by `Layer<FileSystem>`, is not
    satisfied by another branded operation's layer, and does not satisfy `FileSystem`.

Doctests: the JSDoc examples for `Context.Operation`, `Context.Operations`, `Stream.Operation`, `Sink.Operation` and the
`FileSystem` operations run under `pnpm doctest` (they do on this branch: 284 doctests across the four modules).

Benchmarks (`packages/effect/benchmark/Context.ts`, the cases in "Cost"): run in CI for the numbers, with the
thresholds in the acceptance criteria checked by a test that runs the ratios with a generous bound.

Bundle test (issue 2): fixture root bundled with esbuild over `effect` as published; assert each unused
implementation marker is absent, each used one present, Stream bytes under 2 kB, and that the bundle runs.

## Acceptance criteria

- [ ] `Context.Operation`, `Context.Operation<Id, Shape>` with the `Operation` namespace types, `Context.OperationTypeId`,
      `Context.isOperation`, `Context.Operations`, `Context.Operations<Identifier, Shape>` with the `Operations`
      namespace types, `Context.OperationsTypeId` and `Context.isOperations` are exported from `effect/Context`,
      `Stream.Operation` (constructor and type) from `effect/Stream` and `Sink.Operation` (constructor and type) from
      `effect/Sink`, with the signatures in "API".
- [ ] `Context.Key` is the brand shared by every key and `Context.Service` is the key that is an Effect; `Effect.service`
      and `Layer.updateService` read through the context; every existing key behaves as before; a key built
      structurally with `key` alone works with one-slot semantics.
- [ ] Each constructor has one call form, the shape as the type argument and the key as the one value argument, with an
      optional `Brand` intersected into the identifier.
- [ ] An operation is a function (`isEffect` false) and a key (`isKey` true) whose `name` and `key` are its key string,
      carrying `OperationTypeId`, with `Function.prototype` in its chain.
- [ ] A call to an Effect operation is an Effect and not a Stream; a call to a Stream (Sink) operation is a Stream
      (Sink) and not an Effect; `Context.ts` has no run-time import of `Stream`, `Sink` or `Channel`.
- [ ] The implementation is looked up from the running fiber's context each time the call result runs, with the call's
      receiver and arguments forwarded.
- [ ] `Operation.KeyFor` accepts a shape that names its key or is derivable, and rejects generic and overloaded shapes
      that do not name their key and shapes with properties, with the messages in "Generic, overloaded and
      property-bearing shapes"; the constraint rejects synchronous functions, plain values, Effect values and, for
      `Context.Operation`, Stream shapes.
- [ ] A record service is a `Context.Service` whose members are keys and whose identity is the union of its members'
      identifiers or a declared superset of it; it is stored under its own key and its members' keys; reading it
      returns the provided record when current and an assembled one otherwise, per "Record storage"; `Context.make`,
      `add`, `addUnsafe`, `get`, `getOption`, `getOrElse`, `getOrUndefined`, `getOrUndefinedUnsafe`, `pick`, `omit`,
      `merge` and `mergeAll` keep the invariant that a stored record agrees with its slots, including for nested
      records and reference members; and no other `Context`, `Layer` or `Effect` export changes behaviour.
- [ ] `Validate` rejects an identifier lacking a member, a wrong shape and an `unknown` identifier with the three
      documented messages, each naming the difference and none printing the members.
- [ ] The merge of every member layer is assignable to `Layer<Record>`; a subset record satisfies the six facts under
      "Subset records"; `Layer.mock` on a record service dies only on the members it lacks.
- [ ] Cost, by the benchmark, medians over 11 rounds as ratios within one run: mixed-kind `getUnsafe` and `add` within
      10% of the branch point (measured 0.92 and 0.86); a record read with the record provided whole within 1.2× an
      ordinary key read, from the same context and from a context rebuilt per request (0.97 and 1.12); `yield*` of a
      record service within 1.1× `yield*` of a plain record service (1.05); an operation call no slower than a method
      call on a yielded plain record (0.74); a thirty-member record written into a thirty-one slot context under 10 µs
      (4.7 µs) and assembled after a member override under 10 µs (4.4 µs) on the CI runner.
- [ ] The runtime tests, type tests, doctests and bundle test in "Test plan" pass; `pnpm check`, `pnpm lint`,
      `pnpm jsdocs --check` and `pnpm circular` are clean.
- [ ] JSDoc on every new export follows the repository conventions, with "Required, not defaulted", the shape rule
      and "a member that is an Effect is a function of no arguments" under **Gotchas**, and `@stability unstable`.
- [ ] Changeset `effect: minor`, naming the `Context.Key` supertype change.
- [ ] PR against `v4/next-minor`.
