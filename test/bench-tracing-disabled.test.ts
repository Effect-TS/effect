// trace: on
// tracingModule: ../src/Tracing

import * as T from "../src/Effect"
import { tracingEnabled } from "../src/Tracing"

tracingEnabled.set(false)

function fibEffect(n: number): T.UIO<number> {
  if (n < 2) {
    return T.succeed(1)
  }
  return T.zipWith_(
    T.suspend(() => fibEffect(n - 1)),
    T.suspend(() => fibEffect(n - 2)),
    (a, b) => a + b
  )
}
async function fibPromise(n: number): Promise<number> {
  if (n < 2) {
    return 1
  }
  const a = await fibPromise(n - 1)
  const b = await fibPromise(n - 2)
  return a + b
}
function fibEffectGen(n: number): T.UIO<number> {
  if (n < 2) {
    return T.succeed(1)
  }
  return T.gen(function* (_) {
    const x = yield* _(fibEffectGen(n - 1))
    const y = yield* _(fibEffectGen(n - 2))
    return x + y
  })
}

describe("Bench with Tracing on and global disable", () => {
  it("promise", async () => {
    for (let i = 0; i < 1000; i++) {
      await fibPromise(10)
    }
  })
  it("effect", () => T.runPromise(T.repeatN(1000)(fibEffect(10))))
  it("effect-gen", () =>
    T.runPromise(
      T.gen(function* (_) {
        for (let i = 0; i < 1000; i++) {
          yield* _(fibEffect(10))
        }
      })
    ))
  it("effect-gen-2", () =>
    T.runPromise(
      T.gen(function* (_) {
        for (let i = 0; i < 1000; i++) {
          yield* _(fibEffectGen(10))
        }
      })
    ))
})
