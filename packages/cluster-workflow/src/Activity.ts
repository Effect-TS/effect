/**
 * @since 1.0.0
 */
import * as Effect from "effect/Effect"
import type * as Exit from "effect/Exit"
import { pipe } from "effect/Function"
import * as Option from "effect/Option"
import type * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"
import * as ActivityContext from "./ActivityContext.js"
import * as DurableExecutionEvent from "./DurableExecutionEvent.js"
import * as WorkflowContext from "./WorkflowContext.js"

/**
 * @since 1.0.0
 */
export function make<A, IA, E, IE>(
  activityId: string,
  successSchema: Schema.Schema<A, IA>,
  failureSchema: Schema.Schema<E, IE>
) {
  return <R>(
    execute: Effect.Effect<A, E, R>
  ): Effect.Effect<A, E, Exclude<R, ActivityContext.ActivityContext> | WorkflowContext.WorkflowContext> => {
    return Effect.gen(function*() {
      const context = yield* WorkflowContext.WorkflowContext
      const persistenceId = context.makePersistenceId(activityId)
      const journal = context.durableExecutionJournal.read(persistenceId, successSchema, failureSchema, 0, false)
      const initialState = { attempt: 0, lastSequence: 0, exit: Option.none<Exit.Exit<A, E>>() }

      return yield* context.forkAndJoin(
        persistenceId,
        pipe(
          journal,
          Stream.runFold(initialState, (state, _) =>
            DurableExecutionEvent.match(_, {
              onAttempted: (event) => ({ ...state, lastSequence: event.sequence, attempt: state.attempt + 1 }),
              onCompleted: (event) => ({ ...state, lastSequence: event.sequence, exit: Option.some(event.exit) }),
              onForked: (event) => ({ ...state, lastSequence: event.sequence }),
              onJoined: (event) => ({ ...state, lastSequence: event.sequence }),
              onInterruptionRequested: (event) => ({ ...state, lastSequence: event.sequence })
            })),
          Effect.flatMap((_) =>
            pipe(
              _.exit,
              Option.match({
                onSome: (exit) => exit,
                onNone: () =>
                  pipe(
                    context.durableExecutionJournal.append(
                      persistenceId,
                      successSchema,
                      failureSchema,
                      DurableExecutionEvent.Attempted(context.version)(_.lastSequence + 1)
                    ),
                    Effect.zipRight(execute),
                    Effect.provideService(ActivityContext.ActivityContext, {
                      persistenceId,
                      currentAttempt: _.attempt
                    }),
                    Effect.onExit((exit) =>
                      pipe(
                        context.durableExecutionJournal.append(
                          persistenceId,
                          successSchema,
                          failureSchema,
                          DurableExecutionEvent.Completed(exit)(_.lastSequence + 2)
                        ),
                        Effect.unlessEffect(context.isYielding)
                      )
                    )
                  )
              })
            )
          )
        )
      )
    })
  }
}

/**
 * @since 1.0.0
 */
export const currentAttempt = Effect.map(ActivityContext.ActivityContext, (_) => _.currentAttempt)

/**
 * @since 1.0.0
 */
export const persistenceId = Effect.map(ActivityContext.ActivityContext, (_) => _.persistenceId)
