import * as assert from "assert"

import { expect } from "chai"
import fc from "fast-check"

import { effect as T } from "../src"
import { array } from "../src/Array"
import { Do } from "../src/Do"
import * as ex from "../src/Exit"
import { FunctionN, identity } from "../src/Function"
import { pipe } from "../src/Function"
import { makeRef } from "../src/Ref"
import { makeSemaphore } from "../src/Semaphore"

export async function expectExitIn<E, A, B>(
  ioa: T.AsyncE<E, A>,
  f: FunctionN<[ex.Exit<E, A>], B>,
  expected: B
): Promise<void> {
  const result = await T.runToPromiseExit(ioa)
  expect(assert.deepStrictEqual(f(result), expected))
}

export function expectExit<E, A>(
  ioa: T.AsyncE<E, A>,
  expected: ex.Exit<E, A>
): Promise<void> {
  return expectExitIn(ioa, identity, expected)
}

describe("semaphore", () => {
  it("acquire is observable", () => {
    const eff = Do(T.effect)
      .bind("sem", makeSemaphore(4))
      .doL(({ sem }) => T.fork(sem.acquireN(3)))
      .do(T.shifted)
      .bindL("avail", ({ sem }) => sem.available)
      .return(({ avail }) => avail)
    return expectExit(eff, ex.done(1))
  })
  it("release is observable", () => {
    const eff = Do(T.effect)
      .bind("sem", makeSemaphore(4))
      .doL(({ sem }) => T.fork(sem.releaseN(3)))
      .do(T.shifted)
      .bindL("avail", ({ sem }) => sem.available)
      .return(({ avail }) => avail)
    return expectExit(eff, ex.done(7))
  })
  it("should block acquisition", () => {
    const eff = Do(T.effect)
      .bind("gate", makeRef(false))
      .bind("sem", makeSemaphore(0))
      .doL(({ gate, sem }) => T.fork(sem.withPermit(gate.set(true))))
      .bindL("before", ({ gate }) => gate.get)
      .doL(({ sem }) => sem.release)
      .do(T.shifted) // let the forked fiber advance
      .bindL("after", ({ gate, sem }) => T.zip_(gate.get, sem.available))
      .return(({ after, before }) => [before, ...after])
    return expectExit(eff, ex.done([false, true, 1]))
  })
  it("should allow acquire to be interruptible", () => {
    const eff1 = T.chain_(makeRef(false), (gate) =>
      T.chain_(makeSemaphore(1), (sem) =>
        T.chain_(T.fork(T.applySecond(sem.acquireN(2), gate.set(true))), (child) =>
          T.chain_(T.applySecond(child.interrupt, child.wait), (_exit) =>
            T.zip_(sem.available, gate.get)
          )
        )
      )
    )
    return expectExit(eff1, ex.done([1, false] as const))
  })
  it("interrupts should release acquired permits for subsequent acquires to advance", () => {
    const eff = Do(T.effect)
      .bind("turnstyle", makeRef(0))
      .bind("sem", makeSemaphore(2))
      .bindL("child1", ({ sem, turnstyle }) =>
        T.fork(T.applySecond(sem.acquireN(3), turnstyle.set(1)))
      )
      .bindL("child2", ({ sem, turnstyle }) =>
        T.fork(T.applySecond(sem.acquireN(2), turnstyle.set(2)))
      )
      .do(T.shiftedAsync)
      .bindL("moved", ({ turnstyle }) => turnstyle.get)
      .doL(({ child1 }) => child1.interrupt)
      .bindL("c2exit", ({ child2 }) => child2.wait)
      .bindL("after", ({ turnstyle }) => turnstyle.get)
      .return(({ after, c2exit, moved }) => ({
        c2exit: c2exit._tag,
        moved,
        after
      }))
    return expectExit(eff, ex.done({ c2exit: "Done", moved: 0, after: 2 }))
  })
  it("withPermitsN is interruptible", () => {
    const eff = Do(T.effect)
      .bind("sem", makeSemaphore(1))
      .bindL("child", ({ sem }) => T.fork(sem.acquireN(2)))
      .do(T.shifted)
      .bindL("before", ({ sem }) => sem.available)
      .doL(({ child }) => child.interrupt)
      .bindL("after", ({ sem }) => sem.available)
      .return(({ after, before }) => ({ before, after }))
    return expectExit(eff, ex.done({ before: -1, after: 1 }))
  })
  describe("properties", function () {
    jest.setTimeout(20000)
    it("never deadlocks", () =>
      fc.assert(
        fc.asyncProperty(
          fc.array(fc.tuple(fc.nat(100), fc.nat(10), fc.nat(10), fc.boolean()), 100),
          (acquires) => {
            const eff = T.chain_(makeSemaphore(100), (sem) =>
              pipe(
                acquires,
                array.traverse(T.effect)(([n, pre, post, int]) =>
                  sem.withPermitsN(
                    n,
                    pipe(
                      int ? T.raiseInterrupt : T.after(post),
                      T.liftDelay(pre),
                      T.fork
                    )
                  )
                ),
                T.chain(array.traverse(T.effect)((f) => f.wait)),
                (result) => T.applySecond(result, sem.available)
              )
            )
            return expectExit(eff, ex.done(100))
          }
        )
      ))
  })
})
