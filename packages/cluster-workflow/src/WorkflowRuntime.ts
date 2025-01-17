/**
 * @since 1.0.0
 */
import * as Message from "@effect/cluster/Message"
import * as Array from "effect/Array"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Fiber from "effect/Fiber"
import { pipe } from "effect/Function"
import * as Option from "effect/Option"
import * as PrimaryKey from "effect/PrimaryKey"
import * as Queue from "effect/Queue"
import * as Scope from "effect/Scope"
import * as Stream from "effect/Stream"
import * as DurableExecutionEvent from "./DurableExecutionEvent.js"
import * as DurableExecutionJournal from "./DurableExecutionJournal.js"
import type * as Workflow from "./Workflow.js"
import * as WorkflowContext from "./WorkflowContext.js"
import * as WorkflowRuntimeMessage from "./WorkflowRuntimeMessage.js"
import * as WorkflowRuntimeState from "./WorkflowRuntimeState.js"

function handleReplayPhase<A, E>(
  wrs: WorkflowRuntimeState.WorkflowRuntimeState<A, E>,
  sa: DurableExecutionEvent.DurableExecutionEvent<A, E>,
  executionEffect: (version: string) => Effect.Effect<A, E, never>,
  mailbox: Queue.Queue<WorkflowRuntimeMessage.WorkflowRuntimeMessage<A, E>>
): Effect.Effect<WorkflowRuntimeState.WorkflowRuntimeState<A, E>, never, Scope.Scope> {
  return WorkflowRuntimeState.match(wrs, {
    onNotStarted: () => {
      // we expect that the first event into the journal should be an "attempted"
      return DurableExecutionEvent.match(sa, {
        onAttempted: (_) =>
          pipe(
            executionEffect(_.version),
            Effect.forkDaemon,
            Effect.map((fiber) =>
              new WorkflowRuntimeState.Replay({
                version: _.version,
                fiber,
                expectedSequence: _.sequence + 1,
                attempt: 1,
                delayedMessages: []
              })
            )
          ),
        onForked: () => {
          return Effect.die(`ABSURD: Cannot fork on a never started workflow!`)
        },
        onJoined: () => {
          return Effect.die(`ABSURD: Cannot join on a never started workflow!`)
        },
        onInterruptionRequested: () => {
          return Effect.die(`ABSURD: Cannot interrupt on a never started workflow!`)
        },
        onCompleted: () => {
          return Effect.die(`ABSURD: Cannot complete on a never started workflow!`)
        }
      })
    },
    onCompleted: () => {
      return Effect.die(`ABSURD: Cannot have more event in the journal after complete!`)
    },
    onRunning: () => {
      return Effect.die(`ABSURD: Cannot enter in running state while still replaying events.`)
    },
    onYielding: () => {
      return Effect.die(`ABSURD: Cannot enter in yielding state while still replaying events.`)
    },
    onReplay: (state) => {
      // we ensure that the sequence we get is the one we expected
      if (sa.sequence !== state.expectedSequence) {
        return Effect.die(
          `We expected to receive an event with the sequence ${state.expectedSequence} but got ${sa.sequence} instead. Seems like journal is broken or out of order.`
        )
      }
      // update the next expected sequence
      state = new WorkflowRuntimeState.Replay({ ...state, expectedSequence: sa.sequence + 1 })
      // switch based on the event type
      return (DurableExecutionEvent.match(sa, {
        // handle a recorded attempt of executing the workflow
        onAttempted: (_) => Effect.succeed(new WorkflowRuntimeState.Replay({ ...state, attempt: state.attempt + 1 })),
        // trigger interruption request of the workflow
        onInterruptionRequested: (_) =>
          pipe(
            Fiber.interrupt(state.fiber),
            Effect.forkScoped,
            Effect.as(new WorkflowRuntimeState.Replay({ ...state }))
          ),
        // journal is complete, enter in completed state
        onCompleted: (_) => {
          if (state.delayedMessages.length > 0) {
            return Effect.die(`Determinism has been broken! Journal is expected to be empty upon completion replay!`)
          }
          return Effect.succeed(new WorkflowRuntimeState.Completed({ exit: _.exit }))
        },
        // wait for forked to be treated
        onForked: (_) => {
          function processMessageWaitingForFork(sm: WorkflowRuntimeMessage.WorkflowRuntimeMessage<A, E>) {
            return WorkflowRuntimeMessage.match(sm, {
              onRequestJoin: () => Effect.succeed(false),
              onRequestYield: () => Effect.succeed(false),
              onRequestComplete: () => Effect.succeed(false),
              onCheckStatus: () => Effect.succeed(false),
              onRequestFork: (fork) => {
                if (_.persistenceId !== fork.persistenceId) {
                  return Effect.die(
                    `Determinism has been broken! Journal expected ${_.persistenceId} to be started, but got ${fork.persistenceId} instead!`
                  )
                }
                return pipe(
                  Deferred.succeed(fork.signal, void 0),
                  Effect.as(true)
                )
              }
            })
          }

          return pipe(
            Effect.findFirst(state.delayedMessages, processMessageWaitingForFork),
            Effect.flatMap(Option.match({
              onSome: (requestedFork) =>
                Effect.succeed(
                  new WorkflowRuntimeState.Replay({
                    ...state,
                    delayedMessages: Array.filter(state.delayedMessages, (_) => _ !== requestedFork)
                  })
                ),
              onNone: () =>
                Effect.gen(function*() {
                  let delayedMessages = state.delayedMessages
                  while (true) {
                    const message = yield* Queue.take(mailbox)
                    if (yield* processMessageWaitingForFork(message)) {
                      return new WorkflowRuntimeState.Replay({ ...state, delayedMessages })
                    }
                    delayedMessages = delayedMessages.concat([message])
                  }
                })
            }))
          )
        },
        // wait for the join to be treated
        onJoined: (_) => {
          function processMessageWaitingForJoin(sm: WorkflowRuntimeMessage.WorkflowRuntimeMessage<A, E>) {
            return WorkflowRuntimeMessage.match(sm, {
              onRequestFork: () => Effect.succeed(false),
              onRequestYield: () => Effect.succeed(false),
              onRequestComplete: () => Effect.succeed(false),
              onCheckStatus: () => Effect.succeed(false),
              onRequestJoin: (requestedJoin) => {
                if (_.persistenceId !== requestedJoin.persistenceId) {
                  return Effect.succeed(false)
                }
                return pipe(
                  Deferred.succeed(requestedJoin.signal, void 0),
                  Effect.as(true)
                )
              }
            })
          }

          return pipe(
            Effect.findFirst(state.delayedMessages, processMessageWaitingForJoin),
            Effect.flatMap(Option.match({
              onSome: (message) =>
                Effect.succeed(
                  new WorkflowRuntimeState.Replay({
                    ...state,
                    delayedMessages: Array.filter(state.delayedMessages, (_) => _ !== message)
                  })
                ),
              onNone: () =>
                Effect.gen(function*() {
                  let delayedMessages = state.delayedMessages
                  while (true) {
                    const message = yield* Queue.take(mailbox)
                    if (yield* processMessageWaitingForJoin(message)) {
                      return new WorkflowRuntimeState.Replay({ ...state, delayedMessages })
                    }
                    delayedMessages = delayedMessages.concat([message])
                  }
                })
            }))
          )
        }
      }))
    }
  })
}

