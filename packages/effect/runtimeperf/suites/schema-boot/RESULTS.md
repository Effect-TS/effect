# Schema boot baseline

Measured on 2026-11-26 against `packages/effect/src` of main at `db1629c626`, with:

```sh
node packages/effect/runtimeperf/suites/schema-boot/run.mts tmp/schema-boot-baseline --head HEAD --rounds 16 --heap-rounds 3 --profile-rounds 2
```

Node v26.13.0, V8 14.6.202.34, esbuild 0.28.2, AMD EPYC 7763 (16 CPUs), Linux 6.18 x64. The host was shared: the
load average was 58 at the start and 84 at the end, so medians carry a median absolute deviation of 20–50%. Use the
numbers for proportions and orders of magnitude. Use paired comparisons for decisions.

## Timings and heap

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

## Where the work is

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
