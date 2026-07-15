/**
 * Atom bridge for running machines.
 *
 * @since 4.0.0
 */

import * as Effect from "../../Effect.ts"
import type * as Schema from "../../Schema.ts"
import type * as Scope from "../../Scope.ts"
import * as Stream from "../../Stream.ts"
import * as Machine from "../machine/Machine.ts"
import * as AsyncResult from "./AsyncResult.ts"
import * as Atom from "./Atom.ts"
import type * as AtomRegistry from "./AtomRegistry.ts"

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
   * Writable atom that sends events to the machine.
   *
   * @since 4.0.0
   */
  readonly send: Atom.Writable<AsyncResult.AsyncResult<void, StartError | Machine.StoppedError>, Event>

  /**
   * Writable atom that stops the machine.
   *
   * @since 4.0.0
   */
  readonly stop: Atom.Writable<AsyncResult.AsyncResult<void, StartError>, void>
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

  const send = Atom.writable<AsyncResult.AsyncResult<void, StartError | Machine.StoppedError>, Event>(
    (get) => AsyncResult.map(get(ref), () => undefined),
    (ctx, event: Event) => {
      const result = ctx.get(ref)
      if (AsyncResult.isSuccess(result)) {
        Effect.runCallback(result.value.send(event), {
          onExit: (exit) =>
            ctx.setSelf(
              AsyncResult.fromExit(exit)
            )
        })
      }
    }
  )

  const stop = Atom.writable<AsyncResult.AsyncResult<void, StartError>, void>(
    (get) => AsyncResult.map(get(ref), () => undefined),
    (ctx) => {
      const result = ctx.get(ref)
      if (AsyncResult.isSuccess(result)) {
        Effect.runCallback(result.value.stop)
      }
    }
  )

  return {
    ref,
    snapshot,
    state: Atom.mapResult(snapshot, (snapshot) => snapshot.state),
    send,
    stop
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
