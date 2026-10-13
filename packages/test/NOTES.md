# `@effect/test`: working notes

`effect/test` is an Effect-native test runner meant to replace vitest. This package started as a
walking-skeleton prototype and is now the starting point we iterate on. It is private and not
published, and the Effect monorepo's own test suite is **not** being migrated to it: it is built
on its own. Design decisions live in the map (local, not in the repo); this file records how the
code realises them and what is still a shortcut. Sections below that describe the prototype's
history are kept for context.

## Run it

```sh
pnpm --dir packages/test demo          # = node src/cli/bin.ts examples --seed 1234 (exits 1: there are intentional failures)
pnpm --dir packages/test demo:bun      # the same on Bun
pnpm --dir packages/test demo:deno     # the same on Deno
pnpm --dir packages/test test          # the self-tests: `etest` alone runs the config's `paths` (test/)
cd packages/test
node src/cli/bin.ts config                           # the resolved config, and where each value comes from
node src/cli/bin.ts examples                         # agent reporter (default)
node src/cli/bin.ts examples --reporter human        # coloured tree
node src/cli/bin.ts examples --reporter jsonl        # raw event stream, one Schema-encoded event per line
node src/cli/bin.ts examples --list                  # inspect the tree without running anything
node src/cli/bin.ts examples --list --reporter jsonl # the same tree, as JSON, with resolved options per test
node src/cli/bin.ts examples --tag fixtures --workers 1
node src/cli/bin.ts examples --bail --workers 1
node src/cli/bin.ts --failed                         # re-run the tests that failed in previous runs
node src/cli/bin.ts --changed                        # only tests affected by uncommitted changes (--since main: the branch too)
node src/cli/bin.ts serve &                          # keep a warm test runner; `etest` here then forwards to it
node src/cli/bin.ts mcp                              # MCP server over stdio: run_tests, list_tests, show_config
node src/cli/bin.ts                                  # the self-tests (etest testing itself: the config's `paths`)
node src/cli/bin.ts examples/failures.test.ts --test "examples/failures.test.ts > cause-aware > defect (intentional failure)" --seed 1234
```

Flags: `[paths...] [--list] [--test <id|substring>] [--failed] [--changed] [--since <ref>] [--tag <t>] [--seed <n>] [--workers <n>] [--bail] [--reporter agent|human|jsonl] [--config <file> | --no-config]`.
The CLI is built with `effect/cli`, so `--help`, `--version` and shell completions come for free, and invalid flags are reported on stderr. It is one-shot and never interactive. It exits 0 when everything is green and 1 otherwise; Ctrl-C exits with 130. Discovery
finds `*.test.ts` files under the given paths.

- **Never green when nothing ran.** A path that doesn't exist, or a selection with no tests (no test files, no tests in them,
  or nothing matching `--test` / `--tag` / `--failed`), is an error on stderr with the reason, exit 1. A file whose listing
  fails for any reason (a load error, or an executor that died) is reported as a failed `load` entry instead of vanishing.
- **Output contract.** `--reporter jsonl` is versioned (`schemaVersion` in `RunPlanned`) and documented in `EVENTS.md`.
  Every reporter prints what was selected and how (`selected 3 of 60 tests in 8 files (examples); --test "fees"`). Each
  test has a short id (8 hex characters of a hash of its full id, stable across runs) that `--test` accepts and rerun
  hints use. A rerun hint repeats how the run was started: the package script for `pnpm run <script>` /
  `npm run <script>` (from the directory it was run in), else `node src/cli/bin.ts` (`src/cli/invocation.ts`; a client
  forwarded to `etest serve` sends its own). Overlapping paths find a file once. A closed stdout (`etest | head`) stops the output but not the run, and the exit code is kept. Usage errors
  print only the error and a `--help` hint (`helpOnError: false`, added to effect/cli for this).
- **`--changed` / `--since <ref>`** (`src/cli/Changed.ts`) run only the test files affected by uncommitted changes (staged,
  unstaged, untracked), plus, with `--since`, what changed on the branch since it left `ref`. A test file is affected when it
  or anything it imports changed; imports are followed statically (relative imports, and packages that resolve to source
  inside the repo, i.e. workspace packages; never `node_modules`). A changed test config affects everything. No changes, or
  nothing affected, says so and exits 0.
- **`--failed`** re-runs the failures recorded in `node_modules/.cache/etest/last-run.json` (`src/cli/LastRun.ts`). The record
  is merged across runs: tests that ran replace their entry (a pass removes it), others are kept, and entries whose file no
  longer exists are dropped. A file that failed to load is recorded by its file id and re-runs as a whole. No record is an
  error; an empty record says so and exits 0.
