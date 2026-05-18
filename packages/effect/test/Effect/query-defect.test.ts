import { describe, it } from "@effect/vitest"
import { assertTrue } from "@effect/vitest/utils"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as Request from "effect/Request"
import * as RequestResolver from "effect/RequestResolver"

class GetValue extends Request.TaggedClass("GetValue")<string, never, { readonly id: number }> {}

describe("batched resolver defect", () => {
  // When a batched resolver dies with a defect, the request Deferreds are
  // never completed and consumers hang forever. The cleanup that completes
  // uncompleted entries only runs on success (flatMap/OP_ON_SUCCESS) but
  // should run on all exits.
  it.live("resolver defect should not hang consumers", () =>
    Effect.gen(function*() {
      const resolver = RequestResolver.makeBatched((_requests: Array<GetValue>) => Effect.die("boom"))

      const fiber = yield* Effect.request(new GetValue({ id: 1 }), resolver).pipe(
        Effect.fork
      )

      // Wait briefly then check if the fiber completed.
      // If the bug is present, the fiber hangs on deferredAwait forever.
      yield* Effect.sleep("500 millis")
      const poll = yield* Fiber.poll(fiber)

      assertTrue(
        poll._tag === "Some",
        "Fiber should have completed — resolver defect must not leave consumers hanging"
      )

      if (poll._tag === "Some") {
        assertTrue(Exit.isFailure(poll.value))
      }
    }))

  it.live("resolver defect should not hang multiple consumers", () =>
    Effect.gen(function*() {
      const resolver = RequestResolver.makeBatched((_requests: Array<GetValue>) => Effect.die("boom"))

      const fiber = yield* Effect.forEach(
        [1, 2, 3],
        (id) => Effect.request(new GetValue({ id }), resolver),
        { batching: true, concurrency: "unbounded" }
      ).pipe(Effect.fork)

      yield* Effect.sleep("500 millis")
      const poll = yield* Fiber.poll(fiber)

      assertTrue(
        poll._tag === "Some",
        "Fiber should have completed — resolver defect must not leave consumers hanging"
      )

      if (poll._tag === "Some") {
        assertTrue(Exit.isFailure(poll.value))
      }
    }))
})
