# Tree-shakeable services: appendix

The evidence behind [the spec](../tree-shakeable-services.md), the later migration phases in detail, and the decisions
that shaped the design. Every table here is the output of a command on this branch, named above it; nothing in this
file is normative. The branch point is `aab47a5070`, the parent of the first spec commit `c7eee6bb90`, and every
"before" figure was measured there. `git merge-base HEAD origin/v4/next-minor` returns the older `cb679e39ca`,
because upstream rewrote the 15 commits after it; `packages/effect/src/Context.ts` is the same at both
(`git diff --quiet aab47a5070 cb679e39ca -- packages/effect/src/Context.ts` exits 0).

## A. Cost

The gate is the test "costs: Map and WeakMap operations per call, …" in `packages/effect/test/Context.test.ts`. It
replaces `Map.prototype.get/has/set` and `WeakMap.prototype.get/set` with counting wrappers around one call, and
restores them after it. Counts are the gate because they do not move with the machine's load; the earlier timing gate
(three pair orders against the branch point and a twin) could not be decided on a shared host and is deleted, with
its scripts.

What each count is, read from the code:

| Row                                                             | Count (Map, Weak) | Where                                                                                                                                                            |
| --------------------------------------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ordinary read                                                   | 1, 0              | the branch point's `lookup`: the base map's `get`                                                                                                                |
| ordinary `add`                                                  | 0, 0              | the branch point's `addUnsafe`, after one brand test                                                                                                             |
| record write into a non-empty context                           | 0, 0              | one overlay per slot                                                                                                                                             |
| member read through a record's overlays                         | 0, 0              | `lookup` finds the member's overlay                                                                                                                              |
| first record read from a flat map                               | 4, 2              | one `get` per member (4); `~views.get`, `~views.set`                                                                                                             |
| first record read after a record write into a non-empty context | 7, 3              | `has` at the top, `names.get`, `has` at the next overlay, one `positions.get` per member overlay walked (4); `~views.get` at the storage and below, `~views.set` |
| the same, 32 members                                            | 35, 3             | members + 3: linear                                                                                                                                              |
| repeated record read                                            | 1, 1              | `positions.has` at the storage, `~views.get`: the kept object                                                                                                    |
| subset written over the full record, repeated record read       | 1, 1              | as above: the kept object, the same each time                                                                                                                    |
| member override `add`                                           | 0, 0              | an ordinary overlay                                                                                                                                              |
| override, then record read                                      | 2, 2              | `has` and `~views.get` at the override, `names.get`, `~views.get` below; one copy, not kept                                                                      |
| unrelated `add` above an override, then read                    | 3, 2              | as above, one more `has` for the overlay walked past                                                                                                             |

No timing is reported. The figures earlier rounds quoted here (0.7 to 2.3× for a per-request override then record
read, 34× when every override copy was kept) came from a scratch probe that is not committed; they are not a gate.

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
  test in `packages/effect` checks against the real module. A namespace import of the operations module (`import * as
  members`, which a record module may use) does not change this: once the record declaration is dropped, the namespace is unused
  and the bundler keeps only the operations the program reads.

### The prototype's bundle check

`scripts/check-bundle.ts`: esbuild only, minified, `effect` run through the pure-call transform as published; about
4 s.

```
$ pnpm --filter tree-shakeable-services-spec bundle
ok   main.ts (two operation layers)                               90.9 kB  2/30 implementations: readFile, writeFile; Stream runtime 1436 B
ok   main-readonly.ts (ReadOnly subset)                           91.3 kB  3/30 implementations: exists, readFile, stat; Stream runtime 1436 B
ok   main-stream.ts (one Stream operation)                        96.6 kB  1/30 implementations: stream; Stream runtime 3818 B
ok   main-full.ts (the record layer (control))                   103.5 kB  30/30 implementations: all; Stream runtime 3072 B
ok   main.ts (two operation layers, contract published)           87.2 kB  2/30 implementations: readFile, writeFile; Stream runtime 0 B

OK: every bundle contains exactly the implementations its program uses
```

