import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Result from "effect/Result"
import * as Schema from "effect/Schema"

import { LifecycleHooks } from "./lifecycleHooks.ts"
import { HookConfigurationError, type LifecycleEvent, lifecycleEvent } from "./models.ts"

export class CommitPending extends Schema.TaggedError<CommitPending>()("CommitPending", {}) {}
export class CommitDiscarded extends Schema.TaggedError<CommitDiscarded>()("CommitDiscarded", {}) {}

/** No value is exposed until the outermost transaction authority has committed. */
export interface PreparedCommit<A> {
  readonly _tag: "PreparedCommit"
  readonly read: Effect.Effect<A, CommitPending | CommitDiscarded>
}

interface CommitParticipant {
  readonly commit: () => void
  readonly discard: () => void
}

export interface CommitJournal {
  readonly prepare: <A>(value: A) => PreparedCommit<A>
  /** Stage only work belonging to this transaction/savepoint, before its commit returns. */
  readonly stage: (event: LifecycleEvent) => void
}

/**
 * Adapt pure validation to the native persistence owner's synchronous prepare contract.
 * A rejected preparation must abort that owner's transaction before physical commit.
 *
 * @internal
 */
export const prepareCommit =
  <V, A, E>(prepare: (value: V, journal: CommitJournal) => Result.Result<PreparedCommit<A>, E>) =>
  (value: V, journal: CommitJournal): PreparedCommit<A> => {
    const result = prepare(value, journal)

    if (Result.isFailure(result)) {
      // oxlint-disable-next-line effect/no-untyped-throw -- Native transaction/batch owners require synchronous prepare rejection to roll back before committing.
      throw result.failure
    }

    return result.success
  }

/** Current journal for internal transaction operations. Public commit-owner
 * continuations still receive the journal explicitly at the native boundary. */
export class CurrentCommitJournal extends Context.Service<CurrentCommitJournal, CommitJournal>()(
  "@effect/auth/hooks/CurrentCommitJournal"
) {}

class CurrentCommit extends Context.Service<
  CurrentCommit,
  {
    readonly reservations: Set<string>
    readonly assertOpen: () => void
    readonly promote: (
      events: ReadonlyArray<LifecycleEvent>,
      participants: ReadonlyArray<CommitParticipant>,
      reservations: ReadonlySet<string>
    ) => void
  }
>()("@effect/auth/hooks/CurrentCommit") {}

/** Public operations may reject unsupported ambient execution before any mutation. */
export const hasCommitScope = Effect.serviceOption(CurrentCommit).pipe(Effect.map(Option.isSome))

export type CommitResult<A> =
  | { readonly _tag: "PendingCommit"; readonly value: A }
  | {
    readonly _tag: "Committed"
    readonly value: A
  }

/**
 * `owner` must resolve only after its real transaction or batch commits. Nested
 * calls inherit the outer journal; their events are discarded on failure and
 * cannot dispatch until the outermost owner succeeds. Wrap a caught savepoint
 * rollback in its own coordinateCommit call so its events are discarded too.
 * Direct delivery is best effort: a process crash loses staged memory and no
 * retry is automatic. Post-commit delivery stays interruptible; a delivery failure
 * never authorizes repeating the committed operation.
 */
export const coordinateCommit = <A, E, R>(
  owner: (journal: CommitJournal) => Effect.Effect<A, E, R>
): Effect.Effect<
  CommitResult<A>,
  E | HookConfigurationError,
  Exclude<R, CurrentCommitJournal> | LifecycleHooks
