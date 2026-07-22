/**
 * Atom bridge for running machines.
 *
 * @since 4.0.0
 */

import * as Data from "../../Data.ts"
import * as Effect from "../../Effect.ts"
import * as Option from "../../Option.ts"
import type * as Schema from "../../Schema.ts"
import type * as Scope from "../../Scope.ts"
import * as Stream from "../../Stream.ts"
import * as Machine from "../machine/Machine.ts"
import * as AsyncResult from "./AsyncResult.ts"
import * as Atom from "./Atom.ts"
import type * as AtomRegistry from "./AtomRegistry.ts"

/**
 * Error returned when a machine command is issued before startup completes.
 *
 * @category errors
 * @since 4.0.0
 */
export class NotReadyError extends Data.TaggedError("NotReadyError") {}

/**
 * Error returned when a command targets a child machine that is not active.
 *
 * @category errors
 * @since 4.0.0
 */
export class ChildNotActiveError extends Data.TaggedError("ChildNotActiveError")<{
  readonly id: string
}> {}

type AtomSupportedRequirements = Scope.Scope | AtomRegistry.AtomRegistry

type ExternalRequirements<Requirements> = Exclude<Requirements, AtomSupportedRequirements>

const ExternalRequirementsTypeId = "~effect/reactivity/AtomMachine/ExternalRequirements"

type EnsureNoExternalRequirements<Requirements> = [ExternalRequirements<Requirements>] extends [never] ? unknown : {
  readonly [ExternalRequirementsTypeId]: ExternalRequirements<Requirements>
}

type IsAny<A> = 0 extends (1 & A) ? true : false

type ExcludeCompatibleMachineRuntime<Requirements, Events, Emits> = Requirements extends
  Machine.Runtime.Requirement<infer RequiredEvents, infer RequiredEmits> ?
  IsAny<Requirements> extends true ? Requirements
  : [RequiredEvents] extends [Events] ? [RequiredEmits] extends [Emits] ? never : Requirements
  : Requirements
  : Requirements

type MachineRequirements<InitialR, R, Events, Emits> = ExcludeCompatibleMachineRuntime<
  Machine.ExecutionServices<InitialR | R>,
  Events,
  Emits
>

const startMachineAtomEffect = <
  const States extends Machine.Machine.StateSchemas,
  const Events extends ReadonlyArray<Machine.Machine.TaggedSchema>,
  const Emits extends ReadonlyArray<Machine.Machine.TaggedSchema> = any,
  const Input extends Schema.Top = typeof Schema.Void,
  UnhandledStates extends Machine.Machine.StateIdentifier<States> = Machine.Machine.StateIdentifier<States>,
  E = never,
  R = never,
  InitialE = never,
  InitialR = never,
  FinalStates extends Machine.Machine.StateIdentifier<States> = never,
  Output = never
>(
  get: Atom.AtomContext,
  machine: Machine.Machine<
    States,
    Events,
    Input,
    UnhandledStates,
    E,
    R,
    InitialE,
    InitialR,
    FinalStates,
    Output,
    Emits
  >,
  args: [...Machine.Machine.InputArgs<Input>]
): Effect.Effect<
  Machine.MachineRef<
    Machine.Machine.Snapshot<States>,
    Machine.Machine.EventOf<Events>,
    | E
    | Machine.ActionError<InitialR | R>
    | Machine.InfiniteTransitionError
    | Machine.MachineSchemaDecodeError
    | Machine.StartupError
    | Machine.StoppedError
    | Machine.UnhandledEventError
    | InitialE,
    Output | undefined
  >,
  | InitialE
  | Machine.ActionError<InitialR | R>
  | Machine.MachineSchemaDecodeError
  | Machine.StartupError
  | Machine.StoppedError,
  MachineRequirements<InitialR, R, Machine.Machine.EventOf<Events>, Machine.Machine.EmitOf<Emits>>
> =>
  Effect.scoped(
    Effect.acquireRelease(
      Machine.start(machine, ...args),
      (ref) => ref.stop
    ).pipe(
      Effect.tap((ref) => Effect.sync(() => get.setSelf(AsyncResult.success(ref)))),
      Effect.flatMap(() => Effect.never)
    )
  )