- **`etest serve`** (`src/cli/Server.ts`) keeps a test runner running for the working directory. While it runs, `etest` there
  forwards its command line over a socket (`src/cli/socket.ts`: `$TMPDIR/etest-<hash of cwd>.sock`, a named pipe on Windows)
  and relays output and exit code; `bin.ts` checks for it before loading anything heavy. `--no-server`, `--help`, `--version`
  and `serve` itself always run locally. Correctness first: executors cache the modules they load, so a set of executors is
  used for **one run only** and user code is always loaded fresh; what stays warm is the server (CLI and coordinator) and the
  next run's executors, started while the current run goes. Runs are served one at a time; a client that disconnects
  (Ctrl-C) interrupts its run; a server that dies mid-run makes the client exit 1; a stale socket falls back to a local run.
  Measured (Node, median of 7): one file 626 ms local → 192 ms via the server; the 60 example tests 932 ms → 445 ms. Works on
  Node, Bun and Deno (a Node client can forward to a Bun or Deno server).
- **`etest mcp`** (`src/cli/Mcp.ts`) serves the test runner as an MCP server over stdio, built on `effect/ai/McpServer`, with
  two tools: `run_tests` (paths, test, tag, failed, changed, since, seed, bail → `{ exitCode, passed, output }`, where
  `output` is the agent report) and `list_tests` (paths, test, tag → the tree with short ids). Each call runs an `etest`
  command line in-process (`runCommandLine`, shared with `etest serve`) with captured output, executors one run ahead,
  one call at a time. Works on Node, Bun and Deno. Gap: on Bun and Deno a raw `console.log` inside a test reaches the
  shared stdout, which in MCP mode is the protocol channel (Node pipes worker output to stderr).
- **Startup.** `bin.ts` turns on Node's on-disk compile cache before anything heavy is loaded, then imports `main.ts`; the
  Node platform passes the cache directory to its executor workers (`NODE_COMPILE_CACHE`). This roughly halves startup.
