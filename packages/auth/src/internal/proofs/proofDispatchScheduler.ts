import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import * as Layer from "effect/Layer"
import * as Queue from "effect/Queue"

import { reportAuthFailure } from "../shared/diagnostics.ts"
import { timeoutWithCause } from "../shared/timeout.ts"
import { ProofUnavailable } from "./errors.ts"

/** Admission for private, process-local proof delivery.
 *
 * Proof Layers use the built-in scoped worker by default. Supply an override at
 * Layer construction only when the host needs different scheduling semantics.
 *
 * Accept work without awaiting the provider. Bound both pending work and execution;
 * use an application Scope that outlives requests, and never create daemon fibers.
 * Every committed receipt, including suppression, submits one task.
 * Reject full/closed admission with ProofUnavailable, without inspecting the task.
 *
 * Work has no remaining services or typed failures and contains no public result.
 * Keep its closure private: it contains credential material and is not an outbox
 * value. Do not serialize, inspect, log, or automatically retry it. Interruption
 * still propagates; no delivery settlement transaction runs. A host that requires work
 * to start after sending the response must supply that release boundary itself.
 */
export class ProofDispatchScheduler extends Context.Service<
  ProofDispatchScheduler,
  {
    readonly schedule: (work: Effect.Effect<void>) => Effect.Effect<void, ProofUnavailable>
  }
>()("@effect/auth/ProofDispatchScheduler") {
  /** Default: one worker, 64 pending tasks, and a 10-second cancellation budget per task.
   * Shared across proof modules in one Layer build; shutdown interrupts pending
   * delivery. Build Auth in an application scope that outlives its requests.
   */
  static readonly layer = Layer.effect(
    this,
    Effect.gen(function*() {
      const queue = yield* Effect.acquireRelease(
        Queue.make<Effect.Effect<void>>({ capacity: 64, strategy: "dropping" }),
        (queue) => Queue.shutdown(queue)
      )

      yield* Effect.gen(function*() {
        while (true) {
          const work = yield* Queue.take(queue)

          // Task-owned observation survives interruption of the worker's wait.
          const task = yield* work.pipe(
            timeoutWithCause("10 seconds"),
            Effect.onExit((exit) =>
              Exit.isFailure(exit) ? reportAuthFailure("proof-delivery", exit.cause) : Effect.void
            ),
            Effect.forkChild
          )

          yield* Fiber.await(task)
        }
      }).pipe(Effect.forkScoped)

      return ProofDispatchScheduler.of({
        schedule: (work) =>
          Queue.offer(queue, work).pipe(
            Effect.flatMap((accepted) => (accepted ? Effect.void : ProofUnavailable.make({})))
          )
      })
    })
  )

  /** Explicit CLI/trusted-workflow fallback. Awaits provider acceptance and exposes
   * its latency; do not use for public eligibility-sensitive request handlers. */
  static readonly layerInline = Layer.succeed(this, { schedule: (work) => work })
}
