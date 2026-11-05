# Tree-shakeable services: appendix

The evidence behind [the spec](../tree-shakeable-services.md), the later migration phases in detail, and the decisions
that shaped the design. Every table here is the output of a command on this branch, named above it; nothing in this
file is normative. The branch point is `git merge-base HEAD origin/v4/next-minor`, `aab47a5070`.

## A. Cost

The gate is the test "costs: Map and WeakMap operations per call, …" in `packages/effect/test/Context.test.ts`. It
replaces `Map.prototype.get/has/set` and `WeakMap.prototype.get/set` with counting wrappers around one call, and
restores them after it. Counts are the gate because they do not move with the machine's load; the earlier timing gate
(three pair orders against the branch point and a twin) could not be decided on a shared host and is deleted, with
its scripts.

What each count is, read from the code:

| Row                                          | Count (Map, Weak) | Where                                                                                       |
| -------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------- |
| ordinary read                                | 1, 0              | the branch point's `lookup`: the base map's `get`                                           |
| ordinary `add`                               | 0, 0              | the branch point's `addUnsafe`, after one brand test                                        |
| record write into a non-empty context        | 0, 0              | one overlay per slot                                                                        |
| member read through a record's overlays      | 0, 0              | `lookup` finds the member's overlay                                                         |
| repeated record read                         | 1, 1              | `positions.has` at the storage, `~views.get`                                                |
| member override `add`                        | 0, 0              | an ordinary overlay                                                                         |
| override, then record read                   | 2, 2              | `has` and `~views.get` at the override, `names.get`, `~views.get` below; one copy, not kept |
| unrelated `add` above an override, then read | 3, 2              | as above, one more `has` for the overlay walked past                                        |

Reported, not gated: per-request override then record read, against a plain service's add then read, is 0.7 to 2.3×
(290 to 600 ns) over three runs of a scratch probe, from 34× (4.9 µs) when every override copy was kept in the
`WeakMap`. Keeping it bought "one object per storage", which nothing relied on.

## B. Tree-shaking

### What a kept key costs

A contract's declarations are calls (`Context.Operation<…>()("…")`), and a bundler keeps a top-level call it cannot
prove pure. The bundle check measures the two-operation root with the contract as written and with
`babel-plugin-annotate-pure-calls` run over the contract as publishing it does, under esbuild, with `effect` itself bundled as it is published:

| Root (`main.ts`, two operations)                    |    Size | Keys kept           | Stream code |
| --------------------------------------------------- | ------: | ------------------- | ----------: |
| contract as written, esbuild                        | 90.9 kB | all 30              |      1456 B |
| contract published (`annotate-pure-calls`), esbuild | 87.2 kB | readFile, writeFile |         0 B |

What the rows establish:

- **An unannotated contract costs under 4 kB: the thirty keys and a 1.4 kB wrapper.** The wrapper is
  `Stream.Operation`, `streamCall` and the `Stream.unwrap` they close over, kept because the three Stream keys are
  kept; it is not the Stream runtime, which in a published `effect` is itself tree-shaken function by function (the
  one-Stream-operation root carries 3.8 kB of it). The record service itself is absent from every row: it lives in a
  module of its own (`src/FileSystem.ts`, the record over the operations module imported as a namespace) whose exports
  the two-operation root never uses, and the prototype's `package.json` declares `sideEffects: false`, so the bundler
  drops the module whole. Nothing in the program's behaviour changes, so no rule is needed for shaking to work;
  annotations are an optimisation worth about 4 kB.