### The real module and the Node providers

`packages/effect/test/FileSystem/treeShaking.test.ts` is one esbuild build (esm, platform node, es2022, `effect` as
published: `esbuild.transform` and `babel-plugin-annotate-pure-calls` over the sources) of four roots, asserting the
`internal/fileSystem` or `internal/terminal` modules, the `effect/FileSystem/*` or `effect/Terminal/*` keys present,
that `"effect/FileSystem"` or `"effect/Terminal"` is absent, and the Stream bytes; `main-terminal.ts` also asserts that
`readline`, `emitKeypressEvents` and `setRawMode` are absent. Sizes, minified, measured once with whole-layer controls
(`NodeFileSystem.layer`, `NodeTerminal.layer`), not asserted:

| Root                                                           | Minified | Implementation modules      | Stream runtime |     Whole layer instead |
| -------------------------------------------------------------- | -------: | --------------------------- | -------------: | ----------------------: |
| `main-node.ts`: `NodeFileSystem.readFile` + `writeFile`        |   39,950 | readFile, shared, writeFile |            0 B | 76,840 (1,287 B Stream) |
| `main-http-file.ts`: `HttpServerResponse.file`                 |   99,645 | open, shared, stat, stream  |        3,897 B |                 123,964 |
| `main-logger-file.ts`: `Logger.toFile`                         |   64,215 | open, shared                |            0 B |                       — |
| `main-terminal.ts`: `Terminal.display`, `NodeTerminal.display` |   83,664 | display                     |            0 B |                 110,052 |

Unminified, `main-terminal.ts` is 189,913 B with `NodeTerminal.display` and 247,913 B with `NodeTerminal.layer`.

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
typetest/errors/generic-unnamed.ts(7,3): error TS2345: Argument of type '"test/parse"' is not assignable to parameter of type '"The shape of \"test/parse\" is generic: its result must require \"test/parse\""'.
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
typetest/errors/one-line-display.ts(13,14): error TS2322: Type 'Of<"test/Users", { readonly find: Operation<"test/Users/find", (id: string) => Effect<string, never, never>>; readonly create: Operation<"test/Users/create", (name: string) => Effect<...>>; }>' is not assignable to type 'number'.
typetest/errors/one-line-display.ts(14,14): error TS2322: Type 'Operations<ReadOnly, ReadOnlyShape> & { exists: Operation<"effect/FileSystem/exists", (path: string) => Effect<boolean, FileSystemError, never>>; readFile: Operation<...>; stat: Operation<...>; }' is not assignable to type 'number'.
typetest/errors/partial-aggregate.ts(7,14): error TS2375: Type 'Layer<"effect/FileSystem/readFile" | "effect/FileSystem/writeFile", never, never>' is not assignable to type 'Layer<FileSystem, never, never>' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  Type 'FileSystem' is not assignable to type '"effect/FileSystem/readFile" | "effect/FileSystem/writeFile"'.
    Type '"effect/FileSystem/access"' is not assignable to type '"effect/FileSystem/readFile" | "effect/FileSystem/writeFile"'.
