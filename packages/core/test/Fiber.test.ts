import * as T from "../src/Effect"
import * as E from "../src/Either"
import * as Ex from "../src/Exit"

describe("Fiber", () => {
  it("fork/join", async () => {
    const a = jest.fn()
    const b = jest.fn()

    const fiber = T.runUnsafeSync(
      T.fork(
        T.async<never, void>((r) => {
          const timer = setTimeout(() => {
            r(E.right(undefined))
          }, 15000)
          return (cb) => {
            clearTimeout(timer)
            cb("aaa")
          }
        })
      )
    )

    const cancelJoin = T.run(fiber.join, a)

    cancelJoin(b)

    await T.runToPromise(T.delay(T.unit, 100))

    expect(a.mock.calls.length).toBe(1)
    expect(b.mock.calls.length).toBe(1)

    expect(a.mock.calls[0][0]).toStrictEqual(Ex.interruptWithError("aaa"))
  })
})