- **Config** (`etest.config.ts`, `src/cli/Config.ts`, `src/cli/root.ts`; decided in the _Config surface_ ticket). Found by
  walking up from the working directory to the nearest `etest.config.ts`, stopping at the repository root (`.git`); or
  `--config <file>`; none with `--no-config` (both together are an error). **Its directory is the project root**: a run moves
  there, so test ids, seeds, short ids, the `--failed` record and the server socket are the same from any subdirectory
  (without a config the working directory is the root). Paths given on the command line are relative to where you are, and
  rerun hints are written relative to it too. The keys, all optional, unknown ones an error (compile time and load time):
  - `paths`: where to look when no paths are given (default `.`); **paths on the command line replace them**.
  - `exclude`: globs (relative to the root; `*` within a segment, `**` across) skipped while searching directories, on top
    of the built-in `node_modules` and dot-directories. Naming a path opts it in: a file named directly is never excluded,
    and a directory that is itself excluded is searched in full when named.
  - `workers`: the default for `--workers` (built-in 2).
  - `defaults: { timeout, retries }`: defaults for test options. The nearest suite or test that sets one wins, then the
    config, then the built-in default (timeout 60 s, no retries). A test that passes in over 5 s is reported as `SLOW`.
  - `shared`: layers shared by the run (below). They only optimise: a file passes without them.

  A config that doesn't load or isn't valid fails the run with the reason (`etest: etest.config.ts: unknown key "timeout"
  (did you mean ...)`). Every report's selection line names the config (`...; config etest.config.ts` / `no config`), and
  `RunPlanned.selection` carries `root` and `config`. `etest config` (and the MCP tool `show_config`) prints each resolved
  value and where it comes from. The coordinator imports the config for its plain values (re-imported when the file
  changes, so `etest serve` sees edits; modules it imports are not re-read); the executors import it for `shared`, fresh
  every run. A path that yields no test file (a file that isn't a `*.test.ts`, a directory without any) is an error, and
  overlapping paths find a file once. `--changed` runs everything when the config, a `package.json`, a `tsconfig*.json` or a
  lockfile changed.

## Layout

**Core vs CLI.** Everything in `src/` outside `src/cli/` is runtime- and transport-independent: the coordinator needs an
`RpcClient` for `ExecutorRpcs`, the executor (`Executor.layer`) needs an `RpcServer.Protocol`. `src/cli/` is the local host:
it detects the runtime, provides that runtime's services, runs executors as workers (the pool and the worker entries), and
wires both sides together.

| File                                                        | Role                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/Test.ts`                                               | Authoring API (syntax B): `Test.suite`, `Test.test` (an Effect, or a plain sync / Promise function), pipeable `Test.provide(layer)`, `Test.config({ shared })`, and the transformers `Test.tags` / `Test.timeout` / `Test.retries` / `Test.skip` / `Test.only`. Nodes carry a phantom `R`, and `Test.Runnable = Node<never>`                                                                                                                                                                           |
| `src/CallSite.ts`                                           | Call-site capture from the V8 stack (`file:line:col`, no transform)                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `src/Protocol.ts`                                           | Schema'd `TestEvent` union, the listing schema, and the `ExecutorRpcs` RpcGroup (`ListFile`, `RunFile` → `Stream`)                                                                                                                                                                                                                                                                                                                                                                                     |
| `src/Executor.ts`                                           | Loads a file, lists its tree, and runs the selected tests as fibers with fixtures, the test environment, timeouts, retries and Cause classification Also `layer`: the executor serving `ExecutorRpcs` over any `RpcServer.Protocol` (transport-independent)                                                                                                                                                                                                                                            |
| `src/cli/executor/{node,bun,deno}.ts`                       | One executor entry per runtime: `Executor.layer` over the worker protocol (`RpcServer.layerProtocolWorkerRunner` plus that runtime's worker runner), under its `runMain`. The CLI's platform for a runtime spawns that runtime's entry, so executors never detect their runtime                                                                                                                                                                                                                        |
| `src/Coordinator.ts`                                        | Discovery, planning (nearest-wins options, seeds, filters, only/skip), dispatch over the executor pool, bail, and the completeness guarantee                                                                                                                                                                                                                                                                                                                                                           |
| `src/Reporters.ts`                                          | `agent`, `human` and `jsonl` reporters                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `src/Assert.ts`                                             | Assertions: plain functions that throw (`equal`, `some`, `failure`, `tag`, `includes`, `every`, `closeTo`, `decodes`, ...), plus `eventually` / `always` (Effects, on the TestClock) and `soft`. See "Assertions" below                                                                                                                                                                                                                                                                                |
| `src/Matcher.ts`                                            | Matcher values for inside an expected value (`any`, `partial`, `unordered`, `schema`, `where`, `make`, ...) and the `Expected<A>` type                                                                                                                                                                                                                                                                                                                                                                 |
| `src/AssertionError.ts`, `src/AssertionRecord.ts`           | The failure as data (headline, label, mismatches by path), and each test attempt's record (count, failures, pending assertion Effects)                                                                                                                                                                                                                                                                                                                                                                 |
| `src/internal/compare.ts`                                   | The comparison behind `equal` and the matchers: `Equal.equals` semantics plus a prototype check, as a walk that reports every differing path                                                                                                                                                                                                                                                                                                                                                           |
| `test/*.test.ts`                                            | Self-tests, run with etest itself: `node src/cli/bin.ts test` (`test/fixtures/` holds files the runner tests run)                                                                                                                                                                                                                                                                                                                                                                                      |
| `src/cli/Cli.ts`                                            | The `etest` command, built with `effect/cli` (`Command`, `Flag`, `Argument`). A red run fails with an `ExitCode` error carrying `Runtime.errorExitCode`, marked as already reported                                                                                                                                                                                                                                                                                                                    |
| `src/cli/bin.ts`                                            | Launcher: forwards to `etest serve` when one is running for this directory; otherwise turns on Node's compile cache and imports `main.ts`                                                                                                                                                                                                                                                                                                                                                              |
| `src/cli/Server.ts`, `src/cli/socket.ts`                    | `etest serve`: the warm server, its executors one run ahead, and the socket protocol (line-delimited JSON)                                                                                                                                                                                                                                                                                                                                                                                             |
| `src/cli/Config.ts`, `src/cli/root.ts`                      | The test config: found (walking up to `.git`), validated (unknown keys are errors), shown (`etest config`); the project root                                                                                                                                                                                                                                                                                                                                                                           |
| `src/cli/invocation.ts`                                     | The package script a run was started with (`pnpm run test`), for rerun hints                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `src/cli/Output.ts`                                         | Where the CLI's output goes: this process's stdout/stderr, or a server request's client                                                                                                                                                                                                                                                                                                                                                                                                                |
| `src/cli/Mcp.ts`                                            | `etest mcp`: the `run_tests` and `list_tests` tools over stdio                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `src/cli/main.ts`                                           | The CLI program: `makePlatforms({ node, bun, deno })` (lazy imports of `platform/*.ts`), then `platforms.run(Command.run(cli, ...))`                                                                                                                                                                                                                                                                                                                                                                   |
| `src/cli/LastRun.ts`                                        | The merged record of failing tests behind `--failed`, kept by wrapping the active reporter                                                                                                                                                                                                                                                                                                                                                                                                             |
| `src/cli/Platform.ts`                                       | Generic runtime platforms (imports nothing from the CLI or the test runner). A platform module default-exports `makePlatform({ layer, run })`, its services inferred from the layer. `makePlatforms({ node, bun, deno })` infers the services every platform provides (`Services<I>`, the common members) and returns `load` and `run`, which imports only the current runtime's module (detected from the `Bun` / `Deno` globals), provides its layer to `main` and hands it to that platform's `run` |
| `src/cli/platform/{node,bun,deno}.ts`                       | The CLI's platform per runtime, e.g. `NodeServices.layer` plus `NodeWorker.layer(spawn)`                                                                                                                                                                                                                                                                                                                                                                                                               |
| `examples/helpers.ts`                                       | A custom assertion: a plain function made of other assertions                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `examples/*.test.ts`                                        | Every feature, including intentional failures (marked "(intentional failure)" in the test or suite name)                                                                                                                                                                                                                                                                                                                                                                                               |
| `examples/userRepoContract.ts`, `examples/contract.test.ts` | A contract suite written once (`Suite<UserRepo>`) and provided with two implementations                                                                                                                                                                                                                                                                                                                                                                                                                |
| `examples/typecheck.ts`                                     | Asserts that every test file's default export `satisfies Test.Runnable`, which is what the CLI would generate                                                                                                                                                                                                                                                                                                                                                                                          |
| `examples/typecheck-negative.ts`                            | `@ts-expect-error` cases proving that a missing `Test.provide` is a compile error                                                                                                                                                                                                                                                                                                                                                                                                                      |

## Default decisions and how they were realised

1. **Tests are values (syntax B, see below).** A test file's `export default` _is_ its tree: a `Test.suite(...)` or a single
   `Test.test`. Nothing registers globally on import. If the default export is not a tree, the file fails with
   `no tests exported from <file>`, reported as a failed pseudo-test of kind `load`, or as `LOAD ERROR` under `--list`. Options (`timeout`, `retries`,
   `tags`, `skip`, `only`) are data on the node, given inline or through pipeable transformers. The coordinator
   resolves them nearest-wins: tags are unioned, and `skip` and `only` are inherited. Each node captures its definition site from the stack.
   Test ids are `file > suite > … > test`. The root suite's name is shown in `--list` but left out of ids, because the file already
   identifies the root.
2. **No lifecycle hooks; fixtures are Layers, attached with one `Test.provide`.** Lifetime is where the layer is attached,
   exactly like `Effect.provide`:
   - on a suite: built once, lazily, on the first test that runs, in the suite's own MemoMap and Scope. Reused by every test
     below it and released when the last of them finishes. On the root suite this means "once per file".
   - on a test: built for every **attempt**, in the attempt's MemoMap and Scope. Same as `Effect.provide` in the body.
     Reuse follows Effect's MemoMap semantics. MemoMaps are forked down the tree (run → suite → … → test attempt), so a layer
     value already built further out is reused, including by `Effect.provide` inside a test body. `Layer.fresh(layer)` opts out.
     Provide once per node, as with `Effect.provide`: compose the layers first (`Layer.provide`, `Layer.provideMerge`,
     `Layer.mergeAll`). Providing at different levels (a suite, then a test below it) is how lifetimes are chosen; an outer
     level's fixtures are built first and can feed inner ones. `--list` labels a fixture by where it was attached (`file:line`) unless given `{ name }`. A suite with no selected tests
     never builds its layers. A fresh fixture for every test in a suite is written per test (`tests.map(Test.provide(layer))`),
     and a reusable suite that needs that takes its layer as a parameter (`userRepoContract(InMemoryUserRepo)`).
     **Cross-file sharing is config, and shared layers only optimise.** The config's `shared` (see **Config** above) lists
     layers shared by the run. Each is built lazily, the first time any file provides
     that same Layer value, from the run's context (not the asking file's), detached from the asking test, kept until the run ends;
     a failed build is recorded for the run. This is a custom MemoMap at the root of the fork chain. Every file still provides
     everything it needs, so it type-checks and runs alone; `Test.provide(Layer.fresh(layer))` opts a file out. Shared layers must
     have no requirements (`Layer<A, E, never>`, a compile error otherwise). **In this prototype "the run" is one executor
     (worker); the real design is coordinator-owned.** The examples give identical results with and without the config, and
     a probe confirmed that two files in one worker share one `Database` with the config and get one each without it.
3. **Test environment by default.** Every attempt runs with a fresh `TestClock`, a `TestConsole`, and `Random.withSeed(seed)`.
   The per-test seed is `fnv1a("<runSeed>:<test id>")`, so a rerun of one test with `--seed <runSeed>` reproduces it exactly.
   The seed is in every `TestFinished` event and in the agent output. Console output is captured per test. The agent
   reporter shows it only for failing tests; the jsonl reporter always includes it. The TestClock examples are in
   `basics.test.ts`. Auto-advance is not implemented.
4. **Real interruption.** The per-test timeout is `Effect.timeoutOption`, applied _outside_ the TestClock (so it is real time)
   but _around_ the body's own `Effect.scoped`. On timeout the body fiber is interrupted, its finalizers run, and only then is the
   console read. The sample output shows `released connection (finalizer ran on timeout)`. `--bail` races the whole
   dispatch against a `Deferred`. That interrupts every in-flight `RunFile` stream, the Rpc client sends `Interrupt` to the
   worker, and the worker interrupts the test fibers. Ctrl-C works the same way: `runMain` interrupts the program, and a
   finalizer in a worker was observed to run.
5. **No silent greens.** If the body's _result_ is an Effect, the test fails with `discardedEffect`: a plain function
   returning an Effect, an async function resolving to one, or an Effect producing `Effect<Effect>`. A bare `function*`
   type-checks as a plain function but only returns an unstarted generator, so that fails too, with a hint to write
   `Effect.gen(function*() {...})`. With the assertion record (point 6) a test also fails when:
   - it made no `Assert.*` call (`noAssertions`; opt out with `Test.noAssertions` on the test or a suite);
   - a failed assertion's error was caught, or thrown in a fiber the test never joined (reported with a `note`);
   - an assertion Effect or Promise (`eventually`, `always`, `soft` of an Effect, `rejects`) was built but never run
     (`discardedEffect`, at the line that built it).
6. **Assertions** (`src/Assert.ts`, `src/Matcher.ts`; decided in the _Assertions_ ticket, proposal R3).
   - **Shape.** Plain synchronous functions that throw an `AssertionError` (ours, carrying the failure as data). Only the
     assertions that wait return an Effect (`eventually`, `always`, `soft(effect)`) or a Promise (`rejects`,
     `soft(async)`). Matchers are values for inside an expected value; a custom assertion is a function of assertions, a
     custom matcher `Matcher.make` / `Matcher.where`. No chains, no registry.
   - **Narrow and return.** Assertions that prove something return it, and are always fatal: `some`, `success`,
     `failure` (exactly one typed failure in an Exit's Cause; annotations don't matter), `defect`, `tag`, `instanceOf`,
     `defined`, `single`, `includes` (on an iterable), `match`, `throws`, `rejects`, `decodes`. `isTrue` is the only
     `asserts` function.
   - **Equality.** `equal` follows `Equal.equals` (structural, `Equal` implementations decide for themselves) and also
     requires a shared prototype for objects. `expected` may contain matchers; partial matching is explicit
     (`Matcher.partial`). A failure lists every differing path (`["a"]["b"]: expected 1, got 2`). An Effect or Promise as the
     actual value fails with a "forgot `yield*` / `await`?" hint. The expected value's type is checked against the actual
     value's (`[A] extends [infer B] ? Expected<B> : never`, which works like `NoInfer` without breaking the inference of
     calls like `Option.none()`).
   - **The record.** Each test attempt gets an `AssertionRecord`: a `Context.Reference` for Effect tests (forked fibers
     inherit it), a module variable for plain tests, which therefore run one at a time per executor (no
     AsyncLocalStorage). Every call is counted (`assertions` in `TestFinished`), and every failure is recorded before it is
     thrown. Only `throws` / `rejects` (failures inside are expected), `eventually` (retried) and `soft` (collected)
     handle failures inside them.
   - **eventually / always** advance the TestClock by `interval` between attempts (so sleeping code makes progress and
     nothing waits for real), or sleep on a live clock (inside `TestClock.withLive`). Only assertion failures are retried.
     This does not need general TestClock auto-advance.
   - **soft** collects failed value checks; narrowing assertions still end the body. One failure stands for all, and the
     executor reports each collected failure on its own.
   - **Failures reach reporters as data**: `message` (one line), `label`, `mismatches[]`, `location` (the deepest frame in
     the test file, so a helper's failure points at the test's line), `origin` (the helper's frame) and `note`. The
     coordinator adds `source` (the lines up to the location) and reporters print a code frame with a caret.
   - Other libraries' `AssertionError`s (`node:assert`: name `AssertionError` or code `ERR_ASSERTION`) are still reported
     as kind `assertion` with their own message, but they are not counted.
     **Locations without a transform:** the stack's frames outside the framework or `effect`, `file:line:col` (Node's type
     stripping keeps columns exact). On Bun (JavaScriptCore) a tail call (`() => helper()`) leaves no frame of its own, so
     such a failure is located in the helper.
7. **Cause-aware failures.** The exit Cause is classified as a typed `Fail` (shows `_tag` plus fields, located from
   the error's construction stack), a `Die` (defect: name, message, location), an interrupt-only Cause (`interrupted`) or a timeout.
   A defect that is an `AssertionError` is reported as kind `assertion`. Fixture build failures are their own kind (`fixture`,
   naming the layer and whether it is shared).
8. **Coordinator plus executor pool over Rpc.** `ExecutorRpcs` is an `RpcGroup` with
   `ListFile({ path }) -> { file, nodes }` and `RunFile({ path, concurrency, tests }) -> Stream<TestStarted | TestFinished>`.
   The executors are workers of the current runtime (Node worker threads, Bun or Deno workers; the platform provides the
   spawner and runner). On Node: `NodeWorker.layer` and `RpcClient.layerProtocolWorker({ size: --workers, concurrency: 4 })` (in `cli/Cli.ts`) on the
   coordinator side, `NodeWorkerRunner.layer` and `RpcServer.layerProtocolWorkerRunner` in the worker). Each executor runs up
   to K=4 files as concurrent requests (fibers), and each file runs up to T=8 tests concurrently (a Semaphore). The pool
   balances files across workers. The coordinator only ever talks to executors through `ExecutorRpcs`: listing
   happens executor-side, so the coordinator never imports user code. **The wiring worked first time; no fallback was needed.**
9. **Event protocol.** The `TestEvent` union is `RunPlanned` (every planned id up front, with resolved options and seed) |
   `TestStarted` (per attempt) | `TestFinished` (`status`: passed / failed / skipped / timedOut / interrupted, `durationMs`,
   `seed`, `attempt`, `previousAttempts`, `failures[]`, `console[]`) | `RunFinished` (counts, `bailed`, `cancelled`). Ids are
   `file > suite > … > test`. **Every planned id ends in exactly one terminal event.** The coordinator dedupes, and in an `ensuring`
   block it synthesises `interrupted` (started) or `skipped: not run: --bail|Ctrl-C` (not started) for anything left. This was checked on
   a bail run: 37 planned, 37 terminal, 37 unique. A file that fails to load becomes a failed pseudo-test with the load error.
10. **Reporters.** `agent` (the default) prints a one-line summary first, then failure blocks in plan order (deterministic
    no matter how the tests were scheduled). Each block has the id, status, attempt and seed, the failure data, its `file:line:col`, the captured console
    (bounded to 20 lines) and an exact rerun command. FLAKY, SKIP and BAIL lines come after. No ANSI. `human` prints a coloured
    ✓/✗/○ tree plus failure blocks. `jsonl` streams Schema-encoded events as they arrive.
    `--list --reporter jsonl` prints the listed nodes as JSON, with resolved per-test options.
11. **CLI**: plain `node:util.parseArgs` (quicker than wiring `effect/cli` for a prototype), one-shot.

## What was hard or surprising

- **Almost nothing in the Effect stack fought back.** The Rpc worker pool with a streaming RPC, interrupt propagation into
  the worker, `Layer.buildWithMemoMap` for suite, test and shared fixtures, and TestClock/TestConsole/seeded
  Random all worked as documented. The whole design is mostly composition of existing primitives.
- **Node type stripping rejects parameter properties** (`constructor(readonly x: X)`). The worker died with an opaque
  `WorkerReceiveError: An error event was emitted`, and the real SyntaxError was lost in the Rpc/worker error path. Agents
  need executor crash causes surfaced verbatim. The prototype now prints the cause chain, but the underlying error object
  carries little detail.
- **Scope placement matters for "finalizers ran".** At first the body's `acquireRelease` attached to the _attempt_ scope,
  so finalizers ran _after_ the console had been captured, and the report claimed they ran when the output showed they hadn't.
  The body needs its own Scope, closed inside the timed region. The spec should state precisely which scope a test body's resources belong to.
- **Startup cost dominates small runs.** A one-test rerun takes about 650 ms, nearly all of it spent evaluating `effect` from TS source
  (about 600 ms per isolate: once in the coordinator, once per worker). The tests themselves take milliseconds. Long-lived or warm
  executors (watch/daemon) and a built `effect` matter more than scheduling cleverness.
- **Locations of helper-built tests are ambiguous.** Locations captured at `Test.test(...)` point at the helper when tests
  are built by a factory (`fixtures-a.test.ts:35` for every suite). The location is accurate but ambiguous. Parameterised tests need the id to
  carry the parameters.
- **Typed fixtures were cheap to add** (syntax B). A covariant phantom `R` on nodes is enough, plus `Requirements<Children[number]>`
  in `Test.suite` and a conditional type in `Test.provide`. Details and limits are in the "Syntax B" section.

## What this says about the open tickets

- **Authoring model.** Tests-as-values with options-as-data feels natural. It makes `--list`, filtering and planning trivial and
  side-effect-free: listing happens in the executor, and the coordinator never imports user code. With syntax B, fixture requirements are
  **type-checked**: a missing `Test.provide` is a compile error that names the missing service. The catch is _where_ the
  error appears. A default export can't constrain its own type, so the check lives in an aggregator (`examples/typecheck.ts`),
  which a real CLI would generate. The same tree value can be reused (contract tests) because nodes are just values: ids come
  from the position in the tree, not from the object. There is a single
  `Test.test` (like ZIO Test's `test`): its body is an Effect, or a plain function (awaited if it returns a Promise).
  A function never "returns an Effect to run": the Effect itself is the body. Generators are written `Effect.gen(function*() {...})`, as everywhere in Effect.
- **Isolation and execution model.** Long-lived pooled workers that run many files as fibers work. Module state is shared per
  worker, and that sharing is exactly what makes config-shared layers possible, but it also means two files in one worker can see each
  other's module-level state (`examples/shared.ts` counters). Re-running a file in the same worker would reuse the cached
  module (no reload), so the prototype has no per-file isolation. A truly run-wide shared layer (one per run, not per executor)
  needs the coordinator to own the MemoMap and serve the instance over the protocol. That is the main gap between the prototype and the decided semantics.
- **Runner architecture.** Coordinator ↔ executor over one `RpcGroup` holds up. Plan-first (`ListFile` → `RunPlanned`), stream
  per file, and bail/Ctrl-C as plain interruption with a coordinator-side completeness pass are a good fit. One wrinkle: on
  interruption, executor-side terminal events are lost because the stream is torn down. The coordinator therefore synthesises them and
  can't say _what_ the test was doing. A "drain" phase, where the executor emits final events for interrupted tests before the stream closes,
  would give better data (and hang diagnostics would live there too).
- **Agent-first interaction.** A one-line parseable summary, failures-first blocks in plan order, the exact rerun command, the seed, and the console
  only for failures read well and stay bounded. Things to decide: whether ids should be shorter, since `file > suite > name`
  is long in rerun commands; whether the per-test seed or the run seed should be the replay token (the prototype uses the run seed plus the id); how
  to collapse bail/cancel noise (done here as one `BAIL n interrupted, m not started` line); and whether flaky passes
  belong in the default output (shown here as `FLAKY` lines).

## Known shortcuts

- Config-shared layers are built once per executor (one root MemoMap per worker). There is no coordinator-served fixture.
- No module reloading or isolation between files in a worker. Plain `console.log` from tests goes to the worker's stdout,
  which is piped to the coordinator's **stderr** (not attributed to a test). Only Effect `Console` output is captured per test.
- Promise tests can't be cancelled. Timing out a Promise test interrupts the fiber, but the promise keeps running.
- Plain (sync / Promise) tests run one at a time per executor, so their assertions find the right record without
  AsyncLocalStorage. An assertion in a Promise callback of an _Effect_ test (`Effect.promise(() => p.then(() => Assert...))`)
  has no fiber either, and is attributed to the plain test running at the time, if any. So is one made by a timed-out plain
  test whose promise kept running.
- Only `Assert.*` calls count as assertions. A test that only uses `node:assert` (or `effect/testing/TestSchema`) fails the
  zero-assertion check unless it is marked `Test.noAssertions`.
- Retries reuse the same seed for every attempt. Retries are meant for environmental flakes, not random ones.
- No watch mode, snapshots, result cache, remote executors, property tests, general TestClock auto-advance (only
  `Assert.eventually` / `always` advance it), hang dumps or leak detection.
- The K=4 files per executor and T=8 tests per file are hard-coded (`Cli.ts`); the slow threshold (5 s) too.
- No projects: one config per directory tree, run per package. Project discovery is researched in its own ticket.
- `--test` is an exact-id match when the id exists and a substring match otherwise. Duplicate test names in one suite produce
  duplicate ids, which are not detected.
- `--list` prints node definition sites, but plain ids only in `--list --reporter jsonl`.
- The type-level `Runnable` check needs the hand-written `examples/typecheck.ts`. A test file that isn't listed there isn't checked.
- `tsc` (with `tsconfig.json` here) is clean except for effect-language-service `apiStabilityLeak` lints about unstable Rpc types.

## Syntax B (the chosen authoring syntax)

Before (first iteration):

```ts
export default Test.file([
  Test.suite("users", [
    Test.test(
      "first",
      Effect.gen(function*() {
        const db = yield* Database /* ... */
      })
    )
  ], { layers: [Test.layer(Seeds.layer, { name: "Seeds", scope: "suite" })] })
], {
  tags: ["fixtures"],
  layers: [Test.layer(Database.layer, { name: "Database", scope: "run" })]
})
// R is `any`: forgetting the Database layer compiles and fails at runtime with a "service not found" defect
```

After (syntax B, one `Test.provide`):

```ts
// provided on a test: built for every test
const test = (name: string, suite: string) => Test.test(name, checks(suite)).pipe(Test.provide(Tx.layer))

