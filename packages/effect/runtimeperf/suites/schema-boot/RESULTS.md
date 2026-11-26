# Schema boot results

## Baseline

Measured on 2026-11-26 against `packages/effect/src` of main at `db1629c626`, with:

```sh
node packages/effect/runtimeperf/suites/schema-boot/run.mts tmp/schema-boot-baseline --head HEAD --rounds 16 --heap-rounds 3 --profile-rounds 2
```

Node v26.13.0, V8 14.6.202.34, esbuild 0.28.2, AMD EPYC 7763 (16 CPUs), Linux 6.18 x64. The host was shared: the
load average was 58 at the start and 84 at the end, so medians carry a median absolute deviation of 20–50%. Use the
numbers for proportions and orders of magnitude. Use paired comparisons for decisions.

### Timings and heap

Medians ± MAD in milliseconds over 16 processes. Heap is the median retained `heapUsed` growth of 3 processes.
First use is every phase after `define`. Warm is per decode, component use or request.

| Case             | Import    | Define      | First use                              | Total      | Warm    | Define heap KiB | First use heap KiB |
| ---------------- | --------- | ----------- | -------------------------------------- | ---------- | ------- | --------------: | -----------------: |
| `baseline`       | 143 ± 65  | 0.07 ± 0.01 | decode 1.46, encode 0.35               | 147 ± 65   | 0.6 µs  |               5 |                 22 |
| `graph-small`    | 126 ± 58  | 4.78 ± 2.32 | decode 10.7, encode 1.74               | 150 ± 70   | 23.3 µs |             176 |                181 |
| `graph-medium`   | 102 ± 31  | 33.6 ± 17.5 | decode 21.9, encode 1.96               | 171 ± 46   | 20.6 µs |           1,118 |                180 |
| `graph-large`    | 83 ± 18   | 193 ± 78    | decode 12.5, encode 1.98               | 341 ± 118  | 19.1 µs |          10,392 |                154 |
| `ui-none`        | 90 ± 19   | 79.3 ± 22.9 | use 0.07                               | 170 ± 34   |         |           3,551 |                  1 |
| `ui-one`         | 92 ± 30   | 68.8 ± 24.0 | use 9.63                               | 187 ± 69   | 7.8 µs  |           3,550 |                 99 |
| `ui-all`         | 105 ± 37  | 66.2 ± 19.6 | use 102                                | 262 ± 79   | 5.63 ms |           3,556 |              2,838 |
| `httpapi-small`  | 340 ± 153 | 12.2 ± 5.2  | build 16.4, request 17.4, openapi 35.4 | 446 ± 226  | 980 µs  |             187 |                946 |
| `httpapi-medium` | 209 ± 67  | 23.8 ± 12.8 | build 40.9, request 19.6, openapi 205  | 527 ± 161  | 939 µs  |             429 |              2,350 |
| `httpapi-large`  | 274 ± 109 | 110 ± 28    | build 156, request 22.9, openapi 531   | 1346 ± 466 | 512 µs  |           1,283 |              7,606 |

Bundles are 565 KiB for `baseline`, 568–571 KiB for the graph and UI fixtures and 1,186 KiB for HttpApi.

### Where the work is

Shares are of CPU samples in the two profiled processes per case. `summary.md` in the output directory lists every
phase.

- **Import** is mostly V8 compiling the bundle (`compileSourceTextModule`, 36–68% of samples) and evaluating its
  modules. Frames in Schema modules account for 8–27%. These come from schemas that Effect modules define at the top
  level, such as `Schema.ts` constants and the schema classes of the HttpApi modules.
- **Definition** is Schema work: 67–82% of samples in the graph and UI cases. The outermost operations are
  `TaggedStruct` (19–36%), `Class` (14–18% in the UI cases), `Literals` (6–10%), `Record`, `optionalKey` and
  `check`. Self time is split between AST construction and copying in `SchemaAST.ts` (18–40%), the central
  schema constructor `make` (a function object per schema, 9–22%) and garbage collection (9–26%). A graph entity
  retains about 10 KiB and a UI component about 18 KiB.
- **First decode** compiles parsers (`interpreter.compile`, `getParser`). Parsers are already compiled on first
  use and memoized per AST, so this cost follows what is decoded, not what is defined: graph decode takes 11–22 ms at
  every size.
- **HttpApi definition** derives schemas eagerly: `toCodecJson`, `toCodecStringTree` and the response checks in
  `HttpApiEndpoint` make up 46–51% of its samples. **Build** is router registration and Effect runtime work
  (Schema 5–17%). The **first request** is about half Schema: compiling the params decoder and the success encoder.
  **OpenAPI** generation is the largest phase in the medium and large APIs and runs only when requested.

Laziness can reach the AST and derivation work in definition and the Schema share of import. It cannot reach V8
compilation, parser compilation, which is already lazy, or router registration.

## Lazy construction prototype

Branch `agent/effect-bot/4bc2a7e0a9bd-lazy-prototype` contains two commits on top of this suite:

- `9604133f6e` builds schema ASTs on first access. A schema stores a thunk, and the `ast` getter runs and memoizes it.
  `Struct`, `Union`, `Literals`, `Array`, `NonEmptyArray`, `optionalKey`, `optional`, `mutableKey`, `toType`,
  `toEncoded`, `decodeTo`, `withConstructorDefault`, `refine`, `annotate`, `annotateKey`, `check` and the
  container wrappers are lazy. `Literal` and `Record` stay eager because their constructors validate their input. A
  derivation from an already built AST stays eager, so that `check` on `suspend` still throws at definition. A lazy
  schema with more than 64 unbuilt levels below it builds them at definition, which keeps a 5,000-level nesting within
  the call stack.
- `0b648cef11` also derives `toCodecJson`, `toCodecStringTree` and `toCodecArrayFromSingle` on first access.

```sh
node packages/effect/runtimeperf/suites/schema-boot/run.mts tmp/lazy-ast --base 2c784ca41d --head 9604133f6e --rounds 24 --heap-rounds 2 --profile-rounds 1
node packages/effect/runtimeperf/suites/schema-boot/run.mts tmp/lazy-derive --base 2c784ca41d --head 0b648cef11 --cases httpapi-small,httpapi-large --rounds 20 --heap-rounds 2 --profile-rounds 1
```

Both comparisons ran with load averages of 45–73. Wall-time intervals were too wide to classify most phases, so the
table uses main-thread CPU time: medians of 24 paired processes, the head/base ratio with its 95% bootstrap interval,
and retained heap. The baseline column is `packages/effect/src` of main.

| Case             | Phase  | Main CPU ms | Lazy AST CPU ms | Ratio (95% CI)   | Heap KiB       |
| ---------------- | ------ | ----------: | --------------: | ---------------- | -------------- |
| `ui-none`        | define |        29.1 |            22.5 | 0.78 (0.73–0.90) | 3,550 → 3,038  |
|                  | total  |        86.6 |            81.5 | 0.93 (0.89–0.99) |                |
| `ui-one`         | define |        30.0 |            24.4 | 0.80 (0.77–0.86) | 3,551 → 3,039  |
|                  | use    |        4.91 |            5.94 | 1.19 (1.15–1.24) | 98 → 110       |
|                  | total  |        94.6 |            87.9 | 0.94 (0.91–0.95) |                |
| `ui-all`         | define |        28.9 |            22.3 | 0.74 (0.69–0.78) | 3,555 → 3,038  |
|                  | use    |        30.9 |            45.0 | 1.45 (1.38–1.57) | 2,839 → 3,439  |
|                  | total  |         121 |             123 | 1.01 (0.97–1.07) |                |
| `graph-large`    | define |        69.6 |            62.3 | 0.89 (0.85–0.92) | 10,388 → 9,063 |
|                  | decode |        6.82 |            8.23 | 1.25 (1.10–1.40) | 106 → 128      |
|                  | total  |         138 |             133 | 0.93 (0.89–0.98) |                |
| `httpapi-medium` | define |        12.0 |            13.6 | 1.11 (1.06–1.18) | 433 → 470      |
| `httpapi-large`  | define |        28.6 |            29.6 | 1.07 (0.98–1.11) | 1,288 → 1,326  |
|                  | total  |         358 |             364 | 1.01 (0.99–1.04) |                |

Import, build, request, OpenAPI and warm throughput did not change in any case. Adding lazy derivation moved HttpApi
work from `define` to `build`, which registers every endpoint and forces its codecs: in `httpapi-large`, define was
0.97 (0.91–1.01) and build 1.09 (1.00–1.21) of main, with an unchanged total.

### What moved and what disappeared

- Only work for schemas that are never used disappears: 6.6 ms of the 29 ms definition in `ui-none` and 512 KiB of
  its 3.5 MB. The rest of definition is the schema objects themselves. Every schema is a function object so that it
  can be extended as a class, and `init` in `make.ts` is the largest self cost of a lazy definition (21% of samples
  in `ui-all`), followed by `Class` construction.
- Work that is used moves to first use and costs more there. In `ui-all`, definition saves 6.6 ms and first use adds
  14.1 ms. Graph decode, which forces one entity, is 25% slower.
- HttpApi uses every endpoint schema when it builds the router, so nothing disappears. The `ast` getter and thunks
  add 7–11% to its definition.

### Semantics

- Repeated access returns the same AST, and schemas shared between structs share one AST. Recursive schemas through
  `suspend` decode as before. Warm throughput is unchanged.
- `ast` becomes an accessor on the prototype instead of an own property, so it is missing from `Object.keys` and
  object spread. Reading `ast` for introspection builds it.
- Constructor errors move to the first use of the AST unless the constructor stays eager. With every constructor
  lazy, 4 of 3,240 Schema and HttpApi tests failed: a non-finite `Literal`, `check` on `suspend`, and `Record`
  with an optional value threw late, and a 5,000-level nesting overflowed the stack. The prototype keeps those eager.
  Lazy derivation moves 3 `toCodecJson` and `toCodecStringTree` errors for unsupported schemas to first use.

### Recommendation

No general laziness. Lazy ASTs save 20–26% of definition CPU only where most retained schemas are never used, and
6–7% of the measured process. They are neutral when every schema is used, slower on first use, slower for HttpApi,
and they move errors. Lazy derivation does not help HttpApi, because router construction uses every endpoint.

The larger fixed costs are elsewhere: V8 compiling the bundle (about 57 ms of CPU for 565 KiB), schemas that Effect
modules define at import, and creating a function object for every schema and class. Reducing the cost per schema
object would help eager and lazy use alike, and is the next thing to measure.
