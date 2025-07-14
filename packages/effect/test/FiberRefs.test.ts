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
})
