import { right, left } from "fp-ts/lib/Either"

import { effect as T } from "../src"
import { raise, interruptWithError, done } from "../src/Exit"

describe("ParFast", () => {
  it("should complete", async () => {
    const a = jest.fn()
    const b = jest.fn()
    const c = jest.fn()
    const d = jest.fn()

    function calling(f: () => void, s: string) {
      return T.async((r) => {
        const handle = setTimeout(() => {
          r(right(s))
        }, 2000)
        return (cb) => {
          f()
          clearTimeout(handle)
          cb()
        }
      })
    }

    const processes = [
      calling(a, "a"),
      calling(b, "b"),
      calling(c, "c"),
      calling(d, "d")
    ]

    const result = await T.runToPromiseExit(T.parFastSequenceArray(processes))

    expect(result).toStrictEqual(done(["a", "b", "c", "d"]))
    expect(a.mock.calls.length).toStrictEqual(0)
    expect(b.mock.calls.length).toStrictEqual(0)
    expect(c.mock.calls.length).toStrictEqual(0)
    expect(d.mock.calls.length).toStrictEqual(0)
  })
  it("should cancel", async () => {
    const a = jest.fn()
    const b = jest.fn()
    const c = jest.fn()
    const d = jest.fn()

    function calling(f: () => void) {
      return T.async((r) => {
        const handle = setTimeout(() => {
          r(right(undefined))
        }, 2000)
        return (cb) => {
          f()
          clearTimeout(handle)
          cb()
        }
      })
    }

    const processes = [
      calling(a),
      calling(b),
      T.async((r) => {
        const handle = setTimeout(() => {
          r(left("ok"))
        }, 100)
        return (cb) => {
          clearTimeout(handle)
          cb()
        }
      }),
      calling(c),
      calling(d)
    ]

    const result = await T.runToPromiseExit(T.parFastSequenceArray(processes))

    expect(result).toStrictEqual(raise("ok"))
    expect(a.mock.calls.length).toStrictEqual(1)
    expect(b.mock.calls.length).toStrictEqual(1)
    expect(c.mock.calls.length).toStrictEqual(1)
    expect(d.mock.calls.length).toStrictEqual(1)
  })
  it("should abort", async () => {
    const a = jest.fn()
    const b = jest.fn()
    const c = jest.fn()
    const d = jest.fn()

    function calling(f: () => void, s: string) {
      return T.async((r) => {
        const handle = setTimeout(() => {
          r(right(undefined))
        }, 2000)
        return (cb) => {
          f()
          clearTimeout(handle)
          cb(new Error(s))
        }
      })
    }

    const processes = [
      calling(a, "a"),
      calling(b, "b"),
      T.async((r) => {
        const handle = setTimeout(() => {
          r(left("ok"))
        }, 100)
        return (cb) => {
          clearTimeout(handle)
          cb()
        }
      }),
      calling(c, "c"),
      calling(d, "d")
    ]

    const result = await T.runToPromiseExit(T.parFastSequenceArray(processes))

    expect(result).toStrictEqual(
      interruptWithError(new Error("a"), new Error("b"), new Error("c"), new Error("d"))
    )
    expect(a.mock.calls.length).toStrictEqual(1)
    expect(b.mock.calls.length).toStrictEqual(1)
    expect(c.mock.calls.length).toStrictEqual(1)
    expect(d.mock.calls.length).toStrictEqual(1)
  })
  it("should handle interrupt", async () => {
    const a = jest.fn()
    const b = jest.fn()
    const c = jest.fn()
    const d = jest.fn()

    function calling(f: () => void, s: string) {
      return T.async((r) => {
        const handle = setTimeout(() => {
          r(right(undefined))
        }, 2000)
        return (cb) => {
          f()
          clearTimeout(handle)
          cb(new Error(s))
        }
      })
    }

    const processes = [
      calling(a, "a"),
      calling(b, "b"),
      calling(c, "c"),
      calling(d, "d")
    ]

    const fiber = await T.runToPromise(T.fork(T.parFastSequenceArray(processes)))
    const result = await T.runToPromise(fiber.interrupt)

    expect(a.mock.calls.length).toStrictEqual(1)
    expect(b.mock.calls.length).toStrictEqual(1)
    expect(c.mock.calls.length).toStrictEqual(1)
    expect(d.mock.calls.length).toStrictEqual(1)

    expect(result).toStrictEqual(
      interruptWithError(new Error("a"), new Error("b"), new Error("c"), new Error("d"))
    )
  })
})
