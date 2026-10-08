# Fiber runtime benchmarks

Measurement harness for fiber-runtime work: throughput (paired base/head), memory
(forced-GC experiments) and CPU/heap profiles. It runs async workloads, which
`packages/effect/runtimeperf` cannot.

All commands run from the repository root through the flake:
`nix develop --command <cmd>` (Node 26, Bun, Deno). Results go to
`tmp/fiberperf/` (gitignored).

## Design

- `workloads.ts` is the single registry. A workload is
  `{ name, group, description, size, make(E, size) => { run, validate, metrics? } }`.
  `E` is the effect module namespace loaded at runtime from
  `<root>/packages/effect/src/index.ts`. Workloads only use type imports, so the
  same file measures any checkout and both sides of a comparison run identical
  workload code.
- `run()` executes one iteration (usually `Effect.runPromise` of a pre-built
  program). `validate()` checks the computed result (sums, counts, finalizer
  counts) so nothing can be skipped. Validation runs once before warmup and
  once after measurement.
- `worker.mts` makes one measurement in a fresh process. It records per-iteration
  `process.hrtime` times, GC events during the measured window
  (`PerformanceObserver("gc")`), heap/RSS before and after, workload metrics,
  loadavg, the engine, and the source identity: `git HEAD`, whether
  `packages/effect/src` is dirty, and a content hash of that tree. The hash is
  taken before and after the run, so source edited mid-run is detected
  (`srcChangedDuringRun`).
- `--size key=value,...` overrides workload sizes in every tool.

## Workloads

The times below are rough means per iteration on the baseline (757821fe9, Node 26, Xeon 8272CL 2.6 GHz, with a
shared, loaded host).

| workload                  | group        | size                         | ms/iter | isolates                                                                                                                  |
| ------------------------- | ------------ | ---------------------------- | ------: | ------------------------------------------------------------------------------------------------------------------------- |
| `succeed-flatmap-loop`    | sync         | n=100k                       |      19 | op dispatch, continuation push/pop                                                                                        |
| `map-chain-deep`          | sync         | depth=10k x10                |       7 | deep pre-built map stack                                                                                                  |
| `left-assoc-flatmap-deep` | sync         | depth=10k x10                |      13 | left-nested flatMap (stack safety)                                                                                        |
| `gen-loop`                | sync         | steps=50k                    |       7 | Effect.gen adapter, sync/succeed                                                                                          |
| `error-unwind`            | sync         | 1k map frames x100           |       7 | failure unwinding to catchCause/catch                                                                                     |
| `finalizers-success`      | sync         | 128 finalizers x50           |       3 | ensuring/onExit frames, success path                                                                                      |
| `finalizers-failure`      | sync         | 128 finalizers x50           |     3.7 | ensuring/onExit frames, failure path                                                                                      |
| `sync-runSync`            | sync         | 1k ops x20 runs              |     2.8 | root fiber creation + sync scheduler                                                                                      |
| `fork-join-sequential`    | fiber        | fibers=5k                    |      19 | child lifecycle, join wake-up                                                                                             |
| `fork-fanout-join-all`    | fiber        | fibers=10k                   |      19 | bulk fork + joinAll                                                                                                       |
| `forEach-bounded`         | fiber        | 10k items, conc 16           |      16 | bounded pool, yieldNow per item                                                                                           |
| `forEach-unbounded`       | fiber        | 10k items                    |     2.7 | one fiber per item                                                                                                        |
| `short-lived-fibers`      | fiber        | all(1k) x10                  |     2.6 | short-lived fiber churn                                                                                                   |
| `callback-resume`         | async        | steps=10k                    |     4.5 | Effect.callback resumed from a microtask                                                                                  |
| `promise-interop`         | async        | steps=10k                    |     4.6 | Effect.promise bridging                                                                                                   |
| `yield-contention`        | async        | 1k fibers x20 yields         |      33 | scheduler under contention + fairness metrics                                                                             |
| `deferred-pingpong`       | async        | handoffs=10k                 |       9 | Deferred await wake-up latency                                                                                            |
| `interrupt-suspended`     | interruption | fibers=2k                    |      19 | interrupting parked fibers (interruptAll)                                                                                 |
| `race`                    | interruption | races=2k                     |      28 | race forks, loser interruption                                                                                            |
| `timeout`                 | interruption | timeouts=1k                  |      20 | timer setup/cancel via timeout                                                                                            |
| `scope-finalizers`        | interruption | 500 scopes x10               |      12 | scoped + acquireRelease                                                                                                   |
| `context-locals`          | interruption | steps=10k                    |      11 | provideService + service/References reads                                                                                 |
| `tracing-spans`           | interruption | spans=5k                     |      15 | withSpan with the default tracer                                                                                          |
| `queue-bounded-pc`        | queue        | 20k msgs, cap 16             |      21 | 1 producer/1 consumer backpressure                                                                                        |
| `queue-mpmc`              | queue        | 20k msgs, 4p/4c              |      11 | unbounded queue, multiple waiters                                                                                         |
| `mixed-service`           | mixed        | 500 reqs, conc 64, 8 permits |      21 | Effect.fn span, Layer service, semaphore, promise, scoped resource, queue consumer, 10% typed failures caught by catchTag |