- **Published contracts shake without user action.** `packages/effect`'s build runs `babel-plugin-annotate-pure-calls`
  over `dist`, which annotates the outer call of every top-level declaration, curried or not, and esbuild drops the
  whole expression (the second row). This is how every `Context.Service("…")` key in `effect` shakes
  today, and `effect/FileSystem`'s operations shake the same way with no annotation in the source, which the bundle
  test in `packages/effect` checks against the real module. A namespace import of the operations module (the record
  module's `import * as members`) does not change this: once the record declaration is dropped, the namespace is unused
  and the bundler keeps only the operations the program reads.

### The prototype's bundle check

`scripts/check-bundle.ts`: esbuild only, minified, `effect` run through the pure-call transform as published; about
4 s.

```
$ pnpm --filter tree-shakeable-services-spec bundle
ok   main.ts (two operation layers)                               90.9 kB  2/30 implementations: readFile, writeFile; Stream runtime 1456 B
ok   main-readonly.ts (ReadOnly subset)                           91.4 kB  3/30 implementations: exists, readFile, stat; Stream runtime 1456 B
ok   main-stream.ts (one Stream operation)                        96.7 kB  1/30 implementations: stream; Stream runtime 3838 B
ok   main-full.ts (the record layer (control))                   103.6 kB  30/30 implementations: all; Stream runtime 3092 B
ok   main.ts (two operation layers, contract published)           87.2 kB  2/30 implementations: readFile, writeFile; Stream runtime 0 B

OK: every bundle contains exactly the implementations its program uses
```

### The real module and the Node providers

`packages/effect/test/FileSystem/treeShaking.test.ts` is one esbuild build (esm, platform node, es2022, `effect` as
published: `esbuild.transform` and `babel-plugin-annotate-pure-calls` over the sources) of three roots, asserting the
`internal/fileSystem` modules, the `effect/FileSystem/*` keys present, that `"effect/FileSystem"` is absent, and the
Stream bytes. Sizes, minified, measured once with whole-layer controls, not asserted:

| Root                                                    | Minified | `internal/fileSystem` modules | Stream runtime | Whole `NodeFileSystem.layer` |
| ------------------------------------------------------- | -------: | ----------------------------- | -------------: | ---------------------------: |
| `main-node.ts`: `NodeFileSystem.readFile` + `writeFile` |   39,950 | readFile, shared, writeFile   |            0 B |      76,840 (1,287 B Stream) |
| `main-http-file.ts`: `HttpServerResponse.file`          |   99,645 | open, shared, stat, stream    |        3,897 B |                      123,964 |
| `main-logger-file.ts`: `Logger.toFile`                  |   64,215 | open, shared                  |            0 B |                            — |

## C. Type-level evidence

The output of `pnpm --filter tree-shakeable-services-spec check-errors`, which compiles the files under
`typetest/errors` with TypeScript's default truncation (`noErrorTruncation: false`, as users see it) and checks that each fails for its documented reason:

```
typetest/errors/displayed-type.ts(4,14): error TS2322: Type 'Operation<"effect/FileSystem/readFile", (path: string) => Effect<Uint8Array<ArrayBufferLike>, FileSystemError, never>>' is not assignable to type 'string'.
typetest/errors/displayed-type.ts(6,14): error TS2322: Type 'Effect<Uint8Array<ArrayBufferLike>, FileSystemError, "effect/FileSystem/readFile">' is not assignable to type 'string'.
typetest/errors/displayed-type.ts(8,14): error TS2322: Type 'Stream<Uint8Array<ArrayBufferLike>, FileSystemError, "effect/FileSystem/stream">' is not assignable to type 'string'.
typetest/errors/effect-shape.ts(5,89): error TS2345: Argument of type '"test/readFile"' is not assignable to parameter of type '"The shape returns an Effect: define it with Context.Operation"'.
typetest/errors/forgotten-override.ts(7,3): error TS2379: Argument of type 'Effect<number, FileSystemError, "effect/FileSystem/writeFile">' is not assignable to parameter of type 'Effect<number, FileSystemError, never>' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Type '"effect/FileSystem/writeFile"' is not assignable to type 'never'.
typetest/errors/generic-unnamed.ts(7,3): error TS2345: Argument of type '"test/parse"' is not assignable to parameter of type '"The shape of \"test/parse\" is generic or overloaded: its result must require \"test/parse\""'.
typetest/errors/missing-requirement.ts(5,19): error TS2379: Argument of type 'Effect<number, FileSystemError, "effect/FileSystem/readFile" | "effect/FileSystem/writeFile">' is not assignable to parameter of type 'Effect<number, FileSystemError, never>' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Type '"effect/FileSystem/readFile" | "effect/FileSystem/writeFile"' is not assignable to type 'never'.
    Type '"effect/FileSystem/readFile"' is not assignable to type 'never'.
typetest/errors/missing-twenty.ts(48,19): error TS2379: Argument of type 'Effect<{ root: string; text: string; bytes: number; present: boolean; size: number; link: "Directory" | "File" | "Other" | "SymbolicLink"; real: string; names: number; entries: number; }, FileSystemError, "effect/FileSystem/rename" | ... 1 more ... | "effect/FileSystem/utimes">' is not assignable to parameter of type 'Effect<{ root: string; text: string; bytes: number; present: boolean; size: number; link: "Directory" | "File" | "Other" | "SymbolicLink"; real: string; names: number; entries: number; }, FileSystemError, never>' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Type '"effect/FileSystem/rename" | "effect/FileSystem/stat" | "effect/FileSystem/utimes"' is not assignable to type 'never'.
    Type '"effect/FileSystem/rename"' is not assignable to type 'never'.
typetest/errors/missing-twenty.ts(52,19): error TS2379: Argument of type 'Effect<unknown, FileSystemError, "effect/FileSystem/chmod" | "effect/FileSystem/chown" | "effect/FileSystem/glob" | "effect/FileSystem/link" | "effect/FileSystem/makeTempDirectoryScoped" | ... 4 more ... | "effect/FileSystem/watch">' is not assignable to parameter of type 'Effect<unknown, FileSystemError, never>' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Type '"effect/FileSystem/chmod" | "effect/FileSystem/chown" | "effect/FileSystem/glob" | "effect/FileSystem/link" | "effect/FileSystem/makeTempDirectoryScoped" | "effect/FileSystem/makeTempFile" | "effect/FileSystem/makeTempFileScoped" | "effect/FileSystem/readLink" | "effect/FileSystem/stream" | "effect/FileSystem/watch"' is not assignable to type 'never'.
    Type '"effect/FileSystem/chmod"' is not assignable to type 'never'.
typetest/errors/not-an-effect.ts(5,34): error TS2345: Argument of type 'Operation<"effect/FileSystem/readFile", (path: string) => Effect<Uint8Array<ArrayBufferLike>, FileSystemError, never>>' is not assignable to parameter of type 'Effect<unknown, unknown, unknown>'.
typetest/errors/not-an-effect.ts(5,66): error TS18046: 'bytes' is of type 'unknown'.
typetest/errors/not-an-effect.ts(8,24): error TS2488: Type 'Operation<"effect/FileSystem/readFile", (path: string) => Effect<Uint8Array<ArrayBufferLike>, FileSystemError, never>>' must have a '[Symbol.iterator]()' method that returns an iterator.
typetest/errors/not-an-operation.ts(6,39): error TS2344: Type '(path: string) => string' does not satisfy the constraint 'FunctionSignature'.
  Type '(path: string) => string' is not assignable to type 'EffectSignature'.
    Type 'string' is not assignable to type 'Effect<any, any, any>'.
typetest/errors/not-an-operation.ts(8,40): error TS2344: Type '{ readonly port: number; }' does not satisfy the constraint 'FunctionSignature'.
typetest/errors/not-an-operation.ts(10,46): error TS2344: Type 'Effect<number, never, never>' does not satisfy the constraint 'FunctionSignature'.
typetest/errors/one-line-display.ts(12,14): error TS2322: Type 'Of<{ readonly find: Operation<"test/Users/find", (id: string) => Effect<string, never, never>>; readonly create: Operation<"test/Users/create", (name: string) => Effect<void, never, never>>; }>' is not assignable to type 'number'.
typetest/errors/one-line-display.ts(13,14): error TS2322: Type 'Operations<ReadOnly, ReadOnlyShape> & { exists: Operation<"effect/FileSystem/exists", (path: string) => Effect<boolean, FileSystemError, never>>; readFile: Operation<...>; stat: Operation<...>; }' is not assignable to type 'number'.
typetest/errors/overloaded-unnamed.ts(8,6): error TS2345: Argument of type '"test/format"' is not assignable to parameter of type '"The shape of \"test/format\" is generic or overloaded: its result must require \"test/format\""'.
typetest/errors/partial-aggregate.ts(7,14): error TS2375: Type 'Layer<"effect/FileSystem/readFile" | "effect/FileSystem/writeFile", never, never>' is not assignable to type 'Layer<FileSystem, never, never>' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Type 'FileSystem' is not assignable to type '"effect/FileSystem/readFile" | "effect/FileSystem/writeFile"'.
    Type '"effect/FileSystem/access"' is not assignable to type '"effect/FileSystem/readFile" | "effect/FileSystem/writeFile"'.
typetest/errors/partial-record.ts(6,67): error TS2345: Argument of type '{ readFile: () => Effect.Effect<Uint8Array<ArrayBuffer>, never, never>; }' is not assignable to parameter of type 'Shape'.
  Type '{ readFile: () => Effect.Effect<Uint8Array<ArrayBuffer>, never, never>; }' is missing the following properties from type 'Shape<typeof import("…/src/FileSystem/operations")>': access, chmod, chown, copy, and 25 more.
typetest/errors/partial-subset.ts(6,59): error TS2345: Argument of type '{ readFile: () => Effect.Effect<Uint8Array<ArrayBuffer>, never, never>; }' is not assignable to parameter of type 'ReadOnlyShape'.
  Type '{ readFile: () => Effect.Effect<Uint8Array<ArrayBuffer>, never, never>; }' is missing the following properties from type 'Shape<{ exists: Operation<"effect/FileSystem/exists", (path: string) => Effect<boolean, FileSystemError, never>>; readFile: Operation<"effect/FileSystem/readFile", (path: string) => Effect<...>>; stat: Operation<...>; }>': exists, stat
typetest/errors/record-requires-all.ts(8,19): error TS2379: Argument of type 'Effect<number, FileSystemError, FileSystem>' is not assignable to parameter of type 'Effect<number, FileSystemError, never>' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Type 'FileSystem' is not assignable to type 'never'.
    Type '"effect/FileSystem/access"' is not assignable to type 'never'.
typetest/errors/record-requires-all.ts(11,3): error TS2379: Argument of type 'Effect<number, FileSystemError, "effect/FileSystem/access" | "effect/FileSystem/chmod" | "effect/FileSystem/chown" | "effect/FileSystem/copy" | "effect/FileSystem/copyFile" | ... 22 more ... | "effect/FileSystem/writeFileString">' is not assignable to parameter of type 'Effect<number, FileSystemError, never>' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Type '"effect/FileSystem/access" | "effect/FileSystem/chmod" | "effect/FileSystem/chown" | "effect/FileSystem/copy" | "effect/FileSystem/copyFile" | "effect/FileSystem/exists" | ... 21 more ... | "effect/FileSystem/writeFileString"' is not assignable to type 'never'.
    Type '"effect/FileSystem/access"' is not assignable to type 'never'.
typetest/errors/shape-with-properties.ts(6,3): error TS2345: Argument of type '"test/double"' is not assignable to parameter of type '"The shape has properties: an operation is a bare function"'.
typetest/errors/shared-slot.ts(13,41): error TS2345: Argument of type '"test/Shared/Alias"' is not assignable to parameter of type '"\"test/Shared/a\" is reachable under two names: a slot has one name in a record"'.
typetest/errors/shared-slot.ts(16,42): error TS2345: Argument of type '"test/Shared/Nested"' is not assignable to parameter of type '"\"test/Shared/a\" is reachable under two names: a slot has one name in a record"'.
typetest/errors/shared-slot.ts(20,40): error TS2345: Argument of type '"test/Shared/Both"' is not assignable to parameter of type '"\"test/Shared/b\" is reachable under two names: a slot has one name in a record"'.
typetest/errors/stream-shape.ts(5,88): error TS2345: Argument of type '"test/stream"' is not assignable to parameter of type '"The shape returns a Stream: define it with Stream.Operation"'.
typetest/errors/subset-not-full.ts(7,14): error TS2375: Type 'Layer<ReadOnly, never, never>' is not assignable to type 'Layer<FileSystem, never, never>' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Type 'FileSystem' is not assignable to type 'ReadOnly'.
    Type '"effect/FileSystem/access"' is not assignable to type 'ReadOnly'. Did you mean '"effect/FileSystem/exists"'?
typetest/errors/value-shape.ts(7,32): error TS2349: This expression is not callable.
  Type 'Effect<number, never, "effect/Terminal/columns"> & Slot<"effect/Terminal/columns", Effect<number, never, never>> & { readonly "~effect/Context/Operation": "~effect/Context/Operation"; readonly key: "effect/Terminal/columns"; }' has no call signatures.
typetest/errors/value-shape.ts(9,54): error TS2344: Type '() => Effect<number, never, never>' does not satisfy the constraint 'Effect<any, any, any>'.
typetest/errors/wrong-override.ts(11,3): error TS2345: Argument of type '(path: number) => Effect.Effect<Uint8Array<ArrayBuffer>, never, never>' is not assignable to parameter of type '(path: string) => Effect<Uint8Array<ArrayBufferLike>, FileSystemError, never>'.
  Types of parameters 'path' and 'path' are incompatible.
    Type 'string' is not assignable to type 'number'.
typetest/errors/wrong-override.ts(16,13): error TS2375: Type 'Effect<Uint8Array<ArrayBuffer>, never, { readonly value: number; }>' is not assignable to type 'Effect<Uint8Array<ArrayBufferLike>, FileSystemError, never>' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Type '{ readonly value: number; }' is not assignable to type 'never'.
typetest/errors/wrong-self.ts(11,82): error TS2345: Argument of type '"test/Partial"' is not assignable to parameter of type '"Self lacks the identifier of \"effect/FileSystem/writeFile\""'.
typetest/errors/wrong-self.ts(19,5): error TS2345: Argument of type '"test/WrongShape"' is not assignable to parameter of type '"Shape is not the members' shape: declare it as interface Shape extends Context.Operations.Shape<typeof members> {}"'.
typetest/errors/wrong-self.ts(21,45): error TS2345: Argument of type '"test/Unknown"' is not assignable to parameter of type '"Give the record its identifier: Context.Operations<Self, Shape>()(key, members)"'.
typetest/errors/wrong-self.ts(23,42): error TS2554: Expected 0 arguments, but got 1.

OK: every file under typetest/errors fails to compile for the documented reason
```

`partial-record.ts` and `partial-subset.ts` print the shape by name in the headline (`parameter of type 'Shape'`);
the elaboration below it prints the base type, truncated, and the missing members. `shared-slot.ts` is the one-name
rule on an alias, a nested record and two overlapping subsets; `one-line-display.ts` is how the one-line form and a
named record print.
`record-requires-all.ts(8,19)` is the record program run unprovided, which prints the record's name;
`record-requires-all.ts(11,3)` is the same program with two of its thirty operations provided, which prints the
remaining keys, truncated (`missing-twenty.ts(48,19)`, three left, prints three). The positive assertions,
`typetest/ok/signatures.ts`, compile under `pnpm --filter tree-shakeable-services-spec check`; the repository's type
tests are `packages/effect/typetest/Context.tst.ts` and `FileSystem.tst.ts`, under `tstyche`.

## D. Compile cost

`tsc --extendedDiagnostics` (the repository's TypeScript, `packages/effect/tsconfig.json`, `--noEmit`, no incremental
cache) at the branch point and on this branch, which carries `Context`, the FileSystem and Terminal migrations with
`ReadOnly`, and their tests:

| Metric         |    before |     after |  change |
| -------------- | --------: | --------: | ------: |
| Types          | 1,046,206 | 1,055,272 | +0.87 % |
| Instantiations | 3,801,554 | 3,835,967 | +0.91 % |

Check time is not a criterion.

## E. The remaining phases in detail

**Done on this branch: `effect/FileSystem` providers, Node and Bun.** In `packages/platform/node-shared`, the 358-line
`src/NodeFileSystem.ts` is split into `src/internal/fileSystem/<op>.ts`, one module per operation (32), plus
`shared.ts` (the error mapping and handle helpers the primitives share) and `layer.ts` (the merge). Each primitive
exports `Layer.succeed(FileSystem.<op>, impl)` built from the function `NodeFileSystem.ts` had for that member;
`watch` is `Layer.effect` over `serviceOption(WatchBackend)`. The derived operations (`exists`, `glob`,
`readFileString`, `stream`, `sink`, `writeFileString`) are platform-independent: `effect/FileSystem` ships each as a
layer over the primitives it needs, and each platform module is that layer provided with the platform's primitive,
`Layer.provide(FileSystem.layerReadFileString, readFile.layer)`. `src/NodeFileSystem.ts` re-exports the 32 by member
name and `layer`, whose type and behaviour are unchanged; `@effect/platform-node`'s `NodeFileSystem` and
`@effect/platform-bun`'s `BunFileSystem` re-export all 33, so the export maps are unchanged. A program that provides
`NodeFileSystem.readFile` and `NodeFileSystem.writeFile` bundles those two modules and `shared` (B); one that provides
`NodeFileSystem.layer` behaves as before.

**Deno, out of scope.** `packages/platform/deno/src/DenoFileSystem.ts` is untouched and provides the record whole. The
same layout applies (one module per primitive over `Deno.*`, derived operations from `effect/FileSystem`'s layers) and
is an issue of its own.

**`effect/Terminal` providers (issue 11).** `NodeTerminal` becomes one module per member. `columns`, `rows` and
`display` are one-liners over `process.stdout`: `Layer.succeed(Terminal.columns, Effect.sync(() =>
process.stdout.columns ?? 80))`. `readInput`, `readLine` and `size` share the `stdin`/`readline` setup that
`make(shouldQuit)` does once today; it becomes an internal scoped service, `NodeTerminal/Input` (a `Context.Service`
whose layer owns the `readline` interface and the keypress listener), and each of the three is
`Layer.effect(Terminal.readInput, Effect.map(Input, …))` provided with it. A root that only displays never imports
`Input`, so neither `readline` nor the key-event parser is in its bundle, which the prototype's `main-terminal.ts`
measures (two of six members). `NodeTerminal.layer` keeps its form, a record layer with `Input` provided inside;
`NodeTerminal.make(shouldQuit)` keeps its signature. The prototype's `src/Terminal.ts` and `src/node/terminal/` are
this layout.

**`effect/FileSystem` consumers (issue 10).** The 57 `yield* FileSystem` sites inside `effect` move, one commit per
module: sites that use a few members call them (`ConfigProvider` directory reads, `Logger` file sinks, `cli`
completions) and expose the precise union, or annotate `FileSystem.ReadOnly` where they want one name; sites that read
and stream files (`HttpServerResponse.file`, `HttpStaticServer`) annotate `FileSystem.ReadOnly |
"effect/FileSystem/stream"`; sites that use many members, or hand the record to other code, keep `yield* FileSystem`.

**`effect/Terminal` consumers (issue 12).** The ten `cli/Prompt.ts` sites read `columns`, `readInput` and `display`;
the prompt runner takes `Terminal.Shape` by parameter in three places and keeps doing so. Each prompt's requirement
becomes `Terminal.Interactive`, a subset record over those three exported from `effect/Terminal`, so a CLI that never
prompts carries no reader.

## F. Decisions, and why

In the order an implementer meets them:

- **An operation is a `Context.Slot` that is a function, not a `Context.Key`.** A key is an Effect, and a value that
  is both callable and an Effect types one way and runs the other under every `isEffect` dispatch (the first hazard).
  Providing through a property of the operation (`op.service`) was a second rule for providing. `Key` is `@stability stable` and is an Effect, so
  `<I, S>(k: Context.Key<I, S>) => Effect.gen(function*() { return yield* k })` must keep compiling in a minor; making
  `Key` the non-Effect brand broke exactly that. A type test pins that a value typed `Key` is still an Effect.
  `Context.ts` gains type-only imports of `Stream` and `Sink` and imports `withFiberSucceed` from `internal/core.ts`;
  `Sink.ts`'s type-only import of `Context` becomes a value import, as `Stream.ts`'s already is; `pnpm circular` is
  clean.
- **The result kind is fixed at the definition** (`Context.Operation`, `Stream.Operation`, `Sink.Operation`,
  `Context.Operation.value`), because a type argument is erased and a call result must be exactly one kind of value.
  One constructor dispatching on `isEffect` of the implementation was the hazard again; Effect-valued members
  rewritten as functions of no arguments changed `Terminal`'s shape. The three function constructors accept one
  another's shapes so that the wrong one is a message naming the right one, rather than a constraint error naming a type.
- **The key is written once, in the one place it is used.** A flat form taking the key from an annotation wrote it
  twice; the curried form is what `Context.Service<Self, Shape>()("key")` already does.
- **A generic or overloaded shape names its key in its result**, checked by `Derivable` at the definition, rather
  than an escape hatch at every call site.
- **The record's identity is the union of its members' keys**, declared by the author for libraries so that
  diagnostics keep the name. A prefix type (`` `effect/FileSystem/${string}` ``) prints short but cannot be shown to
  be covered by a merge of member layers; the record interface as the identity, with branded member keys, keeps
  today's names but member layers can never satisfy it.
- **The shape is derived from the operations, and named.** `interface Shape extends Context.Operations.Shape<typeof
  members> {}`: each operation declares its shape once and the record derives the rest, so no hand-written interface
  has to be kept in step. A partial record's headline names `Shape`; the line below prints the base type and the
  missing members (C). An empty second base, `Context.Operations.Named`, made that line print `Shape` too, at the
  price of an export that existed only for printing; it is dropped.
- **The recipe is the floor.** The members cannot come from the shape (types are erased); a helper building operations
  from a table of names would keep every key in every bundle (B, "What a kept key costs"); and TypeScript names a type
  only where a declaration creates it. The member list is the module's export list where the operations have a module,
  and written out otherwise; a namespace import keeps nothing a written list does not.
- **No branded phase for unstable modules.** `FileSystem` and `Terminal` are `@stability unstable`, whose policy
  allows a breaking minor, so the identity change ships directly with the codemod and `ReadOnly`, without a period in
  which each operation is branded with the old identity.
- **The members are properties of the key**, so that the one-line form `Context.Operations("app/Users", { find })`
  gives `Users.find(id)`. A member whose name is a property of every key is rejected on the key argument
  (`Operations.Reserved`, which includes `name`) and a defect at construction.
- **The record key is a function, like every other key**, recognised by its brand (`OperationsTypeId`), not by being
  the one key that is a plain object; `Context`'s getters test the brand.
- **A slot has one name in a record.** An alias, a nested record sharing a member, or two overlapping subsets would let
  a write give one slot two values, and an override copy that replaces one name would leave the other stale. Rejecting
  them at the definition (`Operations.Shared` on the key argument; a defect naming both paths at construction) keeps
  the read a function of the slots without re-deriving every path on each override.
- **A record is its members and nothing else.** A slot of the record's own holding the provided object, returned while
  the members agreed with it, needed an equality check per read, views inheriting from class instances, a bound-method
  cache and string semantics for the record's own slot, each a seam: a class method calling a sibling through `this`
  skipped an override; `getOrUndefinedUnsafe` by the record's string returned the provided object after an override;
  overlays and flat maps followed different rules. A record write is its members' slots and a record read a plain
  object of them, assembled the same way on every path; `instanceof` and identity do not survive a read.
- **A record write is one ordinary overlay per member**, counting as one addition toward `maxDepth`. One overlay
  holding every member by position made `lookup` test every overlay's kind and cost the ordinary read 1.12 to 1.21× in
  a process holding no record; with per-member overlays the `Overlay` type, `lookup`, the flatten and `merge` are the
  branch point's code. The price is the write: about two ordinary writes per member (an overlay and a property of the
  assembled object).
- **Record state is two pieces: `~layout` and `~views`.** Everything fixed at construction (members with their
  positions and nested records, the slot list, slot positions, direct-member names) is one immutable object; the only
  mutable state is one `WeakMap` from storage to the object built there. The one-entry cache, the template and the
  fiber-cached flags are gone: the costs test showed nothing they bought.
- **A write's read is kept; an override's read is a copy.** The storage is the topmost overlay holding one of the
  record's slots, or the base map; overlays above it hold other slots and cannot change the result, so contexts
  derived by unrelated writes share it. An override's storage is a one-member overlay, and its read is the read below
  with that member replaced, made each time and not kept: a per-request override leaves nothing in the `WeakMap` and
  costs one copy (A). "One object per storage" is not promised; nothing relied on it.
- **Presence is `name in value`.** A member whose value is `undefined` is a member: a record holding an optional
  callback set to `undefined` is complete, and `getOption` is `Some`. Only an absent member is the defect.
- **A record provided without a member is a defect at the write**, naming the member's key, rather than a record that
  reads back a member no call can use.
- **Every function member is stored bound to the object it was provided on**, at the write: own property or
  inherited, plain object or class instance. One rule, so a member runs the same standalone, through the record and
  through a spread copy, private fields included. A sibling call through `this` therefore reaches the provided object;
  the recipe calls siblings through the operation, which sees overrides. A callable that is also an Effect is stored
  as it is, since binding would drop its prototype.
- **A record service reads itself**: `yield*`, `use` and `useSync` on a record key call its read directly instead
  of passing through `Context.get`.
- **No defaults.** Every reason the overridable design was set aside is a reason not to add a defaulted variant;
  `Context.Reference` remains for values that want one, and may be a member.
- **The cost gate is counts only, in the normal test suite.** Counts do not depend on the machine; timing on a shared
  host never decided, so it is reported, not gated, and the benchmark scripts are deleted.
- **Bundle checks assert contents, not sizes**: which implementation modules and keys are present and the Stream
  bytes, in one esbuild build, so they are fast and do not drift with unrelated code.

## G. Alternatives rejected

- **Bundler-side property shaking**, an earlier design. Teach the bundler to drop unused properties from service records by
  tracking demand from `Context` lookups to provider literals. Rolldown has no property-level shaking to build on; a
  plugin proof of concept recovered up to 41 % on closed-world programs but bailed out on exported entry points, Streams,
  forks, reflection and direct `Context` access. Complementary: it works on existing records without changing user code,
  at the cost of a bundler fork and a list of bailouts.

- **A `members` helper** that builds the operations from a table of names and kinds. Removes the key strings and the
  member list from a contract, and keeps every key and the Stream wrapper in every bundle that uses one (B).
- **A hand-written `Shape` interface** with the operations taking their shapes from it (`Shape["readFile"]`). Two
  declarations of every member's type, kept in step by a `ShapeDifference` check, and more compile time (D was +1.34 %
  types and +2.06 % instantiations with it).
