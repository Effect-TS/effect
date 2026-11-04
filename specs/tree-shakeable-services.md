# Tree-shakeable services

A program that calls two operations of a fifty-operation service should bundle those two implementations and nothing
else, and a test should still be able to replace one operation. This spec adds one primitive to `effect/Context` to
make that true, defines it precisely enough to implement, and ships a prototype under `specs/tree-shakeable-services/`
whose esbuild check shows the unused implementations are absent from the bundle.

## Summary

An **operation** is a service whose shape is a function. `Context.Operation` creates one: a callable that looks its
implementation up from the context of the fiber that runs the call, plus the `Context.Service` the implementation is
stored under.

```ts
// contract module: keys only, no implementations
export const readFile = Context.Operation<(path: string) => Effect.Effect<Uint8Array, PlatformError>>()(
  "effect/FileSystem/readFile"
)

// a program calls it like a function; the key lands in R
const bytes = yield* FileSystem.readFile("/etc/hosts")
//    Effect<Uint8Array, PlatformError, "effect/FileSystem/readFile">

// an implementation module provides it like any service
export const readFile = Layer.succeed(FileSystem.readFile.service, (path) => Effect.tryPromise(...))

// a test replaces one operation like any service
program.pipe(Effect.provideService(FileSystem.readFile.service, () => Effect.succeed(bytes)))
```

Nothing else is new. Providing, overriding, merging and yielding go through `Context`, `Layer` and `Effect` as they
are today, because `.service` is an ordinary `Context.Service`. The implementation of an operation nobody calls is
never imported, so the bundler drops it. A missing implementation is a compile error naming the key.

The prototype's esbuild check on a 30-operation file system contract, with a program that calls two operations:

```
  main.ts (two operation layers)                226.2 kB
  main-full.ts (aggregate layer)                441.5 kB

  main.ts contains 2 of 30 implementations: readFile, writeFile
  main-full.ts contains 30 of 30 implementations
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
own and make the program reference only the bindings it uses. The question is what the program references.

## The design

### One concept: an operation is a service whose shape is a function

A `Context.Service` key has a string identity and a shape. Today the shape is usually a record. An operation is the
same key with a function for a shape, plus the one thing a function-shaped service needs to read well: you can call it.

| Form      | Key                                        | Shape                   | Use                               | Provide                               |
| --------- | ------------------------------------------ | ----------------------- | --------------------------------- | ------------------------------------- |
| record    | `Context.Service<FileSystem>("...")`       | `{ readFile, stat, … }` | `(yield* FileSystem).readFile(p)` | `Layer.succeed(FileSystem, record)`   |
| operation | `Context.Operation<Shape>()("…/readFile")` | `(path) => Effect<…>`   | `yield* readFile(p)`              | `Layer.succeed(readFile.service, fn)` |

Both rows are keys in a `Context`. The difference is the granularity at which you provide and override. A call
`readFile(p)` means exactly `readFile.service.use((f) => f(p))`; it is sugar over the key, not a second mechanism.

### Defining operations

A contract module exports one operation per export and holds no implementations:

```ts
// FileSystem.ts
import * as Context from "effect/Context"

export const readFile = Context.Operation<(path: string) => Effect.Effect<Uint8Array, PlatformError>>()(
  "effect/FileSystem/readFile"
)
export const writeFile = Context.Operation<
  (path: string, data: Uint8Array, options?: { readonly mode?: number }) => Effect.Effect<void, PlatformError>
