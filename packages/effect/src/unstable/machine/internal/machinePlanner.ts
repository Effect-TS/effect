/**
 * Internal machine planning helpers.
 *
 * @since 4.0.0
 */

import * as Cause from "../../../Cause.ts"
import * as Context from "../../../Context.ts"
import * as Effect from "../../../Effect.ts"
import * as Option from "../../../Option.ts"
import type * as Schema from "../../../Schema.ts"
import type { ActionRequirement, InitialEvent as MachineInitialEvent, Machine, Runtime } from "../Machine.ts"
import {
  InfiniteTransitionError,
  MachineSchemaDecodeError,
  StartupError,
  UnhandledEventError
} from "./machineErrors.ts"
import {
  type ActiveConfiguration,
  compareDocumentOrder,
  completeConfigurationEffect,
  decodeEmit,
  decodeEvent,
  decodeInput,
  getActiveLeafPathFrom,
  getActiveLeafPaths,
  getActiveValue,
  getInitialEntryPaths,
  getLeafPath,
  getNode,
  getPathToRoot,
  getRootPath,
  isActiveFinalConfiguration,
  isDescendantOf,
  isSnapshot,
  isTarget,
  normalizeConfiguration,
  normalizeConfigurationEffect,
  normalizeTargetConfigurationEffect,
  pathDepth,
  snapshotFromConfiguration,
  validateInitialConfiguration
} from "./machineModel.ts"
import type { ProcessScope } from "./machineRuntime.ts"

type DeferredAction<E = any, R = any> = Effect.Effect<void, E, R>

type IsAny<A> = 0 extends (1 & A) ? true : false

type ExcludeCompatibleRuntime<Requirements, Events, Emits> = Requirements extends Runtime.Requirement<
  infer RequiredEvents,
  infer RequiredEmits
> ? IsAny<Requirements> extends true ? Requirements
  : [RequiredEvents] extends [Events] ? [RequiredEmits] extends [Emits] ? never : Requirements
  : Requirements
  : Requirements

interface DeferredQueue<A> {
  readonly add: (value: A) => Effect.Effect<void>
  readonly read: Effect.Effect<ReadonlyArray<A>>
}

class DeferredActions extends Context.Service<DeferredActions, {
  readonly add: <E, R>(effect: DeferredAction<E, R>) => Effect.Effect<void>
  readonly read: Effect.Effect<ReadonlyArray<DeferredAction>>
}>()("effect/Machine/DeferredActions") {}

class DeferredRaisedEvents extends Context.Service<DeferredRaisedEvents, {
  readonly add: <Event>(event: Event) => Effect.Effect<void>
  readonly addEmitted: <Event>(event: Event) => Effect.Effect<void>
  readonly read: Effect.Effect<ReadonlyArray<any>>
  readonly readEmitted: Effect.Effect<ReadonlyArray<any>>
}>()("effect/Machine/DeferredRaisedEvents") {}

class RuntimeContext extends Context.Service<RuntimeContext, Runtime<any, any>>()(
  "effect/Machine/Runtime"
) {}

const makeDeferredQueue = <A>(): Effect.Effect<DeferredQueue<A>> =>
  Effect.sync(() => {
    const values: Array<A> = []
    return {
      read: Effect.sync(() => values),
      add: (value) =>
        Effect.sync(() => {
          values.push(value)
        })
    }
  })

const makeDeferredActions = Effect.map(
  makeDeferredQueue<DeferredAction>(),
  (queue) =>
    DeferredActions.of({
      read: queue.read,
      add: (effect) => queue.add(effect)
    })
)

const makeDeferredRaisedEvents = Effect.gen(function*() {
  const raised = yield* makeDeferredQueue<any>()
  const emitted = yield* makeDeferredQueue<any>()
  return (
    DeferredRaisedEvents.of({
      read: raised.read,
      readEmitted: emitted.read,
      add: (event) => raised.add(event),
      addEmitted: (event) => emitted.add(event)
    })
  )
})

const provideDeferredServices = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  machine: Machine.Any,
  deferredActions: DeferredActions["Service"],
  deferredRaisedEvents: DeferredRaisedEvents["Service"]
): Effect.Effect<A, E | MachineSchemaDecodeError, R> =>
  effect.pipe(
    Effect.provideService(DeferredActions, deferredActions),
    Effect.provideService(DeferredRaisedEvents, deferredRaisedEvents),
    Effect.provideService(RuntimeContext, makePlanningRuntime(machine, deferredRaisedEvents))
  )

const provideRuntimeContext = <A, E, R, Events, Emits>(
  effect: Effect.Effect<A, E, R>,
  runtime: Runtime<Events, Emits>
): Effect.Effect<A, E, ExcludeCompatibleRuntime<R, Events, Emits>> =>
  Effect.provideService(
    effect as Effect.Effect<A, E, R | RuntimeContext>,
    RuntimeContext,
    runtime as Runtime<any, any>
  ) as Effect.Effect<A, E, ExcludeCompatibleRuntime<R, Events, Emits>>

const makePlanningRuntime = <Events, Emits>(
  machine: Machine.Any,
  deferredRaisedEvents: DeferredRaisedEvents["Service"]
): Runtime<Events, Emits> =>
  RuntimeContext.of({
    raise: (event) =>
      decodeEvent(machine, event).pipe(
        Effect.flatMap((event) => deferredRaisedEvents.add(event))
      ),
    sendParent: (event) =>
      decodeEmit(machine, event).pipe(
        Effect.flatMap((event) => deferredRaisedEvents.addEmitted(event))
      )
  })

export const makeLiveRuntime = <Events, Emits>(
  machine: Machine.Any,
  scope: ProcessScope<Events>
): Runtime<Events, Emits> =>
  RuntimeContext.of({
    raise: (event) =>
      decodeEvent(machine, event).pipe(
        Effect.flatMap((event) => scope.self.send(event as Events))
      ),
    sendParent: (event) =>
      decodeEmit(machine, event).pipe(
        Effect.flatMap((event) => scope.sendParent(event))
      )
  })

