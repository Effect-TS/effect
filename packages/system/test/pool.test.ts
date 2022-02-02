import * as Chunk from "../src/Collections/Immutable/Chunk"
import * as Tp from "../src/Collections/Immutable/Tuple"
import * as T from "../src/Effect"
import * as Ex from "../src/Exit"
import { pipe } from "../src/Function"
import * as M from "../src/Managed"
import * as Pool from "../src/Pool"
import * as P from "../src/Promise"
import * as Ref from "../src/Ref"

describe("Pool", () => {
  it("preallocates pool items", async () => {
    const result = await pipe(
      T.gen(function* (_) {
        const count = yield* _(Ref.makeRef(0))
        const get = M.make_(
          Ref.updateAndGet_(count, (_) => _ + 1),
          (_) => Ref.update_(count, (_) => _ - 1)
        )
        const reserve = yield* _(M.managedReserve(Pool.makeFixed(get, 10)))

        yield* _(reserve.acquire)
        yield* _(T.repeatUntil_(count.get, (_) => _ === 10))

        return yield* _(count.get)
      }),
      T.runPromise
    )

    expect(result).toEqual(10)
  })

  it("cleans up items when shut down", async () => {
    const result = await pipe(
      T.gen(function* (_) {
        const count = yield* _(Ref.makeRef(0))
        const get = M.make_(
          Ref.updateAndGet_(count, (_) => _ + 1),
          (_) => Ref.update_(count, (_) => _ - 1)
        )
        const reserve = yield* _(M.managedReserve(Pool.makeFixed(get, 10)))

        yield* _(reserve.acquire)
        yield* _(T.repeatUntil_(count.get, (_) => _ === 10))
        yield* _(reserve.release(Ex.succeed(undefined)))

        return yield* _(count.get)
      }),
      T.runPromise
    )

    expect(result).toEqual(0)
  })

  it("acquire one item", async () => {
    const result = await pipe(
      T.gen(function* (_) {
        const count = yield* _(Ref.makeRef(0))
        const get = M.make_(
          Ref.updateAndGet_(count, (_) => _ + 1),
          (_) => Ref.update_(count, (_) => _ - 1)
        )
        const reserve = yield* _(M.managedReserve(Pool.makeFixed(get, 10)))
        const pool = yield* _(reserve.acquire)

        yield* _(T.repeatUntil_(count.get, (_) => _ === 10))

        return yield* _(M.use_(Pool.get(pool), (_) => T.succeed(_)))
      }),
      T.runPromise
    )

    expect(result).toEqual(1)
  })

  it("reports failures via get", async () => {
    const result = await pipe(
      T.gen(function* (_) {
        const count = yield* _(Ref.makeRef(0))
        const get = M.make_(
          T.chain_(
            Ref.updateAndGet_(count, (_) => _ + 1),
            (_) => T.fail(_)
          ),
          (_) => Ref.update_(count, (_) => _ - 1)
        )
        const reserve = yield* _(
          M.managedReserve(Pool.makeFixed<unknown, number, string>(get, 10))
        )
        const pool = yield* _(reserve.acquire)

        yield* _(T.repeatUntil_(count.get, (_) => _ === 10))

        return yield* _(
          T.collectAll(
            Array.from({ length: 10 }, () =>
              T.chain_(M.managedReserve(Pool.get(pool)), (_) => T.flip(_.acquire))
            )
          )
        )
      }),
      T.runPromise
    )

    expect(result).equals(Chunk.make(1, 2, 3, 4, 5, 6, 7, 8, 9, 10))
  })

  it("blocks when item not available", async () => {
    const result = await pipe(
      T.gen(function* (_) {
        const count = yield* _(Ref.makeRef(0))
        const get = M.make_(
          Ref.updateAndGet_(count, (_) => _ + 1),
          (_) => Ref.update_(count, (_) => _ - 1)
        )
        const reserve = yield* _(M.managedReserve(Pool.makeFixed(get, 10)))
        const pool = yield* _(reserve.acquire)

        yield* _(T.repeatUntil_(count.get, (_) => _ === 10))
        yield* _(
          T.collectAll(
            Array.from({ length: 10 }, () =>
              T.chain_(M.managedReserve(Pool.get(pool)), (_) => _.acquire)
            )
          )
        )

        return yield* _(
          T.timeout_(T.disconnect(M.use_(Pool.get(pool), (_) => T.unit)), 1)
        )
      }),
      T.runPromise
    )

    expect(result._tag).equals("None")
  })

  it("reuse released items", async () => {
    const result = await pipe(
      T.gen(function* (_) {
        const count = yield* _(Ref.makeRef(0))
        const get = M.make_(
          Ref.updateAndGet_(count, (_) => _ + 1),
          (_) => Ref.update_(count, (_) => _ - 1)
        )
        const reserve = yield* _(M.managedReserve(Pool.makeFixed(get, 10)))
        const pool = yield* _(reserve.acquire)

        yield* _(
          T.repeatN_(
            M.use_(Pool.get(pool), (_) => T.unit),
            99
          )
        )

        return yield* _(count.get)
      }),
      T.runPromise
    )

    expect(result).equals(10)
  })

  it("invalidate item", async () => {
    const result = await pipe(
      T.gen(function* (_) {
        const count = yield* _(Ref.makeRef(0))
        const get = M.make_(
          Ref.updateAndGet_(count, (_) => _ + 1),
          (_) => Ref.update_(count, (_) => _ - 1)
        )
        const reserve = yield* _(M.managedReserve(Pool.makeFixed(get, 10)))
        const pool = yield* _(reserve.acquire)

        yield* _(T.repeatUntil_(count.get, (_) => _ === 10))
        yield* _(Pool.invalidate_(pool, 1))

        return yield* _(M.use_(Pool.get(pool), (_) => T.succeed(_)))
      }),
      T.runPromise
    )

    expect(result).equals(2)
  })

  it("compositional retry", async () => {
    const cond = (i: number) => (i <= 10 ? T.fail(i) : T.succeed(i))

    const result = await pipe(
      T.gen(function* (_) {
        const count = yield* _(Ref.makeRef(0))
        const get = M.make_(
          T.chain_(
            Ref.updateAndGet_(count, (_) => _ + 1),
            (_) => cond(_)
          ),
          (_) => Ref.update_(count, (_) => _ - 1)
        )
        const reserve = yield* _(M.managedReserve(Pool.makeFixed(get, 10)))
        const pool = yield* _(reserve.acquire)

        yield* _(T.repeatUntil_(count.get, (_) => _ === 10))

        return yield* _(T.eventually(M.use_(Pool.get(pool), (_) => T.succeed(_))))
      }),
      T.runPromise
    )

    expect(result).equals(11)
  })

  // Timing issue? Revisit later
  it.skip("max pool size", async () => {
    const result = await pipe(
      T.gen(function* (_) {
        const promise = yield* _(P.make<never, void>())
        const count = yield* _(Ref.makeRef(0))
        const get = M.make_(
          Ref.updateAndGet_(count, (_) => _ + 1),
          (_) => Ref.update_(count, (_) => _ - 1)
        )
        const reserve = yield* _(
          M.managedReserve(Pool.make(get, Tp.tuple(10, 15), 1000))
        )
        const pool = yield* _(reserve.acquire)

        yield* _(
          T.repeatN_(T.fork(M.use_(Pool.get(pool), (_) => P.await(promise))), 14)
        )
        yield* _(T.repeatUntil_(count.get, (_) => _ === 15))
        yield* _(P.succeed_(promise, undefined))

        const max = yield* _(count.get)

        yield* _(T.sleep(2500))

        const min = yield* _(count.get)

        return { min, max }
      }),
      T.runPromise
    )

    expect(result).toEqual({ min: 10, max: 15 })
  })

  it("shutdown robustness", async () => {
    const result = await pipe(
      T.gen(function* (_) {
        const count = yield* _(Ref.makeRef(0))
        const get = M.make_(
          Ref.updateAndGet_(count, (_) => _ + 1),
          (_) => Ref.update_(count, (_) => _ - 1)
        )
        const reserve = yield* _(M.managedReserve(Pool.makeFixed(get, 10)))
        const pool = yield* _(reserve.acquire)

        yield* _(T.repeatN_(T.fork(M.use_(Pool.get(pool), (_) => T.succeed(_))), 99))
        yield* _(reserve.release(Ex.succeed(undefined)))

        return yield* _(count.get)
      }),
      T.runPromise
    )

    expect(result).equals(0)
  })
})
