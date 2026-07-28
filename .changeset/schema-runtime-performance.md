---
"effect": patch
---

Improve Schema parsing, schema construction and adapter runtime performance
while preserving current parsing behavior.

## Runtime performance

All results are median microseconds per operation (`µs/op`); lower is better
and the fastest value is bold.

| Library |          Version | API and mode                                     |
| ------- | ---------------: | ------------------------------------------------ |
| Effect  | `4.0.0-beta.102` | `SchemaParser.decodeUnknownExit` (`SchemaIssue`) |
| Valibot |          `1.4.2` | Pre-created `safeParser`                         |
| Zod     |          `4.4.3` | `zod/v4` `safeParse` with `jitless: true`        |
| TypeBox |          `1.3.7` | Non-JIT `Value.Errors`                           |

Effect `main` (`0a532e503`) and branch (`c6edd1ebb`) are paired five-process
medians. Competitor values use five processes, or nine for tagged unions.
Environment: Node `v24.12.0`, macOS arm64, Apple M3.

### Successful parsing

| Scenario                          | Effect `main` | Effect branch |       Valibot | Zod 4 jitless | TypeBox `Value.Errors` |
| --------------------------------- | ------------: | ------------: | ------------: | ------------: | ---------------------: |
| Object, 1 field                   |      0.132 µs |     0.0907 µs |     0.0317 µs | **0.0241 µs** |                1.22 µs |
| Object, 32 fields                 |       1.86 µs |       1.47 µs |   **1.18 µs** |       1.52 µs |               17.19 µs |
| Array, 32 elements                |      0.820 µs |      0.336 µs |      0.299 µs |  **0.279 µs** |               14.39 µs |
| Record, 1 entry                   |      0.340 µs |     0.0864 µs | **0.0362 µs** |      0.134 µs |                1.33 µs |
| Record, 32 entries                |       5.39 µs |       1.11 µs |   **1.01 µs** |       3.09 µs |               15.02 µs |
| Literal union, 100 members        |       2.01 µs | **0.0351 µs** |       6.86 µs |       3.30 µs |               42.10 µs |
| Tagged union, 100 members         |      0.473 µs |  **0.241 µs** |      10.27 µs |      0.248 µs |              244.21 µs |
| Non-empty string                  |     0.0549 µs | **0.0245 µs** |     0.0355 µs |     0.0368 µs |               0.654 µs |
| Native five-part template literal |       2.01 µs |      0.693 µs |             — | **0.0423 µs** |                      — |
| Application-shaped schema         |       2.12 µs |      0.786 µs |  **0.570 µs** |      0.824 µs |                      — |

### Failed parsing

| Scenario                                          | Effect `main` | Effect branch |       Valibot | Zod 4 jitless | TypeBox `Value.Errors` |
| ------------------------------------------------- | ------------: | ------------: | ------------: | ------------: | ---------------------: |
| Object, 1 invalid field                           |       1.46 µs |       1.27 µs | **0.0930 µs** |       7.05 µs |                1.29 µs |
| Object 32, last field invalid                     |       3.32 µs |       2.52 µs |   **1.33 µs** |       9.08 µs |               17.65 µs |
| Array 32, last element invalid                    |       2.92 µs |       2.49 µs |  **0.526 µs** |       7.27 µs |               14.71 µs |
| Record 32, last entry invalid                     |       5.31 µs |       1.32 µs |   **1.22 µs** |      10.76 µs |               15.20 µs |
| Literal union 100, invalid                        |       1.95 µs | **0.0783 µs** |       7.32 µs |      80.42 µs |               42.37 µs |
| Tagged union, selected member invalid             |       1.81 µs |   **1.50 µs** |      10.83 µs |       7.49 µs |              250.52 µs |
| Tagged union, unknown tag                         |      0.142 µs | **0.0841 µs** |      14.42 µs |      17.98 µs |              258.45 µs |
| Non-empty string, invalid                         |      0.127 µs |     0.0891 µs | **0.0587 µs** |       6.61 µs |               0.655 µs |
| Native five-part template literal, invalid number |       1.33 µs |   **1.24 µs** |             — |       7.50 µs |                      — |

### Cold paths

