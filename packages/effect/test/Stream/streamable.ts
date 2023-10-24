import * as it from "effect-test/utils/extend"
import * as Effect from "effect/Effect"
import * as Stream from "effect/Stream"
import * as Streamable from "effect/Streamable"
import { describe, expect } from "vitest"

describe("Streamable", () => {
  it.effect(
    "allows creating custom Stream types",
    () =>
      Effect.gen(function*($) {
        class MyStream extends Streamable.Class<never, never, number> {
          toStream() {
            return Stream.fromIterable([1, 2, 3])
          }
        }
        const stream = new MyStream()

        const values = Array.from(yield* $(Stream.runCollect(stream)))

        expect(values).toEqual([1, 2, 3])
      })
  )
})