// Suite<Database | Schema_ | Seeds>  ->  Suite<Database | Schema_>
const suite = (name: string) =>
  Test.suite(name, [test("first", name), test("second", name), test("third", name)]).pipe(
    Test.provide(Seeds.layer) // once per suite
  )

// One provide per node, layers composed first: Database feeds Schema and stays available to the tests.
export default Test.suite("fixtures", [suite("users"), suite("orders")]).pipe(
  // root suite = once per file; Database is the run's shared instance with the config
  Test.provide(Schema_.layer.pipe(Layer.provideMerge(Database.layer))),
  Test.tags("fixtures")
) // Suite<never>
```

```ts
// etest.config.ts
export default Test.config({
  shared: [Database.layer]
})
```

The contract (`examples/userRepoContract.ts`) is a function of the implementation's Layer that provides it to each of its
tests, so every test gets a fresh repo. The fake-postgres implementation deliberately has no unique index, so its
`emails are unique` test fails, and its location points into the shared `userRepoContract.ts`:

```ts
export default Test.suite("UserRepo", [
  Test.suite("in-memory", [userRepoContract(InMemoryUserRepo)]),
  Test.suite("fake postgres (intentional failure: no unique index)", [userRepoContract(FakePostgresUserRepo)]).pipe(
    Test.provide(PgPool.layer) // one pool for the suite
  )
])
```

### How the typing works

- Every node has a phantom, covariant `"~requires": (_: never) => R`. It exists only in the types and is never set at runtime.
- `Test.test(name, effect)` takes the Effect's `R`, minus `Scope`, because the body gets its own Scope. A plain function is `never`. The default test
  services (TestClock, TestConsole, Random) are `Context.Reference`s in v4, so they never show up in `R` and need no exclusion.
- `Test.suite(name, children)` is `SuiteNode<Requirements<Children[number]>>`: the union of what its children need. It is inferred
  through a `const` type parameter.
- `Test.provide(layer: Layer<ROut, E, RIn>)` maps `Node<R>` to `Node<Exclude<R, ROut> | RIn>`. Transformers preserve the type.
- `Test.Runnable = Node<never>`. A test file's default export must satisfy it. `examples/typecheck.ts` checks that for every file.
- Hover types read well: `SuiteNode<Database | Seeds | Tx>`.

### What it catches

`examples/typecheck-negative.ts` (the `@ts-expect-error`s are consumed, so `tsc` passes. Delete them and it fails):

```ts
// Not a test file. Proves that a missing fixture is a COMPILE error: each line below is an
// unsatisfied tree, and `tsc` fails if any `@ts-expect-error` is unused.
import * as Test from "../src/Test.ts"
import { Database, Schema_ } from "./shared.ts"
import { userRepoContract } from "./userRepoContract.ts"

