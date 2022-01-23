import * as Tp from "../src/Collections/Immutable/Tuple"
import * as T from "../src/Effect"
import * as Ex from "../src/Exit"
import * as Fiber from "../src/Fiber"
import { pipe } from "../src/Function"
import * as Promise from "../src/Promise"
import * as STM from "../src/Transactional/STM"
import * as TRef from "../src/Transactional/TRef"
import * as TSemaphore from "../src/Transactional/TSemaphore"

function repeat<E, A>(self: STM.STM<unknown, E, A>, n: number): STM.STM<unknown, E, A> {
  if (n < 1) {
    return STM.die(`The value of "n" must be greater than 0, received: ${n}`)
  }
  if (n === 1) {
    return self
  }
  return STM.chain_(self, () => STM.suspend(() => repeat(self, n - 1)))
}

describe("TSemaphore", () => {
  describe("factories", () => {
    it("make", async () => {
      const result = await pipe(
        TSemaphore.make(10),
        STM.chain(TSemaphore.available),
        STM.commit,
        T.unsafeRunPromise
      )

      expect(result).toBe(10)
    })
  })

  describe("acquire and release", () => {
    it("acquiring and releasing a permit should not change the availability", async () => {
      const result = await pipe(
        TSemaphore.make(10),
        STM.chain((semaphore) =>
          pipe(
            TSemaphore.acquire(semaphore),
            STM.chain(() => TSemaphore.release(semaphore)),
            STM.chain(() => TSemaphore.available(semaphore))
          )
        ),
        STM.commit,
        T.unsafeRunPromise
      )

      expect(result).toBe(10)
    })

    it("used capacity must be equal to the # of acquires minus # of releases", async () => {
      const capacity = 10
      const acquire = 7
      const release = 4

      const result = await pipe(
        TSemaphore.make(capacity),
        STM.chain((sem) =>
          pipe(
            repeat(TSemaphore.acquire(sem), acquire),
            STM.chain(() => repeat(TSemaphore.release(sem), release)),
            STM.chain(() => TSemaphore.available(sem))
          )
        ),
        STM.commit,
        T.unsafeRunPromise
      )

      const usedCapacity = acquire - release

      expect(result).toBe(capacity - usedCapacity)
    })

    it("acquireN/releaseN(n) is acquire/release repeated N times", async () => {
      const capacity = 50

      function acquireRelease(
        sem: TSemaphore.TSemaphore,
        acquire: (n: number) => STM.STM<unknown, never, void>,
        release: (n: number) => STM.STM<unknown, never, void>
      ): STM.STM<unknown, never, Tp.Tuple<[number, number]>> {
        return STM.gen(function* (_) {
          yield* _(acquire(50))

          const usedCapacity = yield* _(TSemaphore.available(sem))

          yield* _(release(capacity))

          const freeCapacity = yield* _(TSemaphore.available(sem))

          return Tp.tuple(usedCapacity, freeCapacity)
        })
      }

      const stm = STM.gen(function* (_) {
        const sem = yield* _(TSemaphore.make(capacity))
        const acquireReleaseN = acquireRelease(
          sem,
          (n) => TSemaphore.acquireN_(sem, n),
          (n) => TSemaphore.releaseN_(sem, n)
        )
        const acquireReleaseRep = acquireRelease(
          sem,
          (n) => repeat(TSemaphore.acquire(sem), n),
          (n) => repeat(TSemaphore.release(sem), n)
        )
        const resN = yield* _(acquireReleaseN)
        const resRep = yield* _(acquireReleaseRep)
        return { resN, resRep }
      })

      const { resN, resRep } = await pipe(STM.commit(stm), T.unsafeRunPromise)

      expect(resN.get(0)).toBe(resRep.get(0))
      expect(resN.get(1)).toBe(resRep.get(1))
      expect(resN.get(0)).toBe(0)
      expect(resN.get(1)).toBe(capacity)
    })

    it("withPermit automatically releases the permit if the effect is interrupted", async () => {
      const { permits } = await pipe(
        T.Do(),
        T.bind("promise", () => Promise.make<never, void>()),
        T.bind("semaphore", () => STM.commit(TSemaphore.make(1))),
        T.bindValue("effect", ({ promise, semaphore }) =>
          T.chain_(
            TSemaphore.withPermit_(Promise.succeed_(promise, undefined), semaphore),
            () => T.never
          )
        ),
        T.bind("fiber", ({ effect }) => T.fork(effect)),
        T.tap(({ promise }) => Promise.await(promise)),
        T.tap(({ fiber }) => Fiber.interrupt(fiber)),
        T.bind("permits", ({ semaphore }) =>
          pipe(TRef.get(semaphore.permits), STM.commit)
        ),
        T.unsafeRunPromise
      )

      expect(permits).toBe(1)
    })

    it("withPermit acquire is interruptible", async () => {
      const f = jest.fn()
      const res = await pipe(
        T.Do(),
        T.bind("semaphore", () => STM.commit(TSemaphore.make(0))),
        T.bindValue("effect", ({ semaphore }) =>
          TSemaphore.withPermit_(
            T.succeed(() => f()),
            semaphore
          )
        ),
        T.bind("fiber", ({ effect }) => T.fork(effect)),
        T.tap(({ fiber }) => Fiber.interrupt(fiber)),
        T.chain(({ fiber }) => Fiber.join(fiber)),
        T.unsafeRunPromiseExit
      )

      expect(Ex.isInterrupted(res)).toBe(true)
      expect(f).toHaveBeenCalledTimes(0)
    })
  })
})
