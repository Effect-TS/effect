# Prototype for `specs/tree-shakeable-services.md`

A small runnable model of `Context.Operation`, `Stream.Operation`, `Sink.Operation`
and `Context.Operations`. The primitives live in `packages/effect/src/Context.ts`,
`packages/effect/src/Stream.ts` and `packages/effect/src/Sink.ts` on this
branch; this package uses them through the public `effect` API and checks the
spec's bundle and diagnostic claims. Runtime behaviour is tested in
`packages/effect/test/Context.test.ts`, not here.

| Path                              | What it is                                                                                                                                             |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/FileSystem.ts`               | The contract as a consumer sees it: the record `FileSystem` over the operations module imported as a namespace, and `ReadOnly`, a subset               |
| `src/FileSystem/Shape.ts`         | The contract's error and data types                                                                                                                    |
| `src/FileSystem/operations.ts`    | The thirty operations, one per export and nothing else                                                                                                 |
| `src/Terminal.ts`                 | A 6-member contract modelled on `effect/Terminal`, for the type fixtures                                                                               |
| `src/node/<op>.ts`                | One implementation layer per operation, tagged with a `node/FileSystem/<op>` marker                                                                    |
| `src/node/index.ts`, `layer.ts`   | The namespace a root imports per operation, and the thirty layers merged (the control)                                                                 |
| `src/program*.ts`, `src/main*.ts` | Programs and their composition roots: two operations, the `ReadOnly` subset, one Stream operation, the whole record                                    |
| `typetest/ok/signatures.ts`       | Type assertions that must compile                                                                                                                      |
| `typetest/errors/*.ts`            | One file per type error the design relies on, with its expected message                                                                                |
| `scripts/check-errors.ts`         | Compiles `typetest/errors` and checks each file fails as documented                                                                                    |
| `scripts/check-bundle.ts`         | esbuild on every root, `effect` as published: fails if an unused implementation is in a bundle or a used one is missing; prints sizes and Stream bytes |

From the repository root, after `pnpm install`:

```sh
pnpm --filter tree-shakeable-services-spec verify
```

runs `check` (tsc, about 6 s), `check-errors` (about 25 s) and `bundle` (about
4 s). Each can be run on its own with the same `--filter`.