export const runActions = <E, R, Events, Emits>(
  actions: Iterable<Effect.Effect<void, E, R>>,
  runtime: Runtime<Events, Emits>
): Effect.Effect<void, E, ExcludeCompatibleRuntime<R, Events, Emits>> =>
  Effect.all(
    Array.from(actions, (action) => provideRuntimeContext(action, runtime)),
    { discard: true }
  )

export const runEmittedEvents = <Events, Emits>(
  events: Iterable<Emits>,
  runtime: Runtime<Events, Emits>
) =>
  Effect.all(
    Array.from(events, (event) => runtime.sendParent(event)),
    { discard: true }
  )

export const runtimeFor = <Events, Emits>(): Effect.Effect<
  Runtime<Events, Emits>,
  never,
  Runtime.Requirement<Events, Emits>
> => runtime<{ readonly events: Events; readonly emits: Emits }>()

export type MicrostepPlan<State, Event, E, R> = {
  readonly next: State
  readonly event: Event | MachineInitialEvent
  readonly actions: ReadonlyArray<Effect.Effect<void, E, R>>
  readonly raisedEvents: ReadonlyArray<Event>
  readonly emittedEvents: ReadonlyArray<unknown>
  readonly exitPaths: ReadonlyArray<string>
  readonly entryPaths: ReadonlyArray<string>
  readonly changed: boolean
}

export type MacrostepPlan<State, Event, E, R, Output> = {
  readonly next: State
  readonly actions: ReadonlyArray<Effect.Effect<void, E, R>>
  readonly microsteps: ReadonlyArray<MicrostepPlan<State, Event, E, R>>
  readonly emittedEvents: ReadonlyArray<unknown>
  readonly output: Output | undefined
}

type TransitionHandler<States extends Machine.StateSchemas, E, R, Context> = (
  context: Context
) => Machine.HandlerResult<States, E, R>

type EventTransition<States extends Machine.StateSchemas, E, R, Context> =
  | TransitionHandler<States, E, R, Context>
  | {
    readonly reenter?: boolean
    readonly transition: TransitionHandler<States, E, R, Context>
  }

type MicrostepTransition<States extends Machine.StateSchemas, E, R, Context> = {
  readonly reenter: boolean
  readonly transition: TransitionHandler<States, E, R, Context>
}

const normalizeEventTransition = <States extends Machine.StateSchemas, E, R, Context>(
  transition: EventTransition<States, E, R, Context> | undefined
): MicrostepTransition<States, E, R, Context> | undefined => {
  if (transition === undefined) {
    return undefined
  }
  return typeof transition === "function"
    ? { reenter: false, transition }
    : { reenter: transition.reenter === true, transition: transition.transition }
}

const collectStateAction = Effect.fnUntraced(function*<Context, Event, E, R>(
  machine: Machine.Any,
  handler: ((context: Context) => Machine.StateActionResult<E, R>) | undefined,
  context: Context
) {
  const deferredActions = yield* makeDeferredActions
  const deferredRaisedEvents = yield* makeDeferredRaisedEvents
  if (handler !== undefined) {
    const result = handler(context)
    if (Effect.isEffect(result)) {
      yield* provideDeferredServices(result, machine, deferredActions, deferredRaisedEvents)
    }
  }
  const actions = yield* deferredActions.read
  const raisedEvents = yield* deferredRaisedEvents.read
  const emittedEvents = yield* deferredRaisedEvents.readEmitted
  return {
    actions: actions as ReadonlyArray<DeferredAction<E, R>>,
    raisedEvents: raisedEvents as ReadonlyArray<Event>,
    emittedEvents
  }
})

const collectTransition = Effect.fnUntraced(function*<
  const States extends Machine.StateSchemas,
  Event,
  E,
  R,
  Context
>(
  machine: Machine.Any,
  transition: TransitionHandler<States, E, R, Context>,
  context: Context
) {
  const deferredActions = yield* makeDeferredActions
  const deferredRaisedEvents = yield* makeDeferredRaisedEvents
  const result = transition(context)
  const state = Effect.isEffect(result)
    ? yield* provideDeferredServices(result, machine, deferredActions, deferredRaisedEvents)
    : result
  const actions = yield* deferredActions.read
  const raisedEvents = yield* deferredRaisedEvents.read
  const emittedEvents = yield* deferredRaisedEvents.readEmitted
  return {
    state,
    actions: actions as ReadonlyArray<DeferredAction<E, R>>,
    raisedEvents: raisedEvents as ReadonlyArray<Event>,
    emittedEvents
  }
})

type SelectedTransition<States extends Machine.StateSchemas, E, R, Context> = {
  readonly sourcePath: string
  readonly leafPath: string
  readonly transition: MicrostepTransition<States, E, R, Context>
  readonly context: Context
}

type EvaluatedTransition<States extends Machine.StateSchemas, Event, E, R, Context> = {
  readonly selection: SelectedTransition<States, E, R, Context>
  readonly target:
    | Machine.Snapshot<States>
    | Machine.Target<States, Machine.StateIdentifier<States>>
    | undefined
  readonly actions: ReadonlyArray<Effect.Effect<void, E, R>>
  readonly raisedEvents: ReadonlyArray<Event>
  readonly emittedEvents: ReadonlyArray<unknown>
  readonly changed: boolean
  readonly exitPaths: ReadonlyArray<string>
  readonly entryPaths: ReadonlyArray<string>
}

const getCandidatePaths = (machine: Machine.Any, configuration: ActiveConfiguration): ReadonlyArray<string> =>
  Array.from(configuration.active)
    .sort((left, right) => {
      const depth = pathDepth(machine, right) - pathDepth(machine, left)
      return depth === 0 ? compareDocumentOrder(machine, left, right) : depth
    })

