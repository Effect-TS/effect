import * as it from "effect-test/utils/extend"
import * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as FiberId from "effect/FiberId"
import * as FiberRef from "effect/FiberRef"
import * as FiberRefs from "effect/FiberRefs"
import * as HashMap from "effect/HashMap"
import * as Option from "effect/Option"
import * as Queue from "effect/Queue"
import { assert, describe, expect } from "vitest"

describe.concurrent("FiberRefs", () => {
  it.scoped("propagate FiberRef values across fiber boundaries", () =>
    Effect.gen(function*($) {
      const fiberRef = yield* $(FiberRef.make(false))
      const queue = yield* $(Queue.unbounded<FiberRefs.FiberRefs>())
      const producer = yield* $(
        FiberRef.set(fiberRef, true).pipe(
          Effect.zipRight(Effect.getFiberRefs.pipe(Effect.flatMap((a) => Queue.offer(queue, a)))),
          Effect.fork
        )
      )
      const consumer = yield* $(
        Queue.take(queue),
        Effect.flatMap((fiberRefs) => Effect.setFiberRefs(fiberRefs).pipe(Effect.zipRight(FiberRef.get(fiberRef)))),
        Effect.fork
      )
      yield* $(Fiber.join(producer))
      const result = yield* $(Fiber.join(consumer))
      assert.isTrue(result)
    }))
  it.it("interruptedCause", () => {
    const parent = FiberId.make(1, Date.now()) as FiberId.Runtime
    const child = FiberId.make(2, Date.now()) as FiberId.Runtime
    const parentFiberRefs = FiberRefs.unsafeMake(new Map())
    const childFiberRefs = FiberRefs.updateAs(parentFiberRefs, {
      fiberId: child,
      fiberRef: FiberRef.interruptedCause,
      value: Cause.interrupt(parent)
    })
    const newParentFiberRefs = FiberRefs.joinAs(parentFiberRefs, parent, childFiberRefs)
    assert.deepStrictEqual(FiberRefs.get(newParentFiberRefs, FiberRef.interruptedCause), Option.some(Cause.empty))
  })

  describe.concurrent("currentLogAnnotations", () => {
    it.it("doesnt leak", () => {
      Effect.unit.pipe(Effect.annotateLogs("test", "abc"), Effect.runSync)
      expect(FiberRef.currentLogAnnotations.pipe(FiberRef.get, Effect.map(HashMap.size), Effect.runSync)).toBe(0)
    })
  })
})
