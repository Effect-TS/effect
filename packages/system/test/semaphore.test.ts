import * as A from "../src/Collections/Immutable/Array"
import * as T from "../src/Effect"
import * as F from "../src/Fiber"
import * as SM from "../src/Semaphore"

describe("Semaphores", () => {
  it("interrupts properly (Blocking IO First)", async () => {
    const program = T.gen(function* (_) {
      let blockingExecuted = 0
      let unblockingExecuted = 0
      const semaphore = yield* _(SM.make(1))
      const fiber = yield* _(
        T.fork(
          T.forEachPar_(A.range(1, 10), () =>
            SM.withPermit_(
              semaphore,
              T.gen(function* (_) {
                // Blocking IO
                yield* _(
                  T.succeedWith(() => {
                    blockingExecuted++
                  })
                )

                // Unblocking IO
                yield* _(
                  T.andThen_(
                    T.sleep(10),
                    T.succeedWith(() => {
                      unblockingExecuted++
                    })
                  )
                )

                yield* _(T.sleep(100))
              })
            )
          )
        )
      )

      // Give enough time for 2 iterations to completely finish then interrupt
      yield* _(T.sleep(200))
      yield* _(F.interrupt(fiber))

      return [blockingExecuted, unblockingExecuted]
    })

    const [blocking, unblocking] = await T.runPromise(program)

    expect(blocking).toEqual(10)
    expect(unblocking).toEqual(2)
  })

  it("interrupts properly (Unblocking IO First)", async () => {
    const program = T.gen(function* (_) {
      let blockingExecuted = 0
      let unblockingExecuted = 0
      const semaphore = yield* _(SM.make(1))
      const fiber = yield* _(
        T.fork(
          T.forEachPar_(A.range(1, 10), () =>
            SM.withPermit_(
              semaphore,
              // Unblocking IO
              T.gen(function* (_) {
                yield* _(
                  T.andThen_(
                    T.sleep(10),
                    T.succeedWith(() => {
                      unblockingExecuted++
                    })
                  )
                )

                // Blocking IO
                yield* _(
                  T.succeedWith(() => {
                    blockingExecuted++
                  })
                )
                yield* _(T.sleep(100))
              })
            )
          )
        )
      )

      // Give enough time for 2 iterations to completely finish then interrupt
      yield* _(T.sleep(200))
      yield* _(F.interrupt(fiber))

      return [blockingExecuted, unblockingExecuted]
    })

    const [blocking, unblocking] = await T.runPromise(program)

    expect(blocking).toEqual(2)
    expect(unblocking).toEqual(2)
  })
})