const getLeafCandidatePaths = (machine: Machine.Any, leaf: string): ReadonlyArray<string> =>
  [...getPathToRoot(machine, leaf)].reverse()

const getLeastCommonAncestor = (
  machine: Machine.Any,
  left: string,
  right: string
): string | undefined => {
  const leftPath = getPathToRoot(machine, left)
  const rightPath = getPathToRoot(machine, right)
  let ancestor: string | undefined = undefined
  const length = Math.min(leftPath.length, rightPath.length)
  for (let index = 0; index < length; index++) {
    if (leftPath[index] !== rightPath[index]) {
      break
    }
    ancestor = leftPath[index]
  }
  return ancestor
}

const getExitPaths = (
  machine: Machine.Any,
  configuration: ActiveConfiguration,
  boundary: string | undefined
): ReadonlyArray<string> =>
  sortExitPaths(
    machine,
    Array.from(configuration.active)
      .filter((path) => boundary === undefined || isDescendantOf(path, boundary))
  )

const getEntryPaths = (
  machine: Machine.Any,
  configuration: ActiveConfiguration,
  boundary: string | undefined
): ReadonlyArray<string> =>
  sortEntryPaths(
    machine,
    Array.from(configuration.active).filter((path) => boundary === undefined || isDescendantOf(path, boundary))
  )

const hasSameActivePaths = (left: ActiveConfiguration, right: ActiveConfiguration): boolean =>
  left.active.size === right.active.size && Array.from(left.active).every((path) => right.active.has(path))

export const sortExitPaths = (machine: Machine.Any, paths: Iterable<string>): ReadonlyArray<string> =>
  Array.from(new Set(paths))
    .sort((left, right) => {
      const depth = getPathToRoot(machine, right).length - getPathToRoot(machine, left).length
      return depth === 0 ? getNode(machine, right).order - getNode(machine, left).order : depth
    })

export const sortEntryPaths = (machine: Machine.Any, paths: Iterable<string>): ReadonlyArray<string> =>
  Array.from(new Set(paths))
    .sort((left, right) => {
      const depth = getPathToRoot(machine, left).length - getPathToRoot(machine, right).length
      return depth === 0 ? compareDocumentOrder(machine, left, right) : depth
    })

const makePlanningCapabilities = <Events, Emits>(): Machine.PlanningCapabilities<Events, Emits> & {
  readonly runtime: Effect.Effect<Runtime<Events, Emits>, never, Runtime.Requirement<Events, Emits>>
} => {
  const runtimeEffect = runtimeFor<Events, Emits>()
  return {
    action,
    runtime: runtimeEffect,
    raise: (event) => Effect.flatMap(runtimeEffect, (runtime) => runtime.raise(event)),
    emit: (event) => Effect.flatMap(runtimeEffect, (runtime) => runtime.sendParent(event))
  }
}

const makeStateActionContext = <
  const States extends Machine.StateSchemas,
  const Events extends ReadonlyArray<Machine.TaggedSchema>,
  const Emits extends ReadonlyArray<Machine.TaggedSchema>,
  StateId extends Machine.StateIdentifier<States>
>(
  configuration: ActiveConfiguration,
  path: string,
  event: Machine.LifecycleEvent<Events>
): Machine.StateActionContext<States, Events, Emits, StateId> => ({
  state: getActiveValue(configuration, path) as Machine.StateByIdentifier<States, StateId>,
  event,
  ...makePlanningCapabilities<Machine.EventOf<Events>, Machine.EmitOf<Emits>>()
})

const makeTransitionContext = <
  const States extends Machine.StateSchemas,
  const Events extends ReadonlyArray<Machine.TaggedSchema>,
  const Emits extends ReadonlyArray<Machine.TaggedSchema>,
  StateId extends Machine.StateIdentifier<States>,
  EventTag extends Machine.TagOf<Events[number]>
>(
  machine: Machine<States, Events, any, any, any, any, any, any, any, any, Emits>,
  configuration: ActiveConfiguration,
  path: string,
  event: Machine.EventByTag<Events, EventTag>
): Machine.HandlerContext<States, Events, Emits, StateId, EventTag, any, any> => ({
  state: getActiveValue(configuration, path) as Machine.StateByIdentifier<States, StateId>,
  event,
  ...makePlanningCapabilities<Machine.EventOf<Events>, Machine.EmitOf<Emits>>(),
  target: machine.makeTargetBuilder(path as StateId)
})

const makeDoneContext = <
  const States extends Machine.StateSchemas,
  const Events extends ReadonlyArray<Machine.TaggedSchema>,
  const Emits extends ReadonlyArray<Machine.TaggedSchema>,
  StateId extends Machine.StateIdentifier<States>
>(
  machine: Machine.Any,
  configuration: ActiveConfiguration,
  path: string,
  event: Machine.LifecycleEvent<Events>,
  output: unknown
): Machine.DoneContext<States, Events, Emits, StateId> => ({
  state: getActiveValue(configuration, path) as Machine.StateByIdentifier<States, StateId>,
  event,
  output: output as Machine.CompletionOutputByIdentifier<States, StateId>,
  ...makePlanningCapabilities<Machine.EventOf<Events>, Machine.EmitOf<Emits>>(),
  target: machine.makeTargetBuilder(path as StateId)
})

