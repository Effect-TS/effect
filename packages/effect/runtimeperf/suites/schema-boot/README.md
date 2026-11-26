# Schema boot costs

This suite measures what Schema costs before an application does useful work: importing a bundle, defining schemas,
and the first decode, encode, request or OpenAPI document. It also records warm throughput and retained heap, and
attributes CPU samples of each phase to Effect source modules.

Run from the repository root:

```sh
node packages/effect/runtimeperf/suites/schema-boot/run.mts tmp/schema-boot
node packages/effect/runtimeperf/suites/schema-boot/run.mts tmp/schema-boot-compare --base main
```

The output directory must not exist. Results are written to `results.json` (every observation) and `summary.md`.
Without `--base`, the current working tree is measured. With `--base <ref>`, the ref is checked out in a temporary
worktree and compared with the working tree, or with `--head <ref>`. Both sides bundle the same fixtures from this
checkout, so only `packages/effect/src` differs.

| Option             | Default | Meaning                                                     |
| ------------------ | ------- | ----------------------------------------------------------- |
| `--rounds`         | 10      | Timed processes per case and variant                        |
| `--heap-rounds`    | 3       | Processes run with `--expose-gc` to record retained heap    |
| `--profile-rounds` | 2       | Processes with a 100 µs CPU profile of every phase          |
| `--warm-time`      | 300     | Milliseconds of warm measurement after a half-length warmup |
| `--cases`          | all     | Comma-separated case names                                  |

## Workloads

Each fixture in `fixtures/` is bundled with esbuild (ESM, Node platform, unminified, linked source maps) against
the measured `packages/effect/src`. Bundling the TypeScript sources skips the published build's pure-call
annotations, so absolute bundle sizes and import times are not those of `dist`. Both sides of a comparison are
bundled the same way, with module path comments normalized, so identical source gives identical bundles.

| Case                         | Definitions                                                                                       | Phases after `define`                   |
| ---------------------------- | ------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `baseline`                   | One two-field struct                                                                              | `decode`, `encode`                      |
| `graph-small/medium/large`   | 10, 100 or 1,000 entities sharing core schemas, each with a struct and a three-member event union | `decode` and `encode` of the last event |
| `ui-none/one/all`            | 200 components, each with a props struct, a model `Class` and a five-member message union         | `use` of 0, 1 or 200 components         |
| `httpapi-small/medium/large` | 1, 8 or 40 groups of six endpoints sharing entity, query and error schemas                        | `build`, `request`, `openapi`           |

An entity has 12 fields: a branded id, checks, a string-to-number and a string-to-date transformation, arrays, a
record, optional keys, a recursive tree and a shared user and address. The UI cases model a module that keeps many
schemas reachable but uses few of them. In the HttpApi cases, `define` builds the `HttpApi`, `build` builds the
layer with handlers and registers routes, `request` serves one GET through the web handler, and `openapi`
generates the document. Warm throughput repeats the last decode, component use or request.

## Protocol

Every observation is a fresh Node process. Timed rounds rotate the case order, and comparisons alternate the variant
order between rounds. Before any phase, the worker loads Node's fetch and stream internals so that Node's own lazy
loading is not attributed to the first request. Phases run in order in one process: `import` is `import()` of the
bundle, including V8 compilation and module evaluation; every later phase includes its first-use work, such as parser
compilation. Each phase records wall time and main-thread CPU time (`process.threadCpuUsage`), reported as `<phase>`
and `<phase> cpu`. On a loaded host, wall time includes time spent waiting for a CPU, so compare CPU time there.
CPU time excludes background compilation and concurrent garbage collection threads. Medians and median absolute
deviations are reported per phase, together with per-process sums: `total` over every phase and, for HttpApi,
`through build` and `through request`, which exclude optional OpenAPI generation. Warm throughput is wall time only.
Comparisons use the paired bootstrap from `../../stats.mts` and classify a phase only when its 95% interval excludes
the 2% improvement or 5% regression threshold.

Heap processes call `gc()` twice after each phase and report the change in `heapUsed`, so a phase's value is what
it leaves reachable. Profiled processes start and stop the V8 sampling profiler around each phase. Bundle frames are
mapped to original files through the source map. A sample's self time is assigned to the module of its leaf frame,
and its outermost frame in a Schema module names the operation that started the Schema work. Profiled processes are
not used for timings.

## Limitations

The workloads are synthetic. The UI cases include only Schema, not a component library, and the HttpApi cases do not
open a socket. Timings depend on machine load; record it, which the report does, and prefer paired comparisons.

## Validation

```sh
node --test packages/effect/runtimeperf/test/schema-boot.test.mts
```