> =>
  Effect.uninterruptibleMask((restore) =>
    Effect.gen(function*() {
      const parent = yield* Effect.serviceOption(CurrentCommit)
      const hooks = yield* LifecycleHooks
      const events: Array<LifecycleEvent> = []
      const participants: Array<CommitParticipant> = []
      const reservations = Option.isSome(parent) ? parent.value.reservations : new Set<string>()
      const ownedReservations = new Set<string>()

      const discard = Effect.sync(() => {
        for (const participant of participants) participant.discard()
        for (const id of ownedReservations) reservations.delete(id)
        ownedReservations.clear()
      })

      let open = true

      const assertOpen = (): void => {
        if (!open) {
          // oxlint-disable-next-line effect/no-untyped-throw -- CommitJournal is a synchronous native transaction callback API; closed journals must reject before physical commit.
          throw HookConfigurationError.make({
            reason: "closed-journal",
            contribution: "transaction"
          })
        }
        if (Option.isSome(parent)) parent.value.assertOpen()
      }

      const append = (
        incoming: ReadonlyArray<LifecycleEvent>,
        incomingParticipants: ReadonlyArray<CommitParticipant> = []
      ): void => {
        assertOpen()
        const next = new Set(reservations)

        for (const event of incoming) {
          if (next.has(event.id)) {
            // oxlint-disable-next-line effect/no-untyped-throw -- Native journal staging must reject duplicate events while the transaction can still roll back.
            throw HookConfigurationError.make({
              reason: "duplicate-event",
              contribution: event.id
            })
          }
          next.add(event.id)
        }
        // Reserve while the native owner can still roll back. Successful child
        // owners transfer these reservations without another duplicate check.
        for (const item of incoming) {
          reservations.add(item.id)
          ownedReservations.add(item.id)
          events.push(item)
        }
        participants.push(...incomingParticipants)
      }

      const promote = (
        incoming: ReadonlyArray<LifecycleEvent>,
        incomingParticipants: ReadonlyArray<CommitParticipant>,
        incomingReservations: ReadonlySet<string>
      ): void => {
        assertOpen()
        events.push(...incoming)
        participants.push(...incomingParticipants)
        for (const id of incomingReservations) ownedReservations.add(id)
      }

      const journal: CommitJournal = {
        prepare: <A>(input: A): PreparedCommit<A> => {
          let status: "pending" | "committed" | "discarded" = "pending"
          let value: Option.Option<A> = Option.some(input)

          append(
            [],
            [
              {
                commit: () => {
                  status = "committed"
                },
                discard: () => {
                  status = "discarded"
                  value = Option.none()
                }
              }
            ]
          )

          return Object.freeze({
            _tag: "PreparedCommit",
            read: Effect.suspend((): Effect.Effect<A, CommitPending | CommitDiscarded> =>
              status === "committed" && Option.isSome(value)
                ? Effect.succeed(value.value)
                : status === "discarded"
                ? Effect.fail(CommitDiscarded.make({}))
                : Effect.fail(CommitPending.make({}))
            )
          })
        },
        stage: (input) => append([lifecycleEvent(input)])
      }

      const value = yield* restore(Effect.suspend(() => owner(journal))).pipe(
        Effect.provideService(CurrentCommitJournal, journal),
        Effect.provideService(CurrentCommit, { reservations, assertOpen, promote }),
        // Synchronous journal methods can throw inside an Effect callback. The
        // owner's failed transaction has rolled back before we normalize them.
        // Mixed causes stay intact so typed recovery cannot swallow a defect or interruption.
        Effect.catchCause((cause) =>
          Effect.failCause(
            cause.reasons.every(
                (reason) => Cause.isDieReason(reason) && Schema.is(HookConfigurationError)(reason.defect)
              )
              ? Cause.fromReasons<E | HookConfigurationError>(
                cause.reasons.map((reason) =>
                  Cause.isDieReason(reason) && Schema.is(HookConfigurationError)(reason.defect)
                    ? Cause.makeFailReason(reason.defect).annotate(
                      Cause.reasonAnnotations(reason)
                    )
                    : reason
                )
              )
              : cause
          )
        ),
        Effect.onError(() => discard),
        Effect.ensuring(
          Effect.sync(() => {
            open = false
          })
        )
      )

      if (Option.isSome(parent)) {
        yield* Effect.try({
          try: () => parent.value.promote(events, participants, ownedReservations),
          catch: (error) =>
            Schema.is(HookConfigurationError)(error)
              ? error
              : HookConfigurationError.make({
                reason: "closed-journal",
                contribution: "transaction"
              })
        }).pipe(Effect.onError(() => discard))

        return { _tag: "PendingCommit", value } as const
      }
      for (const participant of participants) participant.commit()
      for (const event of events) yield* restore(hooks.after(event))

      return { _tag: "Committed", value } as const
    })
  )