function handleExecutionPhase<A, E>(
  appendToJournal: (
    event: DurableExecutionEvent.DurableExecutionEvent<A, E>
  ) => Effect.Effect<void, never, DurableExecutionJournal.DurableExecutionJournal>,
  wrs: WorkflowRuntimeState.WorkflowRuntimeState<A, E>,
  ms: WorkflowRuntimeMessage.WorkflowRuntimeMessage<A, E>,
  executionEffect: (version: string) => Effect.Effect<A, E, never>,
  executionVersion: string,
  mailbox: Queue.Queue<WorkflowRuntimeMessage.WorkflowRuntimeMessage<A, E>>
): Effect.Effect<
  WorkflowRuntimeState.WorkflowRuntimeState<A, E>,
  never,
  Scope.Scope | DurableExecutionJournal.DurableExecutionJournal
> {
  return WorkflowRuntimeState.match(wrs, {
    // workflow never started, we start the fiber than process again this message
    onNotStarted: () =>
      pipe(
        appendToJournal(
          DurableExecutionEvent.Attempted(executionVersion)(0)
        ),
        Effect.zipRight(Effect.forkDaemon(executionEffect(executionVersion))),
        Effect.flatMap((fiber) =>
          handleExecutionPhase(
            appendToJournal,
            new WorkflowRuntimeState.Running({ fiber, attempt: 0, nextSequence: 1 }),
            ms,
            executionEffect,
            executionVersion,
            mailbox
          )
        )
      ),
    // we need to switch from replay to running state and then run all the delayed messages one after the other
    onReplay: (state) => {
      return pipe(
        appendToJournal(
          DurableExecutionEvent.Attempted(state.version)(state.expectedSequence)
        ),
        Effect.zipRight(
          Effect.reduce(
            state.delayedMessages.concat([ms]),
            new WorkflowRuntimeState.Running({
              fiber: state.fiber,
              attempt: state.attempt + 1,
              nextSequence: state.expectedSequence + 1
            }) as WorkflowRuntimeState.WorkflowRuntimeState<A, E>,
            (state, msg) =>
              handleExecutionPhase(appendToJournal, state, msg, executionEffect, executionVersion, mailbox)
          )
        )
      )
    },
    // we are running so we need to handle the message
    onRunning: (state) => {
      return WorkflowRuntimeMessage.match(ms, {
        // on completion request we save the event, switch to completed state and then allow to exit
        onRequestComplete: (message) =>
          pipe(
            appendToJournal(
              DurableExecutionEvent.Completed(message.exit)(state.nextSequence)
            ),
            Effect.as(
              new WorkflowRuntimeState.Completed({
                exit: message.exit
              })
            ),
            Effect.zipLeft(Deferred.succeed(message.signal, void 0)),
            Effect.zipLeft(Queue.shutdown(mailbox))
          ),
        // on fork request we save the event, increment next sequence and allow fork to run
        onRequestFork: (message) =>
          pipe(
            appendToJournal(
              DurableExecutionEvent.Forked(message.persistenceId)(state.nextSequence)
            ),
            Effect.as(new WorkflowRuntimeState.Running({ ...state, nextSequence: state.nextSequence + 1 })),
            Effect.zipLeft(Deferred.succeed(message.signal, void 0))
          ),
        // on join request we save the event, increment next sequence and allow join to run
        onRequestJoin: (message) =>
          pipe(
            appendToJournal(
              DurableExecutionEvent.Joined(message.persistenceId)(state.nextSequence)
            ),
            Effect.as(new WorkflowRuntimeState.Running({ ...state, nextSequence: state.nextSequence + 1 })),
            Effect.zipLeft(Deferred.succeed(message.signal, void 0))
          ),
        // on yield request we trigger interrupt and immediately switch to yielding
        onRequestYield: () =>
          pipe(
            Fiber.interrupt(state.fiber),
            Effect.forkScoped,
            Effect.as(new WorkflowRuntimeState.Yielding({ fiber: state.fiber }))
          ),
        // no, we are running
        onCheckStatus: (_) => pipe(Deferred.succeed(_.signal, state), Effect.as(state))
      })
    },

    onYielding: (state) => {
      return WorkflowRuntimeMessage.match(ms, {
        // we yielded, so we cannot complete, interrupt!
        onRequestComplete: (message) =>
          pipe(
            Deferred.interrupt(message.signal),
            Effect.as(state),
            Effect.zipLeft(Queue.shutdown(mailbox))
          ),
        // we yielded! so we cannot start activities
        onRequestFork: (message) => pipe(Deferred.interrupt(message.signal), Effect.as(state)),
        // we yielded! so we cannot end activities
        onRequestJoin: (message) => pipe(Deferred.interrupt(message.signal), Effect.as(state)),
        // we wielded already for another reason!
        onRequestYield: () => Effect.succeed(state),
        // yes, we are!
        onCheckStatus: (_) => pipe(Deferred.succeed(_.signal, state), Effect.as(state))
      })
    },
    onCompleted: (state) => {
      return WorkflowRuntimeMessage.match(ms, {
        // we completed already! just proceed!
        onRequestComplete: (message) =>
          pipe(
            Deferred.succeed(message.signal, void 0),
            Effect.as(state),
            Effect.zipLeft(Queue.shutdown(mailbox))
          ),
        // we completed so no fork is allowed
        onRequestFork: (message) =>
          pipe(
            Deferred.die(message.signal, "ABSURD: Cannot receive new messages in completed state"),
            Effect.as(state)
          ),
        // we completed so no join is allowed
        onRequestJoin: (message) =>
          pipe(
            Deferred.die(message.signal, "ABSURD: Cannot receive new messages in completed state"),
            Effect.as(state)
          ),
        // we completed so yielding is a noop
        onRequestYield: () => Effect.succeed(state),
        // no, we are completed
        onCheckStatus: (_) => pipe(Deferred.succeed(_.signal, state), Effect.as(state))
      })
    }
  })
}

