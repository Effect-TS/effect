import { PgliteClient } from "@effect/sql-pglite"
import { assert, describe, layer } from "@effect/vitest"
import { Effect } from "effect"

describe("PgliteClient JSON values", () => {
  layer(PgliteClient.layer(), { timeout: "30 seconds" })((it) => {
    for (const type of ["json", "jsonb"]) {
      describe(type, () => {
        it.effect.each(["null", "123", "hello"])("preserves the string %j", (input) =>
          Effect.gen(function*() {
            const sql = yield* PgliteClient.PgliteClient
            const rows = yield* sql<{ value: unknown }>`SELECT ${sql.json(input)}::${sql.literal(type)} AS value`
            assert.deepStrictEqual(rows, [{ value: input }])
          }))

        it.effect.each([
          { input: { message: "hello" } },
          { input: ["null", "123", "hello"] },
          { input: 123 },
          { input: true },
          { input: false },
          { input: null }
        ])("preserves the non-string JSON value $input", ({ input }) =>
          Effect.gen(function*() {
            const sql = yield* PgliteClient.PgliteClient
            const rows = yield* sql<{ value: unknown }>`SELECT ${sql.json(input)}::${sql.literal(type)} AS value`
            assert.deepStrictEqual(rows, [{ value: input }])
          }))

        it.effect.each(["null", "123", "hello"])(
          "accepts explicitly serialized string %j",
          (input) =>
            Effect.gen(function*() {
              const sql = yield* PgliteClient.PgliteClient
              const rows = yield* sql<{ value: unknown }>`SELECT ${JSON.stringify(input)}::${
                sql.literal(type)
              } AS value`
              assert.deepStrictEqual(rows, [{ value: input }])
            })
        )

        it.effect.each(["", "\"quoted\"\\\n"])("escapes the string %j", (input) =>
          Effect.gen(function*() {
            const sql = yield* PgliteClient.PgliteClient
            const rows = yield* sql`SELECT ${sql.json(input)}::${sql.literal(type)} AS value`
            assert.deepStrictEqual(rows, [{ value: input }])
          }))

        for (const transformJson of [true, false]) {
          it.effect.each([true, false])(
            `transformJson=${transformJson}, withoutTransform=%j`,
            (withoutTransform) =>
              Effect.gen(function*() {
                const sql = yield* PgliteClient.PgliteClient
                const compiler = PgliteClient.makeCompiler((name) => name.toUpperCase(), transformJson)
                const input = { nested: [{ message: "hello" }] }
                const expected = transformJson && !withoutTransform ? { NESTED: [{ MESSAGE: "hello" }] } : input
                const [query, params] = compiler.compile(
                  sql`SELECT ${sql.json("hello")}::${sql.literal(type)} AS text, ${sql.json(input)}::${
                    sql.literal(type)
                  } AS value`,
                  withoutTransform
                )
                assert.deepStrictEqual(params, [JSON.stringify("hello"), expected])
                assert.deepStrictEqual(yield* sql.unsafe(query, params), [{ text: "hello", value: expected }])
                assert.deepStrictEqual(input, { nested: [{ message: "hello" }] })
              })
          )
        }
      })
    }

    it.effect("leaves ordinary SQL parameters unchanged", () =>
      Effect.gen(function*() {
        const sql = yield* PgliteClient.PgliteClient
        const statement = sql`SELECT ${"hello"}::text AS text, ${123}::integer AS number, ${true}::boolean AS boolean`
        assert.deepStrictEqual(statement.compile()[1], ["hello", 123, true])
        assert.deepStrictEqual(yield* statement, [{ text: "hello", number: 123, boolean: true }])
      }))
  })
})
