import * as T from "../src/Effect"

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

describe("Bench", () => {
  it("effect", async () => {
    for (let i = 0; i < 100; i++) {
      await T.runPromise(fibEffect(10))
    }
  })
  it("promise", async () => {
    for (let i = 0; i < 100; i++) {
      await fibPromise(10)
    }
  })
})