/**
 * @since 1.0.0
 */
export function attempt<A extends Message.Message.Any, R>(workflow: Workflow.Workflow<A, R>) {
  return (
    request: A
  ): Effect.Effect<
    Message.Message.Success<A>,
    Message.Message.Error<A>,
    R | DurableExecutionJournal.DurableExecutionJournal
  > => {
    return Effect.gen(function*() {
      const persistenceId = PrimaryKey.value(request)
      const successSchema = Message.successSchema(request)
      const failureSchema = Message.failureSchema(request)
      const durableExecutionJournal = yield* DurableExecutionJournal.DurableExecutionJournal
      const context = yield* Effect.context<R>()
      const executionVersion = workflow.version(request)

      const appendToJournal = (
        event: DurableExecutionEvent.DurableExecutionEvent<Message.Message.Success<A>, Message.Message.Error<A>>
      ) =>
        Effect.flatMap(
          DurableExecutionJournal.DurableExecutionJournal,
          (journal) => journal.append(persistenceId, successSchema, failureSchema, event)
        )

      const mailbox = yield* Queue.unbounded<
        WorkflowRuntimeMessage.WorkflowRuntimeMessage<Message.Message.Success<A>, Message.Message.Error<A>>
      >()

      const isYielding = pipe(
        Deferred.make<
          WorkflowRuntimeState.WorkflowRuntimeState<Message.Message.Success<A>, Message.Message.Error<A>>,
          never
        >(),
        Effect.tap((signal) => Queue.offer(mailbox, new WorkflowRuntimeMessage.CheckStatus({ signal }))),
        Effect.flatMap(Deferred.await),
        Effect.map((_) =>
          WorkflowRuntimeState.match(_, {
            onNotStarted: () => false,
            onReplay: () => false,
            onRunning: () => false,
            onYielding: () => true,
            onCompleted: () => false
          })
        )
      )

      const yieldExecution = pipe(
        Queue.offer(mailbox, new WorkflowRuntimeMessage.RequestYield()),
        Effect.zipRight(Effect.interrupt)
      )

      const forkAndJoin = <A2, E2, R2>(persistenceId: string, fa: Effect.Effect<A2, E2, R2>) =>
        pipe(
          Deferred.make<void>(),
          Effect.tap((signal) =>
            Queue.offer(mailbox, new WorkflowRuntimeMessage.RequestFork({ persistenceId, signal }))
          ),
          Effect.tap(Deferred.await),
          Effect.zipRight(fa),
          Effect.ensuring(
            pipe(
              Deferred.make<void>(),
              Effect.tap((signal) =>
                Queue.offer(mailbox, new WorkflowRuntimeMessage.RequestJoin({ persistenceId, signal }))
              ),
              Effect.tap(Deferred.await)
            )
          )
        )

      const makePersistenceId = (localId: string) => persistenceId + "__" + localId

      const executionScope = yield* Scope.make()

      const executionEffect = (version: string) =>
        pipe(
          workflow.execute(request),
          Effect.provideService(WorkflowContext.WorkflowContext, {
            makePersistenceId,
            isYielding,
            forkAndJoin,
            yieldExecution,
            durableExecutionJournal,
            version
          }),
          Effect.onExit((exit) =>
            pipe(
              Deferred.make<void, never>(),
              Effect.tap((signal) =>
                Queue.offer(mailbox, new WorkflowRuntimeMessage.RequestComplete({ exit, signal }))
              ),
              Effect.flatMap((signal) => Deferred.await(signal))
            )
          ),
          Effect.provide(context)
        )

      const coordinatorFiber = yield* pipe(
        durableExecutionJournal.read(persistenceId, successSchema, failureSchema, 0, false),
        Stream.runFoldEffect(
          WorkflowRuntimeState.initialState<A>(),
          (state, event) => handleReplayPhase(state, event, executionEffect, mailbox)
        ),
        Effect.zipLeft(pipe(
          Deferred.make<
            WorkflowRuntimeState.WorkflowRuntimeState<Message.Message.Success<A>, Message.Message.Error<A>>,
            never
          >(),
          Effect.flatMap((signal) => Queue.offer(mailbox, new WorkflowRuntimeMessage.CheckStatus({ signal })))
        )),
        Effect.flatMap((stateAfterReplay) =>
          pipe(
            Stream.fromQueue(mailbox),
            Stream.runFoldEffect(stateAfterReplay, (state, message) =>
              handleExecutionPhase(
                appendToJournal,
                state,
                message,
                executionEffect,
                executionVersion,
                mailbox
              ))
          )
        ),
        Effect.flatMap((state) =>
          WorkflowRuntimeState.match(state, {
            onCompleted: (_) => _.exit,
            onNotStarted: () => Effect.interrupt,
            onReplay: () => Effect.interrupt,
            onRunning: () => Effect.interrupt,
            onYielding: () => Effect.interrupt
          })
        ),
        Effect.forkIn(executionScope)
      )

      return yield* pipe(
        Fiber.await(coordinatorFiber),
        Effect.flatten,
        Effect.onInterrupt(() =>
          pipe(
            Queue.offer(mailbox, new WorkflowRuntimeMessage.RequestYield()),
            Effect.zipRight(Fiber.await(coordinatorFiber))
          )
        ),
        Effect.ensuring(Scope.close(executionScope, Exit.void))
      )
    }).pipe(Effect.scoped)
  }
}