const collectStateActions = Effect.fnUntraced(function*<
  const States extends Machine.StateSchemas,
  const Events extends ReadonlyArray<Machine.TaggedSchema>,
  const Emits extends ReadonlyArray<Machine.TaggedSchema>,
  E,
  R
>(
  machine: Machine.Any,
  configuration: ActiveConfiguration,
  paths: ReadonlyArray<string>,
  event: Machine.LifecycleEvent<Events>,
  key: "entry" | "exit"
) {
  const actions: Array<DeferredAction<E, R>> = []
  const raisedEvents: Array<Machine.EventOf<Events>> = []
  const emittedEvents: Array<Machine.EmitOf<Emits>> = []
  for (const path of paths) {
    const collected = yield* collectStateAction<
      Machine.StateActionContext<States, Events, Emits, Machine.StateIdentifier<States>>,
      Machine.EventOf<Events>,
      E,
      R
    >(
      machine,
      machine.handlers[path]?.[key],
      makeStateActionContext<States, Events, Emits, Machine.StateIdentifier<States>>(configuration, path, event)
    )
    actions.push(...collected.actions)
    raisedEvents.push(...collected.raisedEvents)
    emittedEvents.push(...collected.emittedEvents as ReadonlyArray<Machine.EmitOf<Emits>>)
  }
  return { actions, emittedEvents, raisedEvents }
})

const selectAlwaysTransitions = <
  const States extends Machine.StateSchemas,
  const Events extends ReadonlyArray<Machine.TaggedSchema>,
  const Emits extends ReadonlyArray<Machine.TaggedSchema>,
  E,
  R
>(
  machine: Machine.Any,
  configuration: ActiveConfiguration,
  event: Machine.LifecycleEvent<Events>
): ReadonlyArray<
  SelectedTransition<
    States,
    E,
    R,
    Machine.AlwaysContext<States, Events, Emits, Machine.StateIdentifier<States>>
  >
> => {
  const selected: Array<
    SelectedTransition<
      States,
      E,
      R,
      Machine.AlwaysContext<States, Events, Emits, Machine.StateIdentifier<States>>
    >
  > = []
  const selectedSources = new Set<string>()
  for (const leaf of getActiveLeafPaths(machine, configuration)) {
    for (const path of getLeafCandidatePaths(machine, leaf)) {
      const always = machine.handlers[path]?.always
      if (always !== undefined) {
        if (!selectedSources.has(path)) {
          selectedSources.add(path)
          selected.push({
            sourcePath: path,
            leafPath: leaf,
            transition: { reenter: false, transition: always } as MicrostepTransition<
              States,
              E,
              R,
              Machine.AlwaysContext<States, Events, Emits, Machine.StateIdentifier<States>>
            >,
            context: {
              state: getActiveValue(configuration, path) as Machine.StateByIdentifier<
                States,
                Machine.StateIdentifier<States>
              >,
              event,
              ...makePlanningCapabilities<Machine.EventOf<Events>, Machine.EmitOf<Emits>>(),
              target: machine.makeTargetBuilder(path as Machine.StateIdentifier<States>)
            }
          })
        }
        break
      }
    }
  }
  return selected
}

const selectDoneTransitions = <
  const States extends Machine.StateSchemas,
  const Events extends ReadonlyArray<Machine.TaggedSchema>,
  const Emits extends ReadonlyArray<Machine.TaggedSchema>,
  E,
  R
>(
  machine: Machine.Any,
  configuration: ActiveConfiguration,
  event: Machine.LifecycleEvent<Events>,
  completions: ReadonlyArray<{ readonly path: string; readonly output: unknown }>
): ReadonlyArray<
  SelectedTransition<
    States,
    E,
    R,
    Machine.DoneContext<States, Events, Emits, Machine.StateIdentifier<States>>
  >
> => {
  const selected: Array<
    SelectedTransition<
      States,
      E,
      R,
      Machine.DoneContext<States, Events, Emits, Machine.StateIdentifier<States>>
    >
  > = []
  const selectedSources = new Set<string>()
  for (const completion of completions) {
    const onDone = machine.handlers[completion.path]?.onDone
    if (onDone !== undefined && !selectedSources.has(completion.path)) {
      selectedSources.add(completion.path)
      selected.push({
        sourcePath: completion.path,
        leafPath: getActiveLeafPathFrom(machine, configuration, completion.path),
        transition: { reenter: false, transition: onDone } as MicrostepTransition<
          States,
          E,
          R,
          Machine.DoneContext<States, Events, Emits, Machine.StateIdentifier<States>>
        >,
        context: makeDoneContext<States, Events, Emits, Machine.StateIdentifier<States>>(
          machine,
          configuration,
          completion.path,
          event,
          completion.output
        )
      })
    }
  }
  return selected
}

const selectEventTransitions = <
  const States extends Machine.StateSchemas,
  const Events extends ReadonlyArray<Machine.TaggedSchema>,
  const Emits extends ReadonlyArray<Machine.TaggedSchema>,
  E,
  R
>(
  machine: Machine.Any,
  configuration: ActiveConfiguration,
  event: Machine.EventByTag<Events, Machine.TagOf<Events[number]>>
): ReadonlyArray<
  SelectedTransition<
    States,
    E,
    R,
    Machine.HandlerContext<States, Events, Emits, Machine.StateIdentifier<States>, Machine.TagOf<Events[number]>, E, R>
  >
> => {
  const selected: Array<
    SelectedTransition<
      States,
      E,
      R,
      Machine.HandlerContext<
        States,
        Events,
        Emits,
        Machine.StateIdentifier<States>,
        Machine.TagOf<Events[number]>,
        E,
        R
      >
    >
  > = []
  const selectedSources = new Set<string>()
  for (const leaf of getActiveLeafPaths(machine, configuration)) {
    for (const path of getLeafCandidatePaths(machine, leaf)) {
      const transition = normalizeEventTransition(machine.handlers[path]?.on?.[event._tag])
      if (transition !== undefined) {
        if (!selectedSources.has(path)) {
          selectedSources.add(path)
          selected.push({
            sourcePath: path,
            leafPath: leaf,
            transition: transition as unknown as MicrostepTransition<
              States,
              E,
              R,
              Machine.HandlerContext<
                States,
                Events,
                Emits,
                Machine.StateIdentifier<States>,
                Machine.TagOf<Events[number]>,
                E,
                R
              >
            >,
            context: makeTransitionContext<
              States,
              Events,
              Emits,
              Machine.StateIdentifier<States>,
              Machine.TagOf<Events[number]>
            >(machine, configuration, path, event)
          })
        }
        break
      }
    }
  }
  return selected
}

