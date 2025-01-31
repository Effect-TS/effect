import { describe, it } from "@effect/vitest"
import * as Effect from "effect/Effect"
import * as Stream from "effect/Stream"
import * as Streamable from "effect/Streamable"
import { deepStrictEqual } from "effect/test/util"

describe("Streamable", () => {
  it.effect(
    "allows creating custom Stream types",
    () =>
      Effect.gen(function*() {
        class MyStream extends Streamable.Class<number> {
          toStream() {
            return Stream.fromIterable([1, 2, 3])
          }
        }
        const stream = new MyStream()

        const values = Array.from(yield* Stream.runCollect(stream))

        deepStrictEqual(values, [1, 2, 3])
      })
  )
})
