import type * as Cause from "effect/Cause"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Queue from "effect/Queue"
import * as Terminal from "effect/Terminal"

/** @internal */
export const size: Terminal.Shape["size"] = Effect.gen(function*() {
  const stdout = process.stdout
  const queue = yield* Queue.sliding<Terminal.Size, Cause.Done>(1)
  const onResize = () => Queue.offerUnsafe(queue, { columns: stdout.columns ?? 0, rows: stdout.rows ?? 0 })
  yield* Effect.addFinalizer(() =>
    Effect.sync(() => {
      stdout.off("resize", onResize)
      Queue.endUnsafe(queue)
    })
  )
  stdout.on("resize", onResize)
  onResize()
  return queue
})

/** @internal */
export const layer: Layer.Layer<"effect/Terminal/size"> = Layer.succeed(Terminal.size, size)