const getTargetNodePath = <const States extends Machine.StateSchemas>(
  target: Machine.Snapshot<States> | Machine.Target<States, Machine.StateIdentifier<States>>
): string => {
  if (isTarget(target)) {
    return String(target.path)
  }
  if (isSnapshot(target)) {
    return String(target.path)
  }
  throw new Error("Machine expected transition target to be a snapshot or target builder result")
}

const hasPathIntersection = (left: ReadonlyArray<string>, right: ReadonlyArray<string>): boolean => {
  for (const path of left) {
    if (right.includes(path)) {
      return true
    }
  }
  return false
}

const sortEvaluatedTransitions = <
  const States extends Machine.StateSchemas,
  Event,
  E,
  R,
  Context
>(
  machine: Machine.Any,
  transitions: Iterable<EvaluatedTransition<States, Event, E, R, Context>>
): ReadonlyArray<EvaluatedTransition<States, Event, E, R, Context>> =>
  Array.from(transitions)
    .sort((left, right) => compareDocumentOrder(machine, left.selection.sourcePath, right.selection.sourcePath))

const removePreemptedAncestorSelections = <
  const States extends Machine.StateSchemas,
  E,
  R,
  Context
>(
  selections: ReadonlyArray<SelectedTransition<States, E, R, Context>>
): ReadonlyArray<SelectedTransition<States, E, R, Context>> =>
  selections.filter((selection) =>
    !selections.some((other) =>
      other.sourcePath !== selection.sourcePath && isDescendantOf(other.sourcePath, selection.sourcePath)
    )
  )

const removeConflictingTransitions = <
  const States extends Machine.StateSchemas,
  Event,
  E,
  R,
  Context
>(
  machine: Machine.Any,
  transitions: ReadonlyArray<EvaluatedTransition<States, Event, E, R, Context>>
): ReadonlyArray<EvaluatedTransition<States, Event, E, R, Context>> => {
  const filtered: Array<EvaluatedTransition<States, Event, E, R, Context>> = []
  for (const transition of sortEvaluatedTransitions(machine, transitions)) {
    let preempted = false
    const transitionsToRemove = new Set<EvaluatedTransition<States, Event, E, R, Context>>()
    for (const selected of filtered) {
      if (hasPathIntersection(transition.exitPaths, selected.exitPaths)) {
        if (isDescendantOf(transition.selection.sourcePath, selected.selection.sourcePath)) {
          transitionsToRemove.add(selected)
        } else {
          preempted = true
          break
        }
      }
    }
    if (!preempted) {
      for (const removed of transitionsToRemove) {
        const index = filtered.indexOf(removed)
        if (index >= 0) {
          filtered.splice(index, 1)
        }
      }
      filtered.push(transition)
    }
  }
  return filtered
}

const collectEvaluatedTransition = Effect.fnUntraced(function*<
  const States extends Machine.StateSchemas,
  Event,
  E,
  R,
  Context
>(
  machine: Machine.Any,
  state: ActiveConfiguration,
  selection: SelectedTransition<States, E, R, Context>
) {
  const stateIdentifier = selection.leafPath
  const transitionResult = yield* collectTransition<States, Event, E, R, Context>(
    machine,
    selection.transition.transition,
    selection.context
  )
  const target = transitionResult.state === undefined
    ? undefined
    : transitionResult.state as
      | Machine.Snapshot<States>
      | Machine.Target<States, Machine.StateIdentifier<States>>
  const targetPath = target === undefined ? undefined : getTargetNodePath(target)
  const stateAfterTransition = target === undefined
    ? state
    : yield* normalizeTargetConfigurationEffect<States>(machine, state, target)
  const changed = selection.transition.reenter || !hasSameActivePaths(state, stateAfterTransition)

  if (!changed) {
    return {
      selection,
      target,
      actions: transitionResult.actions,
      raisedEvents: transitionResult.raisedEvents,
      emittedEvents: transitionResult.emittedEvents,
      changed,
      exitPaths: [],
      entryPaths: []
    } as EvaluatedTransition<States, Event, E, R, Context>
  }

  const boundary = selection.transition.reenter
    ? getNode(machine, selection.sourcePath).parent
    : getLeastCommonAncestor(machine, stateIdentifier, targetPath!)

  return {
    selection,
    target,
    actions: transitionResult.actions,
    raisedEvents: transitionResult.raisedEvents,
    emittedEvents: transitionResult.emittedEvents,
    changed,
    exitPaths: getExitPaths(machine, state, boundary),
    entryPaths: getEntryPaths(machine, stateAfterTransition, boundary)
  } as EvaluatedTransition<States, Event, E, R, Context>
})

const MaxMacrostepIterations = 1000
export const InitialEventTypeId: unique symbol = Symbol("effect/Machine/InitialEvent")
export const InitialEvent: MachineInitialEvent = { _tag: InitialEventTypeId }

const catchStartup = <A, E, R>(
  effect: Effect.Effect<A, E, R>
): Effect.Effect<A, MachineSchemaDecodeError | StartupError, R> =>
  Effect.catchCause(effect, (cause): Effect.Effect<never, MachineSchemaDecodeError | StartupError> => {
    const error = Cause.findErrorOption(cause)
    return Option.isSome(error) && error.value instanceof MachineSchemaDecodeError
      ? Effect.fail(error.value as MachineSchemaDecodeError)
      : Effect.fail(new StartupError({ cause }))
  })

export const isFinalState = (
  machine: Machine.Any,
  state: Machine.Snapshot<any>
): boolean => isActiveFinalConfiguration(machine, normalizeConfiguration(machine, state))

