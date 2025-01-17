/**
 * @since 1.0.0
 */
import type * as Message from "@effect/cluster/Message"
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
export interface WorkflowEngine<T extends Message.Message.Any> {
  sendDiscard: (request: T) => Effect.Effect<void>
  send: <A extends T>(request: A) => Effect.Effect<Message.Message.Success<A>, Message.Message.Error<A>>
}

/**
 * @since 1.0.0
 */
export function makeScoped<T extends Message.Message.Any, R>(
  workflow: Workflow.Workflow<T, R>
): Effect.Effect<
  WorkflowEngine<T>,
  never,
  R | Scope.Scope | DurableExecutionJournal.DurableExecutionJournal
> {
  return Effect.gen(function*() {
    const fiberMap = yield* FiberMap.make()
    const env = yield* Effect.context<R | DurableExecutionJournal.DurableExecutionJournal>()

    const getOrStartFiber = <A extends T>(
      request: A
    ): Effect.Effect<Fiber.Fiber<Message.Message.Success<A>, Message.Message.Error<A>>> => {
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
    ): Effect.Effect<Message.Message.Success<A>, Message.Message.Error<A>> =>
      pipe(
        WorkflowRuntime.attempt(workflow)(request),
        Effect.provide(env)
      )

    return ({ send, sendDiscard })
  })
}