Sizes were reduced from the initial plan where one iteration took more than
about 30 ms: yield-contention steps 100→20, interrupt-suspended 10k→2k, race
10k→2k, timeout 10k→1k, queues 100k→20k, mixed 2k→500, fork-join-sequential
10k→5k, tracing 10k→5k, and scopes 1k→500.

`yield-contention` reports two fairness metrics. `completionSpreadFraction` is
(last fiber completion − first) / total run time; lower means fibers finish
together. `maxStepsBehind` is the largest lag of any fiber behind the leader,
sampled when the lagging fiber resumes. Medians and maxima are taken over
iterations.

## Throughput methodology

- Each process loads one checkout, validates, warms up for `--warmup` ms (default 500), then runs iterations
  sequentially for `--time` ms (default 1500, at least 5 iterations). One process yields one observation, its
  mean ns per iteration. It also reports median, p90, p99 and in-process CV.
- `compare.mts` runs base and head in fresh processes for each round, alternating
  which side goes first. Status comes from `runtimeperf/stats.mts`
  `analyzePairs`, a paired bootstrap 95% CI of the median head/base ratio. The
  result is an **improvement** if the whole CI is below −`--min-improvement`%
  (default 2) and a **regression** if the whole CI is above
  +`--max-regression`% (default 2). Otherwise it is **inconclusive**. Use at
  least 10 rounds; with fewer than 6 the CI is degenerate and the tool warns.
- p99 is analyzed separately as a paired CI over the per-process p99 values. GC pause per iteration and workload
  metrics are reported as medians over processes. The CV columns show the variation of the per-process observation
  across processes.
- The tool warns when base and head have identical source hashes, which is an A/A
  run, or when a side's source changed during the run. Before trusting small
  deltas, run an A/A comparison: on a loaded host, A/A runs with few rounds have
  shown spurious ±5–8% differences.
- The tool warns if the 1-min loadavg is above 1.5 at start. The loadavg at start
  and end of every process is stored in the raw JSON.
- Type feedback: a fresh process that runs one workload keeps the
  interpreter's shared call and property sites monomorphic, which applications
  do not. `compare.mts` therefore runs `pollute.ts`, a mix of about twenty
  primitive kinds, in every worker before warmup (`--no-pollute` disables it;
  `worker.mts`, `run.mts` callers and `profile.mts` take `--pollute`). On the
  baseline this moves `succeed-flatmap-loop` from 18 to 23 ms, and it is what
  exposed the megamorphic sites fixed in this branch.
- Engines: `--engine node` (default), `bun` runs `bun worker.mts`, and `deno`
  runs `deno run -A worker.mts`. Bun has no GC observer (`gc.available: false`).
  Deno accepts a `gc` observer but delivers no entries, so it is also marked
  unavailable.

## Memory methodology (`memory.mts`, Node only)

Each measurement runs in a fresh `node --expose-gc` child. Readings are taken after FORCED full GC (several
`gc()` + `setImmediate` turns), so the output is tagged `forcedGc: true`. Never mix these numbers into throughput
results. A warm-up pass of the same scenario (≤1k fibers) runs before the baseline, so compiled code and lazily
initialized module state are not counted. The default is 5 repeats; the tool reports median, min and max.

- `heapUsed`: V8 heap in use. After forced GC this approximates live retained bytes.
- `rss`: resident set of the process, including heap pages, code and native memory.
  Pages are not returned to the OS promptly, so RSS shows footprint and peaks,
  not retention.
- `allocated`: cumulative bytes allocated, whatever their lifetime. This is the
  delta of `v8.getHeapStatistics().total_allocated_bytes`, cross-checked against
  bytes reclaimed by each GC (`v8.GCProfiler`) plus net heap growth. It measures
  GC pressure, not footprint.

Scenarios (default `--n 50000`; `peak-fanout` defaults to 100000):