>()("effect/FileSystem/writeFile")
export const stream = Context.Operation<(path: string) => Stream.Stream<Uint8Array, PlatformError>>()(
  "effect/FileSystem/stream"
)
// … 27 more
```

The key string is the identity of the operation at both levels: it is the slot the implementation is stored under at
run time, and it is the type that appears in `R` while the operation is unprovided. The convention is
`<package>/<Service>/<operation>`. Two operations with the same key are the same operation, in the types and at run
time, which is the same rule `Context.Service` has today.

From the consumer's side the module is the service: `import * as FileSystem from "./FileSystem.ts"` and then
`FileSystem.readFile(path)`. Member access on a namespace import is the one object-property pattern bundlers do shake,
so the "record" the program sees is the module, and it costs only the members read.

### Using operations

```ts
export const backup = (path: string) =>
  Effect.gen(function*() {
    const bytes = yield* FileSystem.readFile(path)
    yield* FileSystem.writeFile(`${path}.bak`, bytes)
    return bytes.length
  })
// Effect<number, FileSystemError, "effect/FileSystem/readFile" | "effect/FileSystem/writeFile">
```

A call has the shape's parameters and the shape's result with the operation's key added to its requirements. A
Stream-returning operation returns a Stream. An operation whose shape requires `Scope` keeps `Scope` in `R`. Because an
operation is a function and not an Effect, `Effect.andThen(getPath, FileSystem.readFile)`,
`Effect.tap(_, FileSystem.readFile)` and `Effect.flatMap(_, FileSystem.readFile)` all call it.

To get the implementation itself, yield the service: `const read = yield* FileSystem.readFile.service`. This is how a
generic operation is called with full fidelity if its shape did not name its key (see "Generic and overloaded
operations"), and how a record is assembled from operations.

### Providing operations

An implementation module provides one operation with the existing layer constructors:

```ts
// node/readFile.ts
export const readFile = Layer.succeed(
  FileSystem.readFile.service,
  (path) => Effect.tryPromise({ try: () => fs.readFile(path), catch: toPlatformError })
)

// node/makeTempDirectoryScoped.ts: an implementation that needs state uses Layer.effect and sibling services
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

If `writeFile` is missing, the `runPromise` call does not compile and the error names
`"effect/FileSystem/writeFile"`. The types tell the root what to import; no layout rule has to be remembered.

The coarse-grained form is a layer that merges every operation, `NodeFileSystem.layer`. Providing it is the same as
providing a record service today and bundles every implementation, by construction. Its type lists every key it
provides. A library ships both: one layer per operation in its own module, and the aggregate in a module of its own so
that importing one does not import the other.

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

Precedence is ordinary `Context` precedence: the innermost provider wins. There is no `Layer.mock` equivalent and none
is needed. A test provides the operations the program uses; if it forgets one, the test does not compile:

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
and it is deliberately not merged into this one.

### Full and per-operation forms interact through ordinary layers

Operations and record services are distinct keys. A `Layer<FileSystem>` does not satisfy `"effect/FileSystem/readFile"`
and a `Layer<"effect/FileSystem/readFile">` does not satisfy `FileSystem`. Both directions are a few lines of existing
API, and both are tested in the prototype:

```ts
// record from operations: every operation is required, so the record form costs all of them, as it should
const fileSystem = Layer.effect(
  FileSystem,
  Effect.map(Effect.all({ readFile: readFile.service, stat: stat.service /* … */ }), FileSystem.make)
)

// operations from a record: for consuming per-operation APIs on top of an existing full implementation
const readFileFromRecord = Layer.effect(readFile.service, Effect.map(FileSystem, (fs) => fs.readFile))
```

The second direction bundles the record implementation; it is the migration path for existing services, not the
tree-shaking path.

### Generic and overloaded operations

The call signature of an operation is derived from its shape: the shape's parameters and receiver, and the shape's
result with the key added to `R`. TypeScript cannot rewrite the result of a generic function type without
instantiating its type parameters at their constraints, and cannot see past the last overload. So the rule is:

> If the shape's result already requires the key, the shape is the call signature, unchanged.

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

A generic shape that does not name its key still compiles and is still sound; it is imprecise. The prototype's
`typetest/errors/derived-generic.ts` pins what that looks like:

```
typetest/errors/derived-generic.ts(8,14): error TS2322: Type 'Effect<unknown, never, "test/parse">' is not assignable to type 'string'.
```