export const getFinalOutputEffect = <
  const States extends Machine.StateSchemas,
  const Events extends ReadonlyArray<Machine.TaggedSchema>,
  Output
>(
  machine: Machine.Any,
  state: Machine.Snapshot<States>,
  event: Machine.LifecycleEvent<Events>
): Effect.Effect<Output | undefined, MachineSchemaDecodeError> =>
  normalizeConfigurationEffect(machine, state).pipe(
    Effect.flatMap((configuration) => completeConfigurationEffect(machine, configuration, event)),
    Effect.map((completed): Output | undefined => {
      const root = getRootPath(machine, completed.configuration)
      return isActiveFinalConfiguration(machine, completed.configuration)
        ? completed.configuration.outputs.get(root) as Output | undefined
        : undefined
    })
  )

export const isFinal = <
  const States extends Machine.StateSchemas,
  const Events extends ReadonlyArray<Machine.TaggedSchema>,
  const Input extends Schema.Top = typeof Schema.Void,
  UnhandledStates extends Machine.StateIdentifier<States> = Machine.StateIdentifier<States>,
  E = never,
  R = never,
  InitialE = never,
  InitialR = never,
  FinalStates extends Machine.StateIdentifier<States> = never
>(
  machine: Machine<States, Events, Input, UnhandledStates, E, R, InitialE, InitialR, FinalStates>,
  state: Machine.Snapshot<States>
): state is Machine.SnapshotContainingFinal<States, FinalStates> => isFinalState(machine, state)

export const planInitial: <
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
  {
    readonly state: Machine.Snapshot<States>
    readonly actions: ReadonlyArray<
      Effect.Effect<void, InitialE | MachineSchemaDecodeError | StartupError, InitialR | R>
    >
    readonly emittedEvents: ReadonlyArray<Machine.EmitOf<Emits>>
    readonly output: Output | undefined
  },
  InitialE | MachineSchemaDecodeError | StartupError,
  ExcludeCompatibleRuntime<InitialR | R, Machine.EventOf<Events>, Machine.EmitOf<Emits>>
> = Effect.fnUntraced(function*<
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
) {
  const deferredActions = yield* makeDeferredActions
  const deferredRaisedEvents = yield* makeDeferredRaisedEvents
  const inputArgs = machine.input === undefined
    ? args
    : args.length === 0
    ? (yield* decodeInput(machine, machine.input, undefined), args)
    : [yield* decodeInput(machine, machine.input, args[0])] as [...Machine.InputArgs<Input>]
  const result = machine.initial(...inputArgs)
  const state = Effect.isEffect(result)
    ? yield* (provideDeferredServices(
      result as Effect.Effect<Machine.Snapshot<States>, InitialE, InitialR>,
      machine,
      deferredActions,
      deferredRaisedEvents
    ) as Effect.Effect<
      Machine.Snapshot<States>,
      InitialE | MachineSchemaDecodeError,
      ExcludeCompatibleRuntime<InitialR, Machine.EventOf<Events>, Machine.EmitOf<Emits>>
    >)
    : result
  const configuration = yield* normalizeConfigurationEffect<States>(machine, state)
  validateInitialConfiguration(machine, configuration)
  const actions = yield* deferredActions.read
  const raisedEvents = yield* deferredRaisedEvents.read
  const emittedEvents = yield* deferredRaisedEvents.readEmitted
  const settled = yield* (catchStartup(Effect.gen(function*() {
    const entry = yield* collectStateActions<States, Events, Emits, E, R>(
      machine,
      configuration,
      getInitialEntryPaths(machine, configuration),
      InitialEvent,
      "entry"
    )
    return yield* (settle(
      machine,
      configuration,
      InitialEvent,
      [...entry.actions] as Array<Effect.Effect<void, E, R>>,
      [...raisedEvents, ...entry.raisedEvents] as Array<Machine.EventOf<Events>>,
      [...emittedEvents, ...entry.emittedEvents],
      []
    ) as Effect.Effect<MacrostepPlan<ActiveConfiguration, Machine.EventOf<Events>, E, R, Output>>)
  })) as Effect.Effect<
    MacrostepPlan<ActiveConfiguration, Machine.EventOf<Events>, E, R, Output>,
    MachineSchemaDecodeError | StartupError,
    ExcludeCompatibleRuntime<R, Machine.EventOf<Events>, Machine.EmitOf<Emits>>
  >)

  return {
    state: snapshotFromConfiguration<States>(machine, settled.next),
    actions: [
      ...actions,
      ...settled.actions
    ] as ReadonlyArray<Effect.Effect<void, InitialE | MachineSchemaDecodeError | StartupError, InitialR | R>>,
    emittedEvents: settled.emittedEvents as ReadonlyArray<Machine.EmitOf<Emits>>,
    output: settled.output
  }
})

export const enabled = <
  const States extends Machine.StateSchemas,
  const Events extends ReadonlyArray<Machine.TaggedSchema>,
  const Input extends Schema.Top = typeof Schema.Void,
  UnhandledStates extends Machine.StateIdentifier<States> = Machine.StateIdentifier<States>,
  E = never,
  R = never
>(
  machine: Machine<States, Events, Input, UnhandledStates, E, R>,
  state: Machine.Snapshot<States>
): ReadonlyArray<Machine.TagOf<Events[number]>> => {
  if (isFinalState(machine, state)) {
    return []
  }
  const configuration = normalizeConfiguration(machine, state)
  const tags: Array<Machine.TagOf<Events[number]>> = []
  const seen = new Set<PropertyKey>()
  for (const path of getCandidatePaths(machine, configuration)) {
    for (const tag of Reflect.ownKeys(machine.handlers[path]?.on ?? {})) {
      if (!seen.has(tag)) {
        seen.add(tag)
        tags.push(tag as Machine.TagOf<Events[number]>)
      }
    }
  }
  return tags
}

