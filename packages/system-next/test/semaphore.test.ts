import * as T from "../src/Effect"
import { pipe } from "../src/Function"
import * as STM from "../src/Transactional/STM"
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
// private def repeat[E, A](stm: STM[E, A])(n: Long): STM[E, A] = n match {
//     case x if x < 1 => STM.die(new Throwable("n must be greater than 0"))
//     case 1          => stm
//     case x          => stm *> repeat(stm)(x - 1)
//   }

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
  })
})