Nothing changes at call sites between the two cases; the rule only affects how a contract author writes a generic
shape. Yielding the service (`const f = yield* parse.service`) always gives the shape verbatim.

## API

All additions live in `effect/Context`. No existing export changes signature or behaviour.

### `Context.Operation` (constructor)

```ts
export const Operation: <Shape extends Operation.Signature>() => <const Key extends string>(
  key: Key
) => Operation<Key, Shape>
```

Two stages so the shape is given explicitly and the key is inferred as a literal, mirroring
`Context.Service<Self, Shape>()("Id")`. Returns a function with `name === key`, the `OperationTypeId` marker and a
`service` property.

### `Context.Operation<Key, Shape>` (type)

```ts
export type Operation<Key extends string, Shape extends Operation.Signature> =
  & Operation.Call<Key, Shape>
  & {
    readonly [OperationTypeId]: OperationTypeId
    readonly service: Service<Key, Shape>
  }

export declare namespace Operation {
  /** The shapes an operation accepts. */
  export type Signature = (...args: any) => Effect<any, any, any> | Stream<any, any, any>

  /** The call signature: the shape as is when it requires its key, otherwise derived with the key added. */
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

  export type Any = Operation<string, Signature>
  export type Key<Op extends Any> = Op["service"] extends Service<infer K, infer _S> ? K : never
  export type Shape<Op extends Any> = Op["service"] extends Service<infer _K, infer S> ? S : never
}
```

`Operation` is a type alias, not an interface, because its call signature is conditional on the shape. TypeScript keeps
the alias name in diagnostics:

```
typetest/errors/displayed-type.ts(4,14): error TS2322: Type 'Operation<"effect/FileSystem/readFile", (path: string) => Effect<Uint8Array<ArrayBufferLike>, FileSystemError, never>>' is not assignable to type 'string'.
typetest/errors/displayed-type.ts(6,14): error TS2322: Type 'Effect<Uint8Array<ArrayBufferLike>, FileSystemError, "effect/FileSystem/readFile">' is not assignable to type 'string'.
typetest/errors/displayed-type.ts(8,14): error TS2322: Type 'Stream<Uint8Array<ArrayBufferLike>, FileSystemError, "effect/FileSystem/stream">' is not assignable to type 'string'.
```

`Shape` is constrained to functions returning an `Effect` or a `Stream`, because the implementation is looked up inside
a running fiber and the call result has to be something a fiber runs. Anything else is rejected:

```
typetest/errors/not-an-operation.ts(4,31): error TS2344: Type '(path: string) => string' does not satisfy the constraint 'Signature'.
  Type 'string' is not assignable to type 'Effect<any, any, any> | Stream<any, any, any>'.
typetest/errors/not-an-operation.ts(6,32): error TS2344: Type '{ readonly port: number; }' does not satisfy the constraint 'Signature'.
  Type '{ readonly port: number; }' provides no match for the signature '(...args: any): Effect<any, any, any> | Stream<any, any, any>'.
```

A value or a synchronous function is a `Context.Service` and is yielded; that is the same idea at value granularity.

### `Context.OperationTypeId` and `Context.isOperation`

```ts
export type OperationTypeId = "~effect/Context/Operation"
export const OperationTypeId: OperationTypeId
export const isOperation: (u: unknown) => u is Operation.Any
```

### Existing APIs this touches

None are modified. The ones an operation flows through, and what they see:

| API                                                           | Sees                                                     |
| ------------------------------------------------------------- | -------------------------------------------------------- |
| `Context.Service` (constructor)                               | Called once per operation to make `.service`; unchanged  |
| `Layer.succeed`, `Layer.effect`, `Layer.sync`, `Context.make` | `op.service`, an ordinary `Service<Key, Shape>`          |
| `Effect.provideService`, `Effect.provideServiceEffect`        | `op.service`                                             |
| `Context.get`, `getOption`, `getUnsafe`, `yield* op.service`  | the implementation, typed as `Shape`                     |
| `Service.use`, `Service.useSync`, `Service.of`                | available on `op.service`; `op(args)` is sugar for `use` |
| `Effect.andThen`, `Effect.tap`, `Effect.flatMap`              | a function, so they call it (`isEffect(op)` is false)    |
| `Effect.map(op, …)`, `yield* op`                              | a type error: an operation is not an Effect              |
| `Context.isKey`, `Context.isReference`, `Effect.isEffect`     | `false` for `op`; `isKey(op.service)` is `true`          |

`Context.ts` gains type-only imports of `Stream` and `Channel` and two literal type IDs, exactly as `Layer.ts` already
has for `Layer.mock`. It gains no run-time import.

## Runtime semantics

**Construction.** `Operation<Shape>()(key)` creates `service = Service(key)`, a function `op` whose `name` is `key`,
sets `op[OperationTypeId]` and `op.service`, and returns `op`. Nothing is looked up at construction. Creating an
operation is cheap enough to do at module top level for every operation of a contract; the prototype annotates each
with `/* @__PURE__ */` so a bundler can also drop the keys of operations a program never references (without the
annotation each unused key costs a small object and the implementations are still absent).

**Calling.** `op(...args)` returns a value immediately, without touching the context. The value is built once per call
and is both an `Effect` and a `Stream` at run time, in the way `Layer.mock`'s unimplemented members are, because the
implementation's result kind is not known until the implementation has been looked up:

- The **Effect side** is `withFiber((fiber) => { const impl = get(fiber.context, service); const result =
  Reflect.apply(impl, receiver, args); return isEffect(result) ? result : succeed(result) })`. For an Effect-shaped
  operation this runs the implementation's effect. For a Stream-shaped one it succeeds with the Stream; this side is
  unreachable from typed code for Stream shapes, and it is defined so that nothing crashes if reached.
- The **Stream side** is a structural stream whose `channel.transform(upstream, scope)` is
  `withFiber((fiber) => Reflect.apply(get(fiber.context, service), receiver, args).channel.transform(upstream, scope))`.
  It delegates to the channel of the Stream the implementation returns; `Stream` and `Channel` APIs never branch on
  `isEffect`, so the hybrid is safe there.

The static type of the call says which side exists. `Effect.isEffect(stream(p))` and `Stream.isStream(readFile(p))` are
both `true` at run time; this is pinned by a test so it stays documented.

**Lookup timing.** The implementation is read from the running fiber's context each time the call result runs, not
when `op` is called and not when it is constructed. One call value run under two providers runs two implementations.
This is what makes `Effect.provideService(op.service, fake)` work on a call built before the override is applied.

**Receiver.** `op` forwards its `this` to the implementation (`Reflect.apply(impl, this, args)`). A shape that declares a
`this` parameter keeps it in the call signature; an ordinary shape has `this: unknown` and ignores it. Implementations
written as arrows or `Effect.fn` are unaffected.

**Function properties.** `op` has its own properties (`service`, `name`, `length`) and does not copy the
implementation's. The implementation is not known when `op` is created, and an override may change it. A shape with
properties (`{ (n: number): Effect<number>; readonly label: string }`) exposes them on the implementation reached via
`yield* op.service`, never on `op`.

**Missing implementation.** The types prevent running a program whose `R` still contains an operation's key. If the
types are bypassed, `get` throws the existing `Service not found: effect/FileSystem/stat` defect when the call result
runs.

**Precedence.** Ordinary `Context` semantics: the provider closest to the call wins. `Effect.provide(a)` then
`Effect.provide(b)` in a pipe means `a` wins over `b` for keys both provide; `Layer.provideMerge(override, live)` has
`override` win.

**Cost.** One `Context` map read per run of a call result, the same as `Service.use`, plus one Effect primitive and one
small Stream shell per call. There is no caching and no identity assumption on implementations.