// the contract suite needs a UserRepo and nobody provided one
// @ts-expect-error
const unprovided: Test.Runnable = Test.suite("UserRepo", [userRepoContract])

// Schema_ is provided, but its own requirement (Database) is not
// @ts-expect-error
const halfProvided: Test.Runnable = Test.suite("db", [
  Test.test(
    "reads schema",
    Effect.gen(function*() {
      yield* Schema_
    })
  )
]).pipe(Test.provide(Schema_.layer))

// fully provided: compiles
const ok: Test.Runnable = Test.suite("db", [
  Test.test(
    "reads schema",
    Effect.gen(function*() {
      yield* Schema_
    })
  )
]).pipe(
  Test.provide(Schema_.layer),
  Test.provide(Database.layer)
)

export { halfProvided, ok, unprovided }
```

Actual `tsc` errors with the `@ts-expect-error` lines removed:

```text
examples/typecheck-negative.ts(7,7): error TS2322: Type 'SuiteNode<UserRepo>' is not assignable to type 'Runnable'.
  Type 'SuiteNode<UserRepo>' is not assignable to type 'SuiteNode<never>'.
    Type 'UserRepo' is not assignable to type 'never'.
examples/typecheck-negative.ts(10,7): error TS2322: Type 'SuiteNode<Database>' is not assignable to type 'Runnable'.
  Type 'SuiteNode<Database>' is not assignable to type 'SuiteNode<never>'.
    Type 'Database' is not assignable to type 'never'.