| Scenario                                        | Effect `main` | Effect branch |       Valibot | Zod 4 jitless | TypeBox `Value.Errors` |
| ----------------------------------------------- | ------------: | ------------: | ------------: | ------------: | ---------------------: |
| Construct a 32-field object schema              |      12.11 µs |      12.04 µs |      11.17 µs |     155.50 µs |            **8.05 µs** |
| Construct and perform the first decode          |      16.10 µs |      15.78 µs |  **11.78 µs** |     184.32 µs |               25.80 µs |
| Construct a record and decode 32 entries        |      11.83 µs |       5.63 µs |   **1.80 µs** |      16.19 µs |               18.94 µs |
| Construct a 100-member literal union and decode |     426.19 µs |     416.45 µs |  **45.05 µs** |     399.00 µs |               57.60 µs |
| Construct a 100-member tagged union and decode  |   1,035.03 µs |     901.72 µs | **121.06 µs** |   2,612.27 µs |              325.59 µs |

### Additional Effect paths

| Scenario                                                | Effect `main` | Effect branch |
| ------------------------------------------------------- | ------------: | ------------: |
| Template literal, valid                                 |       1.69 µs |  **0.489 µs** |
| Five-part template literal parser, valid                |       1.72 µs |  **0.598 µs** |
| Five-part template literal parser, invalid              |      0.682 µs |  **0.597 µs** |
| Template literal parser with backtracking, valid        |      0.980 µs |  **0.424 µs** |
| Template literal parser with backtracking, invalid      |      0.844 µs |  **0.706 µs** |
| Transformed and checked template literal parser, valid  |       1.45 µs |  **0.446 µs** |
| Record with 32 template-literal keys, valid             |      66.25 µs |  **17.24 µs** |
| Construct a five-part template literal                  |      22.98 µs |  **10.88 µs** |
| Construct and first-decode a five-part template literal |      26.14 µs |  **25.74 µs** |
| Object with optional properties absent, valid           |      0.221 µs |  **0.169 µs** |
| Object with optional properties present, valid          |      0.408 µs |  **0.217 µs** |
| Object with an invalid optional property                |       7.23 µs |   **6.73 µs** |

### Cost of Effect adapters

| Effect API on invalid input      | Effect `main` | Effect branch |
| -------------------------------- | ------------: | ------------: |
| `SchemaParser.decodeUnknownExit` |       1.88 µs |   **1.57 µs** |
| `Schema.decodeUnknownOption`     |       1.34 µs |   **1.23 µs** |
| `Schema.is`                      |       1.35 µs |   **1.27 µs** |
| `Schema.decodeUnknownResult`     |   **6.24 µs** |       6.38 µs |
| `Schema.decodeUnknownExit`       |       7.97 µs |   **7.83 µs** |
| `Schema.decodeUnknownSync`       |       7.47 µs |   **7.18 µs** |

### `open-circle/schema-benchmarks` suite

The Schema parser and AST changes also improve the complete `effect@beta`
timing matrix from `open-circle/schema-benchmarks`. A five-round paired
comparison against `main` produced 14 classified improvements, two
inconclusive results and no regressions:

| Scenario                             |    `main` |    Branch |                  Delta |
| ------------------------------------ | --------: | --------: | ---------------------: |
| Initialize schema                    | 137.28 µs | 118.23 µs |                -12.69% |
| Initialize schema and decoder        | 144.81 µs | 130.50 µs |                -10.88% |
| Validate valid product               |  8.478 µs |  5.415 µs |                -35.18% |
| Validate invalid product             |  1.516 µs |  1.348 µs |                -11.59% |
| Parse valid product, all errors      |  8.360 µs |  5.366 µs |                -36.28% |
| Parse invalid product, all errors    | 11.302 µs |  9.100 µs |                -19.42% |
| Parse valid product, first error     |  8.201 µs |  5.294 µs |                -35.44% |
| Parse invalid product, first error   |  1.510 µs |  1.352 µs |                -10.51% |
| Standard Schema valid, all errors    |  9.284 µs |  5.935 µs |                -35.96% |
| Standard Schema invalid, all errors  | 16.718 µs | 15.203 µs |                -11.31% |
| Standard Schema valid, first error   |  8.889 µs |  5.843 µs |                -34.17% |
| Standard Schema invalid, first error |  2.377 µs |  2.181 µs |  -8.00% (inconclusive) |
| Typed codec encode                   | 0.4692 µs | 0.3420 µs |                -27.60% |
| Typed codec decode                   | 0.5191 µs | 0.3762 µs |                -27.19% |
| Unknown codec encode                 | 0.4939 µs | 0.3639 µs | -26.29% (inconclusive) |
| Unknown codec decode                 | 0.5061 µs | 0.3637 µs |                -29.26% |