## Hazards, and what the design does about each

- **Callables that are also Effects.** A `Context.Service` key is a function that is also an Effect. If the operation
  itself were the key, `Effect.andThen(x, op)` would type as a call (the function overload is listed first) but run as
  an Effect (`isEffect` is checked first), returning the implementation instead of calling it. The operation is
  therefore a plain function and the key lives on `.service`. `isEffect(op)` and `isKey(op)` are `false`.
- **`isEffect`-dispatching duals.** `Effect.andThen` and `Effect.tap` dispatch on `isEffect(f)`; every `dual` with an
  `isEffect(args[0])` predicate decides data-first against data-last the same way. With `op` not an Effect, all of
  them see a function and the types agree with the runtime. `Effect.map(op, f)` is rejected at the type level:

  ```
  typetest/errors/not-an-effect.ts(5,34): error TS2345: Argument of type 'Operation<"effect/FileSystem/readFile", (path: string) => Effect<Uint8Array<ArrayBufferLike>, FileSystemError, never>>' is not assignable to parameter of type 'Effect<unknown, unknown, unknown>'.
  typetest/errors/not-an-effect.ts(8,24): error TS2488: Type 'Operation<"effect/FileSystem/readFile", (path: string) => Effect<Uint8Array<ArrayBufferLike>, FileSystemError, never>>' must have a '[Symbol.iterator]()' method that returns an iterator.
  ```

- **Stream-returning operations.** Handled by the two-sided call result above; the shape decides the static type, and
  overriding a Stream operation is the same `provideService` as for an Effect one. The prototype tests both the default
  and an override through `Stream.runCollect`.
- **Receivers.** Forwarded, so method-style use (`holder.greet("x")`) reaches an implementation that declares `this`.
  Tested.
- **Function properties.** Not copied, as above. A test pins that `"label" in op` is `false` while the implementation's
  `label` is readable through `op.service`.
- **Key collisions.** Two operations with the same string are the same key, in `R` and in the map; the types and the
  runtime cannot disagree about identity. The `<package>/<Service>/<operation>` convention keeps keys unique.
- **Override typing.** An override is the shape, so a wrong parameter type and an added requirement are both rejected:

  ```
  typetest/errors/wrong-override.ts(11,3): error TS2345: Argument of type '(path: number) => Effect.Effect<Uint8Array<ArrayBuffer>, never, never>' is not assignable to parameter of type '(path: string) => Effect<Uint8Array<ArrayBufferLike>, FileSystemError, never>'.
    Types of parameters 'path' and 'path' are incompatible.
      Type 'string' is not assignable to type 'number'.
  typetest/errors/wrong-override.ts(16,13): error TS2375: Type 'Effect<Uint8Array<ArrayBuffer>, never, { readonly value: number; }>' is not assignable to type 'Effect<Uint8Array<ArrayBufferLike>, FileSystemError, never>' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
    Type '{ readonly value: number; }' is not assignable to type 'never'.
  ```

  An implementation that needs another service declares it in the layer (`Layer.effect(op.service, Effect.map(Pool,
  …))`), not in the shape, which is where it belongs: the requirement is the implementation's, not the caller's.
- **Error text under `exactOptionalPropertyTypes`.** TypeScript appends "with 'exactOptionalPropertyTypes: true'.
  Consider adding 'undefined'…" to every `Effect` assignability error because `Effect` has optional `Unify` members.
  This is the same for every missing requirement in v4 today and is not specific to operations; the line that matters
  is the indented one naming the key.
- **`op.service` is callable.** Every `Context.Service` key is a `function KeyClass() {}` at run time and calling it
  returns `undefined`. That is an existing property of keys, unchanged here; the typed call is `op`, not
  `op.service`.

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

What compiles (from `typetest/ok/signatures.ts`, abridged):

