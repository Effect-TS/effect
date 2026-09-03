import { SqliteClient } from "@effect/sql-sqlite-wasm"
import { assert, it } from "@effect/vitest"
import { Effect, Exit, Scope, Stream } from "effect"
import { Reactivity } from "effect/unstable/reactivity"
import { vi } from "vitest"

vi.mock("@effect/wa-sqlite/dist/wa-sqlite.mjs", async (importOriginal) => {
  const { default: createModule } = await importOriginal<{
    readonly default: (options: { readonly wasmBinary: Uint8Array }) => Promise<unknown>
  }>()
  const { readFileSync } = await import("node:fs")
  const { createRequire } = await import("node:module")
  const wasmBinary = readFileSync(createRequire(import.meta.url).resolve("@effect/wa-sqlite/dist/wa-sqlite.wasm"))
  return { default: () => createModule({ wasmBinary }) }
})

it.effect("releases an unfinished statement when a memory stream stops early", () =>
  Effect.acquireUseRelease(
    Scope.make(),
    (scope) =>
      Effect.gen(function*() {
        const sql = yield* SqliteClient.makeMemory({}).pipe(Scope.provide(scope))

        yield* sql`CREATE TABLE items (id INTEGER NOT NULL)`
        yield* sql`WITH RECURSIVE ids(id) AS (SELECT 1 UNION ALL SELECT id + 1 FROM ids WHERE id < 5000)
          INSERT INTO items SELECT id FROM ids`

        assert.deepStrictEqual(
          yield* sql<{ id: number }>`SELECT id FROM items`.stream.pipe(Stream.take(1), Stream.runCollect),
          [{ id: 1 }]
        )
        assert.deepStrictEqual(yield* sql`DROP TABLE items`, [])
      }),
    (scope) => Scope.close(scope, Exit.void).pipe(Effect.ignore)
  ).pipe(Effect.provide(Reactivity.layer)))
