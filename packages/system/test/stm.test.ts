import * as T from "../src/Effect/index.js"
import * as Ex from "../src/Exit/index.js"
import { ArrayIndexOutOfBoundsException } from "../src/GlobalExceptions/index.js"
import * as O from "../src/Option/index.js"
import * as STM from "../src/Transactional/STM/index.js"
import * as TArray from "../src/Transactional/TArray/index.js"
import * as TRef from "../src/Transactional/TRef/index.js"

describe("TRef", () => {
  it("use TRef", async () => {
    const result = await T.runPromise(
      STM.gen(function* (_) {
        const ref = yield* _(TRef.make(0))

        yield* _(ref["|>"](TRef.update((n) => n + 1)))

        return yield* _(TRef.get(ref))
      })["|>"](STM.commit)
    )

    expect(result).toEqual(1)
  })
  it("use TRef getAndUpdateSome", async () => {
    const result = await T.runPromise(
      STM.gen(function* (_) {
        const ref = yield* _(TRef.make(0))

        const v0 = yield* _(
          ref["|>"](
            TRef.getAndUpdateSome(
              O.partial((miss) => (n) => {
                if (n > 0) {
                  return n + 1
                }
                return miss()
              })
            )
          )
        )

        return [yield* _(TRef.get(ref)), v0] as const
      })["|>"](STM.commit)
    )

    const result2 = await T.runPromise(
      STM.gen(function* (_) {
        const ref = yield* _(TRef.make(1))

        const v0 = yield* _(
          ref["|>"](
            TRef.getAndUpdateSome(
              O.partial((miss) => (n) => {
                if (n > 0) {
                  return n + 1
                }
                return miss()
              })
            )
          )
        )

        return [yield* _(TRef.get(ref)), v0] as const
      })["|>"](STM.commit)
    )

    expect(result).toEqual([0, 0])
    expect(result2).toEqual([2, 1])
  })
  it("use check", async () => {
    const f = jest.fn()

    await T.gen(function* (_) {
      const ref = yield* _(STM.commit(TRef.make(0)))

      yield* _(
        STM.commit(ref["|>"](TRef.get)["|>"](STM.tap((n) => STM.check(n > 3))))
          ["|>"](
            T.chain((n) =>
              T.succeedWith(() => {
                f(n)
              })
            )
          )
          ["|>"](T.fork)
      )

      yield* _(
        STM.commit(ref["|>"](TRef.update((n) => n + 1)))
          ["|>"](T.delay(10))
          ["|>"](T.repeatN(4))
          ["|>"](T.fork)
      )
    })
      ["|>"](T.awaitAllChildren)
      ["|>"](T.runPromise)

    expect(f).toHaveBeenCalledTimes(1)
    expect(f).toHaveBeenCalledWith(4)
  })
})

describe("TArray", () => {
  it("make-get", async () => {
    const result = await T.runPromiseExit(
      STM.commit(
        STM.gen(function* (_) {
          const arr = yield* _(TArray.make(0, 1, 2))

          return yield* _(TArray.get_(arr, 1))
        })
      )
    )
    const result2 = await T.runPromiseExit(
      STM.commit(
        STM.gen(function* (_) {
          const arr = yield* _(TArray.make(0, 1, 2))

          return yield* _(TArray.get_(arr, 3))
        })
      )
    )
    expect(result).toEqual(Ex.succeed(1))
    expect(result2).toEqual(Ex.die(new ArrayIndexOutOfBoundsException(3)))
  })
  it("find", async () => {
    const result = await T.runPromise(
      STM.commit(
        STM.gen(function* (_) {
          const arr = yield* _(TArray.make(0, 1, 2))
          const a = yield* _(TArray.find_(arr, (n) => n > 1))
          const b = yield* _(TArray.find_(arr, (n) => n > 2))
          return [a, b] as const
        })
      )
    )
    expect(result).toEqual([O.some(2), O.none])
  })
  it("findLast", async () => {
    const result = await T.runPromise(
      STM.commit(
        STM.gen(function* (_) {
          const arr = yield* _(TArray.make(0, 1, 2))
          const a = yield* _(TArray.findLast_(arr, (n) => n > 0))
          const b = yield* _(TArray.findLast_(arr, (n) => n > 2))
          return [a, b] as const
        })
      )
    )
    expect(result).toEqual([O.some(2), O.none])
  })
})