- **A redeclared member in `Shape`** to make TypeScript print its name. Works, but repeats one member's type in every
  contract.
- **Re-deriving nested and subset views on each override** instead of one name per slot. Correct, but an override's
  read would rebuild every record path through the slot, and nothing needs a slot under two names.
- **Storing the record only under its own key, with members reading through it.** A member read would walk every record
  spanning it, and a member provided outside a record would lose to it: the precedence bug of slices.
- **One overlay holding every member by position.** A cheaper write (one allocation) and a dearer everything else:
  `lookup` tested every overlay's kind, the flatten knew the record, and the getters shared one helper compiled for
  both kinds of key.
- **Writing a record as a fresh flat map.** Correct and simple, but every `Effect.provideService(FileSystem, impl)`
  copied the context's map: 3.6 µs at 33 slots, 27 µs at 300. Per-member overlays cost the same into either.
- **A view with the overriding members only**, inheriting the rest from the provided object. Wrong under every
  operation that enumerates own properties (spread, `Object.keys`, `JSON.stringify`, `Effect.updateService` with a
  spread, `Layer.effect` over `yield* FileSystem`), and a `TypeError` from a class with private fields.
- **A `Proxy` as the record read.** Every property read is a trap, and a `Proxy` is one more kind of object a user's
  record can turn into.
- **Keeping every override's copy in the `WeakMap`.** Bought "one object per storage" for 34× a plain override then
  read; nothing relied on the identity (F).
- **Dispatching record reads on the miss path of the getters**, so the hit path has no brand test. Measured at the same
  cost, and it makes the record's string a slot again: a `Context.Service` built with it would hide the members
  from `Context.get` while `yield*` kept reading them.
- **Rebuilding the record on every member write** instead of reading on demand. A flat copy and a thirty-member rebuild
  on every override, and a per-context index of records.
- **Class-style operations** (`class ReadFile extends Context.Operation<…>()("…") {}`). A class cannot be called
  without `new`.
- **An identifier type parameter for operations** (`Operation<Self, Shape>`). Two operations with the same shape would
  alias in `R` unless each carried a brand; the key string is already unique and nominal.
- **A `read` method on every key's prototype as the getters' dispatch.** A key built structurally (`{ key }`) has no
  prototype of ours, so the getter would still test for the method, and the call is a polymorphic property load on
  every read where the `typeof` costs none.
- **The key in the wrong-kind message.** TypeScript infers the key literal only from a branch of `KeyFor` that is the
  type parameter itself; a message built from it printed `${string}` in the key's place.