```ts
const read: Effect<Uint8Array, FileSystemError, "effect/FileSystem/readFile"> = FileSystem.readFile("a.txt")
const scoped: Effect<string, FileSystemError, Scope | "effect/FileSystem/makeTempFileScoped"> = FileSystem
  .makeTempFileScoped()
const stream: Stream<Uint8Array, FileSystemError, "effect/FileSystem/stream"> = FileSystem.stream("a.txt")
const layer: Layer<"effect/FileSystem/readFile"> = Layer.succeed(
  FileSystem.readFile.service,
  () => Effect.succeed(bytes)
)
const provided: Effect<number, FileSystemError, "effect/FileSystem/writeFile"> = backup("a.txt").pipe(
  Effect.provideService(FileSystem.readFile.service, () => Effect.succeed(bytes))
)
const parsed: Effect<number, never, "test/parse"> = parse(Number, "42") // generic shape naming its key
const formattedDate: Effect<string, never, "test/format"> = format(new Date(), "en") // overloaded shape naming its key
const greeting: Effect<string, never, "test/greet"> = greeter.greet("x") // shape with a `this` parameter
```

## Tree-shaking: what the bundler needs, and what the prototype shows

Requirements on code, all of which are the ordinary requirements for anything to tree-shake:

1. One implementation per top-level export, in a side-effect-free module. One module per operation is the simplest
   way to get that and is what the prototype does; several exports in one side-effect-free module also work.
2. The composition root imports implementation modules, or reads members off their namespace. It does not import an
   aggregate unless it wants everything.
3. Aggregates (`layer = Layer.mergeAll(...)`) live in their own module or are `/* @__PURE__ */`-annotated, because an
   unused call expression at top level is retained otherwise.
4. Contract modules hold keys only. Their `Operation` calls may be `/* @__PURE__ */`-annotated to let unused keys drop
   too.

The types enforce the half that matters: `R` names what to import. Nothing in the design depends on a rule that the
types cannot check except rule 3, which is the general rule for any top-level call in any bundled code.

The prototype (`specs/tree-shakeable-services/`) models `effect/FileSystem` as 30 operations, three of them
Stream-returning and two needing `Scope`, with one Node implementation module each, and a program that calls
`readFile` and `writeFile`. `pnpm --filter tree-shakeable-services-spec bundle` builds three roots with esbuild and
reports which implementation modules each contains, by metafile and by a per-implementation marker string:

```
Bundle sizes (esbuild, esm, unminified)

  main.ts (two operation layers)                226.2 kB
  main-namespace.ts (two layers off a namespace) 226.2 kB
  main-full.ts (aggregate layer)                441.5 kB

Implementation modules and markers in each bundle

  operation                  main.ts      main-namespace.ts    main-full.ts
  access                     absent       absent               present
  chmod                      absent       absent               present
  …
  readFile                   present      present              present
  …
  writeFile                  present      present              present
  writeFileString            absent       absent               present

  main.ts contains 2 of 30 implementations: readFile, writeFile
  main-namespace.ts contains 2 of 30 implementations: readFile, writeFile
  main-full.ts contains 30 of 30 implementations: access, chmod, … writeFileString

  operation keys in main.ts (contract constants the bundler kept): readFile, writeFile

  node dist/main.js <file>: backed up 6 bytes of <file>

OK: the shaken bundles contain exactly the implementations the program uses, and run
```

The check fails if an unused implementation appears in a shaken bundle or a used one is missing, and it runs the
shaken bundle against a temporary file. `main-namespace.ts` shows that `import * as NodeFileSystem` with
`NodeFileSystem.readFile` shakes identically to importing the module directly.

