import type { SqlStorage } from "@cloudflare/workers-types"
import { SqliteClient } from "@effect/sql-sqlite-do"
import { assert, describe, it } from "@effect/vitest"
import { Cause, Effect, Exit, Option, Result, Stream } from "effect"
import * as Reactivity from "effect/unstable/reactivity/Reactivity"
import type { SqlError } from "effect/unstable/sql/SqlError"

describe("statement stream driver errors", () => {
  for (const phase of ["exec", "cursor", "healthy"] as const) {
    for (const mode of ["statement", "values", "stream"] as const) {
      it.effect(`${mode}: ${phase}`, () =>
        Effect.gen(function*() {
          const driverError = new Error(`synthetic storage ${phase} failure`)
          const calls: Array<readonly [string, ReadonlyArray<unknown>]> = []
          let origin: string | undefined
          let rowsRead = 0
          const db = {
            exec(query: string, ...params: ReadonlyArray<unknown>) {
              calls.push([query, params])
              if (phase === "exec") {
                origin = "exec"
                throw driverError
              }
              return {
                columnNames: ["value"],
                *raw() {
                  rowsRead++
                  yield [1]
                  if (phase === "cursor") {
                    origin = "cursor"
                    throw driverError
                  }
                  rowsRead++
                  yield [2]
                }
              }
            }
          } as unknown as SqlStorage
          const sql = yield* SqliteClient.make({ db })
          const statement = sql<{ value: number }>`SELECT ${1} AS value UNION ALL SELECT ${2} AS value`
          const execute: Effect.Effect<ReadonlyArray<unknown>, SqlError> = mode === "stream"
            ? Stream.runCollect(statement.stream)
            : mode === "values"
            ? statement.values
            : statement
          const exit = yield* Effect.exit(execute)

          assert.deepStrictEqual(calls, [["SELECT ? AS value UNION ALL SELECT ? AS value", [1, 2]]])
          assert.strictEqual(rowsRead, phase === "exec" ? 0 : phase === "cursor" ? 1 : 2)
          if (phase === "healthy") {
            assert(Exit.isSuccess(exit))
            assert.deepStrictEqual(exit.value, mode === "values" ? [[1], [2]] : [{ value: 1 }, { value: 2 }])
          } else {
            assert.strictEqual(origin, phase)
            assert(Exit.isFailure(exit))
            if (Cause.hasDies(exit.cause)) {
              assert.strictEqual(Result.getOrThrow(Cause.findDefect(exit.cause)), driverError)
            }
            assert.isFalse(Cause.hasDies(exit.cause), "storage failures must use the typed SqlError channel")
            const error = Option.getOrThrow(Cause.findErrorOption(exit.cause))
            assert.strictEqual(error._tag, "SqlError")
            assert.strictEqual(error.reason._tag, "UnknownError")
            assert.strictEqual(error.reason.cause, driverError)
          }
        }).pipe(Effect.provide(Reactivity.layer)))
    }
  }
})
