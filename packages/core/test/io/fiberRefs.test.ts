import type { FiberRefs } from "../../src/io/Effect"
import { Effect } from "../../src/io/Effect"
import * as Fiber from "../../src/io/Fiber"
import { FiberRef } from "../../src/io/FiberRef"
import { Queue } from "../../src/io/Queue"

describe("FiberRefs", () => {
  it("propagate FiberRef values across fiber boundaries", async () => {
    const program = Effect.Do()
      .bind("fiberRef", () => FiberRef.make(false))
      .bind("queue", () => Queue.unbounded<FiberRefs>())
      .bind("producer", ({ fiberRef, queue }) =>
        fiberRef
          .set(true)
          .zipRight(Effect.getFiberRefs.flatMap((a) => queue.offer(a)))
          .fork()
      )
      .bind("consumer", ({ fiberRef, queue }) =>
        queue.take().flatMap(Effect.setFiberRefs).zipRight(fiberRef.get()).fork()
      )
      .tap(({ producer }) => Fiber.join(producer))
      .flatMap(({ consumer }) => Fiber.join(consumer))

    const result = await program.unsafeRunPromise()

    expect(result).toBe(true)
  })
})
