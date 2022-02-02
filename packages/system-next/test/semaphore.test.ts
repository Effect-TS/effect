import { Tuple } from "../src/collection/immutable/Tuple"
import { pipe } from "../src/data/Function"
import { Effect } from "../src/io/Effect"
import * as Fiber from "../src/io/Fiber"
import { Promise } from "../src/io/Promise"
import * as STM from "../src/stm/STM"
import * as TRef from "../src/stm/TRef"
import * as TSemaphore from "../src/stm/TSemaphore"

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
      const program = pipe(
        TSemaphore.make(10),
        STM.chain(TSemaphore.available),
        STM.commit
      )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(10)
    })
  })

  describe("acquire and release", () => {
    it("acquiring and releasing a permit should not change the availability", async () => {
      const program = pipe(
        TSemaphore.make(10),
        STM.chain((semaphore) =>
          pipe(
            TSemaphore.acquire(semaphore),
            STM.chain(() => TSemaphore.release(semaphore)),
            STM.chain(() => TSemaphore.available(semaphore))
          )
        ),
        STM.commit
      )

      const result = await program.unsafeRunPromise()

      expect(result).toBe(10)
    })

    it("used capacity must be equal to the # of acquires minus # of releases", async () => {
      const capacity = 10
      const acquire = 7
      const release = 4

      const program = pipe(
        TSemaphore.make(capacity),
        STM.chain((sem) =>
          pipe(
            repeat(TSemaphore.acquire(sem), acquire),
            STM.chain(() => repeat(TSemaphore.release(sem), release)),
            STM.chain(() => TSemaphore.available(sem))
          )
        ),
        STM.commit
      )

      const result = await program.unsafeRunPromise()

      const usedCapacity = acquire - release

      expect(result).toBe(capacity - usedCapacity)
    })

    it("acquireN/releaseN(n) is acquire/release repeated N times", async () => {
      const capacity = 50

      function acquireRelease(
        sem: TSemaphore.TSemaphore,
        acquire: (n: number) => STM.STM<unknown, never, void>,
        release: (n: number) => STM.STM<unknown, never, void>
      ): STM.STM<unknown, never, Tuple<[number, number]>> {
        return STM.gen(function* (_) {
          yield* _(acquire(50))

          const usedCapacity = yield* _(TSemaphore.available(sem))

          yield* _(release(capacity))

          const freeCapacity = yield* _(TSemaphore.available(sem))

          return Tuple(usedCapacity, freeCapacity)
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

      const program = STM.commit(stm)

      const { resN, resRep } = await program.unsafeRunPromise()

      expect(resN.get(0)).toBe(resRep.get(0))
      expect(resN.get(1)).toBe(resRep.get(1))
      expect(resN.get(0)).toBe(0)
      expect(resN.get(1)).toBe(capacity)
    })

    it("withPermit automatically releases the permit if the effect is interrupted", async () => {
      const program = Effect.Do()
        .bind("promise", () => Promise.make<never, void>())
        .bind("semaphore", () => STM.commit(TSemaphore.make(1)))
        .bindValue("effect", ({ promise, semaphore }) =>
          TSemaphore.withPermit_(promise.succeed(undefined), semaphore).flatMap(
            () => Effect.never
          )
        )
        .bind("fiber", ({ effect }) => effect.fork())
        .tap(({ promise }) => promise.await())
        .tap(({ fiber }) => Fiber.interrupt(fiber))
        .flatMap(({ semaphore }) => STM.commit(TRef.get(semaphore.permits)))

      const result = await program.unsafeRunPromise()

      expect(result).toBe(1)
    })

    it("withPermit acquire is interruptible", async () => {
      const f = jest.fn()
      const program = Effect.Do()
        .bind("semaphore", () => STM.commit(TSemaphore.make(0)))
        .bindValue("effect", ({ semaphore }) =>
          TSemaphore.withPermit_(
            Effect.succeed(() => f()),
            semaphore
          )
        )
        .bind("fiber", ({ effect }) => effect.fork())
        .tap(({ fiber }) => Fiber.interrupt(fiber))
        .flatMap(({ fiber }) => Fiber.join(fiber))

      const result = await program.unsafeRunPromiseExit()

      expect(result.isInterrupted()).toBe(true)
      expect(f).toHaveBeenCalledTimes(0)
    })
  })
})