typetest/errors/partial-record.ts(6,67): error TS2345: Argument of type '{ readFile: () => Effect.Effect<Uint8Array<ArrayBuffer>, never, never>; }' is not assignable to parameter of type 'Shape'.
  Type '{ readFile: () => Effect.Effect<Uint8Array<ArrayBuffer>, never, never>; }' is missing the following properties from type 'Shape<{ access: Operation<"effect/FileSystem/access", (path: string, options?: { readonly writable?: boolean; readonly readable?: boolean; } | undefined) => Effect<void, FileSystemError, never>>; ... 28 more ...; writeFileString: Operation<...>; }>': access, chmod, chown, copy, and 25 more.
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
typetest/errors/this-shape.ts(7,3): error TS2345: Argument of type '"test/greet"' is not assignable to parameter of type '"The shape declares this: an implementation's receiver is the object that provides it"'.
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
the elaboration below it prints the base type, expanded and truncated by TypeScript, and ends with the missing
members. Round 13's prototype printed `Shape<Members>` there through `interface Members extends Readonly<typeof
members> {}`, a line kept only for printing; round 14 drops it, so the prototype is the recipe as `effect` writes it,
members by name, and both errors read the same way. `this-shape.ts` is a shape declaring `this`, rejected because an
operation passes no receiver. `shared-slot.ts` is the one-name
rule on an alias, a nested record and two overlapping subsets; `one-line-display.ts` is how the one-line form prints,
`Of<"test/Users", { … }>` with its key first, and how a named record prints. `generic-unnamed.ts` is a generic
shape that does not name its key; the overloaded counterpart, `overloaded-unnamed.ts`, compiles now and is deleted (F).
`record-requires-all.ts(8,19)` is the record program run unprovided, which prints the record's name;
`record-requires-all.ts(11,3)` is the same program with two of its thirty operations provided, which prints the
remaining keys as a union, truncated (`missing-twenty.ts(48,19)`, three left, prints three). TypeScript prints the
result of `Exclude` over a union as that union; it cannot print it as "FileSystem minus readFile". The mitigation is a
subset record, which names the members a program uses. The positive assertions,
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

These figures were measured in round 12 and not re-measured since: the repository's `tsc` is now `effect-tsgo` 7.0, whose `--extendedDiagnostics` reports no type or instantiation counts, so round 13's `Operation.Derive` and the Terminal migration are not in them. Check time is not a criterion.

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

**Done on this branch: `effect/Terminal` providers, Node and Bun (issue 11).** In `packages/platform/node-shared`,
`src/NodeTerminal.ts` is split into `src/internal/terminal/<member>.ts`, one module per member (6), plus `input.ts`.
`columns`, `rows`, `size` and `display` are over `process.stdout` only: `Layer.succeed(Terminal.columns,
Effect.sync(() => process.stdout.columns ?? 0))`, the existing `0` fallback. `readInput` and `readLine` share the
internal scoped service `Input` (key `"@effect/platform-node-shared/NodeTerminal/Input"`), which owns the `stdin`,
`readline` and raw-mode setup; each is `Layer.effect(Terminal.readInput, Effect.map(Effect.service(Input.Input),
make)).pipe(Layer.provide(Input.layer))`, so merged they build one `Input`, by layer memoization by reference, which
`node-shared/test/NodeTerminal.test.ts` asserts ("merged readInput and readLine build one Input").
`NodeTerminal.make(shouldQuit)` and `NodeTerminal.layer` keep their signatures and are built from the same modules;
`@effect/platform-node`'s `NodeTerminal` and `@effect/platform-bun`'s `BunTerminal` re-export the six member layers. A
root that only displays never imports `Input`: the bundle test's `main-terminal.ts` carries the `display` module alone,
no `readline`, `emitKeypressEvents` or `setRawMode`, and 0 Stream bytes (B). `DenoTerminal` is untouched, out of scope, and provides
the record whole; its implementation is `NodeTerminal`'s, whose six layers a Deno root can import.

**`effect/FileSystem` consumers (issue 10).** The 57 `yield* FileSystem` sites inside `effect` move, one commit per
module: sites that use a few members call them (`ConfigProvider` directory reads, `Logger` file sinks, `cli`
completions) and expose the precise union, or annotate `FileSystem.ReadOnly` where they want one name; sites that read
and stream files (`HttpServerResponse.file`, `HttpStaticServer`) annotate `FileSystem.ReadOnly |
"effect/FileSystem/stream"`; sites that use many members, or hand the record to other code, keep `yield* FileSystem`.

**Done on this branch: `effect/Terminal` consumers (issue 12).** `effect/Terminal` exports `Interactive`, the subset
record `{ columns, readInput, display }`, and its `InteractiveShape`; a `Layer<Terminal>` satisfies it
(`Terminal.test.ts`). `Prompt.run` reads `Terminal.Interactive`, and the runner (`runWithInput`, `runLoop`) takes
`Terminal.InteractiveShape` by parameter; the nine `yield* Terminal.Terminal` then `terminal.columns` sites read
`Terminal.columns`. `Prompt.Environment` and `Command.Environment` stay whole (`Terminal.Terminal`), so user callbacks
typed against them keep compiling; a command instead carries the requirements of its own params and handler, and
`Command.run` requires those and `Stdio | Terminal.Interactive` ("`Command.Environment`" in the spec).

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
- **A generic shape names its key in its result**, checked by `Derivable` at the definition, rather than an escape
  hatch at every call site: a signature whose type parameter reaches the result cannot be rebuilt with the key added,
  and the message is `The shape of "<key>" is generic: its result must require "<key>"`. Overloaded shapes, up to
  four overloads, are derived overload by overload (`Operation.Derive`) and need not name it. A generic overload
  inside an overload set is derived at its constraint (`unknown`): sound, but less precise, because TypeScript relates
  overload sets with their type parameters erased, so the definition cannot tell. Such a shape names its key in its
  results to keep the parameter; `packages/effect/typetest/Context.tst.ts` pins both (`render`, `coerce`).
- **The record's identity is the union of its members' keys**, declared by the author for libraries so that
  diagnostics keep the name. A prefix type (`` `effect/FileSystem/${string}` ``) prints short but cannot be shown to
  be covered by a merge of member layers; the record interface as the identity, with branded member keys, keeps
  today's names but member layers can never satisfy it.
- **The shape is derived from the operations, and named.** `interface Shape extends Context.Operations.Shape<typeof
  members> {}`: each operation declares its shape once and the record derives the rest, so no hand-written interface
  has to be kept in step. A partial record's headline names `Shape`; the line below prints the base type, truncated,
  and ends with the missing members (C). Every way found to print `Shape` there too exists only for printing: an
  empty second base, `Context.Operations.Named` (round 12), a `Members` interface (round 13), or a dummy optional
  member on `Shape`. None is kept. The headline and the member list are the two facts a reader acts on.
- **The recipe is the floor.** The members cannot come from the shape (types are erased); a helper building operations
  from a table of names would keep every key in every bundle (B, "What a kept key costs"); and TypeScript names a type
  only where a declaration creates it. The member list is written out, as an object of the operations; a namespace import
  would save the list, but it prints `typeof import("<absolute path>")` in diagnostics.
- **No branded phase for unstable modules.** `FileSystem` and `Terminal` are `@stability unstable`, whose policy
  allows a breaking minor, so the identity change ships directly with the codemod and `ReadOnly`, without a period in
  which each operation is branded with the old identity.
- **The members are properties of the key**, so that the one-line form `Context.Operations("app/Users", { find })`
  gives `Users.find(id)`. A member whose name is a property of every key is rejected on the key argument
  (`Operations.Reserved`, which includes `name`) and a defect at construction. The one-line form's type is
  `Operations.Of<Key, Ops>`, which prints its key first (`Of<"test/Users", { … }>`, C), and the key is typed on the
  value (`Users.key: "test/Users"`).
- **The record key is a function, like every other key**, recognised by its brand (`OperationsTypeId`), not by being
  the one key that is a plain object; `Context`'s getters test the brand.
- **A slot has one name in a record.** An alias, a nested record sharing a member, or two overlapping subsets would let
  a write give one slot two values, and an override copy that replaces one name would leave the other stale. Rejecting
  them at the definition (`Operations.Shared` on the key argument; a defect naming both paths at construction) keeps
  the read a function of the slots without re-deriving every path on each override.
- **A record is its members and nothing else.** A slot of the record's own holding the provided object, returned while
  the members agreed with it, needed an equality check per read, views inheriting from class instances, a bound-method
  cache and string semantics for the record's own slot, each a seam: `getOrUndefinedUnsafe` by the record's string
  returned the provided object after an override; overlays and flat maps followed different rules. A record write is
  its members' slots and a record read a plain object of them, assembled the same way on every path; the provided
  object's `instanceof` and identity do not survive a read.
- **A record write is one ordinary overlay per member**, counting as one addition toward `maxDepth`. One overlay
  holding every member by position made `lookup` test every overlay's kind and cost the ordinary read 1.12 to 1.21× in
  a process holding no record; with per-member overlays the `Overlay` type, `lookup`, the flatten and `merge` are the
  branch point's code. The price is the write: about two ordinary writes per member (an overlay and a property of the
  assembled object).
- **Record state is two pieces: `~layout` and `~views`.** Everything fixed at construction (members with their
  positions and nested records, the slot list, slot positions, direct-member names) is one immutable object; the only
  mutable state is one `WeakMap` from storage to the object built there. The one-entry cache, the template and the
  fiber-cached flags are gone: the costs test showed nothing they bought.
- **A read is kept for its storage, built in one walk; one override over a kept read is a copy.** The storage is the
  topmost overlay holding one of the record's slots, or the base map; overlays above it hold other slots and cannot
  change the result, so contexts derived by unrelated writes share it. A read returns the object kept for its storage,
  or builds one from the slots in one walk and keeps it there. The one shortcut: when the storage is an overlay of one
  direct member (an override) and the next storage below it already has a kept object, the read is that object with
  the member replaced, made each time and not kept, so a per-request override leaves nothing in the `WeakMap` and
  costs one copy (A). When the storage below is the base map, the base map's object is built and kept on the way, so a
  layer's flat context read only through per-request overrides builds it once. The shortcut never recurses: a record
  write's own overlays, a subset written over the full record and a stack of overrides are built once, in one walk,
  and kept. Round 12's shortcut recursed through every overlay of a record write (a first read quadratic in the
  members; 35 `Map` operations for 32 now) and never cached a subset over the full record (a copy per member overlay on
  every read; one `has` and one `~views.get` now). "One object per storage" is not promised for an override's read.
- **Presence is `name in value`.** A member whose value is `undefined` is a member: a record holding an optional
  callback set to `undefined` is complete, and `getOption` is `Some`. Only an absent member is the defect.
- **A record provided without a member is a defect at the write**, naming the member's key, rather than a record that
  reads back a member no call can use.
- **One receiver rule.** An operation calls its implementation with no receiver, whatever the call site, and a record
  write binds each function operation's implementation to the object that provides it, plain object or class
  instance; every other member (a value operation, a service, a class constructor) is stored as the object holds it,
  with its identity, `name`, properties and statics. Round 13 had two rules, an own method's `this` being its call's
  receiver and an inherited one bound, so the same `this.find` read the override through a record read, the
  operation through the key, the instance's own through a class, and failed on a bare call. Now `this` is the object
  that provides the implementation from every call site, private fields work, and `this.find` is the object's own,
  never an override, as one closure calls another; a sibling that must see an override is called through its
  operation (`Users.find(id)`). An operation member read back is a bound copy (`"bound find"`), the price of the
  rule; a shape declaring `this` is rejected at the definition, so no type promises a receiver the call does not
  pass. `Context.test.ts` asserts it ("binds an operation's implementation to the object that provides it, from
  every call site", and "keeps a function member's properties, statics and identity through a record write" for the
  other members), and `treeShaking.test.ts` runs the matrix from a bundle (`main-receiver.ts`).
- **A record service reads itself**: `yield*`, `use` and `useSync` on a record key call its read directly instead
  of passing through `Context.get`.
- **No defaults.** Every reason the overridable design was set aside is a reason not to add a defaulted variant;
  `Context.Reference` remains for values that want one, and may be a member.
- **The cost gate is counts only, in the normal test suite.** Counts do not depend on the machine; timing on a shared
  host never decided, so it is not gated, and the benchmark scripts are deleted.
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
  read, in an uncommitted probe (A); nothing relied on the identity (F).
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
