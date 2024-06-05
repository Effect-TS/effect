/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"

/**
 * @internal
 */
const ActivityContextSymbolKey = "@effect/cluster-workflow/ActivityContext"

/**
 * @since 1.0.0
 * @category symbols
 */
export const ActivityContextTypeId: unique symbol = Symbol.for(ActivityContextSymbolKey)

/**
 * @since 1.0.0
 * @category symbols
 */
export type ActivityContextTypeId = typeof ActivityContextTypeId

/**
 * @since 1.0.0
 */
export interface ActivityContext {
  persistenceId: string
  currentAttempt: number
}

/**
 * @since 1.0.0
 */
export const ActivityContext = Context.GenericTag<ActivityContext>(ActivityContextSymbolKey)
