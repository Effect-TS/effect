/**
 * @since 1.0.0
 */
import type * as Message from "@effect/cluster/Message"
import * as Data from "effect/Data"
import type * as Exit from "effect/Exit"
import type * as Fiber from "effect/Fiber"
import type * as WorkflowRuntimeMessage from "./WorkflowRuntimeMessage.js"

const NOT_STARTED = "@effect/cluster-workflow/WorkflowRuntimeState/NotStarted"

/**
 * @since 1.0.0
 */
export class NotStarted extends Data.TaggedClass(NOT_STARTED)<{}> {}

const REPLAY = "@effect/cluster-workflow/WorkflowRuntimeState/Replay"

/**
 * @since 1.0.0
 */
export class Replay<A, E> extends Data.TaggedClass(REPLAY)<{
  version: string
  fiber: Fiber.Fiber<A, E>
  expectedSequence: number
  attempt: number
  delayedMessages: ReadonlyArray<WorkflowRuntimeMessage.WorkflowRuntimeMessage<A, E>>
}> {}

const RUNNING = "@effect/cluster-workflow/WorkflowRuntimeState/Running"

/**
 * @since 1.0.0
 */
export class Running<A, E> extends Data.TaggedClass(RUNNING)<{
  fiber: Fiber.Fiber<A, E>
  attempt: number
  nextSequence: number
}> {}

const YIELDING = "@effect/cluster-workflow/WorkflowRuntimeState/Yielding"

/**
 * @since 1.0.0
 */
export class Yielding<A, E> extends Data.TaggedClass(YIELDING)<{
  fiber: Fiber.Fiber<A, E>
}> {}

const COMPLETED = "@effect/cluster-workflow/WorkflowRuntimeState/Completed"

/**
 * @since 1.0.0
 */
export class Completed<A, E> extends Data.TaggedClass(COMPLETED)<{
  exit: Exit.Exit<A, E>
}> {}

/**
 * @since 1.0.0
 */
export type WorkflowRuntimeState<A, E> =
  | NotStarted
  | Replay<A, E>
  | Running<A, E>
  | Yielding<A, E>
  | Completed<A, E>

/**
 * @since 1.0.0
 */
export function match<A, E, B, C = B, D = C, F = D, G = F>(fa: WorkflowRuntimeState<A, E>, fns: {
  onReplay: (state: Replay<A, E>) => B
  onRunning: (state: Running<A, E>) => C
  onYielding: (state: Yielding<A, E>) => D
  onCompleted: (state: Completed<A, E>) => F
  onNotStarted: (state: NotStarted) => G
}) {
  switch (fa._tag) {
    case NOT_STARTED:
      return fns.onNotStarted(fa)
    case REPLAY:
      return fns.onReplay(fa)
    case RUNNING:
      return fns.onRunning(fa)
    case YIELDING:
      return fns.onYielding(fa)
    case COMPLETED:
      return fns.onCompleted(fa)
  }
}

/**
 * @since 1.0.0
 */
export const initialState = <A extends Message.Message.Any>() =>
  new NotStarted() as WorkflowRuntimeState<Message.Message.Success<A>, Message.Message.Error<A>>