/**
 * Atoms backed by one running machine instance in an `AtomRegistry`.
 *
 * **Details**
 *
 * The machine starts when one of the returned atoms is mounted or read in
 * a registry, and it is stopped when the registry disposes the ref atom. The
 * same atom values share one running machine per registry.
 *
 * @category models
 * @since 4.0.0
 */
export interface MachineAtom<State, Event, Error = never, Output = never, StartError = never> {
  /**
   * Atom containing the running machine handle once startup succeeds.
   *
   * @since 4.0.0
   */
  readonly ref: Atom.Atom<
    AsyncResult.AsyncResult<Machine.MachineRef<State, Event, Error, Output>, StartError>
  >

  /**
   * Atom containing the latest machine lifecycle snapshot.
   *
   * @since 4.0.0
   */
  readonly snapshot: Atom.Atom<
    AsyncResult.AsyncResult<Machine.RuntimeSnapshot<State, Error, Output>, StartError>
  >

  /**
   * Atom containing the state value from the latest runtime snapshot.
   *
   * @since 4.0.0
   */
  readonly state: Atom.Atom<AsyncResult.AsyncResult<State, StartError>>

  /**
   * Writable atom that sends events to the machine. Writes before startup
   * completes fail with `NotReadyError`.
   *
   * @since 4.0.0
   */
  readonly send: Atom.Writable<
    AsyncResult.AsyncResult<void, StartError | NotReadyError | Machine.StoppedError>,
    Event
  >

  /**
   * Writable atom that stops the machine. Writes before startup completes fail
   * with `NotReadyError`.
   *
   * @since 4.0.0
   */
  readonly stop: Atom.Writable<AsyncResult.AsyncResult<void, StartError | NotReadyError>, void>

  /**
   * Creates a reactive bridge for a directly invoked child machine.
   *
   * @since 4.0.0
   */
  readonly child: <Child extends Machine.ChildMachine.Any>(
    child: Child
  ) => ChildMachineAtom<Child, StartError>
}

type RefState<Ref> = Ref extends Machine.MachineRef<infer State, any, any, any> ? State : never
type RefError<Ref> = Ref extends Machine.MachineRef<any, any, infer Error, any> ? Error : never
type RefOutput<Ref> = Ref extends Machine.MachineRef<any, any, any, infer Output> ? Output : never

/**
 * Reactive access to one invoked child machine selected by its descriptor.
 *
 * **Details**
 *
 * Each atom contains `Option.none()` while the state that owns the invocation
 * is inactive or while the child is starting. It contains `Option.some(...)`
 * for the current child instance and follows replacements after re-entry.
 *
 * **Gotchas**
 *
 * Lookup is direct-child scoped. Use `child` again on this bridge to reach a
 * machine invoked by the selected child.
 *
 * @category models
 * @since 4.0.0
 */
export interface ChildMachineAtom<Child extends Machine.ChildMachine.Any, StartError = never> {
  /** Atom containing the current child reference when the child is active. */
  readonly ref: Atom.Atom<
    AsyncResult.AsyncResult<Option.Option<Machine.ChildMachine.Ref<Child>>, StartError>
  >
  /** Atom containing the current child lifecycle snapshot when active. */
  readonly snapshot: Atom.Atom<
    AsyncResult.AsyncResult<
      Option.Option<
        Machine.RuntimeSnapshot<
          RefState<Machine.ChildMachine.Ref<Child>>,
          RefError<Machine.ChildMachine.Ref<Child>>,
          RefOutput<Machine.ChildMachine.Ref<Child>>
        >
      >,
      StartError
    >
  >
  /** Atom containing the current child state when active. */
  readonly state: Atom.Atom<
    AsyncResult.AsyncResult<Option.Option<RefState<Machine.ChildMachine.Ref<Child>>>, StartError>
  >
  /** Writable atom that sends events to the active child. */
  readonly send: Atom.Writable<
    AsyncResult.AsyncResult<void, StartError | NotReadyError | ChildNotActiveError | Machine.StoppedError>,
    Machine.ChildMachine.Event<Child>
  >
  /** Writable atom that stops the active child. */
  readonly stop: Atom.Writable<
    AsyncResult.AsyncResult<void, StartError | NotReadyError | ChildNotActiveError>,
    void
  >
  /** Creates a reactive bridge for a directly owned nested child. */
  readonly child: <Nested extends Machine.ChildMachine.Any>(
    child: Nested
  ) => ChildMachineAtom<Nested, StartError>
}

