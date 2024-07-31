import * as S from "@effect/schema/Schema"
import * as Util from "@effect/schema/test/TestUtils"
import { Effect, Either } from "effect"
import { describe, expect, it } from "vitest"

describe("DecodingFallbackAnnotation", () => {
  it("using Either", async () => {
    const schema = S.String.annotations({ decodingFallback: () => Either.right("<fallback value>") })
    await Util.expectDecodeUnknownSuccess(
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
    await Util.expectDecodeUnknownSuccess(
      schema,
      null,
      "<fallback value>"
    )
    expect(log).toEqual([null])
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
    await Util.expectDecodeUnknownSuccess(
      schema,
      null,
      "<fallback value>"
    )
    expect(log).toEqual([null])
    expect(() => S.decodeUnknownSync(schema)(null)).toThrowError(
      new Error(`string
└─ cannot be be resolved synchronously, this is caused by using runSync on an effect that performs async work`)
    )
  })

  it("nested Struct", async () => {
    const schema = S.Struct({
      name: S.String.annotations({ decodingFallback: () => Either.right("John") }),
      age: S.Number.annotations({ decodingFallback: () => Either.right(18) })
    })
    await Util.expectDecodeUnknownSuccess(
      schema,
      {},
      { name: "John", age: 18 }
    )
  })
})