const microstep: <
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
  Output = never,
  Context = never
>(
  machine: Machine<States, Events, Input, UnhandledStates, E, R, InitialE, InitialR, FinalStates, Output, Emits>,
  state: ActiveConfiguration,
  event: Machine.LifecycleEvent<Events>,
  selections: ReadonlyArray<SelectedTransition<States, E, R, Context>>
) => Effect.Effect<
  MicrostepPlan<ActiveConfiguration, Machine.EventOf<Events>, E, R>,
  E | MachineSchemaDecodeError | UnhandledEventError,
  R
> = Effect.fnUntraced(function*<
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
  Output = never,
  Context = never
>(
  machine: Machine<States, Events, Input, UnhandledStates, E, R, InitialE, InitialR, FinalStates, Output, Emits>,
  state: ActiveConfiguration,
  event: Machine.LifecycleEvent<Events>,
  selections: ReadonlyArray<SelectedTransition<States, E, R, Context>>
) {
  if (selections.length === 0) {
    return yield* new UnhandledEventError({
      machineId: machine.id,
      state: String(getLeafPath(machine, state)),
      event: String(event._tag)
    })
  }

  const activeSelections = removePreemptedAncestorSelections(selections)
  const evaluatedTransitions: Array<EvaluatedTransition<States, Machine.EventOf<Events>, E, R, Context>> = []
  for (const selection of activeSelections) {
    evaluatedTransitions.push(
      yield* collectEvaluatedTransition<States, Machine.EventOf<Events>, E, R, Context>(
        machine,
        state,
        selection
      )
    )
  }

  const transitions = removeConflictingTransitions(machine, evaluatedTransitions)
  const sortedTransitions = sortEvaluatedTransitions(machine, transitions)
  let stateAfterTransition = state
  for (const transition of sortedTransitions) {
    if (transition.target !== undefined) {
      stateAfterTransition = yield* normalizeTargetConfigurationEffect<States>(
        machine,
        stateAfterTransition,
        transition.target
      )
    }
  }

  const changed = transitions.some((transition) => transition.changed)
  const transitionActions = sortedTransitions
    .flatMap((transition) => transition.actions)
  const transitionRaisedEvents = sortedTransitions
    .flatMap((transition) => transition.raisedEvents)
  const transitionEmittedEvents = sortedTransitions
    .flatMap((transition) => transition.emittedEvents)

  if (!changed) {
    return {
      next: stateAfterTransition,
      event,
      actions: transitionActions,
      raisedEvents: transitionRaisedEvents,
      emittedEvents: transitionEmittedEvents,
      exitPaths: [],
      entryPaths: [],
      changed: false
    }
  }

  const exitPaths = sortExitPaths(machine, sortedTransitions.flatMap((transition) => transition.exitPaths))
  const entryPaths = sortEntryPaths(machine, sortedTransitions.flatMap((transition) => transition.entryPaths))
  const exit = yield* collectStateActions<States, Events, Emits, E, R>(
    machine,
    state,
    exitPaths,
    event,
    "exit"
  )
  const entry = yield* collectStateActions<States, Events, Emits, E, R>(
    machine,
    stateAfterTransition,
    entryPaths,
    event,
    "entry"
  )

  return {
    next: stateAfterTransition,
    event,
    actions: [...exit.actions, ...transitionActions, ...entry.actions] as ReadonlyArray<
      Effect.Effect<void, E, R>
    >,
    raisedEvents: [...exit.raisedEvents, ...transitionRaisedEvents, ...entry.raisedEvents] as ReadonlyArray<
      Machine.EventOf<Events>
    >,
    emittedEvents: [...exit.emittedEvents, ...transitionEmittedEvents, ...entry.emittedEvents],
    exitPaths,
    entryPaths,
    changed: true
  }
})

const settle: <
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
  state: ActiveConfiguration,
  event: Machine.LifecycleEvent<Events>,
  actions: Array<Effect.Effect<void, E, R>>,
  raisedEvents: Array<Machine.EventOf<Events>>,
  emittedEvents: Array<unknown>,
  microsteps: Array<MicrostepPlan<ActiveConfiguration, Machine.EventOf<Events>, E, R>>
) => Effect.Effect<
  MacrostepPlan<ActiveConfiguration, Machine.EventOf<Events>, E, R, Output>,
  E | InfiniteTransitionError | MachineSchemaDecodeError | UnhandledEventError,
  R
