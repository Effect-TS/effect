import { provideTestClock } from "../src/Clock"
import * as Tp from "../src/Collections/Immutable/Tuple"
import * as T from "../src/Effect"
import * as F from "../src/Fiber"
import * as FR from "../src/FiberRef"
import { identity, increment, pipe } from "../src/Function"
import * as O from "../src/Option"
import * as P from "../src/Promise"
import { runTest } from "./utils/runTest"

describe("FiberRef", () => {
  const initial = "initial"
  const update = "update"
  const update1 = "update1"
  const update2 = "update2"
  it("`get` returns the current valye", () =>
    T.gen(function* (_) {
      const fiberRef = yield* _(FR.make(initial))
      const value = yield* _(FR.get(fiberRef))
      expect(value).toEqual(initial)
    })["|>"](runTest))

  it("`get` returns the current value for a child", () =>
    T.gen(function* (_) {
      const fiberRef = yield* _(FR.make(initial))
      const child = yield* _(pipe(FR.get(fiberRef), T.fork))
      const value = yield* _(F.join(child))
      expect(value).toEqual(initial)
    })["|>"](runTest))

  it("`getAndUpdate` changes value", () =>
    T.gen(function* (_) {
      const fiberRef = yield* _(FR.make(initial))
      const value1 = yield* _(
        pipe(
          fiberRef,
          FR.getAndUpdate(() => update1)
        )
      )
      const value2 = yield* _(FR.get(fiberRef))
      expect(value1).toEqual(initial)
      expect(value2).toEqual(update1)
    })["|>"](runTest))

  it("`getAndUpdateSome` changes value", () =>
    T.gen(function* (_) {
      const fiberRef = yield* _(FR.make(initial))
      const value1 = yield* _(
        pipe(
          fiberRef,
          FR.getAndUpdateSome(() => O.some(update1))
        )
      )
      const value2 = yield* _(FR.get(fiberRef))
      expect(value1).toEqual(initial)
      expect(value2).toEqual(update1)
    })["|>"](runTest))

  it("`getAndUpdateSome` doesn't changes value", () =>
    T.gen(function* (_) {
      const fiberRef = yield* _(FR.make(initial))
      const value1 = yield* _(
        pipe(
          fiberRef,
          FR.getAndUpdateSome(
            O.partial((miss) => (x) => x !== initial ? update1 : miss())
          )
        )
      )
      const value2 = yield* _(FR.get(fiberRef))
      expect(value1).toEqual(initial)
      expect(value2).toEqual(initial)
    })["|>"](runTest))

  it("`locally` restores original value", () =>
    T.gen(function* (_) {
      const fiberRef = yield* _(FR.make(initial))
      const local = yield* _(pipe(fiberRef, FR.locally(update1)(FR.get(fiberRef))))
      const value = yield* _(FR.get(fiberRef))
      expect(local).toEqual(update1)
      expect(value).toEqual(initial)
      return
    })["|>"](runTest))

  it("`locally` restores parent's value", () =>
    T.gen(function* (_) {
      const fiberRef = yield* _(FR.make(initial))
      const child = yield* _(
        pipe(fiberRef, FR.locally(update1)(FR.get(fiberRef)), T.fork)
      )
      const local = yield* _(F.join(child))
      const value = yield* _(FR.get(fiberRef))
      expect(local).toEqual(update1)
      expect(value).toEqual(initial)
    })["|>"](runTest))

  it("`locally` restores undefined value", () =>
    T.gen(function* (_) {
      const child = yield* _(pipe(FR.make(initial), T.fork))
      const fiberRef = yield* _(pipe(child, F.await, T.chain(T.done)))
      const localValue = yield* _(pipe(fiberRef, FR.locally(update1)(FR.get(fiberRef))))
      const value = yield* _(FR.get(fiberRef))
      expect(localValue).toEqual(update1)
      expect(value).toEqual(initial)
    })["|>"](runTest))

  it("`modify` changes value", () =>
    T.gen(function* (_) {
      const fiberRef = yield* _(FR.make(initial))
      const value1 = yield* _(
        pipe(
          fiberRef,
          FR.modify(() => Tp.tuple(1, update1))
        )
      )
      const value2 = yield* _(FR.get(fiberRef))
      expect(value1).toEqual(1)
      expect(value2).toEqual(update1)
    })["|>"](runTest))

  it("`modifySome` doesn't change value", () =>
    T.gen(function* (_) {
      const fiberRef = yield* _(FR.make(initial))
      const value1 = yield* _(
        pipe(
          fiberRef,
          FR.modifySome(() => 2)(
            O.partial((miss) => (x) => x !== initial ? Tp.tuple(1, update1) : miss())
          )
        )
      )
      const value2 = yield* _(FR.get(fiberRef))
      expect(value1).toEqual(2)
      expect(value2).toEqual(initial)
    })["|>"](runTest))

  it("`set` updates the current value", () =>
    T.gen(function* (_) {
      const fiberRef = yield* _(FR.make(initial))
      yield* _(pipe(fiberRef, FR.set(update1)))
      const value = yield* _(FR.get(fiberRef))
      expect(value).toEqual(update1)
    })["|>"](runTest))

  it("`set` by a child doesn't update the parent's value", () =>
    T.gen(function* (_) {
      const fiberRef = yield* _(FR.make(initial))
      const promise = yield* _(P.make<never, void>())
      yield* _(
        pipe(
          fiberRef,
          FR.set(update1),
          T.zipRight(pipe(promise, P.succeed<void>(undefined))),
          T.fork
        )
      )
      yield* _(P.await(promise))
      const value = yield* _(FR.get(fiberRef))
      expect(value).toEqual(initial)
    })["|>"](runTest))

  it("`updateAndGet` changes value", () =>
    T.gen(function* (_) {
      const fiberRef = yield* _(FR.make(initial))
      const value1 = yield* _(
        pipe(
          fiberRef,
          FR.updateAndGet(() => update1)
        )
      )
      const value2 = yield* _(FR.get(fiberRef))
      expect(value1).toEqual(update1)
      expect(value2).toEqual(update1)
    })["|>"](runTest))

  it("`updateSomeAndGet` changes value", () =>
    T.gen(function* (_) {
      const fiberRef = yield* _(FR.make(initial))
      const value1 = yield* _(
        pipe(
          fiberRef,
          FR.updateSomeAndGet(() => O.some(update1))
        )
      )
      const value2 = yield* _(pipe(FR.get(fiberRef)))
      expect(value1).toEqual(update1)
      expect(value2).toEqual(update1)
    })["|>"](runTest))

  it("`updateSomeAndGet` doesn't change value", () =>
    T.gen(function* (_) {
      const fiberRef = yield* _(FR.make(initial))
      const value1 = yield* _(
        pipe(
          fiberRef,
          FR.updateSomeAndGet(
            O.partial((miss) => (x) => x !== initial ? update1 : miss())
          )
        )
      )
      const value2 = yield* _(pipe(FR.get(fiberRef)))
      expect(value1).toEqual(initial)
      expect(value2).toEqual(initial)
    })["|>"](runTest))

  it("value is inherited after simple race", () =>
    T.gen(function* (_) {
      const fiberRef = yield* _(FR.make(initial))
      yield* _(pipe(fiberRef, FR.set(update1), T.race(pipe(fiberRef, FR.set(update2)))))
      const value = yield* _(fiberRef.get)
      expect([update1, update2]).toContain(value)
    })["|>"](runTest))

  it("value is inherited after a race with a failed winner", () =>
    T.gen(function* (_) {
      const fiberRef = yield* _(FR.make(initial))
      const failedWinner = pipe(fiberRef, FR.set(update1), T.zipRight(T.fail("oops")))
      const succeededLoser = pipe(fiberRef, FR.set(update2), T.zipRight(T.sleep(0)))
      yield* _(pipe(failedWinner, T.race(succeededLoser)))
      const value = yield* _(FR.get(fiberRef))
      expect(value).toEqual(update2)
    })
      ["|>"](provideTestClock)
      ["|>"](runTest))

  it("value is not inherited after a race of two failed Effects", () =>
    T.gen(function* (_) {
      const fiberRef = yield* _(FR.make(initial))
      const failed1 = pipe(fiberRef, FR.set(update1), T.zipRight(T.fail("oops1")))
      const failed2 = pipe(fiberRef, FR.set(update2), T.zipRight(T.fail("oops2")))
      yield* _(pipe(failed1, T.race(failed2), T.ignore))
      const value = yield* _(FR.get(fiberRef))
      expect(value).toEqual(initial)
    })["|>"](runTest))

  it("the value of the loser is inherited in zipPar", () =>
    T.gen(function* (_) {
      const fiberRef = yield* _(FR.make(initial))
      const latch = yield* _(P.make<never, void>())
      const winner = pipe(
        fiberRef,
        FR.set(update1),
        T.zipRight(pipe(latch, P.succeed<void>(undefined))),
        T.asUnit
      )
      const loser = pipe(
        P.await(latch),
        T.zipRight(pipe(fiberRef, FR.set(update2))),
        T.zipRight(T.sleep(0))
      )
      yield* _(pipe(winner, T.zipPar(loser)))
      const value = yield* _(FR.get(fiberRef))
      expect(value).toEqual(update2)
    })
      ["|>"](provideTestClock)
      ["|>"](runTest))

  it("nothing get inherited with a failure in zipPar", () =>
    T.gen(function* (_) {
      const fiberRef = yield* _(FR.make(initial))
      const success = pipe(fiberRef, FR.set(update))
      const failure1 = pipe(fiberRef, FR.set(update1), T.zipRight(T.fail("oops1")))
      const failure2 = pipe(fiberRef, FR.set(update2), T.zipRight(T.fail("oops2")))
      yield* _(
        pipe(
          success,
          T.zipPar(failure1),
          T.zipPar(failure2),
          T.orElse(() => T.unit)
        )
      )
      const value = yield* _(FR.get(fiberRef))
      expect(value).toEqual(initial)
    })["|>"](runTest))

  it("fork function is applied on fork - 1", () =>
    T.gen(function* (_) {
      const fiberRef = yield* _(FR.make(0, increment))
      const child = yield* _(pipe(T.unit, T.fork))
      yield* _(F.join(child))
      const value = yield* _(FR.get(fiberRef))
      expect(value).toEqual(1)
    })["|>"](runTest))

  it("fork function is applied on fork - 2", () =>
    T.gen(function* (_) {
      const fiberRef = yield* _(FR.make(0, increment))
      const child = yield* _(pipe(T.unit, T.fork, T.chain(F.join), T.fork))
      yield* _(F.join(child))
      const value = yield* _(FR.get(fiberRef))
      expect(value).toEqual(2)
    })["|>"](runTest))

  it("join function is applied on join - 1", () =>
    T.gen(function* (_) {
      const fiberRef = yield* _(FR.make(0, identity, Math.max))
      const child = yield* _(pipe(fiberRef, FR.update(increment), T.fork))
      yield* _(F.join(child))
      const value = yield* _(FR.get(fiberRef))
      expect(value).toEqual(1)
    })["|>"](runTest))

  it("join function is applied on join - 2", () =>
    T.gen(function* (_) {
      const fiberRef = yield* _(FR.make(0, identity, Math.max))
      const child = yield* _(pipe(fiberRef, FR.update(increment), T.fork))
      yield* _(
        pipe(
          fiberRef,
          FR.update((n) => n + 2)
        )
      )
      yield* _(F.join(child))
      const value = yield* _(FR.get(fiberRef))
      expect(value).toEqual(2)
    })["|>"](runTest))
})
