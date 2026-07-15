/**
 * Internal machine process integration.
 *
 * @since 4.0.0
 */

import * as Effect from "../../../Effect.ts"
import * as Exit from "../../../Exit.ts"
import * as HashMap from "../../../HashMap.ts"
import * as Option from "../../../Option.ts"
import * as Ref from "../../../Ref.ts"
import type * as Schema from "../../../Schema.ts"
import * as Scope from "../../../Scope.ts"
import * as Stream from "../../../Stream.ts"
import type { ActionError, ExecutionServices, Machine, Runtime } from "../Machine.ts"
import type {
  InfiniteTransitionError,
  MachineSchemaDecodeError,
  StartupError,
  StoppedError,
  UnhandledEventError
} from "./machineErrors.ts"
import * as Model from "./machineModel.ts"
import * as internalPlanner from "./machinePlanner.ts"
import * as internalRuntime from "./machineRuntime.ts"

type IsAny<A> = 0 extends (1 & A) ? true : false

type ExcludeCompatibleRuntime<Requirements, Events, Emits> = Requirements extends Runtime.Requirement<
  infer RequiredEvents,
  infer RequiredEmits
> ? IsAny<Requirements> extends true ? Requirements
  : [RequiredEvents] extends [Events] ? [RequiredEmits] extends [Emits] ? never : Requirements
  : Requirements
  : Requirements

type AnyInvokeConfig = Machine.InvokeConfig<any, any, any, any, any, any, any, any, any, any, any>

interface InvokeSession {
  readonly token: symbol
  readonly scope: Scope.Closeable
  readonly childId: string
}

const getInvokes = (config: Machine.AnyStateConfig | undefined): ReadonlyArray<AnyInvokeConfig> => {
  const invokes = config?.invoke
  if (invokes === undefined) {
    return []
  }
  return Array.isArray(invokes) ? invokes as ReadonlyArray<AnyInvokeConfig> : [invokes as AnyInvokeConfig]
}

export const toProcessLogic: <
  const States extends Machine.StateSchemas,
  const Events extends ReadonlyArray<Machine.TaggedSchema>,
  const Emits extends ReadonlyArray<Machine.TaggedSchema> = any,
  const Input extends Schema.Top = typeof Schema.Void,
  UnhandledStates extends Machine.StateIdentifier<States> = Machine.StateIdentifier<States>,
  E = never,
  R = never,
  InitialE = never,
  InitialR = never,
  FinalStates extends Machine.StateIdentifier<States> = never,
  Output = never
>(
  machine: Machine<States, Events, Input, UnhandledStates, E, R, InitialE, InitialR, FinalStates, Output, Emits>,
  ...args: [...Machine.InputArgs<Input>]
) => internalRuntime.ProcessLogic<
  Machine.Snapshot<States>,
  Machine.EventOf<Events>,
  E | ActionError<R> | InfiniteTransitionError | MachineSchemaDecodeError | StoppedError | UnhandledEventError,
  ExcludeCompatibleRuntime<
    Exclude<ExecutionServices<InitialR | R>, internalRuntime.MachineRuntime>,
    Machine.EventOf<Events>,
    Machine.EmitOf<Emits>
  >,
  Output | undefined,
  InitialE | ActionError<InitialR | R> | MachineSchemaDecodeError | StartupError | StoppedError
> = <
  const States extends Machine.StateSchemas,
  const Events extends ReadonlyArray<Machine.TaggedSchema>,
  const Emits extends ReadonlyArray<Machine.TaggedSchema> = any,
  const Input extends Schema.Top = typeof Schema.Void,
  UnhandledStates extends Machine.StateIdentifier<States> = Machine.StateIdentifier<States>,
  E = never,
  R = never,
  InitialE = never,
  InitialR = never,
  FinalStates extends Machine.StateIdentifier<States> = never,
  Output = never
