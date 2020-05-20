import * as assert from "assert"

import { sequenceT } from "../src/Apply"
import { array } from "../src/Array"
import * as T from "../src/Effect"
import { right } from "../src/Either"
import { interruptWithError, done } from "../src/Exit"

describe("Interrupt", () => {
  it("run gets exit in cb", async () => {
    const program = T.async(() => (cb) => {
      setTimeout(() => {
        cb(new Error("ok"))
      }, 100)
    })

    const cancel = T.run(program)
    let pExit = {}
    cancel((exit) => {
      pExit = exit
    })
    await T.runToPromise(T.delay(T.unit, 100))
    expect(pExit).toStrictEqual(interruptWithError(new Error("ok")))
  })
  it("run gets exit in cb - 2", async () => {
    const program = T.async((res) => {
      res(right("ok"))
      return (cb) => {
        setTimeout(() => {
          cb(new Error("ok"))
        }, 100)
      }
    })

    const cancel = T.run(program)
    let pExit = {}
    cancel((exit) => {
      pExit = exit
    })
    await T.runToPromise(T.delay(T.unit, 100))
    expect(pExit).toStrictEqual(done("ok"))
  })
  it("should interrupt with error", async () => {
    let exit: any = null

    const program = T.async(() => (cb) => {
      setTimeout(() => {
        cb(new Error("test error"))
      }, 100)
    })

    const canceller = T.run(program, (ex) => {
      exit = ex
    })

    canceller()

    await T.runToPromise(T.delay(T.unit, 110))

    assert.deepStrictEqual(exit, interruptWithError(new Error("test error")))
  })

  it("should interrupt with error parallel", async () => {
    let exit: any = null

    const program = sequenceT(T.parEffect)(
      T.async(() => (cb) => {
        setTimeout(() => {
          cb(new Error("test error"))
        }, 100)
      }),
      T.async(() => (cb) => {
        setTimeout(() => {
          cb(new Error("test error 2"))
        }, 100)
      })
    )

    const canceller = T.run(program, (ex) => {
      exit = ex
    })

    canceller()

    await T.runToPromise(T.delay(T.unit, 250))

    assert.deepStrictEqual(
      exit,
      interruptWithError(new Error("test error"), new Error("test error 2"))
    )
  })

  it("parallel interrupt", async () => {
    let counter = 0

    const program = T.asyncTotal((x) => {
      const timer = setTimeout(() => {
        x(undefined)
      }, 3000)
      return (cb) => {
        counter++
        clearTimeout(timer)
        cb()
      }
    })

    const par = array.sequence(T.parEffect)([program, program, program])

    const fiber = await T.runToPromise(T.fork(par))

    await T.runToPromise(fiber.interrupt)

    expect(counter).toBe(3)
  })
})