> = Effect.fnUntraced(function*<
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
  state: ActiveConfiguration,
  event: Machine.LifecycleEvent<Events>,
  actions: Array<Effect.Effect<void, E, R>>,
  raisedEvents: Array<Machine.EventOf<Events>>,
  emittedEvents: Array<unknown>,
  microsteps: Array<MicrostepPlan<ActiveConfiguration, Machine.EventOf<Events>, E, R>>
) {
  let currentState = state
  let currentEvent = event
  let shouldRunAlways = true
  let iterations = 0
  let raisedEventIndex = 0
  let finalOutput: Output | undefined = undefined
  const pendingCompletions: Array<{ readonly path: string; readonly output: unknown }> = []

  while (true) {
    iterations += 1
    if (iterations > MaxMacrostepIterations) {
      return yield* new InfiniteTransitionError({
        machineId: machine.id,
        state: String(getLeafPath(machine, currentState)),
        maxIterations: MaxMacrostepIterations
      })
    }

    const completed = yield* completeConfigurationEffect(machine, currentState, currentEvent)
    currentState = completed.configuration
    pendingCompletions.push(
      ...completed.completions.filter((completion) => machine.handlers[completion.path]?.onDone !== undefined)
    )
    while (pendingCompletions.length > 0 && !currentState.active.has(pendingCompletions[0].path)) {
      pendingCompletions.shift()
    }
    const done = selectDoneTransitions<States, Events, Emits, E, R>(
      machine,
      currentState,
      currentEvent,
      pendingCompletions.length === 0 ? [] : [pendingCompletions.shift()!]
    )
    if (done.length > 0) {
      const doneStep: MicrostepPlan<ActiveConfiguration, Machine.EventOf<Events>, E, R> = yield* microstep(
        machine,
        currentState,
        currentEvent,
        done
      )
      actions.push(...doneStep.actions)
      raisedEvents.push(...doneStep.raisedEvents)
      emittedEvents.push(...doneStep.emittedEvents)
      microsteps.push(doneStep)
      currentState = doneStep.next
      shouldRunAlways = doneStep.changed
      continue
    }
    if (isActiveFinalConfiguration(machine, currentState)) {
      const root = getRootPath(machine, currentState)
      finalOutput = currentState.outputs.get(root) as Output | undefined
      break
    }

    const always = shouldRunAlways
      ? selectAlwaysTransitions<States, Events, Emits, E, R>(machine, currentState, currentEvent)
      : []
    if (always.length > 0) {
      const alwaysStep: MicrostepPlan<ActiveConfiguration, Machine.EventOf<Events>, E, R> = yield* microstep(
        machine,
        currentState,
        currentEvent,
        always
      )
      actions.push(...alwaysStep.actions)
      raisedEvents.push(...alwaysStep.raisedEvents)
      emittedEvents.push(...alwaysStep.emittedEvents)
      microsteps.push(alwaysStep)
      currentState = alwaysStep.next
      shouldRunAlways = alwaysStep.changed
      continue
    }

    const raisedEventValue = raisedEvents[raisedEventIndex]
    if (raisedEventValue === undefined) {
      break
    }
    raisedEventIndex += 1

    const raisedEvent = yield* decodeEvent<Events>(machine, raisedEventValue)
    currentEvent = raisedEvent
    const raisedStep = yield* microstep(
      machine,
      currentState,
      raisedEvent,
      selectEventTransitions<States, Events, Emits, E, R>(
        machine,
        currentState,
        raisedEvent as Machine.EventByTag<Events, Machine.TagOf<Events[number]>>
      )
    )
    actions.push(...raisedStep.actions)
    raisedEvents.push(...raisedStep.raisedEvents)
    emittedEvents.push(...raisedStep.emittedEvents)
    microsteps.push(raisedStep)
    currentState = raisedStep.next
    shouldRunAlways = true
  }

  return {
    next: currentState,
    actions,
    emittedEvents,
    microsteps,
    output: finalOutput
  }
})

const macrostep: <
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
  state: Machine.Snapshot<States>,
  event: Machine.EventOf<Events>
) => Effect.Effect<
  MacrostepPlan<Machine.Snapshot<States>, Machine.EventOf<Events>, E, R, Output>,
  E | InfiniteTransitionError | MachineSchemaDecodeError | UnhandledEventError,
  R
> = Effect.fnUntraced(function*<
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
  state: Machine.Snapshot<States>,
  event: Machine.EventOf<Events>
) {
  const configuration = yield* normalizeConfigurationEffect<States>(machine, state)
  const snapshot = snapshotFromConfiguration<States>(machine, configuration)
  if (isActiveFinalConfiguration(machine, configuration)) {
    return {
      next: snapshot,
      actions: [],
      emittedEvents: [],
      microsteps: [],
      output: undefined
    }
  }

  const decodedEvent = yield* decodeEvent<Events>(machine, event)
  const step = yield* microstep(
    machine,
    configuration,
    decodedEvent,
    selectEventTransitions<States, Events, Emits, E, R>(
      machine,
      configuration,
      decodedEvent as Machine.EventByTag<Events, Machine.TagOf<Events[number]>>
    )
  )
  const actions = [...step.actions]
  const raisedEvents = [...step.raisedEvents]
  const emittedEvents = [...step.emittedEvents]
  const microsteps = [step]
  const settled = yield* settle(machine, step.next, decodedEvent, actions, raisedEvents, emittedEvents, microsteps)
  return {
    next: snapshotFromConfiguration<States>(machine, settled.next),
    actions: settled.actions,
    emittedEvents: settled.emittedEvents,
    microsteps: settled.microsteps.map((step) => ({
      next: snapshotFromConfiguration<States>(machine, step.next),
      event: step.event,
      actions: step.actions,
      raisedEvents: step.raisedEvents,
      emittedEvents: step.emittedEvents,
      exitPaths: step.exitPaths,
      entryPaths: step.entryPaths,
      changed: step.changed
    })),
    output: settled.output
  }
})

export const plan = macrostep

const actionUnsafe = Effect.fnUntraced(function*<E, R>(
  effect: Effect.Effect<void, E, R>
) {
  const actions = yield* DeferredActions
  yield* actions.add(effect)
})

/**
 * Defers an effectful action until the current machine step is planned.
 *
 * @category combinators
 * @since 4.0.0
 */
export const action = <E, R>(
  effect: Effect.Effect<void, E, R>
): Effect.Effect<void, never, ActionRequirement<E, R>> =>
  actionUnsafe(effect) as unknown as Effect.Effect<void, never, ActionRequirement<E, R>>

/**
 * Returns the typed runtime capability for the current machine.
 *
 * @category combinators
 * @since 4.0.0
 */
export const runtime = <const Protocol extends Runtime.Protocol = {}>(): Effect.Effect<
  Runtime<Runtime.Events<Protocol>, Runtime.Emits<Protocol>>,
  never,
  Runtime.Requirement<Runtime.Events<Protocol>, Runtime.Emits<Protocol>>
> =>
  RuntimeContext as unknown as Effect.Effect<
    Runtime<Runtime.Events<Protocol>, Runtime.Emits<Protocol>>,
    never,
    Runtime.Requirement<Runtime.Events<Protocol>, Runtime.Emits<Protocol>>
  >