>(
  machine: Machine<States, Events, Input, UnhandledStates, E, R, InitialE, InitialR, FinalStates, Output, Emits>,
  ...args: [...Machine.InputArgs<Input>]
) =>
  ({
    initial: (scope) =>
      internalRuntime.provideMachineRuntime(
        Effect.gen(function*() {
          const planned = yield* internalPlanner.planInitial(machine, ...args)
          const runtime = internalPlanner.makeLiveRuntime<Machine.EventOf<Events>, Machine.EmitOf<Emits>>(
            machine,
            scope
          )
          yield* internalPlanner.runActions(
            planned.actions,
            runtime
          )
          yield* internalPlanner.runEmittedEvents(planned.emittedEvents, runtime)
          return planned.state
        }),
        scope
      ),
    run: (context) =>
      internalRuntime.provideMachineRuntime(
        Effect.gen(function*() {
          const { receive, state, setState } = context
          let done = false
          let output: Output | undefined = undefined

          const initialState = yield* state
          if (internalPlanner.isFinalState(machine, initialState)) {
            return yield* internalPlanner.getFinalOutputEffect<States, Events, Output>(
              machine,
              initialState,
              internalPlanner.InitialEvent
            )
          }

          const invokeSessions = yield* Ref.make<HashMap.HashMap<string, InvokeSession>>(
            HashMap.empty()
          )
          const makeInvokeSessionKey = (path: string, id: string): string => `${path.length}:${path}${id}`
          const makeInvokeChildId = (path: string, id: string): string =>
            `Machine.invoke:${makeInvokeSessionKey(path, id)}`
          const isCurrentInvoke = (key: string, token: symbol): Effect.Effect<boolean> =>
            Ref.get(invokeSessions).pipe(
              Effect.map((sessions) => {
                const current = HashMap.get(sessions, key)
                return Option.isSome(current) && current.value.token === token
              })
            )
          const stopInvoke = (key: string, exit: Exit.Exit<unknown, unknown>): Effect.Effect<void> =>
            Ref.modify(invokeSessions, (sessions) => {
              const current = HashMap.get(sessions, key)
              return Option.isSome(current)
                ? [current.value, HashMap.remove(sessions, key)] as const
                : [undefined, sessions] as const
            }).pipe(
              Effect.flatMap((session) =>
                session === undefined
                  ? Effect.void
                  : Scope.close(session.scope, exit).pipe(
                    Effect.andThen(context.stopChild(session.childId))
                  )
              )
            )
          const clearInvoke = (key: string, token: symbol, exit: Exit.Exit<unknown, unknown>): Effect.Effect<void> =>
            Ref.modify(invokeSessions, (sessions) => {
              const current = HashMap.get(sessions, key)
              return Option.isSome(current) && current.value.token === token
                ? [current.value, HashMap.remove(sessions, key)] as const
                : [undefined, sessions] as const
            }).pipe(
              Effect.flatMap((session) =>
                session === undefined
                  ? Effect.void
                  : Scope.close(session.scope, exit).pipe(
                    Effect.andThen(context.stopChild(session.childId))
                  )
              )
            )
          const stopAllInvokes = (exit: Exit.Exit<unknown, unknown>): Effect.Effect<void> =>
            Ref.modify(invokeSessions, (sessions) => [HashMap.toEntries(sessions), HashMap.empty()] as const).pipe(
              Effect.flatMap((sessions) =>
                Effect.all(
                  sessions.map(([, session]) =>
                    Scope.close(session.scope, exit).pipe(
                      Effect.andThen(context.stopChild(session.childId))
                    )
                  ),
                  { discard: true, concurrency: "unbounded" }
                )
              )
            )
          const startInvokeWatchers = (
            config: AnyInvokeConfig,
            child: internalRuntime.MachineRef<any, any, any, any>,
            key: string,
            token: symbol,
            scope: Scope.Closeable
          ): Effect.Effect<void> =>
            Effect.gen(function*() {
              if (config.snapshot !== undefined) {
                const mapSnapshot = config.snapshot
                yield* child.changes.pipe(
                  Stream.filter((snapshot) => snapshot.status === "active"),
                  Stream.runForEach((snapshot) =>
                    isCurrentInvoke(key, token).pipe(
                      Effect.flatMap((isCurrent) => {
                        if (!isCurrent) {
                          return Effect.void
                        }
                        const mappedEvent = mapSnapshot({ id: config.id, snapshot })
                        return mappedEvent === undefined
                          ? Effect.void
                          : context.self.send(mappedEvent as Machine.EventOf<Events>)
                      })
                    )
                  ),
                  Effect.forkIn(scope),
                  Effect.asVoid
                )
              }
              yield* internalRuntime.watch(child).pipe(
                Stream.runForEach((outcome) =>
                  isCurrentInvoke(key, token).pipe(
                    Effect.flatMap((isCurrent) => {
                      if (!isCurrent || outcome._tag === "Stopped") {
                        return Effect.void
                      }
                      if (outcome._tag === "Done") {
                        return outcome.output === undefined
                          ? Effect.void
                          : context.self.send(outcome.output as Machine.EventOf<Events>).pipe(
                            Effect.catchTag("StoppedError", () => Effect.void)
                          )
                      }
                      return context.failCause(outcome.cause)
                    })
                  )
                ),
                Effect.forkIn(scope),
                Effect.asVoid
              )
            })
          const startInvoke = <StateId extends Machine.StateIdentifier<States>>(
            path: StateId,
            config: AnyInvokeConfig,
            state: Machine.StateByIdentifier<States, StateId>,
            event: Machine.LifecycleEvent<Events>
          ) =>
            Effect.gen(function*() {
              const token = Symbol()
              const invokeId = String(config.id)
              const key = makeInvokeSessionKey(path, invokeId)
              const childId = makeInvokeChildId(path, invokeId)
              const scope = yield* Scope.make("parallel")
              yield* Ref.update(invokeSessions, (sessions) => HashMap.set(sessions, key, { token, scope, childId }))
              const child = yield* context.spawn(
                config.src({
                  state,
                  event,
                  runtime: internalPlanner.runtimeFor<Machine.EventOf<Events>, Machine.EmitOf<Emits>>()
                }),
                { id: childId }
              ).pipe(
                Effect.onExit((exit) =>
                  Exit.isFailure(exit) ? clearInvoke(key, token, Exit.failCause(exit.cause)) : Effect.void
                )
              )
              yield* startInvokeWatchers(config, child, key, token, scope)
            })
          const startInvokes: (
            state: Machine.Snapshot<States>,
            paths: ReadonlyArray<string>,
            event: Machine.LifecycleEvent<Events>
          ) => Effect.Effect<void, E | MachineSchemaDecodeError, R> = Effect.fnUntraced(function*(
            state: Machine.Snapshot<States>,
            paths: ReadonlyArray<string>,
            event: Machine.LifecycleEvent<Events>
          ) {
            const configuration = yield* Model.normalizeConfigurationEffect(machine, state)
            yield* Effect.all(
              internalPlanner.sortEntryPaths(machine, paths)
                .filter((path) => configuration.active.has(path))
                .flatMap((path) =>
                  getInvokes(Model.getStateConfigByPath(machine, path)).map((config) =>
                    startInvoke(
                      path as Machine.StateIdentifier<States>,
                      config,
                      Model.getActiveValue(configuration, path) as Machine.StateByIdentifier<
                        States,
                        Machine.StateIdentifier<States>
                      >,
                      event
                    ) as Effect.Effect<void, E | MachineSchemaDecodeError, R>
                  )
                ),
              { discard: true }
            )
          })
          const stopInvokes = (paths: ReadonlyArray<string>): Effect.Effect<void> =>
            Effect.all(
              internalPlanner.sortExitPaths(machine, paths).flatMap((path) =>
                getInvokes(Model.getStateConfigByPath(machine, path)).map((config) =>
                  stopInvoke(makeInvokeSessionKey(path, String(config.id)), Exit.void)
                )
              ),
              { discard: true, concurrency: "unbounded" }
            )

          return yield* Effect.gen(function*() {
            yield* startInvokes(
              initialState,
              Model.getInitialEntryPaths(machine, yield* Model.normalizeConfigurationEffect(machine, initialState)),
              internalPlanner.InitialEvent
            )

            yield* Effect.whileLoop({
              while: () => !done,
              body: () =>
                Effect.gen(function*() {
                  const event = yield* receive
                  const current = yield* state
                  const planned = yield* internalPlanner.plan(machine, current, event)
                  const changed = planned.microsteps.some((step) => step.changed)
                  const exitPaths = planned.microsteps.flatMap((step) => step.exitPaths)

                  const runtime = internalPlanner.makeLiveRuntime<Machine.EventOf<Events>, Machine.EmitOf<Emits>>(
                    machine,
                    context
                  )
                  yield* internalPlanner.runActions(planned.actions, runtime)
                  if (changed) {
                    yield* stopInvokes(exitPaths)
                  }
                  yield* setState(planned.next)
                  yield* internalPlanner.runEmittedEvents(
                    planned.emittedEvents as ReadonlyArray<Machine.EmitOf<Emits>>,
                    runtime
                  )

                  if (internalPlanner.isFinalState(machine, planned.next)) {
                    done = true
                    output = planned.output
                    yield* stopAllInvokes(Exit.succeed(output))
                  } else {
                    if (changed) {
                      for (const step of planned.microsteps) {
                        if (step.changed) {
                          yield* startInvokes(
                            planned.next,
                            step.entryPaths,
                            step.event as Machine.LifecycleEvent<Events>
                          )
                        }
                      }
                    }
                    yield* Effect.yieldNow
                  }
                }),
              step: () => undefined
            })

            return output
          }).pipe(
            Effect.onExit((exit) => stopAllInvokes(exit))
          )
        }),
        context
      )
  }) as internalRuntime.ProcessLogic<
    Machine.Snapshot<States>,
    Machine.EventOf<Events>,
    E | ActionError<R> | InfiniteTransitionError | MachineSchemaDecodeError | StoppedError | UnhandledEventError,
    ExcludeCompatibleRuntime<
      Exclude<ExecutionServices<InitialR | R>, internalRuntime.MachineRuntime>,
      Machine.EventOf<Events>,
      Machine.EmitOf<Emits>
    >,
    Output | undefined,
    InitialE | ActionError<InitialR | R> | MachineSchemaDecodeError | StartupError | StoppedError
  >

