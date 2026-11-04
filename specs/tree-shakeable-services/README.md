# Prototype for `specs/tree-shakeable-services.md`

A runnable model of `Context.Operation`, written against the public `effect`
API so the spec's claims can be checked without touching `packages/effect`.

| Path                        | What it is                                                                                     |
| --------------------------- | ---------------------------------------------------------------------------------------------- |
| `src/Operation.ts`          | The primitive: `Operation`, `Operation.Call`, `isOperation`, and the Effect+Stream call result |
| `src/FileSystem.ts`         | A 30-operation contract modelled on `effect/FileSystem`, one `Operation` per export            |
| `src/node/<op>.ts`          | One Node implementation layer per operation, tagged with a `node/FileSystem/<op>` marker       |
| `src/node/index.ts`         | The namespace a composition root imports per operation                                         |
| `src/node/layer.ts`         | The aggregate layer, the coarse-grained form                                                   |
| `src/program.ts`            | A program using two of the thirty operations                                                   |
| `src/main.ts`               | The composition root that provides those two                                                   |
| `src/main-full.ts`          | The same program with the aggregate layer, the bundle baseline                                 |
| `test/Operation.test.ts`    | Runtime semantics: provision, single-operation override, lookup timing, Streams, receivers     |
| `typetest/ok/signatures.ts` | Type assertions that must compile                                                              |
| `typetest/errors/*.ts`      | One file per type error the design relies on                                                   |
| `scripts/check-errors.ts`   | Compiles `typetest/errors`, prints the diagnostics, and checks each file fails as documented   |
| `scripts/check-bundle.ts`   | The esbuild check: bundles both roots, lists the implementations in each, runs the shaken one  |

From the repository root, after `pnpm install`:

```sh
pnpm --filter tree-shakeable-services-spec verify
```

runs, in order, `check` (tsc), `check-errors`, `test` (vitest) and `bundle`
(esbuild). Each can be run on its own with the same `--filter`.
