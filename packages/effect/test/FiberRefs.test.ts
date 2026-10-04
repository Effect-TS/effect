import { describe, it } from "@effect/vitest"
import { assertTrue, deepStrictEqual, strictEqual } from "@effect/vitest/utils"
import { Cause, Effect, Exit, Fiber, FiberId, FiberRef, FiberRefs, HashMap, Option, pipe, Queue, Scope } from "effect"

describe("FiberRefs", () => {
  it.scoped("propagate FiberRef values across fiber boundaries", () =>
    Effect.gen(function*() {
      const fiberRef = yield* FiberRef.make(false)
      const queue = yield* Queue.unbounded<FiberRefs.FiberRefs>()
      const producer = yield* FiberRef.set(fiberRef, true).pipe(
        Effect.zipRight(Effect.getFiberRefs.pipe(Effect.flatMap((a) => Queue.offer(queue, a)))),
        Effect.fork
      )
      const consumer = yield* pipe(
        Queue.take(queue),
        Effect.flatMap((fiberRefs) => Effect.setFiberRefs(fiberRefs).pipe(Effect.zipRight(FiberRef.get(fiberRef)))),
        Effect.fork
      )
      yield* Fiber.join(producer)
      const result = yield* Fiber.join(consumer)
      assertTrue(result)
    }))
  it("interruptedCause", () => {
    const parent = FiberId.make(1, Date.now()) as FiberId.Runtime
    const child = FiberId.make(2, Date.now()) as FiberId.Runtime
    const parentFiberRefs = FiberRefs.unsafeMake(new Map())
    const childFiberRefs = FiberRefs.updateAs(parentFiberRefs, {
      fiberId: child,
      fiberRef: FiberRef.interruptedCause,
      value: Cause.interrupt(parent)
    })
    const newParentFiberRefs = FiberRefs.joinAs(parentFiberRefs, parent, childFiberRefs)
    deepStrictEqual(FiberRefs.get(newParentFiberRefs, FiberRef.interruptedCause), Option.some(Cause.empty))
  })

  describe("currentLogAnnotations", () => {
    it("doesnt leak", () => {
      Effect.void.pipe(Effect.annotateLogs("test", "abc"), Effect.runSync)
      strictEqual(FiberRef.currentLogAnnotations.pipe(FiberRef.get, Effect.map(HashMap.size), Effect.runSync), 0)
    })

    it.effect("annotateLogsScoped", () =>
      Effect.gen(function*() {
        const scope = yield* Scope.make()
        strictEqual(HashMap.size(yield* FiberRef.get(FiberRef.currentLogAnnotations)), 0)
        yield* Effect.annotateLogsScoped({
          test: 123
        }).pipe(Scope.extend(scope))
        strictEqual(HashMap.size(yield* FiberRef.get(FiberRef.currentLogAnnotations)), 1)
        yield* Scope.close(scope, Exit.void)
        strictEqual(HashMap.size(yield* FiberRef.get(FiberRef.currentLogAnnotations)), 0)
      }))
  })

  it.scoped("forkAs preserves referential identity when standard FiberRefs are present", () =>
    Effect.gen(function*() {
      const parentId = FiberId.make(1, Date.now()) as FiberId.Runtime
      const childId = FiberId.make(2, Date.now()) as FiberId.Runtime
      const ref1 = yield* FiberRef.make(1)
      const ref2 = yield* FiberRef.make("test")
      let parentFiberRefs = FiberRefs.empty()
      parentFiberRefs = FiberRefs.updateAs(parentFiberRefs, {
        fiberId: parentId,
        fiberRef: ref1,
        value: 10
      })
      parentFiberRefs = FiberRefs.updateAs(parentFiberRefs, {
        fiberId: parentId,
        fiberRef: ref2,
        value: "updated"
      })
      const childFiberRefs = FiberRefs.forkAs(parentFiberRefs, childId)
      strictEqual(childFiberRefs, parentFiberRefs)
    }))

  it.scoped("child fiber creation via Effect.fork preserves referential identity of FiberRefs", () =>
    Effect.gen(function*() {
      for (let i = 0; i < 100; i++) {
        const ref = yield* FiberRef.make(i)
        yield* FiberRef.set(ref, i * 2)
      }
      const parentFiberRefs = yield* Effect.getFiberRefs
      const childFiber = yield* Effect.fork(Effect.getFiberRefs)
      const childFiberRefs = yield* Fiber.join(childFiber)
      strictEqual(childFiberRefs, parentFiberRefs)
    }))

  it("updateAs returns referential self when setting identical value for current fiberId", () => {
    const fiberId = FiberId.make(1, Date.now()) as FiberId.Runtime
    const ref = FiberRef.unsafeMake(42)
    const initial = FiberRefs.updateAs(FiberRefs.empty(), {
      fiberId,
      fiberRef: ref,
      value: 42
    })
    const updated = FiberRefs.updateAs(initial, {
      fiberId,
      fiberRef: ref,
      value: 42
    })
    strictEqual(updated, initial)
  })

  it.scoped("forkAs creates new FiberRefs when custom fork FiberRef is present", () =>
    Effect.gen(function*() {
      const parentId = FiberId.make(1, Date.now()) as FiberId.Runtime
      const childId = FiberId.make(2, Date.now()) as FiberId.Runtime
      const customRef = yield* FiberRef.make(0, { fork: (n) => n + 1 })
      let parentFiberRefs = FiberRefs.empty()
      parentFiberRefs = FiberRefs.updateAs(parentFiberRefs, {
        fiberId: parentId,
        fiberRef: customRef,
        value: 10
      })
      const childFiberRefs = FiberRefs.forkAs(parentFiberRefs, childId)
      assertTrue(childFiberRefs !== parentFiberRefs)
      deepStrictEqual(FiberRefs.get(childFiberRefs, customRef), Option.some(11))
      deepStrictEqual(FiberRefs.get(parentFiberRefs, customRef), Option.some(10))
    }))

  it.scoped("post-fork mutations maintain copy-on-write isolation across fibers", () =>
    Effect.gen(function*() {
      const ref = yield* FiberRef.make(1)
      const childFiber = yield* Effect.fork(
        Effect.gen(function*() {
          yield* FiberRef.set(ref, 2)
          return yield* FiberRef.get(ref)
        })
      )
      const childExit = yield* Fiber.await(childFiber)
      const parentValue = yield* FiberRef.get(ref)
      deepStrictEqual(childExit, Exit.succeed(2))
      strictEqual(parentValue, 1)
    }))

  it("updateAs creates new FiberRefs when setting different value or fiberId", () => {
    const fiberId1 = FiberId.make(1, Date.now()) as FiberId.Runtime
    const fiberId2 = FiberId.make(2, Date.now()) as FiberId.Runtime
    const ref = FiberRef.unsafeMake(42)
    const initial = FiberRefs.updateAs(FiberRefs.empty(), {
      fiberId: fiberId1,
      fiberRef: ref,
      value: 42
    })
    const updatedValue = FiberRefs.updateAs(initial, {
      fiberId: fiberId1,
      fiberRef: ref,
      value: 100
    })
    assertTrue(updatedValue !== initial)
    deepStrictEqual(FiberRefs.get(updatedValue, ref), Option.some(100))

    const updatedFiberId = FiberRefs.updateAs(initial, {
      fiberId: fiberId2,
      fiberRef: ref,
      value: 42
    })
    assertTrue(updatedFiberId !== initial)
  })
})