```

And when `Test.provide(Database.layer, ...)` is deleted from `examples/fixtures-a.test.ts`, the error surfaces in the aggregator:

```text
examples/typecheck.ts(15,11): error TS1360: Type 'SuiteNode<Database>' does not satisfy the expected type 'Runnable'.
  Type 'SuiteNode<Database>' is not assignable to type 'SuiteNode<never>'.
    Type 'Database' is not assignable to type 'never'.
```

### Typing limitations found

- **The error is far from the cause.** A default export can't constrain its own type, so the error appears in the
  aggregator (or at a `const x: Test.Runnable` annotation), not on the line that forgot the `provide`. Options: generate the aggregator
  from discovery (`etest typecheck`), require `export default ... satisfies Test.Runnable` in every file (noisy), or use an
  effect-language-service diagnostic.
- **The message says _what_ is missing but not _which test_ needs it.** `Type 'Database' is not assignable to type 'never'` names the
  service, but the requirement has been unioned up the tree. A custom message would need a branded `Missing<Database>` type.
- **Over-providing is silent.** Providing a layer nothing needs compiles without complaint. (A config-shared layer with requirements is a compile error.)
- **Sharing depends on object identity.** The config and the files must use one exported Layer value. A look-alike layer written
  inline is a different value and is not shared. Layers _inside_ a composed layer are still matched one by one.
- **Several `Test.provide`s on one node** still work (a later one wraps the earlier ones), but like several `Effect.provide`s
  they are an anti-pattern: compose the layers and provide once. Nothing enforces this yet.
- **`exactOptionalPropertyTypes` noise.** With an _optional_ phantom property, every error carried the extra line "Consider adding
  'undefined'…". Making the phantom required (type-only) removed it.
- **No variance surprises** in the cases tried. `TestNode<any>` is not assignable to `TestNode<never>`, which is correct but means framework
  internals have to use `Node<any>` throughout. Higher-order inference through `pipe` with the generic `provide` worked without annotations.
- **Names are not in the Layer.** A Layer has no runtime record of what it provides. The prototype derives fixture names from the call
  site's source text (`Seeds.layer`), which works for simple arguments but not for multi-line or computed ones (those get `layer#n`). Layer-graph
  introspection (generalisable primitive #2 in the map) would give the provided service keys instead.

## Sample output

Run `pnpm --dir packages/test demo` (agent reporter), add `--reporter human`, or `--list`, to see current output.
The demo exits 1 on purpose: `examples/failures.test.ts` and parts of `examples/options.test.ts` fail intentionally.
