import { pipe } from "../src/data/Function"
import type { FiberRefs } from "../src/io/Effect"
import * as T from "../src/io/Effect"
import * as Fiber from "../src/io/Fiber"
import * as FiberRef from "../src/io/FiberRef"
import * as Queue from "../src/io/Queue"

describe("FiberRefs", () => {
  it("propagate FiberRef values across fiber boundaries", async () => {
    const { value } = await T.unsafeRunPromise(
      pipe(
        T.Do(),
        T.bind("fiberRef", () => FiberRef.make(false)),
        T.bind("queue", () => Queue.makeUnbounded<FiberRefs>()),
        T.bind("producer", ({ fiberRef, queue }) =>
          pipe(
            FiberRef.set_(fiberRef, true),
            T.zipRight(
              T.chain_(T.getFiberRefs, (fiberRefs) => Queue.offer_(queue, fiberRefs))
            ),
            T.fork
          )
        ),
        T.bind("consumer", ({ fiberRef, queue }) =>
          pipe(
            T.chain_(Queue.take(queue), T.setFiberRefs),
            T.zipRight(FiberRef.get(fiberRef)),
            T.fork
          )
        ),
        T.tap(({ producer }) => Fiber.join(producer)),
        T.bind("value", ({ consumer }) => Fiber.join(consumer))
      )
    )

    expect(value).toBe(true)
  })
})
