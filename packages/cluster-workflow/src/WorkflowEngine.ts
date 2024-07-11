/**
 * @since 1.0.0
 */
import type * as Envelope from "@effect/cluster/Envelope"
import type * as Serializable from "@effect/schema/Serializable"
import * as Effect from "effect/Effect"
import type * as Fiber from "effect/Fiber"
import * as FiberMap from "effect/FiberMap"
import { pipe } from "effect/Function"
import * as PrimaryKey from "effect/PrimaryKey"
import type * as Scope from "effect/Scope"
import type * as DurableExecutionJournal from "./DurableExecutionJournal.js"
import type * as Workflow from "./Workflow.js"
import * as WorkflowRuntime from "./WorkflowRuntime.js"

/**
 * @since 1.0.0
 */
export interface WorkflowEngine<T extends Envelope.Envelope.AnyMessage> {
  sendDiscard: (request: T) => Effect.Effect<void>
  send: <A extends T>(request: A) => Effect.Effect<Serializable.WithResult.Success<A>, Serializable.WithResult.Error<A>>
}

/**
 * @since 1.0.0
 */
export function makeScoped<T extends Envelope.Envelope.AnyMessage, R>(
  workflow: Workflow.Workflow<T, R>
): Effect.Effect<
  WorkflowEngine<T>,
  never,
  R | Scope.Scope | DurableExecutionJournal.DurableExecutionJournal
> {
  return Effect.gen(function*(_) {
    const fiberMap = yield* _(FiberMap.make())
    const env = yield* _(Effect.context<R | DurableExecutionJournal.DurableExecutionJournal>())

    const getOrStartFiber = <A extends T>(
      request: A
    ): Effect.Effect<Fiber.Fiber<Serializable.WithResult.Success<A>, Serializable.WithResult.Error<A>>> => {
      const executionId = PrimaryKey.value(request)

      return FiberMap.run(
        fiberMap,
        executionId,
        pipe(
          WorkflowRuntime.attempt(workflow)(request),
          Effect.provide(env)
        )
      )
    }

    const sendDiscard = (request: T) =>
      pipe(
        getOrStartFiber(request),
        Effect.asVoid
      )

    const send = <A extends T>(
      request: A
    ): Effect.Effect<Serializable.WithResult.Success<A>, Serializable.WithResult.Error<A>> =>
      pipe(
        WorkflowRuntime.attempt(workflow)(request),
        Effect.provide(env)
      )

    return ({ send, sendDiscard })
  })
}