The remaining 226 kB is the part of the `effect` runtime the program uses (53 modules, among them `Effect`, `Layer` and
`Context`) plus the two implementations. `Stream.ts` and `Channel.ts` are not among the 53: the only Stream-returning
implementations are unused, and the call result's Stream side is structural. The size is not a measure of this
design; the measure is the 2-of-30 line and the 215 kB difference against the aggregate.

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
separate bindings. Any `yield* FileSystem` anywhere in the graph silently requires the whole record again, which the
types do say but the ergonomics push towards. PR #10319 was closed without merging.

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
driver. PR #10369 implemented it and is open; this spec keeps its callable-not-key wrapper and its hybrid call result,
and replaces the defaulted `Reference` with a required `Service`.

### Bundler-side property shaking (Rolldown)

A third avenue, explored separately: teach the bundler to drop unused properties from service records by tracking
demand from `Context` lookups to provider object literals. The investigation found Rolldown has no property-level
shaking or value-flow machinery to build on, so the analysis has to be Effect-specific and keyed on service identity;
a plugin proof of concept recovered up to 41% on closed-world programs but bailed out on exported entry points,
Streams, forks, reflection and direct `Context` access, and a native fork handles only the `Layer.effect` plus
`yield* Key` base case so far. It is complementary: it attacks existing record services without changing user code,
at the cost of a bundler fork and a list of bailouts. This spec gives library authors a way to make the guarantee
unconditional for the services they choose to expose per operation.

### Alternatives rejected within this design

- **The operation is the key** (one object that is both callable and a `Service`). Best possible ergonomics for
  providing, but a callable that is also an Effect is exactly the hazard in the first bullet above, and every
  `Effect | function` acceptance site in the library and in user code would type one way and run the other. Fixing
  `andThen` and `tap` does not fix `HttpRouter` handlers or anyone else's API. Rejected.
- **A defaulted variant** (`Operation<Shape>()(key, { defaultValue })` backed by `Reference`). One extra overload,
  zero runtime cost, and it brings back all three reasons overridable was set aside. Rejected; `Context.Reference` and
  `yield*` remain for genuinely defaulted values.
- **Derived call signatures only**, with `op.service.use((f) => f(...))` as the escape hatch for generics. Fully
  general, but it moves the special case to every call site of every generic operation. Naming the key in the shape
  keeps it at the single declaration. Rejected in favour of the "shape requires its key" rule.
- **Class-style operations** (`class ReadFile extends Context.Operation<…>()("…") {}`). A class cannot be called
  without `new`. Rejected.
- **An identifier type parameter** (`Operation<Self, Shape>`). Two operations with the same shape would alias in `R`
  unless each carried a brand; the key string is already unique and already nominal, and it prints better in errors.
  Rejected.

## Scope

