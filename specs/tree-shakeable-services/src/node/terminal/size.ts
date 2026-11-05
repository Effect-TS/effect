import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Queue from "effect/Queue"
import * as Terminal from "../../Terminal.ts"

/** The Node implementation of `Terminal.size`: the current size, then every resize until the scope closes. */
export const size = Layer.succeed(
  Terminal.size,
  Effect.gen(function*() {
    const queue = yield* Queue.make<Terminal.Size>()
    const current = () => ({ columns: process.stdout.columns ?? 80, rows: process.stdout.rows ?? 24 })
    Queue.offerUnsafe(queue, current())
    const handler = () => {
      Queue.offerUnsafe(queue, current())
    }
    process.stdout.on("resize", handler)
    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        process.stdout.off("resize", handler)
      })
    )
    return queue
  })
)
