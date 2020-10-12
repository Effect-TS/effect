import * as T from "../src/Effect"
import { pipe } from "../src/Function"

describe("FFI", () => {
  it("should interpret ffi", async () => {
    class MyEffectPrimitive extends T.FFI<unknown, never, number> {
      constructor(readonly n: number) {
        super()
      }
      get [T._I]() {
        return pipe(T.effectTotal(() => this.n))[T._I]
      }
    }

    const myEffect = new MyEffectPrimitive(0)

    const result = await pipe(
      myEffect,
      T.chain((n) => T.effectTotal(() => n + 1)),
      T.runPromise
    )

    expect(result).toEqual(1)
  })
})
