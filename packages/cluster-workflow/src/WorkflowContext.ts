/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import type * as DurableExecutionJournal from "./DurableExecutionJournal.js"

/**
 * @internal
 */
const WorkflowContextSymbolKey = "@effect/cluster-workflow/WorkflowContext"

/**
 * @since 1.0.0
 * @category symbols
 */
export const WorkflowContextTypeId: unique symbol = Symbol.for(WorkflowContextSymbolKey)

/**
 * @since 1.0.0
 * @category symbols
 */
export type WorkflowContextTypeId = typeof WorkflowContextTypeId

/**
 * @since 1.0.0
 */
export interface WorkflowContext {
  makePersistenceId: (localId: string) => string
  durableExecutionJournal: DurableExecutionJournal.DurableExecutionJournal
  isYielding: Effect.Effect<boolean>
  yieldExecution: Effect.Effect<never>
  forkAndJoin: <A, E, R>(persistenceId: string, effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
  version: string
}

/**
 * @since 1.0.0
 */
export const WorkflowContext = Context.GenericTag<WorkflowContext>("@services/WorkflowContext")

/**
 * @since 1.0.0
 */
export function make(args: WorkflowContext): WorkflowContext {
  return args
}

/**
 * @since 1.0.0
 */
export function appendToPersistenceId(suffix: string) {
  return <R, E, A>(fa: Effect.Effect<R, E, A>) =>
    pipe(
      fa,
      Effect.updateService(
        WorkflowContext,
        (context) => ({ ...context, makePersistenceId: (localId) => context.makePersistenceId(localId) + suffix })
      )
    )
}