| scenario                | measures                                                                                                                                            |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `suspended`             | heapUsed/RSS per fiber blocked on `Deferred.await`, then retained bytes after the deferred completes                                                |
| `suspended-never`       | the same for fibers on `Effect.never`, released by interrupting the parent                                                                          |
| `completed-handles`     | bytes retained per completed `Fiber` handle, with the handle array cost measured separately                                                         |
| `released`              | fork N, interrupt, drop everything, settle repeatedly: retained delta, plus the `settleSeries`                                                      |
| `peak-fanout`           | `forEach` unbounded with yieldNow: heapUsed at the top of the fan-out (latch when the last fiber starts), 1 ms sampler peaks, RSS                   |
| `--child-yields k`      | option for `suspended` and `completed-handles`: children yield k times first, so each owns a scheduler dispatcher                                   |
| `allocation`            | `--workload <name> --iterations 20`: allocated bytes per iteration, scavenge and major GC counts                                                    |
| `--rewarm-iterations k` | option for `allocation`: run k unmeasured iterations after the forced GCs, which can discard optimized code, so the measured window is steady state |

The forced GCs before an `allocation` window can deoptimize the interpreter, so
without `--rewarm-iterations` the first measured iterations include cold-code
allocation (an unoptimized `pop` that empties an array releases its store, for
example) and recompilation. Report both windows when comparing.

Known result on the baseline: `released` and `suspended-never` retain about
125 B/fiber, scaling linearly. A heap-snapshot retainer chain shows this is the
grown backing table of the module-level `hashCache` WeakMap in `Hash.ts`: every
interruption combined its interrupt causes through `Hash`/`Equal`. The fibers
themselves are not leaked; the cause combination fast path removes this. The `peak-fanout` sampler rarely fires because
the scheduler seldom yields to timers; the latch reading is the reliable one.

## Profiling methodology (`profile.mts`)

`profile.mts` runs the worker under
`node --cpu-prof --cpu-prof-interval 100` (and `--heap-prof` if requested).
These runs are INSTRUMENTED. Their timings are labelled as such and are never
throughput results. CPU samples are cropped to the measured window, using the
worker's hrtime bounds, which are on the same monotonic clock as the
`.cpuprofile`; `--window all` keeps everything. The tool writes `cpu.folded`
(self samples per stack, frames as `fn file:line`), `cpu.svg`, and `top.txt`
(top-N self and inclusive time). `(idle)` and `(program)` time means the runtime
is waiting on the event loop between scheduler turns. Flame graphs are rendered
by `inferno-flamegraph` (from PATH, or `nix shell nixpkgs#inferno`, which is
verified to work), with a built-in SVG renderer as fallback. The heap profile
covers the whole process and shows sampled live allocations at exit, so module
loading dominates it. Use `memory.mts --scenario allocation` for allocation
volume.

## Shared host lock

Another thread on this host benchmarks too. Definitive comparisons and profiles, and heavy test or typecheck runs
while someone else measures, must be wrapped in the lock:

```sh
flock /tmp/effect-fiber-bench.lock nix develop --command node packages/effect/benchmark/fiber/compare.mts ...
```

## Commands

```sh
B=packages/effect/benchmark/fiber
# quick single-root table
nix develop --command node $B/run.mts --root /tmp/effect-opus55-base --group fiber --time 500 --warmup 200
# definitive paired comparison (all workloads: ~26 x 10 x 2 x ~2.5s ≈ 22 min)
flock /tmp/effect-fiber-bench.lock nix develop --command node $B/compare.mts \
  --base /tmp/effect-opus55-base --head . --rounds 10 --output tmp/fiberperf/compare-<label>.json
# subset / other engine / thresholds
nix develop --command node $B/compare.mts --base /tmp/effect-opus55-base --head . \
  --workloads fork-join-sequential,race --engine bun --min-improvement 2 --max-regression 2
# memory (single root, or paired with --base/--head)
nix develop --command node $B/memory.mts --scenario suspended --n 50000
flock /tmp/effect-fiber-bench.lock nix develop --command node $B/memory.mts \
  --base /tmp/effect-opus55-base --head . --scenario completed-handles --repeats 5
nix develop --command node $B/memory.mts --scenario allocation --workload mixed-service --iterations 20
# profiling
flock /tmp/effect-fiber-bench.lock nix develop --command node $B/profile.mts \
  --workload fork-join-sequential --time 3000 --label fork-join-head [--heap-prof] [--root <dir>]
# single worker process
nix develop --command node $B/worker.mts --workload race --time 1500 --warmup 500 --root /tmp/effect-opus55-base
# typecheck workloads.ts (also covered by pnpm check through tsconfig.tests.json)
nix develop --command pnpm exec tsc -p tmp/fiberperf/tsconfig.check.json
```
