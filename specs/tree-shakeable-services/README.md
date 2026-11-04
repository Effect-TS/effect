# Prototype for `specs/tree-shakeable-services.md`

A runnable model of `Context.Operation`, `Stream.Operation` and
`Context.Operations`. The primitives live in `packages/effect/src/Context.ts`
and `packages/effect/src/Stream.ts` on this branch; this package exercises
them through the public `effect` API and checks the spec's claims.

| Path                        | What it is                                                                                         |
| --------------------------- | -------------------------------------------------------------------------------------------------- |
| `src/FileSystem.ts`         | A 30-operation contract modelled on `effect/FileSystem`, one operation per export, plus the record |
| `src/node/<op>.ts`          | One Node implementation layer per operation, tagged with a `node/FileSystem/<op>` marker           |
| `src/node/index.ts`         | The namespace a composition root imports per operation                                             |
| `src/node/layer.ts`         | The thirty layers merged: a `Layer<FileSystem>` by annotation, the coarse-grained form             |
| `src/program.ts`            | A program using two of the thirty operations                                                       |
| `src/program-record.ts`     | A program that yields the whole record                                                             |
| `src/program-stream.ts`     | A program using one Stream operation                                                               |
| `src/program-twenty.ts`     | A program using twenty operations                                                                  |
| `src/main*.ts`              | One composition root per program (and `main-full.ts`: the two-operation program on the record)     |
| `test/Operation.test.ts`    | Runtime semantics: provision, overrides, lookup timing, Streams, receivers, the record service     |
| `typetest/ok/signatures.ts` | Type assertions that must compile                                                                  |
| `typetest/errors/*.ts`      | One file per type error the design relies on                                                       |
| `scripts/check-errors.ts`   | Compiles `typetest/errors`, prints the diagnostics, and checks each file fails as documented       |
| `scripts/check-bundle.ts`   | The esbuild check: bundles every root, lists the implementations and runtime in each, runs two     |

From the repository root, after `pnpm install`:

```sh
pnpm --filter tree-shakeable-services-spec verify
```

runs, in order, `check` (tsc), `check-errors`, `test` (vitest) and `bundle`
(esbuild). Each can be run on its own with the same `--filter`.
