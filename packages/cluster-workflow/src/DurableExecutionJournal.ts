/**
 * @since 1.0.0
 */
import type * as Schema from "@effect/schema/Schema"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Stream from "effect/Stream"
import type * as DurableExecutionEvent from "./DurableExecutionEvent.js"

/**
 * @internal
 */
const DurableExecutionJournalSymbolKey = "@effect/cluster-workflow/DurableExecutionJournal"

/**
 * @since 1.0.0
 * @category symbols
 */
export const DurableExecutionJournalTypeId: unique symbol = Symbol.for(DurableExecutionJournalSymbolKey)

/**
 * @since 1.0.0
 * @category symbols
 */
export type DurableExecutionJournalTypeId = typeof DurableExecutionJournal

/**
 * @since 1.0.0
 */
export interface DurableExecutionJournal {
  read<A, IA, E, IE>(
    persistenceId: string,
    success: Schema.Schema<A, IA>,
    failure: Schema.Schema<E, IE>,
    fromSequence: number,
    keepReading: boolean
  ): Stream.Stream<DurableExecutionEvent.DurableExecutionEvent<A, E>>
  append<A, IA, E, IE>(
    persistenceId: string,
    success: Schema.Schema<A, IA>,
    failure: Schema.Schema<E, IE>,
    event: DurableExecutionEvent.DurableExecutionEvent<A, E>
  ): Effect.Effect<void>
}

/**
 * @since 1.0.0
 */
export const DurableExecutionJournal = Context.GenericTag<DurableExecutionJournal>(DurableExecutionJournalSymbolKey)

/**
 * @since 1.0.0
 */
export function read<A, IA, E, IE>(
  activityId: string,
  success: Schema.Schema<A, IA>,
  failure: Schema.Schema<E, IE>,
  fromSequence: number,
  keepReading: boolean
) {
  return Stream.flatMap(
    DurableExecutionJournal,
    (journal) => journal.read(activityId, success, failure, fromSequence, keepReading)
  )
}

/**
 * @since 1.0.0
 */
export function append<A, IA, E, IE>(
  activityId: string,
  success: Schema.Schema<A, IA>,
  failure: Schema.Schema<E, IE>,
  event: DurableExecutionEvent.DurableExecutionEvent<A, E>
) {
  return Effect.flatMap(
    DurableExecutionJournal,
    (journal) => journal.append(activityId, success, failure, event)
  )
}