const makeChildRefAtom = <Child extends Machine.ChildMachine.Any, StartError>(
  parentRef: Atom.Atom<
    AsyncResult.AsyncResult<Option.Option<Machine.MachineRef<any, any, any, any>>, StartError>
  >,
  child: Child
): Atom.Atom<AsyncResult.AsyncResult<Option.Option<Machine.ChildMachine.Ref<Child>>, StartError>> =>
  Atom.readable((get) => {
    const parent = get(parentRef)
    if (AsyncResult.isInitial(parent)) {
      return AsyncResult.initial(parent.waiting)
    } else if (AsyncResult.isFailure(parent)) {
      return AsyncResult.failureWithPrevious(parent.cause, {
        previous: get.self(),
        waiting: parent.waiting
      })
    } else if (Option.isNone(parent.value)) {
      return AsyncResult.success(Option.none())
    }

    const handle = parent.value.value
    const current = Effect.runSync(handle.child(child))
    const cancel = Effect.runCallback(
      Effect.yieldNow.pipe(
        Effect.andThen(
          handle.childChanges(child).pipe(
            Stream.runForEach((ref) => Effect.sync(() => get.setSelf(AsyncResult.success(ref))))
          )
        )
      )
    )
    get.addFinalizer(cancel)
    return AsyncResult.success(current)
  })

const makeChildFromRefAtom = <Child extends Machine.ChildMachine.Any, StartError>(
  ref: Atom.Atom<AsyncResult.AsyncResult<Option.Option<Machine.ChildMachine.Ref<Child>>, StartError>>,
  descriptor: Child
): ChildMachineAtom<Child, StartError> => {
  type Ref = Machine.ChildMachine.Ref<Child>
  type State = RefState<Ref>
  type Error = RefError<Ref>
  type Output = RefOutput<Ref>

  const snapshot = Atom.readable((get): AsyncResult.AsyncResult<
    Option.Option<Machine.RuntimeSnapshot<State, Error, Output>>,
    StartError
  > => {
    const result = get(ref)
    if (AsyncResult.isInitial(result)) {
      return AsyncResult.initial(result.waiting)
    } else if (AsyncResult.isFailure(result)) {
      return AsyncResult.failureWithPrevious(result.cause, {
        previous: get.self(),
        waiting: result.waiting
      })
    } else if (Option.isNone(result.value)) {
      return AsyncResult.success(Option.none())
    }

    const handle = result.value.value as unknown as Machine.MachineRef<State, any, Error, Output>
    const cancel = Effect.runCallback(
      handle.changes.pipe(
        Stream.runForEach((snapshot) => Effect.sync(() => get.setSelf(AsyncResult.success(Option.some(snapshot)))))
      )
    )
    get.addFinalizer(cancel)
    return AsyncResult.success(Option.some(Effect.runSync(handle.snapshot)))
  })

  const send = Atom.writable<
    AsyncResult.AsyncResult<void, StartError | NotReadyError | ChildNotActiveError | Machine.StoppedError>,
    Machine.ChildMachine.Event<Child>
  >(
    (get) => AsyncResult.map(get(ref), () => undefined),
    (ctx, event) => {
      const result = ctx.get(ref)
      if (AsyncResult.isInitial(result)) {
        ctx.setSelf(AsyncResult.fail(new NotReadyError()))
      } else if (AsyncResult.isFailure(result)) {
        ctx.setSelf(AsyncResult.map(result, () => undefined))
      } else if (Option.isNone(result.value)) {
        ctx.setSelf(AsyncResult.fail(new ChildNotActiveError({ id: descriptor.id })))
      } else {
        Effect.runCallback(result.value.value.send(event), {
          onExit: (exit) => ctx.setSelf(AsyncResult.fromExit(exit))
        })
      }
    }
  )

  const stop = Atom.writable<
    AsyncResult.AsyncResult<void, StartError | NotReadyError | ChildNotActiveError>,
    void
  >(
    (get) => AsyncResult.map(get(ref), () => undefined),
    (ctx) => {
      const result = ctx.get(ref)
      if (AsyncResult.isInitial(result)) {
        ctx.setSelf(AsyncResult.fail(new NotReadyError()))
      } else if (AsyncResult.isFailure(result)) {
        ctx.setSelf(AsyncResult.map(result, () => undefined))
      } else if (Option.isNone(result.value)) {
        ctx.setSelf(AsyncResult.fail(new ChildNotActiveError({ id: descriptor.id })))
      } else {
        Effect.runCallback(result.value.value.stop)
      }
    }
  )

  return {
    ref,
    snapshot,
    state: Atom.mapResult(snapshot, Option.map((snapshot) => snapshot.state)),
    send,
    stop,
    child: (nested) => makeChildFromRefAtom(makeChildRefAtom(ref as any, nested), nested)
  }
}

