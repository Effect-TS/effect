import * as C from "../../src/Eff/Cause"
import * as T from "../../src/Eff/Effect"
import * as E from "../../src/Eff/Exit"

describe("Core Implementation", () => {
  it("should interrupt async", async () => {
    const fn = jest.fn()

    const effect = T.effectAsyncInterrupt((cb: T.Cb<T.Async<number>>) => {
      const timer = setTimeout(() => {
        cb(T.succeedNow(1))
      }, 5000)
      return T.effectTotal(() => {
        clearTimeout(timer)
        fn()
      })
    })

    const cancel = T.unsafeRunAsyncCancelable(effect)

    const status = await T.unsafeRunPromise(cancel)

    expect(E.interrupted(status) && C.interruptors(status.cause).size).toStrictEqual(1)
  })
})