export const start: <
  const States extends Machine.StateSchemas,
  const Events extends ReadonlyArray<Machine.TaggedSchema>,
  const Emits extends ReadonlyArray<Machine.TaggedSchema> = any,
  const Input extends Schema.Top = typeof Schema.Void,
  UnhandledStates extends Machine.StateIdentifier<States> = Machine.StateIdentifier<States>,
  E = never,
  R = never,
  InitialE = never,
  InitialR = never,
  FinalStates extends Machine.StateIdentifier<States> = never,
  Output = never
>(
  machine: Machine<States, Events, Input, UnhandledStates, E, R, InitialE, InitialR, FinalStates, Output, Emits>,
  ...args: [...Machine.InputArgs<Input>]
) => Effect.Effect<
  internalRuntime.MachineRef<
    Machine.Snapshot<States>,
    Machine.EventOf<Events>,
    | E
    | InitialE
    | ActionError<R | InitialR>
    | InfiniteTransitionError
    | MachineSchemaDecodeError
    | StartupError
    | StoppedError
    | UnhandledEventError,
    Output | undefined
  >,
  InitialE | ActionError<InitialR | R> | MachineSchemaDecodeError | StartupError | StoppedError,
  ExcludeCompatibleRuntime<
    Exclude<ExecutionServices<InitialR | R>, internalRuntime.MachineRuntime>,
    Machine.EventOf<Events>,
    Machine.EmitOf<Emits>
  >
> = (machine, ...args) =>
  internalRuntime.startProcess(
    toProcessLogic(machine, ...args),
    machine.id === undefined ? undefined : { id: machine.id }
  ) as any