const makeFromRefAtom = <State, Event, Error, Output, StartError>(
  ref: Atom.Atom<AsyncResult.AsyncResult<Machine.MachineRef<State, Event, Error, Output>, StartError>>
): MachineAtom<State, Event, Error, Output, StartError> => {
  const snapshot = Atom.readable((
    get
  ): AsyncResult.AsyncResult<Machine.RuntimeSnapshot<State, Error, Output>, StartError> => {
    const result = get(ref)
    if (AsyncResult.isInitial(result)) {
      return AsyncResult.initial(result.waiting)
    } else if (AsyncResult.isFailure(result)) {
      return AsyncResult.failureWithPrevious(result.cause, {
        previous: get.self<AsyncResult.AsyncResult<Machine.RuntimeSnapshot<State, Error, Output>, StartError>>(),
        waiting: result.waiting
      })
    }

    const handle = result.value
    const cancel = Effect.runCallback(
      handle.changes.pipe(
        Stream.runForEach((snapshot) =>
          Effect.sync(() =>
            get.setSelf(
              AsyncResult.success(snapshot, {
                waiting: snapshot.status === "active"
              })
            )
          )
        )
      )
    )
    get.addFinalizer(cancel)

    const current = Effect.runSync(handle.snapshot)
    return AsyncResult.success(current, {
      waiting: current.status === "active"
    })
  })

  const send = Atom.writable<
    AsyncResult.AsyncResult<void, StartError | NotReadyError | Machine.StoppedError>,
    Event
  >(
    (get) => AsyncResult.map(get(ref), () => undefined),
    (ctx, event: Event) => {
      const result = ctx.get(ref)
      if (AsyncResult.isInitial(result)) {
        ctx.setSelf(AsyncResult.fail(new NotReadyError()))
      } else if (AsyncResult.isFailure(result)) {
        ctx.setSelf(AsyncResult.map(result, () => undefined))
      } else {
        Effect.runCallback(result.value.send(event), {
          onExit: (exit) =>
            ctx.setSelf(
              AsyncResult.fromExit(exit)
            )
        })
      }
    }
  )

  const stop = Atom.writable<AsyncResult.AsyncResult<void, StartError | NotReadyError>, void>(
    (get) => AsyncResult.map(get(ref), () => undefined),
    (ctx) => {
      const result = ctx.get(ref)
      if (AsyncResult.isInitial(result)) {
        ctx.setSelf(AsyncResult.fail(new NotReadyError()))
      } else if (AsyncResult.isFailure(result)) {
        ctx.setSelf(AsyncResult.map(result, () => undefined))
      } else {
        Effect.runCallback(result.value.stop)
      }
    }
  )

  return {
    ref,
    snapshot,
    state: Atom.mapResult(snapshot, (snapshot) => snapshot.state),
    send,
    stop,
    child: (child) => {
      const optionalRef = Atom.mapResult(ref, Option.some)
      return makeChildFromRefAtom(makeChildRefAtom(optionalRef as any, child), child)
    }
  }
}

/**
 * Creates atoms backed by a running machine.
 *
 * @category constructors
 * @since 4.0.0
 */
