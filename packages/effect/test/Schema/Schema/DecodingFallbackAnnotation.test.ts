import { describe, it } from "@effect/vitest"
import { deepStrictEqual } from "@effect/vitest/utils"
import { Effect, Either } from "effect"
import * as S from "effect/Schema"
import * as Util from "../TestUtils.js"

describe("DecodingFallbackAnnotation", () => {
  it("using Either", async () => {
    const schema = S.String.annotations({ decodingFallback: () => Either.right("<fallback value>") })
    await Util.assertions.decoding.succeed(
      schema,
      null,
      "<fallback value>"
    )
  })

  it("using a sync Effect", async () => {
    const log: Array<unknown> = []
    const schema = S.String.annotations({
      decodingFallback: (issue) =>
        Effect.gen(function*() {
          log.push(issue.actual)
          return yield* Effect.succeed("<fallback value>")
        })
    })
    await Util.assertions.decoding.succeed(
      schema,
      null,
      "<fallback value>"
    )
    deepStrictEqual(log, [null])
  })

  it("using an async Effect", async () => {
    const log: Array<unknown> = []
    const schema = S.String.annotations({
      decodingFallback: (issue) =>
        Effect.gen(function*() {
          log.push(issue.actual)
          yield* Effect.sleep(10)
          return yield* Effect.succeed("<fallback value>")
        })
    })
    await Util.assertions.decoding.succeed(
      schema,
      null,
      "<fallback value>"
    )
    deepStrictEqual(log, [null])
    Util.assertions.parseError(
      () => S.decodeUnknownSync(schema)(null),
      `string
└─ cannot be be resolved synchronously, this is caused by using runSync on an effect that performs async work`
    )
  })

  it("nested Struct", async () => {
    const schema = S.Struct({
      name: S.String.annotations({ decodingFallback: () => Either.right("John") }),
      age: S.Number.annotations({ decodingFallback: () => Either.right(18) })
    })
    await Util.assertions.decoding.succeed(
      schema,
      {},
      { name: "John", age: 18 }
    )
  })
})
