import { assert, describe, it } from "@effect/vitest"
import { Effect, Exit } from "effect"
import * as Schema from "effect/Schema"
import { SqlResolver } from "effect/unstable/sql"

describe("SqlResolver", () => {
  describe("findById", () => {
    it.effect("deduplicates requests by id", () =>
      Effect.gen(function*() {
        const batches: Array<Array<number>> = []
        const FindById = SqlResolver.findById({
          Id: Schema.Number,
          Result: Schema.Struct({ id: Schema.Number, name: Schema.String }),
          ResultId: (result) => result.id,
          execute: (ids) => {
            batches.push([...ids])
            return Effect.succeed(ids.map((id) => ({ id, name: `name${id}` })))
          }
        })
        const execute = SqlResolver.request(FindById)

        assert.deepStrictEqual(
          yield* Effect.all({
            one: execute(1),
            oneAgain: execute(1),
            two: execute(2)
          }, { concurrency: "unbounded" }),
          {
            one: { id: 1, name: "name1" },
            oneAgain: { id: 1, name: "name1" },
            two: { id: 2, name: "name2" }
          }
        )
        assert.deepStrictEqual(batches, [[1, 2]])
      }))
  })

  describe("ordered", () => {
    it.effect("keeps valid results aligned when another request fails encoding", () =>
      Effect.gen(function*() {
        const resolver = SqlResolver.ordered({
          Request: Schema.Number.check(Schema.isGreaterThan(0)),
          Result: Schema.String,
          execute: (inputs) => Effect.succeed(inputs.map((input) => `value-${input}`))
        })
        const execute = SqlResolver.request(resolver)
        const [invalid, valid] = yield* Effect.all([
          Effect.exit(execute(-1)),
          Effect.exit(execute(2))
        ], { concurrency: "unbounded" })

        assert(Exit.isFailure(invalid))
        assert(Exit.isSuccess(valid))
        assert.strictEqual(valid.value, "value-2")
      }))
  })
})