export const make: {
  <
    const States extends Machine.Machine.StateSchemas,
    const Events extends ReadonlyArray<Machine.Machine.TaggedSchema>,
    const Emits extends ReadonlyArray<Machine.Machine.TaggedSchema> = any,
    const Input extends Schema.Top = typeof Schema.Void,
    UnhandledStates extends Machine.Machine.StateIdentifier<States> = Machine.Machine.StateIdentifier<States>,
    E = never,
    R = never,
    InitialE = never,
    InitialR = never,
    FinalStates extends Machine.Machine.StateIdentifier<States> = never,
    Output = never
  >(
    machine:
      & Machine.Machine<
        States,
        Events,
        Input,
        UnhandledStates,
        E,
        R,
        InitialE,
        InitialR,
        FinalStates,
        Output,
        Emits
      >
      & EnsureNoExternalRequirements<
        MachineRequirements<
          InitialR,
          R,
          Machine.Machine.EventOf<Events>,
          Machine.Machine.EmitOf<Emits>
        >
      >,
    ...args: [...Machine.Machine.InputArgs<Input>]
  ): MachineAtom<
    Machine.Machine.Snapshot<States>,
    Machine.Machine.EventOf<Events>,
    | E
    | Machine.ActionError<InitialR | R>
    | Machine.InfiniteTransitionError
    | Machine.MachineSchemaDecodeError
    | Machine.StartupError
    | Machine.StoppedError
    | Machine.UnhandledEventError
    | InitialE,
    Output | undefined,
    | InitialE
    | Machine.ActionError<InitialR | R>
    | Machine.MachineSchemaDecodeError
    | Machine.StartupError
    | Machine.StoppedError
  >
  <
    RuntimeError,
    const States extends Machine.Machine.StateSchemas,
    const Events extends ReadonlyArray<Machine.Machine.TaggedSchema>,
    const Emits extends ReadonlyArray<Machine.Machine.TaggedSchema> = any,
    const Input extends Schema.Top = typeof Schema.Void,
    UnhandledStates extends Machine.Machine.StateIdentifier<States> = Machine.Machine.StateIdentifier<States>,
    E = never,
    R = never,
    InitialE = never,
    InitialR = never,
    FinalStates extends Machine.Machine.StateIdentifier<States> = never,
    Output = never
  >(
    runtime: Atom.AtomRuntime<
      ExternalRequirements<
        MachineRequirements<
          InitialR,
          R,
          Machine.Machine.EventOf<Events>,
          Machine.Machine.EmitOf<Emits>
        >
      >,
      RuntimeError
    >,
    machine: Machine.Machine<
      States,
      Events,
      Input,
      UnhandledStates,
      E,
      R,
      InitialE,
      InitialR,
      FinalStates,
      Output,
      Emits
    >,
    ...args: [...Machine.Machine.InputArgs<Input>]
  ): MachineAtom<
    Machine.Machine.Snapshot<States>,
    Machine.Machine.EventOf<Events>,
    | E
    | Machine.ActionError<InitialR | R>
    | Machine.InfiniteTransitionError
    | Machine.MachineSchemaDecodeError
    | Machine.StartupError
    | Machine.StoppedError
    | Machine.UnhandledEventError
    | InitialE,
    Output | undefined,
    | InitialE
    | Machine.ActionError<InitialR | R>
    | Machine.MachineSchemaDecodeError
    | Machine.StartupError
    | Machine.StoppedError
    | RuntimeError
  >
} = ((...args: ReadonlyArray<any>) => {
  const runtimeOrMachine = args[0] as Atom.AtomRuntime<any, any> | Machine.Machine.Any
  if (Machine.isMachine(runtimeOrMachine)) {
    const machine = runtimeOrMachine
    const input = args.slice(1) as []
    const ref = Atom.make((get) => startMachineAtomEffect(get, machine, input))
    return makeFromRefAtom(ref as any)
  }

  const runtime = runtimeOrMachine
  const machine = args[1] as Machine.Machine.Any
  const input = args.slice(2) as []
  const ref = runtime.atom((get) => startMachineAtomEffect(get, machine, input))
  return makeFromRefAtom(ref as any)
}) as any
