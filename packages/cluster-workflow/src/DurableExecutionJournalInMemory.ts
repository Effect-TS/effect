/**
 * @since 1.0.0
 */
import * as Data from "effect/Data"
import * as Effect from "effect/Effect"
import { pipe } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Ref from "effect/Ref"
import * as Stream from "effect/Stream"
import type * as DurableExecutionEvent from "./DurableExecutionEvent.js"
import * as DurableExecutionJournal from "./DurableExecutionJournal.js"

class JournalEntry extends Data.Class<{
  persistenceId: string
  event: DurableExecutionEvent.DurableExecutionEvent<any, any>
}> {
}

/**
 * @since 1.0.0
 */
export const activityJournalInMemory = Layer.effect(
  DurableExecutionJournal.DurableExecutionJournal,
  Effect.gen(function*() {
    const memory = yield* Ref.make<Array<JournalEntry>>([])
    const self: DurableExecutionJournal.DurableExecutionJournal = {
      [DurableExecutionJournal.DurableExecutionJournalTypeId]: DurableExecutionJournal.DurableExecutionJournalTypeId,
      append: (persistenceId, _, __, event) =>
        pipe(
          Ref.update(memory, (_) => _.concat([new JournalEntry({ persistenceId, event })]))
        ),
      read: (persistenceId) =>
        pipe(
          Ref.get(memory),
          Effect.map(Stream.fromIterable),
          Stream.unwrap,
          Stream.filter((_) => _.persistenceId === persistenceId),
          Stream.map((_) => _.event)
        )
    }
    return self
  })
)