In scope: `Context.Operation` and its types, `isOperation`, tests, JSDoc, a bundle regression test, a changeset. Out
of scope: converting any existing Effect service to operations, bundler plugins, and the ai-docs example (tracked
separately, since the equivalent example was removed from PR #10369 pending a decision on ai-docs).

## Implementation plan

Three issues, each mergeable and verifiable on its own:

1. **`Context.Operation` in `effect/Context`.** Types, runtime, runtime tests, type tests, JSDoc, changeset
   (`effect: minor`, `@stability unstable`). Acceptance criteria and test plan below.
2. **Bundle regression test.** An esbuild test in `packages/effect/test` following `test/ai/McpServer/Workerd.test.ts`,
   bundling a fixture like the prototype's `main.ts` and asserting the unused implementation markers are absent and
   `Context.ts` pulled in no `Stream` runtime module. Keeps the guarantee from regressing.
3. **ai-docs example** `ai-docs/src/01_effect/03_services/30_operations.ts` with fixtures: a contract, one
   implementation per module, a root importing two, a test overriding one. Opened only once ai-docs are wanted again.

## Test plan

Runtime tests (`packages/effect/test/Context.test.ts`, `describe("Operation")`), each mirrored in the prototype's
`test/Operation.test.ts`:

1. An operation is a function named after its key; `isOperation` is true; `Effect.isEffect` and `Context.isKey` are
   false; `isKey(op.service)` is true and `op.service.key` is the key.
2. A call runs the implementation provided for `op.service` with `Layer.succeed`, `Layer.effect` and
   `Effect.provideService`.
3. Running a call whose key is unprovided (types bypassed) dies with `Service not found: <key>`.
4. A single operation is overridden in a test with the innermost provider winning, through `Effect.provide`,
   `Effect.provideService` and `Layer.provideMerge`.
5. One call value run under two providers runs two implementations (lookup at run time).
6. A Stream-shaped operation runs its default and an override through `Stream.runCollect`, and `Stream.map` composes
   on the call result.
7. The call result is both `isEffect` and `isStream` at run time, for an Effect-shaped and a Stream-shaped operation.
8. `Effect.andThen`, `Effect.tap` and `Effect.flatMap` call an operation passed as their function.
9. The receiver is forwarded to the implementation, for the default and for an override.
10. The implementation's own properties are not on `op` and are reachable through `op.service`.
11. A record service is built from operations with `Layer.effect` and `Effect.all`; an operation is built from a record
    with `Layer.effect` and `Effect.map`.
12. `Effect.fn` implementations work unchanged.

Type tests (`packages/effect/typetest/Context.tst.ts`):

1. A call has the shape's parameters and the shape's result with the key added to `R`; `Scope` in the shape stays in
   `R`; a Stream shape returns a Stream.
2. Providing `op.service` removes exactly the key; `Layer.succeed(op.service, impl)` is `Layer<Key>`.
3. An override with a wrong parameter type and an override that adds a requirement are rejected.
4. A shape returning a plain value, and a non-function, do not satisfy `Operation.Signature`.
5. `op` is not assignable to `Effect`; `yield* op` is rejected.
6. A generic shape naming its key keeps its type parameter; an overloaded shape naming its key keeps both overloads;
   a generic shape not naming its key is instantiated at its constraint.
7. A `this` parameter in the shape is part of the call signature.
8. Displayed-type tests (`@ts-expect-error` text style) pin `Operation<"…", (path: string) => Effect<…>>`,
   `Effect<…, "…">` and `Stream<…, "…">`, so the alias cannot silently expand.

Doctests: the JSDoc examples for `Operation`, `Operation` (type) and `isOperation` run under `pnpm doctest`.

Bundle test (issue 2): fixture root bundled with esbuild; assert each unused implementation marker is absent, each
used one present, and that the bundle runs.

## Acceptance criteria

- [ ] `Context.Operation`, `Context.Operation<Key, Shape>` with the `Operation` namespace types, `Context.OperationTypeId`
      and `Context.isOperation` are exported from `effect/Context` with the signatures in "API".
- [ ] An operation is a plain function (`isEffect` false, `isKey` false) whose `name` is its key, carrying
      `OperationTypeId` and `service: Context.Service<Key, Shape>`.
- [ ] A call returns a value that is both an Effect and a Stream at run time, built without a run-time import of
      `Stream` or `Channel` in `Context.ts`, with the Effect and Stream sides defined as in "Runtime semantics".
- [ ] The implementation is looked up from the running fiber's context each time the call result runs, with the call's
      receiver forwarded.
- [ ] `Operation.Call` uses the shape verbatim when its result requires the key and derives the signature otherwise;
      the derived signature keeps the shape's `this`, parameters and result, adding the key to `R`.
- [ ] `Operation.Signature` rejects shapes that do not return an `Effect` or a `Stream`.
- [ ] No existing export of `Context`, `Layer` or `Effect` changes signature or behaviour.
- [ ] The runtime tests, type tests and doctests in "Test plan" pass; `pnpm check`, `pnpm lint`, `pnpm jsdocs --check`
      and `pnpm circular` are clean.
- [ ] JSDoc on every new export follows the repository conventions, with "Required, not defaulted" and the hybrid call
      result under **Gotchas**, and `@stability unstable`.
- [ ] Changeset `effect: minor`.
- [ ] PR against `v4/next-minor`.
