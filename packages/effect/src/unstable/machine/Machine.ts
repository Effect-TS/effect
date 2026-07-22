/**
 * Schema-first machine definitions.
 *
 * @since 4.0.0
 */

import type * as Cause from "../../Cause.ts"
import * as Effect from "../../Effect.ts"
import { PipeInspectableProto } from "../../internal/core.ts"
import * as Option from "../../Option.ts"
import type { Pipeable } from "../../Pipeable.ts"
import { hasProperty } from "../../Predicate.ts"
import type * as Schema from "../../Schema.ts"
import type * as Scope from "../../Scope.ts"
import type * as Stream from "../../Stream.ts"
import type * as Types from "../../Types.ts"
import type {
  ChildAlreadyExistsError,
  InfiniteTransitionError,
  MachineSchemaDecodeError,
  MachineSchemaEncodeError,
  ProcessLocalError,
  StartupError,
  StoppedError,
  UnhandledEventError
} from "./internal/machineErrors.ts"
import { ProcessLocalError as ProcessLocalErrorValue } from "./internal/machineErrors.ts"
import * as Model from "./internal/machineModel.ts"
import * as internalPlanner from "./internal/machinePlanner.ts"
import * as internalProcess from "./internal/machineProcess.ts"
import * as internalRuntime from "./internal/machineRuntime.ts"

/**
 * String literal type used as the runtime type identifier for `Machine`
 * values.
 *
 * @category type IDs
 * @since 4.0.0
 */
export type TypeId = "~effect/Machine"

/**
 * Runtime type identifier attached to `Machine` values.
 *
 * @category type IDs
 * @since 4.0.0
 */
export const TypeId: TypeId = "~effect/Machine"

/**
 * Type identifier used for the synthetic event passed to startup lifecycle
 * actions.
 *
 * @category type IDs
 * @since 4.0.0
 */
export const InitialEventTypeId: typeof internalPlanner.InitialEventTypeId = internalPlanner.InitialEventTypeId

/**
 * Synthetic event passed to entry, exit, always, invoke, and output callbacks
 * that run while the machine is settling its initial state.
 *
 * @category models
 * @since 4.0.0
 */
export interface InitialEvent {
  readonly _tag: typeof InitialEventTypeId
}

/**
 * Synthetic event value used while the machine settles its initial state.
 *
 * @category constructors
 * @since 4.0.0
 */
export const InitialEvent: InitialEvent = internalPlanner.InitialEvent

/**
 * Returns `true` if a value is the synthetic machine initial event.
 *
 * @category guards
 * @since 4.0.0
 */
export const isInitialEvent = (u: unknown): u is InitialEvent => hasProperty(u, "_tag") && u._tag === InitialEventTypeId

type IsAny<A> = 0 extends (1 & A) ? true : false

/**
 * A schema-first machine definition.
 *
 * **Details**
 *
 * Machines support atomic, compound, parallel, and final states together with
 * completion transitions, eventless transitions, raised events, actions,
 * spawned children, and state-scoped invokes. Schemas validate machine
 * boundaries while preserving decoded state, event, output, error, and service
 * types throughout planning and execution.
 *
 * **Gotchas**
 *
 * History states, delayed transitions, and declarative first-class guards are
 * not part of the current API. Conditional behavior can be expressed in typed
 * handlers with ordinary TypeScript control flow.
 *
 * @category models
 * @since 4.0.0
 */
export interface Machine<
  States extends Machine.StateSchemas,
  Events extends ReadonlyArray<Machine.TaggedSchema>,
  Input extends Schema.Top = typeof Schema.Void,
  UnhandledStates extends Machine.StateIdentifier<States> = Machine.StateIdentifier<States>,
  E = never,
  R = never,
  InitialE = never,
  InitialR = never,
  FinalStates extends Machine.StateIdentifier<States> = never,
  Output = never,
  Emits extends ReadonlyArray<Machine.TaggedSchema> = readonly [],
  OutputStates extends Machine.StateIdentifier<States> = never
> extends Pipeable {
  readonly [TypeId]: TypeId
  readonly states: States
  readonly events: Events
  readonly emits: Emits
  readonly input: Input | undefined
  readonly id: string | undefined

  /** @internal */
  readonly stateNodes: Machine.StateNodes

  /** @internal */
  readonly makeTargetBuilder: <Source extends Machine.StateIdentifier<States>>(
    source: Source
  ) => Machine.TargetBuilder<States, Source>

  readonly handlers: Machine.StateConfigs<States, Events, Emits, UnhandledStates, Machine.TagOf<Events[number]>, E, R>
  readonly handle: Machine.Handler<
    States,
    Events,
    Emits,
    Input,
    UnhandledStates,
    E,
    R,
    InitialE,
    InitialR,
    FinalStates,
    Output,
    OutputStates
  >

  /** @internal */
  readonly initial: (...args: [...Machine.InputArgs<Input>]) => Machine.InitialResult<States, InitialE, InitialR>
}

export {
  /**
   * Error returned by `spawn` when a child process with the same id already
   * exists for the current machine.
   *
   * @category errors
   * @since 4.0.0
   */
  ChildAlreadyExistsError,
  /**
   * Error returned when a machine does not stabilize within the maximum
   * number of macrostep iterations.
   *
   * @category errors
   * @since 4.0.0
   */
  InfiniteTransitionError,
  /**
   * Error returned when a machine contract value does not match the schema or
   * structural configuration declared for a machine boundary.
   *
   * @category errors
   * @since 4.0.0
   */
  MachineSchemaDecodeError,
  /**
   * Error returned when a decoded machine snapshot cannot be encoded through
   * its declared state or output schemas.
   *
   * @category errors
   * @since 4.0.0
   */
  MachineSchemaEncodeError,
  /**
   * Error returned when standalone action execution attempts an operation that
   * requires a managed machine process.
   *
   * @category errors
   * @since 4.0.0
   */
  ProcessLocalError,
  /**
   * Error returned when a machine fails while running startup lifecycle
   * logic after the initial state has been computed.
   *
   * @category errors
   * @since 4.0.0
   */
  StartupError,
  /**
   * Error returned by `join` when a running machine is stopped before
   * producing an output.
   *
   * @category errors
   * @since 4.0.0
   */
  StoppedError,
  /**
   * Error returned when an event has no handler for the current state.
   *
   * @category errors
   * @since 4.0.0
   */
  UnhandledEventError
} from "./internal/machineErrors.ts"

const RuntimeRequirementTypeId = "~effect/Machine/RuntimeRequirement"
const ActionRequirementTypeId = "~effect/Machine/ActionRequirement"
type MachineRuntimeRequirement = internalRuntime.MachineRuntime

/**
 * Opaque marker used to keep staged action errors and services separate from
 * the Effect that plans a machine step.
 *
 * @category services
 * @since 4.0.0
 */
export interface ActionRequirement<Error, Requirements> {
  readonly [ActionRequirementTypeId]: {
    readonly error: Types.Covariant<Error>
    readonly requirements: Types.Covariant<Requirements>
  }
}

/**
 * Extracts the typed error channel of staged machine actions.
 *
 * @category utility types
 * @since 4.0.0
 */
export type ActionError<Requirements> = Requirements extends ActionRequirement<infer Error, any> ? Error : never

/**
 * Extracts the service requirements of staged machine actions.
 *
 * @category utility types
 * @since 4.0.0
 */
export type ActionServices<Requirements> = Requirements extends ActionRequirement<any, infer Services> ? Services
  : never

/**
 * Removes staged action requirements from machine planning services.
 *
 * @category utility types
 * @since 4.0.0
 */
export type PlanningServices<Requirements> = Exclude<Requirements, ActionRequirement<any, any>>

/**
 * Resolves all services needed to execute a machine at runtime.
 *
 * @category utility types
 * @since 4.0.0
 */
export type ExecutionServices<Requirements> =
  | Exclude<PlanningServices<Requirements>, MachineRuntimeRequirement>
  | Exclude<ActionServices<Requirements>, MachineRuntimeRequirement>

/**
 * Runtime capability available to machine actions.
 *
 * @category models
 * @since 4.0.0
 */
export interface Runtime<in Events, in Emits> {
  readonly raise: (event: Events) => Effect.Effect<void, MachineSchemaDecodeError | StoppedError>
  readonly sendParent: (event: Emits) => Effect.Effect<void, MachineSchemaDecodeError | StoppedError>
}

/**
 * Namespace containing type-level members associated with `Runtime`.
 *
 * @since 4.0.0
 */
export declare namespace Runtime {
  /**
   * Protocol annotation accepted by {@link runtime}.
   *
   * @category models
   * @since 4.0.0
   */
  export interface Protocol {
    readonly events?: unknown
    readonly emits?: unknown
  }

  /**
   * Extracts the events required by a runtime protocol annotation.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type Events<Protocol> = Protocol extends { readonly events: infer Events } ? Events : never

  /**
   * Extracts the emitted events required by a runtime protocol annotation.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type Emits<Protocol> = Protocol extends { readonly emits: infer Emits } ? Emits : never

  /**
   * Opaque service requirement for a machine runtime capability.
   *
   * @category services
   * @since 4.0.0
   */
  export interface Requirement<Events, Emits> {
    readonly [RuntimeRequirementTypeId]: {
      readonly events: Events
      readonly emits: Emits
    }
  }
}

type ExcludeCompatibleRuntime<Requirements, Events, Emits> = Requirements extends Runtime.Requirement<
  infer RequiredEvents,
  infer RequiredEmits
> ? IsAny<Requirements> extends true ? Requirements
  : [RequiredEvents] extends [Events] ? [RequiredEmits] extends [Emits] ? never : Requirements
  : Requirements
  : Requirements

type IncompatibleRuntime<Requirements, Events, Emits> = Requirements extends Runtime.Requirement<
  infer RequiredEvents,
  infer RequiredEmits
> ? IsAny<Requirements> extends true ? never
  : [RequiredEvents] extends [Events] ? [RequiredEmits] extends [Emits] ? never : Requirements
  : Requirements
  : never

const RuntimeCompatibilityErrorTypeId = "~effect/Machine/RuntimeCompatibilityError"
const InvokeTypeId: unique symbol = Symbol.for("effect/Machine/Invoke")

type EnsureCompatibleRuntime<Requirements, Events, Emits> = [IncompatibleRuntime<Requirements, Events, Emits>] extends
  [never] ? unknown : {
  readonly [RuntimeCompatibilityErrorTypeId]: IncompatibleRuntime<Requirements, Events, Emits>
}

type StateDefinitionError<Message extends string> = {
  readonly "~effect/Machine/DefinitionError": Message
}

type ValidateStateTree<States extends Machine.StateSchemas> = {
  readonly [Key in keyof States]: ValidateStateNode<States[Key]>
}

type ValidateStateNode<Node> = Node extends Machine.TaggedSchema ? unknown
  : Node extends { readonly schema: Machine.TaggedSchema } ? ValidateStateNodeConfig<Node>
  : StateDefinitionError<"State nodes must be tagged schemas or state node configs">

type ValidateStateNodeConfig<Node extends { readonly schema: Machine.TaggedSchema }> = Node extends
  { readonly states: infer Children } ? ValidateStateNodeWithChildren<Node, Children>
  : ValidateStateNodeWithoutChildren<Node>

type ValidateOutputSchema<Node> = "output" extends keyof Node ? Node extends { readonly output: Schema.Top } ? unknown
  : StateDefinitionError<"State output must be a schema">
  : unknown

type ValidateStateNodeWithChildren<
  Node extends { readonly schema: Machine.TaggedSchema },
  Children
> = Children extends Machine.StateSchemas ?
  Node extends { readonly type: "final" } ? StateDefinitionError<"Final states cannot declare child states">
  : Node extends { readonly type: "parallel" } ?
    "initial" extends keyof Node ? StateDefinitionError<"Parallel states cannot declare an initial child">
    : { readonly states: ValidateStateTree<Children> } & ValidateOutputSchema<Node>
  : "output" extends keyof Node ? StateDefinitionError<"Only final and parallel states can declare output">
  : ValidateCompoundStateNode<Node, Children>
  : StateDefinitionError<"Child states must be a state tree">

type ValidateCompoundStateNode<
  Node extends { readonly schema: Machine.TaggedSchema },
  Children extends Machine.StateSchemas
> = Node extends { readonly initial: infer Initial } ? Initial extends Extract<keyof Children, string> ? {
      readonly states: ValidateStateTree<Children>
    }
  : StateDefinitionError<"Compound initial must be one of its direct child keys">
  : StateDefinitionError<"Compound states must declare an initial child">

type ValidateStateNodeWithoutChildren<Node extends { readonly schema: Machine.TaggedSchema }> = "initial" extends
  keyof Node ? StateDefinitionError<"Atomic states cannot declare an initial child">
  : Node extends { readonly type: infer Type } ? Type extends "final" ? ValidateOutputSchema<Node>
    : Type extends "active" | undefined ?
      "output" extends keyof Node ? StateDefinitionError<"Only final and parallel states can declare output">
      : unknown
    : StateDefinitionError<"State node type must be active, final, or parallel">
  : "output" extends keyof Node ? StateDefinitionError<"Only final and parallel states can declare output">
  : unknown

type DefineStateTreeInput<States extends Machine.StateSchemas> = {
  readonly [Key in keyof States]: DefineStateNodeInput<States[Key]>
}

type DefineStateNodeInput<Node> = Node extends Machine.TaggedSchema ? Node
  : Node extends { readonly type: "parallel"; readonly states: infer Children extends Machine.StateSchemas } ?
    Omit<Node, "states"> & { readonly states: DefineStateTreeInput<Children> }
  : Node extends { readonly states: infer Children extends Machine.StateSchemas } ? Omit<Node, "initial" | "states"> & {
      readonly initial: Extract<keyof Children, string>
      readonly states: DefineStateTreeInput<Children>
    }
  : Node

type ValidateDefinedStates<States extends Machine.StateSchemas> = [States] extends
  [Machine.ValidateStateSchemas<States>] ? []
  : [validation: Machine.ValidateStateSchemas<States>]

const SnapshotBuilderStateTypeId: unique symbol = Symbol("effect/Machine/SnapshotBuilderState")

type SnapshotBuilderComplete<Regions> = {
  readonly [SnapshotBuilderStateTypeId]: Regions
}

type InitialSnapshotBuilderWithPrefix<
  States extends Machine.StateSchemas,
  Prefix extends string = ""
> = {
  readonly [Key in Extract<keyof States, string>]: InitialSnapshotMethod<States, Key, Prefix>
}

type InitialSnapshotMethod<
  States extends Machine.StateSchemas,
  StateId extends Extract<keyof States, string>,
  Prefix extends string
> = (
  ...args: InitialSnapshotArguments<States, StateId, Prefix>
) => InitialSnapshotResult<States, StateId, Prefix>

type InitialSnapshotArguments<
  States extends Machine.StateSchemas,
  StateId extends Extract<keyof States, string>,
  Prefix extends string,
  Path extends string = Machine.JoinPath<Prefix, StateId>
> = States[StateId] extends infer Node ?
  Node extends { readonly type: "parallel"; readonly states: infer Children extends Machine.StateSchemas } ? [
      value: Machine.NodeSchema<Node>["Type"],
      states: (
        builder: InitialParallelBuilder<Children, Path>
      ) => SnapshotBuilderComplete<InitialSnapshotRegionsWithPrefix<Children, Path>>
    ]
  : Node extends { readonly states: infer Children extends Machine.StateSchemas } ?
    Node extends { readonly initial: infer Initial extends Extract<keyof Children, string> } ? [
        value: Machine.NodeSchema<Node>["Type"],
        state: (
          builder: Pick<InitialSnapshotBuilderWithPrefix<Children, Path>, Initial>
        ) => InitialSnapshotResult<Children, Initial, Path>
      ]
    : never
  : [value: Machine.NodeSchema<Node>["Type"]]
  : never

type InitialSnapshotResult<
  States extends Machine.StateSchemas,
  StateId extends Extract<keyof States, string>,
  Prefix extends string,
  Path extends string = Machine.JoinPath<Prefix, StateId>
> = States[StateId] extends infer Node ?
  Node extends { readonly type: "parallel"; readonly states: infer Children extends Machine.StateSchemas } ?
    Machine.ParallelSnapshot<
      Path,
      Machine.NodeSchema<Node>["Type"],
      InitialSnapshotRegionsWithPrefix<Children, Path>
    >
  : Node extends { readonly states: infer Children extends Machine.StateSchemas } ?
    Node extends { readonly initial: infer Initial extends Extract<keyof Children, string> } ? Machine.CompoundSnapshot<
        Path,
        Machine.NodeSchema<Node>["Type"],
        InitialSnapshotResult<Children, Initial, Path>
      >
    : never
  : Machine.AtomicSnapshot<Path, Machine.NodeSchema<Node>["Type"]>
  : never

type InitialSnapshotRegionsWithPrefix<
  States extends Machine.StateSchemas,
  Prefix extends string
> = {
  readonly [Key in Extract<keyof States, string>]: InitialSnapshotResult<States, Key, Prefix>
}

type InitialParallelBuilder<
  States extends Machine.StateSchemas,
  Prefix extends string,
  Remaining extends Extract<keyof States, string> = Extract<keyof States, string>,
  Regions = {}
> =
  & SnapshotBuilderComplete<Regions>
  & {
    readonly [Key in Remaining]: (
      ...args: InitialSnapshotArguments<States, Key, Prefix>
    ) => InitialParallelBuilder<
      States,
      Prefix,
      Exclude<Remaining, Key>,
      Regions & { readonly [Region in Key]: InitialSnapshotResult<States, Key, Prefix> }
    >
  }

type FullSnapshotBuilderWithPrefix<
  States extends Machine.StateSchemas,
  Prefix extends string = ""
> = {
  readonly [Key in Extract<keyof States, string>]: FullSnapshotMethod<States, Key, Prefix>
}

type FullSnapshotMethod<
  States extends Machine.StateSchemas,
  StateId extends Extract<keyof States, string>,
  Prefix extends string
> = (
  ...args: FullSnapshotArguments<States, StateId, Prefix>
) => FullSnapshotResult<States, StateId, Prefix>

type FullSnapshotArguments<
  States extends Machine.StateSchemas,
  StateId extends Extract<keyof States, string>,
  Prefix extends string,
  Path extends string = Machine.JoinPath<Prefix, StateId>
> = States[StateId] extends infer Node ?
  Node extends { readonly type: "parallel"; readonly states: infer Children extends Machine.StateSchemas } ? [
      value: Machine.NodeSchema<Node>["Type"],
      states: (
        builder: FullParallelBuilder<Children, Path>
      ) => SnapshotBuilderComplete<Machine.SnapshotRegionsWithPrefix<Children, Path>>
    ]
  : Node extends { readonly states: infer Children extends Machine.StateSchemas } ? [
      value: Machine.NodeSchema<Node>["Type"],
      state: (
        builder: FullSnapshotBuilderWithPrefix<Children, Path>
      ) => Machine.SnapshotWithPrefix<Children, Path>
    ]
  : [value: Machine.NodeSchema<Node>["Type"]]
  : never

type FullSnapshotResult<
  States extends Machine.StateSchemas,
  StateId extends Extract<keyof States, string>,
  Prefix extends string,
  Path extends string = Machine.JoinPath<Prefix, StateId>
> = Machine.SnapshotByIdentifierWithPath<States, StateId, Path>

type FullParallelBuilder<
  States extends Machine.StateSchemas,
  Prefix extends string,
  Remaining extends Extract<keyof States, string> = Extract<keyof States, string>,
  Regions = {}
> =
  & SnapshotBuilderComplete<Regions>
  & {
    readonly [Key in Remaining]: (
      ...args: FullSnapshotArguments<States, Key, Prefix>
    ) => FullParallelBuilder<
      States,
      Prefix,
      Exclude<Remaining, Key>,
      Regions & { readonly [Region in Key]: FullSnapshotResult<States, Key, Prefix> }
    >
  }

type ParentPath<Path extends string> = Path extends `${infer Parent}.${infer Child}`
  ? Child extends `${string}.${string}` ? `${Parent}.${ParentPath<Child>}` : Parent
  : never

type IsCompoundNode<Node> = Node extends { readonly type: "parallel" } ? false
  : Node extends { readonly states: Machine.StateSchemas } ? true
  : false

type NearestCompoundScope<
  States extends Machine.StateSchemas,
  Source extends Machine.StateIdentifier<States>
> = IsCompoundNode<Machine.NodeByIdentifier<States, Source>> extends true ? Source
  : ParentPath<Source> extends infer Parent extends Machine.StateIdentifier<States> ?
    NearestCompoundScope<States, Parent>
  : never

type ChildrenOf<
  States extends Machine.StateSchemas,
  Path extends Machine.StateIdentifier<States>
> = Machine.NodeByIdentifier<States, Path> extends { readonly states: infer Children extends Machine.StateSchemas } ?
  Children
  : never

type StateIdentifierFromPath<
  States extends Machine.StateSchemas,
  Path extends string
> = Extract<Path, Machine.StateIdentifier<States>>

type LocalTargetResult<
  AllStates extends Machine.StateSchemas,
  States extends Machine.StateSchemas,
  StateId extends Extract<keyof States, string>,
  Prefix extends string,
  Path extends string = Machine.JoinPath<Prefix, StateId>
> = States[StateId] extends { readonly states: infer Children extends Machine.StateSchemas } ?
  LocalTargetResultWithPrefix<AllStates, Children, Path>
  : Machine.Target<AllStates, StateIdentifierFromPath<AllStates, Path>>

type LocalTargetResultWithPrefix<
  AllStates extends Machine.StateSchemas,
  States extends Machine.StateSchemas,
  Prefix extends string
> = {
  readonly [Key in Extract<keyof States, string>]: LocalTargetResult<AllStates, States, Key, Prefix>
}[Extract<keyof States, string>]

type LocalTargetBuilderWithPrefix<
  AllStates extends Machine.StateSchemas,
  States extends Machine.StateSchemas,
  Prefix extends string
> = {
  readonly [Key in Extract<keyof States, string>]: LocalTargetMethod<AllStates, States, Key, Prefix>
}

type LocalTargetMethod<
  AllStates extends Machine.StateSchemas,
  States extends Machine.StateSchemas,
  StateId extends Extract<keyof States, string>,
  Prefix extends string,
  Path extends string = Machine.JoinPath<Prefix, StateId>
> = States[StateId] extends infer Node ?
  Node extends { readonly states: infer Children extends Machine.StateSchemas } ? <
      Result extends LocalTargetResultWithPrefix<
        AllStates,
        Children,
        Path
      >
    >(
      value: Machine.NodeSchema<Node>["Type"],
      state: (
        builder: LocalTargetBuilderWithPrefix<AllStates, Children, Path>
      ) => Result
    ) => Result
  : (value: Machine.NodeSchema<Node>["Type"]) => Machine.Target<AllStates, StateIdentifierFromPath<AllStates, Path>>
  : never

type LocalTargetBuilderForScope<
  States extends Machine.StateSchemas,
  Scope extends Machine.StateIdentifier<States>
> = ChildrenOf<States, Scope> extends infer Children extends Machine.StateSchemas ?
    & LocalTargetBuilderWithPrefix<States, Children, Scope>
    & {
      /**
       * Updates the value of the state containing the local group and moves to
       * one of the states inside it. Values in other active branches are kept.
       *
       * @since 4.0.0
       */
      readonly with: <Result extends LocalTargetResultWithPrefix<States, Children, Scope>>(
        value: Machine.StateByIdentifier<States, Scope>,
        state: (
          builder: LocalTargetBuilderWithPrefix<States, Children, Scope>
        ) => Result
      ) => Result
    }
  : {}

type BranchTargetResult<
  AllStates extends Machine.StateSchemas,
  States extends Machine.StateSchemas,
  StateId extends Extract<keyof States, string>,
  Prefix extends string,
  Path extends string = Machine.JoinPath<Prefix, StateId>
> = States[StateId] extends { readonly states: infer Children extends Machine.StateSchemas } ?
  BranchTargetResultWithPrefix<AllStates, Children, Path>
  : Machine.Target<AllStates, StateIdentifierFromPath<AllStates, Path>>

type BranchTargetResultWithPrefix<
  AllStates extends Machine.StateSchemas,
  States extends Machine.StateSchemas,
  Prefix extends string
> = {
  readonly [Key in Extract<keyof States, string>]: BranchTargetResult<AllStates, States, Key, Prefix>
}[Extract<keyof States, string>]

type BranchTargetBuilderWithPrefix<
  AllStates extends Machine.StateSchemas,
  States extends Machine.StateSchemas,
  Prefix extends string
> = {
  readonly [Key in Extract<keyof States, string>]: BranchTargetMethod<AllStates, States, Key, Prefix>
}

type BranchTargetMethod<
  AllStates extends Machine.StateSchemas,
  States extends Machine.StateSchemas,
  StateId extends Extract<keyof States, string>,
  Prefix extends string,
  Path extends string = Machine.JoinPath<Prefix, StateId>
> = States[StateId] extends infer Node ?
  Node extends { readonly states: infer Children extends Machine.StateSchemas } ?
      & (<Result extends BranchTargetResultWithPrefix<AllStates, Children, Path>>(
        value: Machine.NodeSchema<Node>["Type"],
        state: (
          builder: BranchTargetBuilderWithPrefix<AllStates, Children, Path>
        ) => Result
      ) => Result)
      & BranchTargetBuilderWithPrefix<AllStates, Children, Path>
  : (value: Machine.NodeSchema<Node>["Type"]) => Machine.Target<AllStates, StateIdentifierFromPath<AllStates, Path>>
  : never

type BranchTargetBuilderForRoot<
  States extends Machine.StateSchemas,
  Root extends Extract<keyof States, string>
> = {
  readonly [Key in Root]: BranchTargetMethod<States, States, Key, "">
}

type SpawnRequirements<Requirements> = Exclude<
  Requirements,
  Scope.Scope
>

type SpawnIdError<Options extends SpawnOptions> = "id" extends keyof Options ? Options extends {
    readonly id?: infer Id
  } ? [Id] extends [undefined] ? never : ChildAlreadyExistsError
  : ChildAlreadyExistsError
  : never

type SpawnError<Options extends SpawnOptions> = SpawnIdError<Options>

type SpawnResult<State, Event, Error, Requirements, Output, SpawnError, InitialError = never> = Effect.Effect<
  MachineRef<State, Event, Error | InitialError, Output>,
  SpawnError | InitialError,
  MachineRuntimeRequirement | SpawnRequirements<Requirements>
>

/**
 * Represents the active or terminal lifecycle state of a running machine.
 *
 * **Details**
 *
 * Failures retain the last successfully published machine state and expose the
 * complete `Cause`. Stopped machines are distinct from machines that complete
 * with output or fail while processing an event.
 *
 * @category models
 * @since 4.0.0
 */
export type RuntimeSnapshot<State, Error = never, Output = never> =
  | {
    readonly status: "active"
    readonly state: State
  }
  | {
    readonly status: "done"
    readonly state: State
    readonly output: Output
  }
  | {
    readonly status: "error"
    readonly state: State
    readonly cause: Cause.Cause<Error>
  }
  | {
    readonly status: "stopped"
    readonly state: State
  }

/**
 * Represents a classified terminal outcome derived from a runtime snapshot.
 *
 * @category models
 * @since 4.0.0
 */
export type RuntimeOutcome<State, Error = never, Output = never> =
  | {
    readonly _tag: "Done"
    readonly output: Output
    readonly snapshot: Extract<RuntimeSnapshot<State, Error, Output>, { readonly status: "done" }>
  }
  | {
    readonly _tag: "Failure"
    readonly error: Error
    readonly cause: Cause.Cause<Error>
    readonly snapshot: Extract<RuntimeSnapshot<State, Error, Output>, { readonly status: "error" }>
  }
  | {
    readonly _tag: "Defect"
    readonly defect: unknown
    readonly cause: Cause.Cause<Error>
    readonly snapshot: Extract<RuntimeSnapshot<State, Error, Output>, { readonly status: "error" }>
  }
  | {
    readonly _tag: "Interrupted"
    readonly cause: Cause.Cause<Error>
    readonly snapshot: Extract<RuntimeSnapshot<State, Error, Output>, { readonly status: "error" }>
  }
  | {
    readonly _tag: "Cause"
    readonly cause: Cause.Cause<Error>
    readonly snapshot: Extract<RuntimeSnapshot<State, Error, Output>, { readonly status: "error" }>
  }
  | {
    readonly _tag: "Stopped"
    readonly snapshot: Extract<RuntimeSnapshot<State, Error, Output>, { readonly status: "stopped" }>
  }

/**
 * Provides access to a running machine's state, lifecycle, event input, and
 * termination operations.
 *
 * **Gotchas**
 *
 * `send` reports whether an event was accepted for delivery. Errors that occur
 * while asynchronously processing an accepted event are observed through
 * `snapshot`, `changes`, or `join`. Sending after termination fails with
 * `StoppedError`.
 *
 * @category models
 * @since 4.0.0
 */
export interface MachineRef<out State, in Event, out Error = never, out Output = never> {
  readonly id: string
  readonly sessionId: string
  readonly state: Effect.Effect<State>
  readonly snapshot: Effect.Effect<RuntimeSnapshot<State, Error, Output>>
  readonly changes: Stream.Stream<RuntimeSnapshot<State, Error, Output>>
  readonly join: Effect.Effect<Output, Error | StoppedError>
  readonly stop: Effect.Effect<void>
  readonly send: (event: Event) => Effect.Effect<void, StoppedError>
  /** Returns the current directly owned child for a typed descriptor. */
  readonly child: <Child extends ChildMachine.Any>(
    child: Child
  ) => Effect.Effect<Option.Option<ChildMachine.Ref<Child>>>
  /** Streams activation, replacement, and removal of a directly owned child. */
  readonly childChanges: <Child extends ChildMachine.Any>(
    child: Child
  ) => Stream.Stream<Option.Option<ChildMachine.Ref<Child>>>
}

/**
 * Machine-specific process logic used by `spawn` and `invoke`.
 *
 * @category models
 * @since 4.0.0
 */
export interface Logic<
  State,
  Event,
  out Error = never,
  out Requirements = never,
  out Output = never,
  out InitialError = never
> {
  initial(scope: Logic.Scope<Event>): Effect.Effect<State, InitialError, Requirements>
  run(context: Logic.Context<State, Event>): Effect.Effect<Output, Error, Requirements>
}

/**
 * Public types used by advanced machine process logic.
 *
 * @since 4.0.0
 */
export declare namespace Logic {
  /**
   * Machine-local endpoint that can receive events and be stopped.
   *
   * @category models
   * @since 4.0.0
   */
  export interface Address<in Event> {
    readonly id: string
    readonly sessionId: string
    readonly stop: Effect.Effect<void>
    readonly send: (event: Event) => Effect.Effect<void, StoppedError>
  }

  /**
   * Starts child process logic owned by the current machine process.
   *
   * @category models
   * @since 4.0.0
   */
  export interface Spawn {
    <ChildState, ChildEvent, ChildError, ChildRequirements, ChildOutput, ChildInitialError = never>(
      logic: Logic<ChildState, ChildEvent, ChildError, ChildRequirements, ChildOutput, ChildInitialError>
    ): Effect.Effect<
      MachineRef<ChildState, ChildEvent, ChildError | ChildInitialError, ChildOutput>,
      ChildInitialError,
      Exclude<ChildRequirements, Scope.Scope>
    >
    <ChildState, ChildEvent, ChildError, ChildRequirements, ChildOutput, ChildInitialError = never>(
      logic: Logic<ChildState, ChildEvent, ChildError, ChildRequirements, ChildOutput, ChildInitialError>,
      options: { readonly id: string }
    ): Effect.Effect<
      MachineRef<ChildState, ChildEvent, ChildError | ChildInitialError, ChildOutput>,
      ChildAlreadyExistsError | ChildInitialError,
      Exclude<ChildRequirements, Scope.Scope>
    >
  }

  /**
   * Machine-local capabilities available while process logic initializes.
   *
   * **Gotchas**
   *
   * `sendParent` accepts `unknown` because process logic is independent from
   * the parent that eventually owns it. Prefer typed process output or an
   * invoke snapshot mapper when either can represent the communication.
   *
   * @category models
   * @since 4.0.0
   */
  export interface Scope<Event> {
    readonly self: Address<Event>
    readonly parent: Address<unknown> | undefined
    readonly spawn: Spawn
    readonly sendParent: (event: unknown) => Effect.Effect<void, StoppedError>
    readonly sendTo: <Address extends string>(
      id: Address,
      event: ChildAddress.Event<Address>
    ) => Effect.Effect<void, StoppedError>
    readonly stopChild: (id: string) => Effect.Effect<void>
  }

  /**
   * Machine-local capabilities available while stateful process logic runs.
   *
   * @category models
   * @since 4.0.0
   */
  export interface Context<State, Event> extends Scope<Event> {
    readonly receive: Effect.Effect<Event>
    readonly state: Effect.Effect<State>
    readonly setState: (state: State) => Effect.Effect<void>
    readonly updateState: <E, R>(
      update: (state: State) => Effect.Effect<State, E, R>
    ) => Effect.Effect<void, E, R>
  }
}

const ChildAddressTypeId = "~effect/Machine/ChildAddress"
const ChildAddressCompatibilityErrorTypeId = "~effect/Machine/ChildAddressCompatibilityError"
const ChildMachineTypeId = "~effect/Machine/ChildMachine"

/**
 * Typed descriptor for a complete machine invoked as a child.
 *
 * **Details**
 *
 * The descriptor carries the child's address and complete machine type. Pass
 * the same value to `invokeMachine`, `sendTo`, and child lookup APIs so state,
 * event, error, and output types are inferred without separate annotations.
 *
 * @category models
 * @since 4.0.0
 */
export interface ChildMachine<Id extends string, M extends Machine.Any> {
  readonly [ChildMachineTypeId]: typeof ChildMachineTypeId
  readonly id: Id
  readonly machine: M
}

/**
 * Namespace containing type-level members associated with `ChildMachine`.
 *
 * @since 4.0.0
 */
export declare namespace ChildMachine {
  /**
   * Any typed child machine descriptor.
   *
   * @category models
   * @since 4.0.0
   */
  export type Any = ChildMachine<string, Machine.Any>

  /**
   * Running machine reference selected by a child descriptor.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type Ref<Child> = Child extends ChildMachine<string, infer M> ? M extends Machine<
      infer States,
      infer Events,
      any,
      any,
      infer E,
      infer R,
      infer InitialE,
      infer InitialR,
      any,
      infer Output,
      any,
      any
    > ? MachineRef<
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
      >
    : never
    : never

  /**
   * Event accepted by the child selected by a descriptor.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type Event<Child> = Ref<Child> extends MachineRef<any, infer Event, any, any> ? Event : never
}

/**
 * Parent-local address for a child process that can receive events.
 *
 * @category models
 * @since 4.0.0
 */
export type ChildAddress<Event> = string & ChildAddress.Variance<Event>

/**
 * Namespace containing type-level members associated with `ChildAddress`.
 *
 * @since 4.0.0
 */
export declare namespace ChildAddress {
  /**
   * Variance marker carried by a typed child process address.
   *
   * @category models
   * @since 4.0.0
   */
  export interface Variance<in Event> {
    readonly [ChildAddressTypeId]: {
      readonly _Event: Types.Contravariant<Event>
    }
  }

  /**
   * Extracts the event protocol accepted by a child address.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type Event<Address> = Address extends ChildAddress<infer Event> ? Event : unknown

  /**
   * Ensures a child address protocol is compatible with a child process event
   * protocol.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type Compatibility<Address, Event> = [Address] extends [ChildAddress<infer AddressEvent>] ?
    [AddressEvent] extends [Event] ? unknown : {
      readonly [ChildAddressCompatibilityErrorTypeId]: {
        readonly address: AddressEvent
        readonly child: Event
      }
    }
    : unknown

  /**
   * Ensures spawn options with a typed child address are compatible with a
   * child process event protocol.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type OptionsCompatibility<Options, Event> = "id" extends keyof Options ? Options extends {
      readonly id?: infer Address
    } ? Compatibility<Exclude<Address, undefined>, Event>
    : unknown
    : unknown
}

/**
 * Options for spawning child processes.
 *
 * @category models
 * @since 4.0.0
 */
export interface SpawnOptions {
  readonly id?: string
}

/**
 * Options for spawning child processes with a parent-local id.
 *
 * @category models
 * @since 4.0.0
 */
export interface SpawnIdOptions extends SpawnOptions {
  readonly id: string
}

/**
 * Namespace containing type-level members associated with `Machine`.
 *
 * @since 4.0.0
 */
export declare namespace Machine {
  /**
   * Any schema-first machine.
   *
   * @category models
   * @since 4.0.0
   */
  export type Any = Machine<any, any, any, any, any, any, any, any, any, any, any, any>

  /**
   * A schema whose decoded value contains a `_tag` discriminator.
   *
   * **Details**
   *
   * This mirrors the tagged-schema constraint used by `Schema.toTaggedUnion`.
   *
   * @category models
   * @since 4.0.0
   */
  export type TaggedSchema = Schema.Top & { readonly Type: { readonly _tag: PropertyKey } }

  /**
   * Configuration accepted for an atomic object state node.
   *
   * @category models
   * @since 4.0.0
   */
  export type AtomicStateNodeConfig =
    | {
      readonly schema: TaggedSchema
      readonly type?: "active"
      readonly output?: never
    }
    | {
      readonly schema: TaggedSchema
      readonly type: "final"
      readonly output?: Schema.Top
    }

  /**
   * Configuration accepted for a compound object state node.
   *
   * @category models
   * @since 4.0.0
   */
  export interface CompoundStateNodeConfig {
    readonly schema: TaggedSchema
    readonly type?: "active"
    readonly initial: string
    readonly states: StateTree
  }

  /**
   * Configuration accepted for a parallel object state node.
   *
   * @category models
   * @since 4.0.0
   */
  export interface ParallelStateNodeConfig {
    readonly schema: TaggedSchema
    readonly type: "parallel"
    readonly output?: Schema.Top
    readonly states: StateTree
  }

  /**
   * Configuration accepted for an object state node.
   *
   * @category models
   * @since 4.0.0
   */
  export type StateNodeConfig = AtomicStateNodeConfig | CompoundStateNodeConfig | ParallelStateNodeConfig

  /**
   * Object state tree keyed by state path.
   *
   * @category models
   * @since 4.0.0
   */
  export type StateTree = Readonly<Record<string, TaggedSchema | StateNodeConfig>>

  /**
   * State schema definitions accepted by `make`.
   *
   * @category models
   * @since 4.0.0
   */
  export type StateSchemas = StateTree

  /**
   * Builder for initial state snapshots generated by `defineStates`.
   *
   * **When to use**
   *
   * Use when you need the type of the `initial` property returned by
   * `defineStates` or want to expose an initial snapshot builder from a helper.
   *
   * **Details**
   *
   * Initial builders enforce the declared initial child for compound states and
   * require every direct region for parallel states.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type InitialBuilder<States extends StateSchemas> = InitialSnapshotBuilderWithPrefix<States>

  /**
   * State definitions and snapshot builders returned by `defineStates`.
   *
   * **Details**
   *
   * The `states` property is the original state tree and can be passed directly
   * to `make`. The `initial` property builds path-safe snapshots for the same
   * state tree.
   *
   * @category models
   * @since 4.0.0
   */
  export interface DefinedStates<States extends StateSchemas> {
    readonly states: States
    readonly initial: InitialBuilder<States>

    /**
     * Returns the decoded value for an active state path.
     *
     * @since 4.0.0
     */
    readonly get: <Path extends StateIdentifier<States>>(
      snapshot: Snapshot<States>,
      path: Path
    ) => Option.Option<StateByIdentifier<States, Path>>

    /**
     * Returns the decoded value for an active state path together with all of
     * its active parent values.
     *
     * **Details**
     *
     * Parent values are keyed by their full state paths.
     *
     * @since 4.0.0
     */
    readonly getWithParents: <Path extends StateIdentifier<States>>(
      snapshot: Snapshot<States>,
      path: Path
    ) => Option.Option<StateWithParents<States, Path>>

    /**
     * Returns the snapshot for an active state path.
     *
     * @since 4.0.0
     */
    readonly getSnapshot: <Path extends StateIdentifier<States>>(
      snapshot: Snapshot<States>,
      path: Path
    ) => Option.Option<SnapshotByIdentifier<States, Path>>

    /**
     * Returns whether a state path is active in the snapshot.
     *
     * @since 4.0.0
     */
    readonly matches: <Path extends StateIdentifier<States>>(
      snapshot: Snapshot<States>,
      path: Path
    ) => boolean
  }

  /**
   * Validates the nested shape of state schema definitions.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type ValidateStateSchemas<States extends StateSchemas> = ValidateStateTree<States>

  /**
   * Runtime metadata for a compiled state node.
   *
   * @category models
   * @since 4.0.0
   */
  export interface StateNode {
    readonly path: string
    readonly key: string
    readonly schema: TaggedSchema
    readonly output: Schema.Top | undefined
    readonly type: "atomic" | "compound" | "parallel" | "final"
    readonly parent: string | undefined
    readonly children: ReadonlyArray<string>
    readonly initial: string | undefined
    readonly order: number
  }

  /**
   * Runtime lookup table for state nodes.
   *
   * @category models
   * @since 4.0.0
   */
  export interface StateNodes {
    readonly byPath: ReadonlyMap<string, StateNode>
    readonly roots: ReadonlyArray<string>
  }

  /**
   * Constructor arguments for a machine initial state function.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type InputArgs<Input extends Schema.Top> = Input extends typeof Schema.Void ? []
    : [input: Input["Type"]]

  /**
   * Extracts the discriminator value represented by a tagged schema.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type TagOf<S extends TaggedSchema> = S["Type"]["_tag"]

  /**
   * Extracts the schema from a state tree node definition.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type NodeSchema<Node> = Node extends TaggedSchema ? Node
    : Node extends { readonly schema: infer Schema extends TaggedSchema } ? Schema
    : never

  /**
   * Prefixes a state path with its parent path.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type JoinPath<Parent extends string, Child extends string> = Parent extends "" ? Child : `${Parent}.${Child}`

  /**
   * Extracts the state path values represented by a state definition.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type StateIdentifier<States extends StateSchemas> = StateIdentifierWithPrefix<States>

  /**
   * Extracts the state path values represented by a state definition under a
   * parent path prefix.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type StateIdentifierWithPrefix<
    States extends StateSchemas,
    Prefix extends string = ""
  > = {
    readonly [Key in Extract<keyof States, string>]: States[Key] extends { readonly states: infer Children }
      ? Children extends StateSchemas ?
        JoinPath<Prefix, Key> | StateIdentifierWithPrefix<Children, JoinPath<Prefix, Key>>
      : JoinPath<Prefix, Key>
      : JoinPath<Prefix, Key>
  }[Extract<keyof States, string>]

  /**
   * Extracts a state-tree node by state path.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type NodeByIdentifier<
    States extends StateSchemas,
    StateId extends StateIdentifier<States>
  > = StateId extends `${infer Head}.${infer Rest}`
    ? Head extends keyof States
      ? States[Head] extends { readonly states: infer Children extends StateSchemas }
        ? Rest extends StateIdentifier<Children> ? NodeByIdentifier<Children, Rest> : never
      : never
    : never
    : StateId extends keyof States ? States[StateId]
    : never

  /**
   * Extracts a schema from a state definition by state identifier.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type SchemaByIdentifier<
    States extends StateSchemas,
    StateId extends StateIdentifier<States>
  > = NodeSchema<NodeByIdentifier<States, StateId>>

  /**
   * Extracts the union of state values represented by a state definition.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type StateOf<States extends StateSchemas> = StateIdentifier<States> extends infer StateId
    ? StateId extends StateIdentifier<States> ? SchemaByIdentifier<States, StateId>["Type"]
    : never
    : never

  /**
   * Extracts the union of event values represented by an event schema list.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type EventOf<Events extends ReadonlyArray<TaggedSchema>> = Events[number]["Type"]

  /**
   * Extracts the union of emitted event values represented by an emitted event
   * schema list.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type EmitOf<Emits extends ReadonlyArray<TaggedSchema>> = Emits[number]["Type"]

  /**
   * Event values received by lifecycle callbacks.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type LifecycleEvent<Events extends ReadonlyArray<TaggedSchema>> = EventOf<Events> | InitialEvent

  /**
   * Runtime capability specialized to a machine's event protocols.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type RuntimeEffect<
    Events extends ReadonlyArray<TaggedSchema>,
    Emits extends ReadonlyArray<TaggedSchema>
  > = Effect.Effect<
    Runtime<EventOf<Events>, EmitOf<Emits>>,
    never,
    Runtime.Requirement<EventOf<Events>, EmitOf<Emits>>
  >

  /**
   * Extracts a state value from a state definition by identifier.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type StateByIdentifier<
    States extends StateSchemas,
    StateId extends StateIdentifier<States>
  > = Extract<StateOf<States>, SchemaByIdentifier<States, StateId>["Type"]>

  /**
   * Extracts every parent state path from a state identifier.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type ParentStateIdentifier<StateId extends string> = StateId extends `${infer Parent}.${infer Child}`
    ? Parent | (Child extends `${string}.${string}` ? `${Parent}.${ParentStateIdentifier<Child>}` : never)
    : never

  /**
   * Maps every parent state path of a state identifier to its decoded value.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type ParentStateValues<
    States extends StateSchemas,
    StateId extends StateIdentifier<States>
  > = StateId extends StateIdentifier<States> ? {
      readonly [Parent in Extract<ParentStateIdentifier<StateId>, StateIdentifier<States>>]: StateByIdentifier<
        States,
        Parent
      >
    }
    : never

  /**
   * Represents a decoded state value together with all of its parent values.
   *
   * @category models
   * @since 4.0.0
   */
  export type StateWithParents<
    States extends StateSchemas,
    StateId extends StateIdentifier<States>
  > = StateId extends StateIdentifier<States> ? {
      readonly value: StateByIdentifier<States, StateId>
      readonly parents: ParentStateValues<States, StateId>
    }
    : never

  type UndefinedIfNever<A> = [A] extends [never] ? undefined : A

  type NodeOutput<Node> = Node extends { readonly output: infer Output extends Schema.Top } ? Schema.Schema.Type<Output>
    : undefined

  /**
   * Extracts the declared output type for a state node.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type OutputByIdentifier<
    States extends StateSchemas,
    StateId extends StateIdentifier<States>
  > = NodeOutput<NodeByIdentifier<States, StateId>>

  type DirectFinalCompletionOutput<
    States extends StateSchemas,
    StateId extends StateIdentifier<States>
  > = NodeByIdentifier<States, StateId> extends { readonly type: "final" } ? OutputByIdentifier<States, StateId>
    : never

  type CompoundCompletionOutput<
    States extends StateSchemas,
    Children extends StateSchemas,
    Prefix extends StateIdentifier<States>
  > = UndefinedIfNever<
    {
      readonly [Key in Extract<keyof Children, string>]: DirectFinalCompletionOutput<
        States,
        Extract<JoinPath<Prefix, Key>, StateIdentifier<States>>
      >
    }[Extract<keyof Children, string>]
  >

  /**
   * Extracts the output passed when a state node completes.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type CompletionOutputByIdentifier<
    States extends StateSchemas,
    StateId extends StateIdentifier<States>
  > = NodeByIdentifier<States, StateId> extends infer Node
    ? Node extends { readonly type: "parallel" } ? OutputByIdentifier<States, StateId>
    : Node extends { readonly states: infer Children extends StateSchemas } ? CompoundCompletionOutput<
        States,
        Children,
        StateId
      >
    : Node extends { readonly type: "final" } ? OutputByIdentifier<States, StateId>
    : undefined
    : undefined

  type OutputSchema<Node> = Node extends { readonly output: infer Output extends Schema.Top } ? Output : never

  type DecodingServices<Current> = Current extends Schema.Top ? Current["DecodingServices"] : never

  type EncodingServices<Current> = Current extends Schema.Top ? Current["EncodingServices"] : never

  /**
   * Services required to decode every state value and completion output in a
   * machine snapshot.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type SnapshotDecodingServices<States extends StateSchemas> = StateIdentifier<States> extends infer StateId
    ? StateId extends StateIdentifier<States> ?
        | DecodingServices<SchemaByIdentifier<States, StateId>>
        | DecodingServices<OutputSchema<NodeByIdentifier<States, StateId>>>
    : never
    : never

  /**
   * Services required to encode every state value and completion output in a
   * machine snapshot.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type SnapshotEncodingServices<States extends StateSchemas> = StateIdentifier<States> extends infer StateId
    ? StateId extends StateIdentifier<States> ?
        | EncodingServices<SchemaByIdentifier<States, StateId>>
        | EncodingServices<OutputSchema<NodeByIdentifier<States, StateId>>>
    : never
    : never

  /**
   * Encoded value for one active state path in a normalized machine snapshot.
   *
   * @category models
   * @since 4.0.0
   */
  export interface EncodedSnapshotState {
    readonly path: string
    readonly value: unknown
  }

  /**
   * Encoded output for one completed state path in a normalized machine
   * snapshot. An omitted output represents `undefined`.
   *
   * @category models
   * @since 4.0.0
   */
  export interface EncodedSnapshotCompletion {
    readonly path: string
    readonly output?: unknown
  }

  /**
   * Normalized data representation of a machine snapshot.
   *
   * **Details**
   *
   * Active state and completion values use the encoded representations of
   * their declared schemas. Runtime process state such as children, fibers,
   * scopes, queues, and subscriptions is not included.
   *
   * @category models
   * @since 4.0.0
   */
  export interface EncodedSnapshot {
    readonly _tag: "MachineSnapshot"
    readonly active: ReadonlyArray<EncodedSnapshotState>
    readonly completed?: ReadonlyArray<EncodedSnapshotCompletion>
  }

  /**
   * Completed state path and its resolved output value.
   *
   * @category models
   * @since 4.0.0
   */
  export interface SnapshotCompletion {
    readonly path: string
    readonly output: unknown
  }

  /**
   * Carries lifecycle metadata required to resume planning from a cloned
   * snapshot.
   *
   * **Gotchas**
   *
   * Snapshots contain decoded in-memory values. Their current object shape is
   * experimental and is not a stable JSON persistence or wire format. Copies
   * must preserve decoded values such as `Schema.Class` instances; JSON and
   * `structuredClone` may not preserve those runtime contracts.
   * Use {@link encodeSnapshot} and {@link decodeSnapshot} to cross a persistence
   * or transport boundary.
   *
   * @category models
   * @since 4.0.0
   */
  export interface SnapshotMetadata {
    readonly completed?: ReadonlyArray<SnapshotCompletion>
  }

  /**
   * Atomic statechart snapshot carrying path identity separately from the
   * decoded state value.
   *
   * @category models
   * @since 4.0.0
   */
  export interface AtomicSnapshot<Path extends string, Value> extends SnapshotMetadata {
    readonly path: Path
    readonly value: Value
  }

  /**
   * Compound statechart snapshot carrying parent value plus the active child
   * snapshot.
   *
   * @category models
   * @since 4.0.0
   */
  export interface CompoundSnapshot<Path extends string, Value, Child> extends SnapshotMetadata {
    readonly path: Path
    readonly value: Value
    readonly state: Child
  }

  /**
   * Parallel statechart snapshot carrying parent value plus one active snapshot
   * per child region.
   *
   * @category models
   * @since 4.0.0
   */
  export interface ParallelSnapshot<Path extends string, Value, Regions> extends SnapshotMetadata {
    readonly path: Path
    readonly value: Value
    readonly states: Regions
  }

  /**
   * Extracts the snapshot value represented by a state definition by
   * identifier.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type SnapshotByIdentifier<
    States extends StateSchemas,
    StateId extends StateIdentifier<States>
  > = NodeByIdentifier<States, StateId> extends infer Node
    ? Node extends { readonly type: "parallel"; readonly states: infer Children }
      ? Children extends StateSchemas ? ParallelSnapshot<
          StateId,
          StateByIdentifier<States, StateId>,
          SnapshotRegionsWithPrefix<Children, StateId>
        >
      : AtomicSnapshot<StateId, StateByIdentifier<States, StateId>>
    : Node extends { readonly states: infer Children } ? Children extends StateSchemas ? CompoundSnapshot<
          StateId,
          StateByIdentifier<States, StateId>,
          SnapshotWithPrefix<Children, StateId>
        >
      : AtomicSnapshot<StateId, StateByIdentifier<States, StateId>>
    : AtomicSnapshot<StateId, StateByIdentifier<States, StateId>>
    : AtomicSnapshot<StateId, StateByIdentifier<States, StateId>>

  /**
   * Extracts child snapshots under a parent path prefix.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type SnapshotWithPrefix<
    States extends StateSchemas,
    Prefix extends string
  > = {
    readonly [Key in Extract<keyof States, string>]: SnapshotByIdentifierWithPath<States, Key, JoinPath<Prefix, Key>>
  }[Extract<keyof States, string>]

  /**
   * Extracts child snapshots under a parallel parent path prefix, keyed by
   * child region.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type SnapshotRegionsWithPrefix<
    States extends StateSchemas,
    Prefix extends string
  > = {
    readonly [Key in Extract<keyof States, string>]: SnapshotByIdentifierWithPath<States, Key, JoinPath<Prefix, Key>>
  }

  /**
   * Extracts a snapshot for a state node while preserving its full path.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type SnapshotByIdentifierWithPath<
    States extends StateSchemas,
    StateId extends Extract<keyof States, string>,
    Path extends string
  > = States[StateId] extends { readonly type: "parallel"; readonly states: infer Children }
    ? Children extends StateSchemas ? ParallelSnapshot<
        Path,
        NodeSchema<States[StateId]>["Type"],
        SnapshotRegionsWithPrefix<Children, Path>
      >
    : AtomicSnapshot<Path, NodeSchema<States[StateId]>["Type"]>
    : States[StateId] extends { readonly states: infer Children } ? Children extends StateSchemas ? CompoundSnapshot<
          Path,
          NodeSchema<States[StateId]>["Type"],
          SnapshotWithPrefix<Children, Path>
        >
      : AtomicSnapshot<Path, NodeSchema<States[StateId]>["Type"]>
    : AtomicSnapshot<Path, NodeSchema<States[StateId]>["Type"]>

  /**
   * Extracts the union of statechart snapshots represented by a state
   * definition.
   *
   * @category models
   * @since 4.0.0
   */
  export type Snapshot<States extends StateSchemas> = {
    readonly [StateId in Extract<keyof States, string>]: SnapshotByIdentifier<States, StateId & StateIdentifier<States>>
  }[Extract<keyof States, string>]

  /**
   * Extracts the root state identifier from a state path.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type RootStateIdentifier<StateId extends string> = StateId extends `${infer Root}.${string}` ? Root : StateId

  /**
   * Extracts the public snapshot shape that contains a final state path.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type SnapshotContainingFinal<
    States extends StateSchemas,
    FinalStates extends StateIdentifier<States>
  > = FinalStates extends StateIdentifier<States>
    ? RootStateIdentifier<FinalStates> extends infer Root extends StateIdentifier<States> ? SnapshotByIdentifier<
        States,
        Root
      >
    : never
    : never

  /**
   * Extracts state identifiers whose state-tree definition marks them final.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type FinalStateFromDefinition<States extends StateSchemas> =
    & {
      readonly [StateId in StateIdentifier<States>]: NodeByIdentifier<States, StateId> extends
        { readonly type: "final" } ? StateId
        : never
    }[StateIdentifier<States>]
    & StateIdentifier<States>

  /**
   * Extracts an event value from an event schema list by tag.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type EventByTag<
    Events extends ReadonlyArray<TaggedSchema>,
    Tag extends TagOf<Events[number]>
  > = Extract<EventOf<Events>, { readonly _tag: Tag }>

  /**
   * Machine-bound target instruction accepted from transition handlers.
   *
   * @category models
   * @since 4.0.0
   */
  export interface Target<
    States extends StateSchemas,
    StateId extends StateIdentifier<States>
  > {
    readonly [Model.TargetTypeId]: typeof Model.TargetTypeId
    readonly path: StateId
    readonly value: StateByIdentifier<States, StateId>
    readonly values?: Partial<
      {
        readonly [AncestorStateId in StateIdentifier<States>]: StateByIdentifier<States, AncestorStateId>
      }
    >
  }

  /**
   * Builder for complete transition snapshots.
   *
   * **When to use**
   *
   * Use when a transition enters an inactive root or otherwise needs to provide
   * every active child below the selected root.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type FullTargetBuilder<States extends StateSchemas> = FullSnapshotBuilderWithPrefix<States>

  /**
   * Builder for source-local transition targets.
   *
   * **When to use**
   *
   * Use when a transition stays inside the nearest active compound ancestor of
   * the source state and should preserve active ancestor and sibling values.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type LocalTargetBuilder<
    States extends StateSchemas,
    Source extends StateIdentifier<States>
  > = NearestCompoundScope<States, Source> extends infer Scope ? [Scope] extends [never] ? {}
    : Scope extends StateIdentifier<States> ? LocalTargetBuilderForScope<States, Scope>
    : {}
    : {}

  /**
   * Builder for partial transition targets within the active source root.
   *
   * **When to use**
   *
   * Use when a transition should replace one descendant of the active source
   * root while preserving unmentioned active ancestors or parallel regions.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type BranchTargetBuilder<
    States extends StateSchemas,
    Source extends StateIdentifier<States>
  > = BranchTargetBuilderForRoot<States, Extract<RootStateIdentifier<Source>, Extract<keyof States, string>>>

  /**
   * Machine-bound target builders available in transition contexts.
   *
   * **Details**
   *
   * `local` targets the nearest compound scope for the source state, `branch`
   * targets descendants of the source root, and `full` builds complete
   * snapshots for any root.
   *
   * @category models
   * @since 4.0.0
   */
  export interface TargetBuilder<
    States extends StateSchemas,
    Source extends StateIdentifier<States>
  > {
    /**
     * Moves to another state in the same local group. The value of the state
     * containing that group, and values in other active branches, are kept.
     *
     * @since 4.0.0
     */
    readonly local: LocalTargetBuilder<States, Source>

    /**
     * Moves to a state elsewhere under the current top-level state. Parent
     * values change only when their builder methods are explicitly called;
     * other active branches are kept.
     *
     * @since 4.0.0
     */
    readonly branch: BranchTargetBuilder<States, Source>

    /**
     * Moves to any top-level state by building its complete active state
     * configuration.
     *
     * **Details**
     *
     * When the target contains nested states, an active child must be selected.
     * When it contains parallel states, an active state must be provided for
     * every region.
     *
     * @since 4.0.0
     */
    readonly full: FullTargetBuilder<States>
  }

  /**
   * Stages an Effect to run after the current machine step is planned.
   *
   * @category models
   * @since 4.0.0
   */
  export interface Action {
    <E, R>(effect: Effect.Effect<void, E, R>): Effect.Effect<void, never, ActionRequirement<E, R>>
  }

  /**
   * Planning capabilities shared by transition and lifecycle callbacks.
   *
   * @category models
   * @since 4.0.0
   */
  export interface PlanningCapabilities<Events, Emits> {
    readonly action: Action
    readonly raise: (
      event: Events
    ) => Effect.Effect<void, MachineSchemaDecodeError | StoppedError, Runtime.Requirement<Events, Emits>>
    readonly emit: (
      event: Emits
    ) => Effect.Effect<void, MachineSchemaDecodeError | StoppedError, Runtime.Requirement<Events, Emits>>
  }

  /**
   * Context passed to a state/event handler.
   *
   * @category models
   * @since 4.0.0
   */
  export interface HandlerContext<
    States extends StateSchemas,
    Events extends ReadonlyArray<TaggedSchema>,
    Emits extends ReadonlyArray<TaggedSchema>,
    StateId extends StateIdentifier<States>,
    EventTag extends TagOf<Events[number]>,
    E,
    R
  > extends PlanningCapabilities<EventOf<Events>, EmitOf<Emits>> {
    readonly state: StateByIdentifier<States, StateId>
    readonly parents: ParentStateValues<States, StateId>
    readonly event: EventByTag<Events, EventTag>
    readonly runtime: RuntimeEffect<Events, Emits>

    /**
     * Provides typed builders for choosing the next active state from this
     * handler. Each builder documents which existing state values it keeps.
     *
     * @since 4.0.0
     */
    readonly target: TargetBuilder<States, StateId>
  }

  /**
   * Context passed to an entry or exit state handler.
   *
   * @category models
   * @since 4.0.0
   */
  export interface StateActionContext<
    States extends StateSchemas,
    Events extends ReadonlyArray<TaggedSchema>,
    Emits extends ReadonlyArray<TaggedSchema>,
    StateId extends StateIdentifier<States>
  > extends PlanningCapabilities<EventOf<Events>, EmitOf<Emits>> {
    readonly state: StateByIdentifier<States, StateId>
    readonly parents: ParentStateValues<States, StateId>
    readonly event: LifecycleEvent<Events>
    readonly runtime: RuntimeEffect<Events, Emits>
  }

  /**
   * Context passed to an invoked child process source.
   *
   * @category models
   * @since 4.0.0
   */
  export interface InvokeContext<
    States extends StateSchemas,
    Events extends ReadonlyArray<TaggedSchema>,
    Emits extends ReadonlyArray<TaggedSchema>,
    StateId extends StateIdentifier<States>
  > {
    readonly state: StateByIdentifier<States, StateId>
    readonly parents: ParentStateValues<States, StateId>
    readonly event: LifecycleEvent<Events>
    readonly runtime: RuntimeEffect<Events, Emits>
  }

  /**
   * Context passed to an invoked child process active snapshot mapper.
   *
   * @category models
   * @since 4.0.0
   */
  export interface InvokeSnapshotContext<State, Error, Output> {
    readonly id: string
    readonly snapshot: Extract<RuntimeSnapshot<State, Error, Output>, { readonly status: "active" }>
  }

  /**
   * Context passed to an invoked machine terminal output mapper.
   *
   * @category models
   * @since 4.0.0
   */
  export interface InvokeDoneContext<Output> {
    readonly id: string
    readonly output: Output
  }

  /**
   * Context passed to an eventless transition handler.
   *
   * @category models
   * @since 4.0.0
   */
  export interface AlwaysContext<
    States extends StateSchemas,
    Events extends ReadonlyArray<TaggedSchema>,
    Emits extends ReadonlyArray<TaggedSchema>,
    StateId extends StateIdentifier<States>
  > extends PlanningCapabilities<EventOf<Events>, EmitOf<Emits>> {
    readonly state: StateByIdentifier<States, StateId>
    readonly parents: ParentStateValues<States, StateId>
    readonly event: LifecycleEvent<Events>
    readonly runtime: RuntimeEffect<Events, Emits>

    /**
     * Provides typed builders for choosing the next active state from this
     * eventless handler. Each builder documents which existing state values it
     * keeps.
     *
     * @since 4.0.0
     */
    readonly target: TargetBuilder<States, StateId>
  }

  /**
   * Context passed to a state completion transition handler.
   *
   * @category models
   * @since 4.0.0
   */
  export interface DoneContext<
    States extends StateSchemas,
    Events extends ReadonlyArray<TaggedSchema>,
    Emits extends ReadonlyArray<TaggedSchema>,
    StateId extends StateIdentifier<States>
  > extends PlanningCapabilities<EventOf<Events>, EmitOf<Emits>> {
    readonly state: StateByIdentifier<States, StateId>
    readonly parents: ParentStateValues<States, StateId>
    readonly event: LifecycleEvent<Events>
    readonly output: CompletionOutputByIdentifier<States, StateId>
    readonly runtime: RuntimeEffect<Events, Emits>

    /**
     * Provides typed builders for choosing the next active state after this
     * state completes. Each builder documents which existing state values it
     * keeps.
     *
     * @since 4.0.0
     */
    readonly target: TargetBuilder<States, StateId>
  }

  /**
   * Context passed to a final state output function.
   *
   * @category models
   * @since 4.0.0
   */
  export interface FinalOutputContext<
    States extends StateSchemas,
    Events extends ReadonlyArray<TaggedSchema>,
    StateId extends StateIdentifier<States>
  > {
    readonly state: StateByIdentifier<States, StateId>
    readonly parents: ParentStateValues<States, StateId>
    readonly event: LifecycleEvent<Events>
  }

  /**
   * Extracts region outputs for a completed parallel state.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type ParallelOutputRegions<
    States extends StateSchemas,
    StateId extends StateIdentifier<States>
  > = NodeByIdentifier<States, StateId> extends
    { readonly type: "parallel"; readonly states: infer Children extends StateSchemas } ? {
      readonly [Key in Extract<keyof Children, string>]: CompletionOutputByIdentifier<
        States,
        Extract<JoinPath<StateId, Key>, StateIdentifier<States>>
      >
    }
    : never

  /**
   * Context passed to a parallel state output function.
   *
   * @category models
   * @since 4.0.0
   */
  export interface ParallelOutputContext<
    States extends StateSchemas,
    Events extends ReadonlyArray<TaggedSchema>,
    StateId extends StateIdentifier<States>
  > {
    readonly state: StateByIdentifier<States, StateId>
    readonly parents: ParentStateValues<States, StateId>
    readonly event: LifecycleEvent<Events>
    readonly outputs: ParallelOutputRegions<States, StateId>
  }

  /**
   * Return value accepted from entry and exit state actions.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type StateActionResult<E, R> = void | Effect.Effect<void, E, R>

  /**
   * Return value accepted from a machine initial state function.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type InitialResult<States extends StateSchemas, E, R> =
    | Snapshot<States>
    | Effect.Effect<Snapshot<States>, E, R>

  /**
   * Return value accepted from transition handlers.
   *
   * **Details**
   *
   * Handlers return snapshots for complete state replacement or target builder
   * results for path-safe partial transitions. Raw decoded state values are not
   * accepted at transition boundaries.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type HandlerResult<States extends StateSchemas, E, R> =
    | Snapshot<States>
    | Target<States, StateIdentifier<States>>
    | void
    | Effect.Effect<Snapshot<States> | Target<States, StateIdentifier<States>> | void, E, R>

  /**
   * Extracts the union of handler return values from a handler map.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type HandlerEffect<Handlers> = Handlers[keyof Handlers]
  /**
   * Extracts the error type from a handler return value.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type HandlerError<Handlers> = Effect.Error<HandlerEffect<Handlers>>
  /**
   * Extracts the service requirements from a handler return value.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type HandlerServices<Handlers> = Effect.Services<HandlerEffect<Handlers>>
  /**
   * Extracts the return value from an initial state function.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type InitialReturn<Initial> = Initial extends (...args: any) => infer Ret ? Ret : never
  /**
   * Extracts the return value from an entry or exit action.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type StateActionReturn<Config, Key extends "entry" | "exit"> = Key extends keyof Config
    ? NonNullable<Config[Key]> extends (...args: any) => infer Ret ? Ret : never
    : never
  /**
   * Extracts the return value from an event transition config.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type EventTransitionReturn<Transition> = Transition extends (...args: any) => infer Ret ? Ret
    : Transition extends { readonly transition: (...args: any) => infer Ret } ? Ret
    : never
  /**
   * Extracts the return value from a state's event handlers.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type EventHandlerReturn<Config> = Config extends { readonly on?: infer On }
    ? { readonly [EventTag in keyof On]: EventTransitionReturn<NonNullable<On[EventTag]>> }[
      keyof On
    ]
    : never
  /**
   * Extracts the invoke config or configs from a state config.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type InvokeReturn<Config> = "invoke" extends keyof Config
    ? Config extends { readonly invoke?: infer Invoke }
      ? NonNullable<Invoke> extends (...args: any) => infer Resolved
        ? NonNullable<Resolved> extends ReadonlyArray<infer One> ? One : NonNullable<Resolved>
      : NonNullable<Invoke> extends ReadonlyArray<infer One> ? One
      : NonNullable<Invoke>
    : never
    : never
  /**
   * Extracts the child process logic returned by an invoke source.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type InvokeLogic<Invoke> = Invoke extends { readonly src: (...args: any) => infer Logic } ? Logic : never
  /**
   * Extracts the startup error from an invoke source child process logic.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type InvokeInitialError<Invoke> = Invoke extends {
    readonly [InvokeTypeId]: { readonly initialError: Types.Covariant<infer InitialError> }
  } ? InitialError
    : InvokeLogic<Invoke> extends Logic<any, any, any, any, any, infer InitialError> ? InitialError
    : never
  /**
   * Extracts the runtime error from an invoked child process.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type InvokeRuntimeError<Invoke> = Invoke extends {
    readonly [InvokeTypeId]: { readonly error: Types.Covariant<infer Error> }
  } ? Error
    : InvokeLogic<Invoke> extends Logic<any, any, infer Error, any, any, any> ? Error
    : never
  /**
   * Extracts the output from an invoked child process.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type InvokeOutput<Invoke> = Invoke extends {
    readonly [InvokeTypeId]: { readonly output: Types.Covariant<infer Output> }
  } ? Output
    : InvokeLogic<Invoke> extends Logic<any, any, any, any, infer Output, any> ? Output
    : never
  /**
   * Extracts the service requirements from an invoke source child process logic.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type InvokeServices<Invoke> = Invoke extends {
    readonly [InvokeTypeId]: { readonly requirements: Types.Covariant<infer Requirements> }
  } ? Requirements
    : InvokeLogic<Invoke> extends Logic<any, any, any, infer Requirements, any, any> ? Requirements
    : never
  /**
   * Extracts events emitted directly by an invoked child.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type InvokeEmits<Invoke> = Invoke extends {
    readonly [InvokeTypeId]: { readonly emits: Types.Covariant<infer Emits> }
  } ? Emits :
    never
  /**
   * Extracts events returned by an invoked child snapshot mapper.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type InvokeSnapshotEvent<Invoke> = Invoke extends {
    readonly [InvokeTypeId]: { readonly snapshotEvent: Types.Covariant<infer Event> }
  } ? Event :
    never
  /**
   * Extracts the parent transition error contribution from invoked children.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type InvokeError<Config> = [InvokeReturn<Config>] extends [never] ? never
    : ChildAlreadyExistsError | InvokeInitialError<InvokeReturn<Config>> | InvokeRuntimeError<InvokeReturn<Config>>
  /**
   * Extracts the parent service requirement contribution from invoked children.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type InvokeRequirements<Config> = [InvokeReturn<Config>] extends [never] ? never
    : MachineRuntimeRequirement | InvokeServices<InvokeReturn<Config>>
  /**
   * Extracts the return value from an eventless transition.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type AlwaysReturn<Config> = Config extends { readonly always?: infer Always }
    ? NonNullable<Always> extends (...args: any) => infer Ret ? Ret : never
    : never
  /**
   * Extracts the return value from a state completion transition.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type DoneReturn<Config> = Config extends { readonly onDone?: infer OnDone }
    ? NonNullable<OnDone> extends (...args: any) => infer Ret ? Ret : never
    : never
  /**
   * Extracts the return value from a final state output function.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type FinalOutputReturn<Config> = Config extends { readonly output?: infer Output }
    ? NonNullable<Output> extends (...args: any) => infer Ret ? Ret : never
    : never

  /**
   * Extracts all service requirements contributed by a state handler config.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type ConfigServices<Config> =
    | Effect.Services<EventHandlerReturn<Config>>
    | Effect.Services<AlwaysReturn<Config>>
    | Effect.Services<DoneReturn<Config>>
    | Effect.Services<StateActionReturn<Config, "entry">>
    | Effect.Services<StateActionReturn<Config, "exit">>
    | InvokeRequirements<Config>

  /**
   * Resolves the tag of a state config when it is final.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type FinalStateFromConfig<Config, StateTag extends PropertyKey> = Config extends { readonly type: "final" }
    ? StateTag
    : never

  /**
   * Configuration for invoking a child process while a state is active.
   *
   * @category models
   * @since 4.0.0
   */
  export interface InvokeConfig<
    States extends StateSchemas,
    Events extends ReadonlyArray<TaggedSchema>,
    Emits extends ReadonlyArray<TaggedSchema>,
    StateId extends StateIdentifier<States>,
    Event,
    ChildState,
    ChildEvent,
    ChildError,
    ChildRequirements,
    ChildOutput,
    ChildInitialError,
    ChildEmits = never,
    DeliveredOutput = ChildOutput
  > {
    readonly [InvokeTypeId]: {
      readonly output: Types.Covariant<DeliveredOutput>
      readonly emits: Types.Covariant<ChildEmits>
      readonly snapshotEvent: Types.Covariant<Event>
      readonly error: Types.Covariant<ChildError>
      readonly requirements: Types.Covariant<ChildRequirements>
      readonly initialError: Types.Covariant<ChildInitialError>
    }
    readonly id: string
    /** @internal */
    readonly addressable?: boolean
    src(): Logic<
      ChildState,
      ChildEvent,
      ChildError,
      ChildRequirements,
      ChildOutput,
      ChildInitialError
    >
    snapshot?(
      context: InvokeSnapshotContext<ChildState, ChildError | ChildInitialError, ChildOutput>
    ): Event | undefined
    onDone?(context: InvokeDoneContext<ChildOutput>): DeliveredOutput | undefined
  }

  /** @internal */
  export interface AnyInvokeConfig<
    Output = unknown,
    Error = unknown,
    Requirements = unknown,
    InitialError = unknown,
    Emits = never,
    SnapshotEvent = never
  > {
    readonly [InvokeTypeId]: {
      readonly output: Types.Covariant<Output>
      readonly emits: Types.Covariant<Emits>
      readonly snapshotEvent: Types.Covariant<SnapshotEvent>
      readonly error: Types.Covariant<Error>
      readonly requirements: Types.Covariant<Requirements>
      readonly initialError: Types.Covariant<InitialError>
    }
  }

  /**
   * State-bound configuration for invoked child processes.
   *
   * **Details**
   *
   * A function form receives the owning state's typed value and lifecycle
   * event before constructing one or more invoke configurations.
   *
   * @category models
   * @since 4.0.0
   */
  export type InvokeDefinition<
    States extends StateSchemas,
    Events extends ReadonlyArray<TaggedSchema>,
    Emits extends ReadonlyArray<TaggedSchema>,
    StateId extends StateIdentifier<States>
  > =
    | AnyInvokeConfig<any, any, any, any, any, any>
    | ReadonlyArray<AnyInvokeConfig<any, any, any, any, any, any>>
    | ((context: InvokeContext<States, Events, Emits, StateId>) =>
      | AnyInvokeConfig<any, any, any, any, any, any>
      | ReadonlyArray<AnyInvokeConfig<any, any, any, any, any, any>>)

  type OutputHandlerConfig<
    States extends StateSchemas,
    Events extends ReadonlyArray<TaggedSchema>,
    StateId extends StateIdentifier<States>,
    Context
  > = NodeByIdentifier<States, StateId> extends { readonly output: Schema.Top } ? {
      readonly output: (context: Context) => OutputByIdentifier<States, StateId>
    }
    : {
      readonly output?: never
    }

  type ActiveOutputHandlerConfig<
    States extends StateSchemas,
    Events extends ReadonlyArray<TaggedSchema>,
    StateId extends StateIdentifier<States>
  > = NodeByIdentifier<States, StateId> extends { readonly type: "parallel" } ? OutputHandlerConfig<
      States,
      Events,
      StateId,
      ParallelOutputContext<States, Events, StateId>
    >
    : {
      readonly output?: never
    }

  /**
   * Configuration accepted for a non-final state.
   *
   * @category models
   * @since 4.0.0
   */
  export type ActiveStateConfig<
    States extends StateSchemas,
    Events extends ReadonlyArray<TaggedSchema>,
    Emits extends ReadonlyArray<TaggedSchema>,
    StateId extends StateIdentifier<States>,
    E,
    R
  > = {
    readonly type?: "active"
    readonly entry?: (context: StateActionContext<States, Events, Emits, StateId>) => StateActionResult<any, any>
    readonly exit?: (context: StateActionContext<States, Events, Emits, StateId>) => StateActionResult<any, any>
    readonly invoke?: InvokeDefinition<States, Events, Emits, StateId>
    readonly always?: (context: AlwaysContext<States, Events, Emits, StateId>) => HandlerResult<States, any, any>
    readonly onDone?: (context: DoneContext<States, Events, Emits, StateId>) => HandlerResult<States, any, any>
    readonly on?: {
      readonly [EventTag in TagOf<Events[number]>]?:
        | ((
          context: HandlerContext<States, Events, Emits, StateId, EventTag, E, R>
        ) => HandlerResult<States, any, any>)
        | {
          readonly reenter?: boolean
          readonly transition: (
            context: HandlerContext<States, Events, Emits, StateId, EventTag, E, R>
          ) => HandlerResult<States, any, any>
        }
    }
  } & ActiveOutputHandlerConfig<States, Events, StateId>

  /**
   * Configuration accepted for a final state.
   *
   * @category models
   * @since 4.0.0
   */
  export type FinalStateConfig<
    States extends StateSchemas,
    Events extends ReadonlyArray<TaggedSchema>,
    Emits extends ReadonlyArray<TaggedSchema>,
    StateId extends StateIdentifier<States>
  > = {
    readonly type: "final"
    readonly entry?: (context: StateActionContext<States, Events, Emits, StateId>) => StateActionResult<any, any>
    readonly exit?: never
    readonly always?: never
    readonly onDone?: never
    readonly on?: never
  } & OutputHandlerConfig<States, Events, StateId, FinalOutputContext<States, Events, StateId>>

  /**
   * Configuration accepted by `handle` for a state tag.
   *
   * @category models
   * @since 4.0.0
   */
  export type HandlerConfig<
    States extends StateSchemas,
    Events extends ReadonlyArray<TaggedSchema>,
    Emits extends ReadonlyArray<TaggedSchema>,
    StateId extends StateIdentifier<States>,
    E,
    R
  > =
    | ActiveStateConfig<States, Events, Emits, StateId, E, R>
    | FinalStateConfig<States, Events, Emits, StateId>

  type HandlerChildren<Node> = Node extends { readonly states: infer Children extends StateSchemas } ? Children : never

  type HandlerStateId<
    States extends StateSchemas,
    Path extends string
  > = StateIdentifierFromPath<States, Path>

  type HandlerConfigPart<Config> = {
    readonly [Key in keyof Config as Key extends "states" ? never : Key]: Config[Key]
  }

  type HandlerNode<
    AllStates extends StateSchemas,
    Node,
    Events extends ReadonlyArray<TaggedSchema>,
    Emits extends ReadonlyArray<TaggedSchema>,
    E,
    R,
    StateId extends StateIdentifier<AllStates>
  > =
    & HandlerConfig<AllStates, Events, Emits, StateId, E, R>
    & (HandlerChildren<Node> extends infer Children extends StateSchemas ? [Children] extends [never] ? {
          readonly states?: never
        }
      : {
        readonly states?: HandlerTree<AllStates, Children, Events, Emits, E, R, StateId>
      }
      : {
        readonly states?: never
      })

  type HandlerTree<
    AllStates extends StateSchemas,
    States extends StateSchemas,
    Events extends ReadonlyArray<TaggedSchema>,
    Emits extends ReadonlyArray<TaggedSchema>,
    E,
    R,
    Prefix extends string
  > = {
    readonly [Key in Extract<keyof States, string>]?: HandlerNode<
      AllStates,
      States[Key],
      Events,
      Emits,
      E,
      R,
      HandlerStateId<AllStates, JoinPath<Prefix, Key>>
    >
  }

  type HandlerNodeConfigKey = "always" | "entry" | "exit" | "invoke" | "on" | "onDone" | "output" | "states" | "type"

  type HandlerValidationError<Message extends string> = {
    readonly "~effect/Machine/HandlerError": Message
  }

  type HandlerValidationErrors<Validation> = Validation extends HandlerValidationError<any> ? Validation : never

  type NodeHasDeclaredOutput<
    States extends StateSchemas,
    StateId extends StateIdentifier<States>
  > = NodeByIdentifier<States, StateId> extends { readonly output: Schema.Top } ? StateId : never

  type DirectFinalOutputState<
    States extends StateSchemas,
    StateId extends StateIdentifier<States>
  > = NodeByIdentifier<States, StateId> extends { readonly type: "final" } ? NodeHasDeclaredOutput<States, StateId>
    : never

  type CompoundCompletionOutputStates<
    States extends StateSchemas,
    Children extends StateSchemas,
    Prefix extends StateIdentifier<States>
  > = {
    readonly [Key in Extract<keyof Children, string>]: DirectFinalOutputState<
      States,
      Extract<JoinPath<Prefix, Key>, StateIdentifier<States>>
    >
  }[Extract<keyof Children, string>]

  type RequiredCompletionOutputStates<
    States extends StateSchemas,
    StateId extends StateIdentifier<States>
  > = NodeByIdentifier<States, StateId> extends infer Node
    ? Node extends { readonly type: "parallel" } ? NodeHasDeclaredOutput<States, StateId>
    : Node extends { readonly states: infer Children extends StateSchemas } ? CompoundCompletionOutputStates<
        States,
        Children,
        StateId
      >
    : never
    : never

  type RequiredParallelOutputStates<
    States extends StateSchemas,
    StateId extends StateIdentifier<States>
  > = NodeByIdentifier<States, StateId> extends
    { readonly type: "parallel"; readonly states: infer Children extends StateSchemas } ? {
      readonly [Key in Extract<keyof Children, string>]: RequiredCompletionOutputStates<
        States,
        Extract<JoinPath<StateId, Key>, StateIdentifier<States>>
      >
    }[Extract<keyof Children, string>]
    : never

  type HandlerOutputStates<
    AllStates extends StateSchemas,
    StateId extends StateIdentifier<AllStates>,
    Config
  > = "output" extends keyof Config ? StateId : never

  type UnionToIntersection<Union> = (
    Union extends unknown ? (argument: Union) => void : never
  ) extends (argument: infer Intersection) => void ? Intersection
    : never

  type HandlerUnknownStateKeyValidation<
    States extends StateSchemas,
    Config
  > = [Exclude<Extract<keyof Config, string>, Extract<keyof States, string>>] extends [never] ? unknown
    : HandlerValidationError<"Handler tree contains a state key that does not exist">

  type HandlerUnknownConfigKeyValidation<Config> = [
    Exclude<Extract<keyof Config, string>, HandlerNodeConfigKey>
  ] extends [never] ? unknown
    : HandlerValidationError<"Handler config contains an unknown key">

  type HandlerOnKeyValidation<
    Events extends ReadonlyArray<TaggedSchema>,
    Config
  > = Config extends { readonly on?: infer On } ? [
      Exclude<Extract<keyof NonNullable<On>, string>, TagOf<Events[number]>>
    ] extends [never] ? unknown
    : HandlerValidationError<"Handler config contains an event key that does not exist">
    : unknown

  type HandlerDepth = readonly [unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown]

  type HandlerNextDepth<Depth extends ReadonlyArray<unknown>> = Depth extends
    readonly [unknown, ...infer Rest extends ReadonlyArray<unknown>] ? Rest
    : readonly []

  type HandlerChildrenValidation<
    AllStates extends StateSchemas,
    Node,
    Events extends ReadonlyArray<TaggedSchema>,
    Prefix extends string,
    Config,
    AvailableOutputStates extends StateIdentifier<AllStates>,
    Depth extends ReadonlyArray<unknown>
  > = "states" extends keyof Config ?
    Depth extends readonly [] ? HandlerValidationError<"Handler nesting exceeds the supported depth">
    : Config extends { readonly states?: infer ChildrenConfig } ?
      HandlerChildren<Node> extends infer Children extends StateSchemas ?
        [Children] extends [never] ?
          HandlerValidationError<"Handler config contains child states for a state that has no children">
        : HandlerTreeValidation<
          AllStates,
          Children,
          Events,
          Prefix,
          NonNullable<ChildrenConfig>,
          AvailableOutputStates,
          HandlerNextDepth<Depth>
        >
      : HandlerValidationError<"Handler config contains child states for a state that has no children">
    : unknown
    : unknown

  type HandlerOutputRequirementValidation<
    AllStates extends StateSchemas,
    StateId extends StateIdentifier<AllStates>,
    AvailableOutputStates extends StateIdentifier<AllStates>,
    Config
  > =
    & ("onDone" extends keyof Config ? [
        Exclude<RequiredCompletionOutputStates<AllStates, StateId>, AvailableOutputStates>
      ] extends [never] ? unknown
      : HandlerValidationError<"Handler config is missing an output implementation required by onDone">
      : unknown)
    & ("output" extends keyof Config ? NodeByIdentifier<AllStates, StateId> extends { readonly type: "parallel" } ? [
          Exclude<RequiredParallelOutputStates<AllStates, StateId>, AvailableOutputStates>
        ] extends [never] ? unknown
        : HandlerValidationError<"Handler config is missing a region output implementation required by parallel output">
      : unknown
      : unknown)

  type HandlerNodeValidation<
    AllStates extends StateSchemas,
    Node,
    Events extends ReadonlyArray<TaggedSchema>,
    StateId extends StateIdentifier<AllStates>,
    Config,
    AvailableOutputStates extends StateIdentifier<AllStates>,
    Depth extends ReadonlyArray<unknown>
  > =
    & HandlerUnknownConfigKeyValidation<Config>
    & HandlerOnKeyValidation<Events, Config>
    & HandlerInvokeOutputValidation<Events, Config>
    & HandlerInvokeEmitsValidation<Events, Config>
    & HandlerInvokeSnapshotValidation<Events, Config>
    & HandlerChildrenValidation<AllStates, Node, Events, StateId, Config, AvailableOutputStates, Depth>
    & HandlerOutputRequirementValidation<AllStates, StateId, AvailableOutputStates, Config>

  type HandlerInvokeOutputValidation<
    Events extends ReadonlyArray<TaggedSchema>,
    Config
  > = [InvokeReturn<Config>] extends [never] ? unknown
    : [Exclude<InvokeOutput<InvokeReturn<Config>>, EventOf<Events> | void>] extends [never] ? unknown
    : HandlerValidationError<"Invoked child output must be a machine event or void">

  type HandlerInvokeEmitsValidation<
    Events extends ReadonlyArray<TaggedSchema>,
    Config
  > = [InvokeReturn<Config>] extends [never] ? unknown
    : [Exclude<InvokeEmits<InvokeReturn<Config>>, EventOf<Events>>] extends [never] ? unknown
    : HandlerValidationError<"Invoked child emits events not accepted by the parent machine">

  type HandlerInvokeSnapshotValidation<
    Events extends ReadonlyArray<TaggedSchema>,
    Config
  > = [InvokeReturn<Config>] extends [never] ? unknown
    : IsAny<InvokeSnapshotEvent<InvokeReturn<Config>>> extends true ? unknown
    : [Exclude<InvokeSnapshotEvent<InvokeReturn<Config>>, EventOf<Events> | undefined>] extends [never] ? unknown
    : HandlerValidationError<"Invoked child snapshot mapper must return a machine event or undefined">

  type HandlerTreeNodeValidationErrors<
    AllStates extends StateSchemas,
    States extends StateSchemas,
    Events extends ReadonlyArray<TaggedSchema>,
    Prefix extends string,
    Config,
    AvailableOutputStates extends StateIdentifier<AllStates>,
    Depth extends ReadonlyArray<unknown>
  > = {
    readonly [Key in Extract<Extract<keyof Config, string>, Extract<keyof States, string>>]: HandlerValidationErrors<
      HandlerNodeValidation<
        AllStates,
        States[Key],
        Events,
        HandlerStateId<AllStates, JoinPath<Prefix, Key>>,
        Config[Key],
        AvailableOutputStates,
        Depth
      >
    >
  }[Extract<Extract<keyof Config, string>, Extract<keyof States, string>>]

  type HandlerTreeNodeValidations<
    AllStates extends StateSchemas,
    States extends StateSchemas,
    Events extends ReadonlyArray<TaggedSchema>,
    Prefix extends string,
    Config,
    AvailableOutputStates extends StateIdentifier<AllStates>,
    Depth extends ReadonlyArray<unknown>
  > = HandlerTreeNodeValidationErrors<
    AllStates,
    States,
    Events,
    Prefix,
    Config,
    AvailableOutputStates,
    Depth
  > extends infer Errors ? [Errors] extends [never] ? unknown : UnionToIntersection<Errors>
    : never

  type HandlerTreeValidation<
    AllStates extends StateSchemas,
    States extends StateSchemas,
    Events extends ReadonlyArray<TaggedSchema>,
    Prefix extends string,
    Config,
    AvailableOutputStates extends StateIdentifier<AllStates>,
    Depth extends ReadonlyArray<unknown> = HandlerDepth
  > =
    & HandlerUnknownStateKeyValidation<States, Config>
    & HandlerTreeNodeValidations<AllStates, States, Events, Prefix, Config, AvailableOutputStates, Depth>

  type HandlerNodeChildrenConfig<Config> = "states" extends keyof Config ?
    Config extends { readonly states?: infer Children } ? NonNullable<Children>
    : never
    : never

  type HandlerTreeStateIds<
    AllStates extends StateSchemas,
    States extends StateSchemas,
    Prefix extends string,
    Config,
    Depth extends ReadonlyArray<unknown> = HandlerDepth
  > = {
    readonly [Key in Extract<Extract<keyof Config, string>, Extract<keyof States, string>>]:
      | HandlerStateId<AllStates, JoinPath<Prefix, Key>>
      | HandlerNodeChildStateIds<
        AllStates,
        States[Key],
        HandlerStateId<AllStates, JoinPath<Prefix, Key>>,
        Config[Key],
        Depth
      >
  }[Extract<Extract<keyof Config, string>, Extract<keyof States, string>>]

  type HandlerNodeChildStateIds<
    AllStates extends StateSchemas,
    Node,
    Prefix extends string,
    Config,
    Depth extends ReadonlyArray<unknown>
  > = Depth extends readonly [] ? never
    : HandlerChildren<Node> extends infer Children extends StateSchemas ? [Children] extends [never] ? never
      : HandlerTreeStateIds<AllStates, Children, Prefix, HandlerNodeChildrenConfig<Config>, HandlerNextDepth<Depth>>
    : never

  type HandlerConfigError<Config> =
    | Effect.Error<EventHandlerReturn<Config>>
    | Effect.Error<AlwaysReturn<Config>>
    | Effect.Error<DoneReturn<Config>>
    | Effect.Error<StateActionReturn<Config, "entry">>
    | Effect.Error<StateActionReturn<Config, "exit">>
    | InvokeError<Config>

  type HandlerTreeError<
    AllStates extends StateSchemas,
    Events extends ReadonlyArray<TaggedSchema>,
    Emits extends ReadonlyArray<TaggedSchema>,
    States extends StateSchemas,
    Prefix extends string,
    Config,
    Depth extends ReadonlyArray<unknown> = HandlerDepth
  > = {
    readonly [Key in Extract<Extract<keyof Config, string>, Extract<keyof States, string>>]:
      | HandlerConfigError<HandlerConfigPart<Config[Key]>>
      | HandlerNodeChildError<
        AllStates,
        Events,
        Emits,
        States[Key],
        HandlerStateId<AllStates, JoinPath<Prefix, Key>>,
        Config[Key],
        Depth
      >
  }[Extract<Extract<keyof Config, string>, Extract<keyof States, string>>]

  type HandlerNodeChildError<
    AllStates extends StateSchemas,
    Events extends ReadonlyArray<TaggedSchema>,
    Emits extends ReadonlyArray<TaggedSchema>,
    Node,
    Prefix extends string,
    Config,
    Depth extends ReadonlyArray<unknown>
  > = Depth extends readonly [] ? never
    : HandlerChildren<Node> extends infer Children extends StateSchemas ? [Children] extends [never] ? never
      : HandlerTreeError<
        AllStates,
        Events,
        Emits,
        Children,
        Prefix,
        HandlerNodeChildrenConfig<Config>,
        HandlerNextDepth<Depth>
      >
    : never

  type HandlerTreeServices<
    AllStates extends StateSchemas,
    Events extends ReadonlyArray<TaggedSchema>,
    Emits extends ReadonlyArray<TaggedSchema>,
    States extends StateSchemas,
    Prefix extends string,
    Config,
    Depth extends ReadonlyArray<unknown> = HandlerDepth
  > = {
    readonly [Key in Extract<Extract<keyof Config, string>, Extract<keyof States, string>>]:
      | ConfigServices<HandlerConfigPart<Config[Key]>>
      | HandlerNodeChildServices<
        AllStates,
        Events,
        Emits,
        States[Key],
        HandlerStateId<AllStates, JoinPath<Prefix, Key>>,
        Config[Key],
        Depth
      >
  }[Extract<Extract<keyof Config, string>, Extract<keyof States, string>>]

  type HandlerNodeChildServices<
    AllStates extends StateSchemas,
    Events extends ReadonlyArray<TaggedSchema>,
    Emits extends ReadonlyArray<TaggedSchema>,
    Node,
    Prefix extends string,
    Config,
    Depth extends ReadonlyArray<unknown>
  > = Depth extends readonly [] ? never
    : HandlerChildren<Node> extends infer Children extends StateSchemas ? [Children] extends [never] ? never
      : HandlerTreeServices<
        AllStates,
        Events,
        Emits,
        Children,
        Prefix,
        HandlerNodeChildrenConfig<Config>,
        HandlerNextDepth<Depth>
      >
    : never

  type HandlerTreeFinalStates<
    AllStates extends StateSchemas,
    States extends StateSchemas,
    Prefix extends string,
    Config,
    Depth extends ReadonlyArray<unknown> = HandlerDepth
  > = {
    readonly [Key in Extract<Extract<keyof Config, string>, Extract<keyof States, string>>]:
      | Extract<
        FinalStateFromConfig<HandlerConfigPart<Config[Key]>, HandlerStateId<AllStates, JoinPath<Prefix, Key>>>,
        StateIdentifier<AllStates>
      >
      | HandlerNodeChildFinalStates<
        AllStates,
        States[Key],
        HandlerStateId<AllStates, JoinPath<Prefix, Key>>,
        Config[Key],
        Depth
      >
  }[Extract<Extract<keyof Config, string>, Extract<keyof States, string>>]

  type HandlerNodeChildFinalStates<
    AllStates extends StateSchemas,
    Node,
    Prefix extends string,
    Config,
    Depth extends ReadonlyArray<unknown>
  > = Depth extends readonly [] ? never
    : HandlerChildren<Node> extends infer Children extends StateSchemas ? [Children] extends [never] ? never
      : HandlerTreeFinalStates<AllStates, Children, Prefix, HandlerNodeChildrenConfig<Config>, HandlerNextDepth<Depth>>
    : never

  type HandlerTreeOutput<
    AllStates extends StateSchemas,
    States extends StateSchemas,
    Prefix extends string,
    Config,
    Depth extends ReadonlyArray<unknown> = HandlerDepth
  > = {
    readonly [Key in Extract<Extract<keyof Config, string>, Extract<keyof States, string>>]:
      | ("output" extends keyof HandlerConfigPart<Config[Key]> ? OutputByIdentifier<
          AllStates,
          HandlerStateId<AllStates, JoinPath<Prefix, Key>>
        >
        : never)
      | HandlerNodeChildOutput<
        AllStates,
        States[Key],
        HandlerStateId<AllStates, JoinPath<Prefix, Key>>,
        Config[Key],
        Depth
      >
  }[Extract<Extract<keyof Config, string>, Extract<keyof States, string>>]

  type HandlerNodeChildOutput<
    AllStates extends StateSchemas,
    Node,
    Prefix extends string,
    Config,
    Depth extends ReadonlyArray<unknown>
  > = Depth extends readonly [] ? never
    : HandlerChildren<Node> extends infer Children extends StateSchemas ? [Children] extends [never] ? never
      : HandlerTreeOutput<AllStates, Children, Prefix, HandlerNodeChildrenConfig<Config>, HandlerNextDepth<Depth>>
    : never

  type HandlerTreeOutputStates<
    AllStates extends StateSchemas,
    States extends StateSchemas,
    Prefix extends string,
    Config,
    Depth extends ReadonlyArray<unknown> = HandlerDepth
  > = {
    readonly [Key in Extract<Extract<keyof Config, string>, Extract<keyof States, string>>]:
      | HandlerOutputStates<
        AllStates,
        HandlerStateId<AllStates, JoinPath<Prefix, Key>>,
        HandlerConfigPart<Config[Key]>
      >
      | HandlerNodeChildOutputStates<
        AllStates,
        States[Key],
        HandlerStateId<AllStates, JoinPath<Prefix, Key>>,
        Config[Key],
        Depth
      >
  }[Extract<Extract<keyof Config, string>, Extract<keyof States, string>>]

  type HandlerNodeChildOutputStates<
    AllStates extends StateSchemas,
    Node,
    Prefix extends string,
    Config,
    Depth extends ReadonlyArray<unknown>
  > = Depth extends readonly [] ? never
    : HandlerChildren<Node> extends infer Children extends StateSchemas ? [Children] extends [never] ? never
      : HandlerTreeOutputStates<AllStates, Children, Prefix, HandlerNodeChildrenConfig<Config>, HandlerNextDepth<Depth>>
    : never

  type HandleTreeResult<
    AllStates extends StateSchemas,
    Events extends ReadonlyArray<TaggedSchema>,
    Emits extends ReadonlyArray<TaggedSchema>,
    Input extends Schema.Top,
    UnhandledStates extends StateIdentifier<AllStates>,
    E,
    R,
    InitialE,
    InitialR,
    FinalStates extends StateIdentifier<AllStates>,
    Output,
    OutputStates extends StateIdentifier<AllStates>,
    Config
  > = Machine<
    AllStates,
    Events,
    Input,
    Exclude<UnhandledStates, HandlerTreeStateIds<AllStates, AllStates, "", Config>>,
    E | HandlerTreeError<AllStates, Events, Emits, AllStates, "", Config>,
    ExcludeCompatibleRuntime<
      R | HandlerTreeServices<AllStates, Events, Emits, AllStates, "", Config>,
      EventOf<Events>,
      EmitOf<Emits>
    >,
    InitialE,
    InitialR,
    FinalStates | Extract<HandlerTreeFinalStates<AllStates, AllStates, "", Config>, StateIdentifier<AllStates>>,
    Output | HandlerTreeOutput<AllStates, AllStates, "", Config>,
    Emits,
    OutputStates | Extract<HandlerTreeOutputStates<AllStates, AllStates, "", Config>, StateIdentifier<AllStates>>
  >

  /**
   * Adds state handlers from a root state object.
   *
   * **Gotchas**
   *
   * Type inference traverses up to eight nested child-state objects. Deeper
   * handler trees are rejected explicitly instead of silently dropping their
   * error, service, final-state, or output channels.
   *
   * @category combinators
   * @since 4.0.0
   */
  export interface Handler<
    States extends StateSchemas,
    Events extends ReadonlyArray<TaggedSchema>,
    Emits extends ReadonlyArray<TaggedSchema>,
    Input extends Schema.Top,
    UnhandledStates extends StateIdentifier<States>,
    E,
    R,
    InitialE,
    InitialR,
    FinalStates extends StateIdentifier<States>,
    Output,
    OutputStates extends StateIdentifier<States>
  > {
    <const Config extends HandlerTree<States, States, Events, Emits, E, R, "">>(
      config:
        & Config
        & HandlerTreeValidation<
          States,
          States,
          Events,
          "",
          Config,
          OutputStates | Extract<HandlerTreeOutputStates<States, States, "", Config>, StateIdentifier<States>>
        >
        & EnsureCompatibleRuntime<
          HandlerTreeServices<States, Events, Emits, States, "", Config>,
          EventOf<Events>,
          EmitOf<Emits>
        >
    ): HandleTreeResult<
      States,
      Events,
      Emits,
      Input,
      UnhandledStates,
      E,
      R,
      InitialE,
      InitialR,
      FinalStates,
      Output,
      OutputStates,
      Config
    >
  }

  /**
   * Any state config.
   *
   * @category utility types
   * @since 4.0.0
   */
  export type AnyStateConfig = StateConfig<any, any, any, any, any, any, any>

  /**
   * Runtime event-handler map stored for a single state tag.
   *
   * @category models
   * @since 4.0.0
   */
  export type EventHandlerMap<
    States extends StateSchemas,
    Events extends ReadonlyArray<TaggedSchema>,
    Emits extends ReadonlyArray<TaggedSchema>,
    StateId extends StateIdentifier<States>,
    EventTag extends TagOf<Events[number]>,
    E,
    R
  > = Readonly<
    Record<
      PropertyKey,
      | ((context: HandlerContext<States, Events, Emits, StateId, EventTag, E, R>) => HandlerResult<States, E, R>)
      | {
        readonly reenter?: boolean
        readonly transition: (
          context: HandlerContext<States, Events, Emits, StateId, EventTag, E, R>
        ) => HandlerResult<States, E, R>
      }
    >
  >

  /**
   * Runtime state config stored for a single state tag.
   *
   * @category models
   * @since 4.0.0
   */
  export interface StateConfig<
    States extends StateSchemas,
    Events extends ReadonlyArray<TaggedSchema>,
    Emits extends ReadonlyArray<TaggedSchema>,
    StateId extends StateIdentifier<States>,
    EventTag extends TagOf<Events[number]>,
    E,
    R
  > {
    readonly type?: "final" | "active"
    readonly entry?: (context: StateActionContext<States, Events, Emits, StateId>) => StateActionResult<E, R>
    readonly exit?: (context: StateActionContext<States, Events, Emits, StateId>) => StateActionResult<E, R>
    readonly invoke?: InvokeDefinition<States, Events, Emits, StateId>
    readonly always?: (context: AlwaysContext<States, Events, Emits, StateId>) => HandlerResult<States, E, R>
    readonly onDone?: (context: DoneContext<States, Events, Emits, StateId>) => HandlerResult<States, E, R>
    readonly output?:
      | ((context: FinalOutputContext<States, Events, StateId>) => any)
      | ((context: ParallelOutputContext<States, Events, StateId>) => any)
    readonly on?: EventHandlerMap<States, Events, Emits, StateId, EventTag, E, R>
  }

  /**
   * Runtime handler table stored on a machine.
   *
   * @category models
   * @since 4.0.0
   */
  export type StateConfigs<
    States extends StateSchemas,
    Events extends ReadonlyArray<TaggedSchema>,
    Emits extends ReadonlyArray<TaggedSchema>,
    StateId extends StateIdentifier<States>,
    EventTag extends TagOf<Events[number]>,
    E,
    R
  > = Readonly<Record<PropertyKey, StateConfig<States, Events, Emits, StateId, EventTag, E, R>>>
}

const Proto = {
  ...PipeInspectableProto,
  [TypeId]: TypeId,
  toJSON() {
    return {
      _id: "Machine"
    }
  }
}

const cloneWithHandlers = (
  self: Machine.Any,
  handlers: Machine.StateConfigs<any, any, any, any, any, any, any>
): Machine.Any => {
  const machine = Object.create(Proto)
  machine.states = self.states
  machine.events = self.events
  machine.emits = self.emits
  machine.input = self.input
  machine.id = self.id
  machine.initial = self.initial
  machine.stateNodes = self.stateNodes
  machine.makeTargetBuilder = self.makeTargetBuilder
  machine.handlers = handlers
  machine.handle = makeHandle(machine)
  return machine
}

const flattenHandlers = (
  handlers: Record<PropertyKey, Machine.AnyStateConfig>,
  states: Machine.StateTree,
  prefix: string,
  config: Record<string, unknown>
): void => {
  for (const key of Object.keys(config)) {
    const path = prefix === "" ? key : `${prefix}.${key}`
    if (!hasProperty(states, key)) {
      throw new Error(`Machine received handler for unknown state "${path}"`)
    }
    const nodeConfig = config[key]
    if (typeof nodeConfig !== "object" || nodeConfig === null) {
      throw new Error(`Machine expected state "${path}" handler to be an object`)
    }
    const { states: childConfig, ...stateConfig } = nodeConfig as Record<string, unknown>
    handlers[path] = stateConfig as Machine.AnyStateConfig
    if (childConfig !== undefined) {
      const node = Model.getStateNodeDefinition(path, states[key])
      if (node.states === undefined) {
        throw new Error(`Machine expected state "${path}" to declare child states`)
      }
      if (typeof childConfig !== "object" || childConfig === null) {
        throw new Error(`Machine expected state "${path}" child handlers to be an object`)
      }
      flattenHandlers(handlers, node.states, path, childConfig as Record<string, unknown>)
    }
  }
}

const makeHandle = (self: Machine.Any): Machine.Any["handle"] =>
  ((config: Record<string, unknown>) => {
    const handlers: Record<PropertyKey, Machine.AnyStateConfig> = Object.assign(
      Object.create(null),
      self.handlers
    )
    flattenHandlers(handlers, self.states, "", config)
    return cloneWithHandlers(self, handlers)
  }) as Machine.Any["handle"]

/**
 * Returns `true` if a value is a `Machine`.
 *
 * @category guards
 * @since 4.0.0
 */
export const isMachine = (
  u: unknown
): u is Machine.Any => hasProperty(u, TypeId)

/**
 * Returns `true` if a state snapshot is final for a machine.
 *
 * @category guards
 * @since 4.0.0
 */
export const isFinal = <
  const States extends Machine.StateSchemas,
  const Events extends ReadonlyArray<Machine.TaggedSchema>,
  const Emits extends ReadonlyArray<Machine.TaggedSchema>,
  const Input extends Schema.Top = typeof Schema.Void,
  UnhandledStates extends Machine.StateIdentifier<States> = Machine.StateIdentifier<States>,
  E = never,
  R = never,
  InitialE = never,
  InitialR = never,
  FinalStates extends Machine.StateIdentifier<States> = never,
  Output = never,
  OutputStates extends Machine.StateIdentifier<States> = never
>(
  machine: Machine<
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
    Emits,
    OutputStates
  >,
  state: Machine.Snapshot<States>
): state is Machine.SnapshotContainingFinal<States, FinalStates> => internalPlanner.isFinal(machine, state)

type SnapshotBuilderOptions = {
  readonly mode: "initial" | "full"
  readonly prefix: string
}

const makeSnapshotBuilder = (
  states: Machine.StateTree,
  options: SnapshotBuilderOptions
): unknown => {
  const builder: Record<string, unknown> = {}
  for (const key of Object.keys(states)) {
    builder[key] = (value: unknown, selector?: (builder: unknown) => unknown) =>
      makeSnapshotForNode(states[key], key, value, selector, options)
  }
  return builder
}

const makeParallelSnapshotBuilder = (
  states: Machine.StateTree,
  options: SnapshotBuilderOptions,
  regions: Readonly<Record<string, unknown>>
): unknown => {
  const builder: Record<string, unknown> = {}
  Object.defineProperty(builder, SnapshotBuilderStateTypeId, {
    value: regions,
    enumerable: false
  })
  for (const key of Object.keys(states)) {
    if (hasProperty(regions, key)) {
      continue
    }
    builder[key] = (value: unknown, selector?: (builder: unknown) => unknown) => {
      const nextRegions: Record<string, unknown> = {}
      for (const regionKey of Object.keys(regions)) {
        nextRegions[regionKey] = regions[regionKey]
      }
      nextRegions[key] = makeSnapshotForNode(states[key], key, value, selector, options)
      return makeParallelSnapshotBuilder(states, options, nextRegions)
    }
  }
  return builder
}

const getParallelSnapshotBuilderRegions = (
  path: string,
  states: Machine.StateTree,
  builder: unknown
): Readonly<Record<string, unknown>> => {
  if (typeof builder !== "object" || builder === null || !hasProperty(builder, SnapshotBuilderStateTypeId)) {
    throw new Error(`Machine expected parallel state "${path}" builder callback to return a builder`)
  }
  const regions = (builder as { readonly [SnapshotBuilderStateTypeId]: Readonly<Record<string, unknown>> })[
    SnapshotBuilderStateTypeId
  ]
  for (const key of Object.keys(states)) {
    if (!hasProperty(regions, key)) {
      throw new Error(`Machine expected parallel state "${path}" builder callback to provide region "${key}"`)
    }
  }
  return regions
}

const makeSnapshotForNode = (
  definition: Machine.TaggedSchema | Machine.StateNodeConfig,
  key: string,
  value: unknown,
  selector: ((builder: unknown) => unknown) | undefined,
  options: SnapshotBuilderOptions
): Record<string, unknown> => {
  const path = options.prefix === "" ? key : `${options.prefix}.${key}`
  const node = Model.getStateNodeDefinition(path, definition)
  const snapshot: Record<string, unknown> = {
    path,
    value
  }
  if (node.states === undefined) {
    return snapshot
  }
  if (selector === undefined) {
    throw new Error(`Machine expected state "${path}" builder to provide active child states`)
  }
  if (node.type === "parallel") {
    const builder = makeParallelSnapshotBuilder(node.states, { ...options, prefix: path }, {})
    snapshot.states = getParallelSnapshotBuilderRegions(path, node.states, selector(builder))
    return snapshot
  }
  const childStates = options.mode === "initial" && node.initial !== undefined
    ? { [node.initial]: node.states[node.initial] }
    : node.states
  snapshot.state = selector(makeSnapshotBuilder(childStates, { ...options, prefix: path }))
  return snapshot
}

const getTargetBuilderNode = (
  stateNodes: Machine.StateNodes,
  path: string
): Machine.StateNode => {
  const node = stateNodes.byPath.get(path)
  if (node === undefined) {
    throw new Error(`Machine expected state path "${path}" to exist`)
  }
  return node
}

const getLocalTargetScope = (
  stateNodes: Machine.StateNodes,
  source: string
): string | undefined => {
  let current: string | undefined = source
  while (current !== undefined) {
    const node = stateNodes.byPath.get(current)
    if (node === undefined) {
      return undefined
    }
    if (node.type === "compound") {
      return node.path
    }
    current = node.parent
  }
  return undefined
}

const hasTargetValues = (
  values: Readonly<Record<string, unknown>> | undefined
): values is Readonly<Record<string, unknown>> => values !== undefined && Object.keys(values).length > 0

const makeTargetWithValues = (
  path: string,
  value: unknown,
  values: Readonly<Record<string, unknown>> | undefined
): Machine.Target<any, any> =>
  hasTargetValues(values)
    ? Model.makeTarget(path as any, value as any, { values: values as any })
    : Model.makeTarget(path as any, value as any)

const extendTargetValues = (
  values: Readonly<Record<string, unknown>> | undefined,
  path: string,
  value: unknown
): Readonly<Record<string, unknown>> => {
  const next: Record<string, unknown> = {}
  if (values !== undefined) {
    for (const key of Object.keys(values)) {
      next[key] = values[key]
    }
  }
  next[path] = value
  return next
}

const makeLocalTargetChildBuilder = (
  stateNodes: Machine.StateNodes,
  parentPath: string,
  values: Readonly<Record<string, unknown>> | undefined
): unknown => {
  const parent = getTargetBuilderNode(stateNodes, parentPath)
  const builder: Record<string, unknown> = {}
  for (const childPath of parent.children) {
    const child = getTargetBuilderNode(stateNodes, childPath)
    builder[child.key] = (value: unknown, selector?: (builder: unknown) => unknown) => {
      if (child.type === "atomic" || child.type === "final") {
        return makeTargetWithValues(child.path, value, values)
      }
      if (selector === undefined) {
        throw new Error(`Machine expected target "${child.path}" builder to provide an active child state`)
      }
      return selector(makeLocalTargetChildBuilder(
        stateNodes,
        child.path,
        extendTargetValues(values, child.path, value)
      ))
    }
  }
  return builder
}

const makeLocalTargetBuilder = (
  stateNodes: Machine.StateNodes,
  source: string
): unknown => {
  const scope = getLocalTargetScope(stateNodes, source)
  if (scope === undefined) {
    return {}
  }
  const builder = makeLocalTargetChildBuilder(stateNodes, scope, undefined) as Record<string, unknown>
  builder.with = (value: unknown, selector?: (builder: unknown) => unknown) => {
    if (selector === undefined) {
      throw new Error(`Machine expected target "${scope}" builder to provide an active child state`)
    }
    return selector(makeLocalTargetChildBuilder(stateNodes, scope, { [scope]: value }))
  }
  return builder
}

const addBranchTargetChildren = (
  builder: Record<string, unknown>,
  stateNodes: Machine.StateNodes,
  parentPath: string,
  values: Readonly<Record<string, unknown>> | undefined
): void => {
  const parent = getTargetBuilderNode(stateNodes, parentPath)
  for (const childPath of parent.children) {
    const child = getTargetBuilderNode(stateNodes, childPath)
    builder[child.key] = makeBranchTargetNodeBuilder(stateNodes, child.path, values)
  }
}

const makeBranchTargetNodeBuilder = (
  stateNodes: Machine.StateNodes,
  path: string,
  values: Readonly<Record<string, unknown>> | undefined
): unknown => {
  const node = getTargetBuilderNode(stateNodes, path)
  if (node.type === "atomic" || node.type === "final") {
    return (value: unknown) => makeTargetWithValues(node.path, value, values)
  }
  const builder = ((value: unknown, selector?: (builder: unknown) => unknown) => {
    if (selector === undefined) {
      throw new Error(`Machine expected target "${node.path}" builder to provide an active child state`)
    }
    const nextBuilder: Record<string, unknown> = {}
    addBranchTargetChildren(nextBuilder, stateNodes, node.path, extendTargetValues(values, node.path, value))
    return selector(nextBuilder)
  }) as unknown as Record<string, unknown>
  addBranchTargetChildren(builder, stateNodes, node.path, values)
  return builder
}

const makeBranchTargetBuilder = (
  stateNodes: Machine.StateNodes,
  source: string
): unknown => {
  const rootPath = source.split(".")[0]!
  const root = getTargetBuilderNode(stateNodes, rootPath)
  return {
    [root.key]: makeBranchTargetNodeBuilder(stateNodes, root.path, undefined)
  }
}

const makeTargetBuilder = <const States extends Machine.StateSchemas>(
  states: States,
  stateNodes: Machine.StateNodes
) => {
  const full = makeSnapshotBuilder(states, { mode: "full", prefix: "" }) as Machine.FullTargetBuilder<States>
  return <Source extends Machine.StateIdentifier<States>>(source: Source): Machine.TargetBuilder<States, Source> =>
    ({
      local: makeLocalTargetBuilder(stateNodes, source),
      branch: makeBranchTargetBuilder(stateNodes, source),
      full
    }) as Machine.TargetBuilder<States, Source>
}

const getSnapshotByPath = (
  snapshot: Machine.AtomicSnapshot<string, unknown>,
  path: string,
  parents?: Record<string, unknown>
): Option.Option<Machine.AtomicSnapshot<string, unknown>> => {
  if (snapshot.path === path) {
    return Option.some(snapshot)
  }
  if (!path.startsWith(`${snapshot.path}.`)) {
    return Option.none()
  }
  if (parents !== undefined) {
    parents[snapshot.path] = snapshot.value
  }
  if (hasProperty(snapshot, "state") && Model.isSnapshot(snapshot.state)) {
    return getSnapshotByPath(snapshot.state, path, parents)
  }
  if (hasProperty(snapshot, "states") && typeof snapshot.states === "object" && snapshot.states !== null) {
    for (const child of Object.values(snapshot.states)) {
      if (Model.isSnapshot(child)) {
        const result = getSnapshotByPath(child, path, parents)
        if (Option.isSome(result)) {
          return result
        }
      }
    }
  }
  return Option.none()
}

/**
 * Defines a state tree while preserving literal state paths.
 *
 * **When to use**
 *
 * Use when you want to pass a state tree to `make` and also get typed
 * snapshot builders for initial states and tests.
 *
 * **Details**
 *
 * The returned `states` property is the same object passed to `defineStates`.
 * The returned `initial` builder creates snapshots without user-authored path
 * strings and enforces compound and parallel initial-state rules.
 *
 * **Example** (Atomic initial snapshot)
 *
 * ```ts
 * import { Schema } from "effect"
 * import { Machine } from "effect/unstable/machine"
 *
 * class Idle extends Schema.TaggedClass<Idle>("Idle")("Idle", {}) {}
 *
 * const States = Machine.defineStates({ idle: Idle })
 *
 * Machine.make({
 *   states: States.states,
 *   events: [],
 *   initial: () => States.initial.idle(new Idle({}))
 * })
 * ```
 *
 * @category constructors
 * @since 4.0.0
 */
export const defineStates = <
  const States extends Machine.StateSchemas
>(
  states: States & DefineStateTreeInput<NoInfer<States>>,
  ..._validation: ValidateDefinedStates<NoInfer<States>>
): Machine.DefinedStates<States> => ({
  states: states as States,
  initial: makeSnapshotBuilder(states as States, { mode: "initial", prefix: "" }) as Machine.InitialBuilder<States>,
  get: ((snapshot, path) =>
    getSnapshotByPath(snapshot, path).pipe(
      Option.map((snapshot) => snapshot.value)
    )) as Machine.DefinedStates<States>["get"],
  getWithParents: ((snapshot, path) => {
    const parents: Record<string, unknown> = {}
    return getSnapshotByPath(snapshot, path, parents).pipe(
      Option.map((snapshot) => ({ value: snapshot.value, parents }))
    )
  }) as Machine.DefinedStates<States>["getWithParents"],
  getSnapshot: getSnapshotByPath as unknown as Machine.DefinedStates<States>["getSnapshot"],
  matches: (snapshot, path) => Option.isSome(getSnapshotByPath(snapshot, path))
})

/**
 * Creates a schema-first machine definition.
 *
 * **Details**
 *
 * State and event schemas provide runtime boundary validation while their
 * decoded types drive handler, state, event, target, error, and service
 * inference. State-tree validation is applied whether `states` comes from
 * `defineStates` or is passed inline. Call `handle` on the returned definition
 * to implement state behavior with ordinary TypeScript control flow.
 *
 * **Example** (Typed counter machine)
 *
 * ```ts
 * import { Schema } from "effect"
 * import { Machine } from "effect/unstable/machine"
 *
 * class Count extends Schema.TaggedClass<Count>("Count")("Count", {
 *   value: Schema.Number
 * }) {}
 *
 * class Increment extends Schema.TaggedClass<Increment>("Increment")("Increment", {
 *   by: Schema.Number
 * }) {}
 *
 * const States = Machine.defineStates({ Count })
 *
 * const counter = Machine.make({
 *   states: States.states,
 *   events: [Increment],
 *   initial: () => States.initial.Count(new Count({ value: 0 }))
 * }).handle({
 *   Count: {
 *     on: {
 *       Increment: ({ event, state }) =>
 *         States.initial.Count(new Count({ value: state.value + event.by }))
 *     }
 *   }
 * })
 * ```
 *
 * @see {@link defineStates} for typed initial snapshot builders.
 * @category constructors
 * @since 4.0.0
 */
export const make = <
  const States extends Machine.StateSchemas,
  const Events extends ReadonlyArray<Machine.TaggedSchema>,
  const Emits extends ReadonlyArray<Machine.TaggedSchema> = readonly [],
  const Input extends Schema.Top = typeof Schema.Void,
  InitialE = never,
  InitialR = never
>(
  config: {
    readonly id?: string
    readonly states: States & DefineStateTreeInput<NoInfer<States>>
    readonly events: Events
    readonly emits?: Emits
    readonly input?: Input
    readonly initial: (...args: [...Machine.InputArgs<Input>]) => Machine.InitialResult<States, InitialE, InitialR>
  },
  ..._validation: ValidateDefinedStates<NoInfer<States>>
): Machine<
  States,
  Events,
  Input,
  Machine.StateIdentifier<States>,
  never,
  never,
  InitialE,
  InitialR,
  Machine.FinalStateFromDefinition<States>,
  never,
  Emits
> => {
  const self = Object.create(Proto)
  self.states = config.states
  self.events = config.events
  self.emits = config.emits ?? []
  self.input = config.input
  self.id = config.id
  self.initial = config.initial
  self.stateNodes = Model.compileStateNodes(config.states)
  self.makeTargetBuilder = makeTargetBuilder(config.states, self.stateNodes)
  self.handlers = Object.create(null)
  self.handle = makeHandle(self)
  return self
}

/**
 * Encodes a decoded machine snapshot into a normalized data representation.
 *
 * **When to use**
 *
 * Use when you need to store or transport a statechart snapshot independently
 * of its local machine runtime.
 *
 * **Details**
 *
 * Each active state value and completed output is encoded with the schema
 * declared for its state path. The result contains no process-local runtime
 * state.
 *
 * **Gotchas**
 *
 * The encoded snapshot does not contain the machine definition, machine
 * version, running children, invoked process state, services, or subscriptions.
 * Store machine identity and migration metadata alongside the result when the
 * snapshot crosses deployment versions. Schema encoding does not by itself
 * guarantee JSON-compatible values; schemas used with JSON-backed storage must
 * have JSON-compatible encoded representations.
 *
 * @see {@link decodeSnapshot} for restoring an encoded snapshot.
 * @category encoding
 * @since 4.0.0
 */
export const encodeSnapshot: <
  const States extends Machine.StateSchemas,
  const Events extends ReadonlyArray<Machine.TaggedSchema>,
  const Emits extends ReadonlyArray<Machine.TaggedSchema> = readonly [],
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
  snapshot: Machine.Snapshot<States>
) => Effect.Effect<
  Machine.EncodedSnapshot,
  MachineSchemaEncodeError,
  Machine.SnapshotEncodingServices<States>
> = Model.encodeSnapshot as any

/**
 * Decodes a normalized data representation into a validated machine snapshot.
 *
 * **When to use**
 *
 * Use when you need to resume planning from a snapshot loaded from storage or
 * received over a transport boundary.
 *
 * **Details**
 *
 * Decoding resolves every path against the supplied machine, decodes values
 * with their state and output schemas, validates compound and parallel state
 * relationships, and rebuilds the recursive in-memory snapshot.
 *
 * **Gotchas**
 *
 * Decoding restores logical statechart data only. It does not restart invoked
 * processes, recreate spawned children, or restore a previous `MachineRef`.
 *
 * @see {@link encodeSnapshot} for creating the normalized representation.
 * @category decoding
 * @since 4.0.0
 */
export const decodeSnapshot: <
  const States extends Machine.StateSchemas,
  const Events extends ReadonlyArray<Machine.TaggedSchema>,
  const Emits extends ReadonlyArray<Machine.TaggedSchema> = readonly [],
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
  encoded: unknown
) => Effect.Effect<
  Machine.Snapshot<States>,
  MachineSchemaDecodeError,
  Machine.SnapshotDecodingServices<States>
> = Model.decodeSnapshot as any

/**
 * Creates an invoked child process configuration for an active state.
 *
 * **When to use**
 *
 * Use to run a child process while a machine remains in a state. Successful
 * outputs are sent directly to the parent machine as events; `void` sends
 * nothing. Unrecovered child failures fail the owning machine. Active
 * snapshots can optionally be mapped to progress events.
 *
 * **Gotchas**
 *
 * Invoked child processes run while their owning state is active and are
 * stopped before the state exits. An unrecovered child failure fails the owning
 * machine; recover inside the child Effect when failure should become an event.
 * The `src` callback is intentionally independent from its parent state. When
 * construction depends on the typed state, lifecycle event, or runtime, use
 * the state config factory form `invoke: (context) => Machine.invoke(...)` and
 * close over that context from `src`.
 *
 * **Example** (Effect output as a parent event)
 *
 * ```ts
 * import { Effect, Schema } from "effect"
 * import { Machine } from "effect/unstable/machine"
 *
 * class Loaded extends Schema.TaggedClass<Loaded>("Loaded")("Loaded", {
 *   value: Schema.String
 * }) {}
 *
 * const load = Machine.invoke({
 *   id: "load",
 *   src: () => Machine.effect(Effect.succeed(new Loaded({ value: "ready" })))
 * })
 * ```
 *
 * @see {@link effect} for one-shot child effects.
 * @see {@link spawn} for children whose lifetime is controlled by actions.
 * @category constructors
 * @since 4.0.0
 */
export const invoke = <
  ChildState,
  ChildEvent,
  ChildError = never,
  ChildRequirements = never,
  ChildOutput = never,
  ChildInitialError = never,
  Event = never,
  Id extends string = string
>(
  config: {
    readonly id: Id
    readonly src: () => Logic<
      ChildState,
      ChildEvent,
      ChildError,
      ChildRequirements,
      ChildOutput,
      ChildInitialError
    >
    readonly snapshot?: (
      context: Machine.InvokeSnapshotContext<ChildState, ChildError | ChildInitialError, ChildOutput>
    ) => Event | undefined
  } & ChildAddress.Compatibility<Id, ChildEvent>
): Machine.InvokeConfig<
  any,
  any,
  any,
  any,
  Event,
  ChildState,
  ChildEvent,
  ChildError,
  ChildRequirements,
  ChildOutput,
  ChildInitialError
> => ({ ...config, [InvokeTypeId]: undefined as any })

type InvokeMachineInput<Input extends Schema.Top> = Input extends typeof Schema.Void ? {
    readonly input?: never
  }
  : {
    readonly input: Input["Type"]
  }

/**
 * Creates an invoked child process from a complete statechart machine.
 *
 * **When to use**
 *
 * Use when a state should own another statechart machine and communicate with
 * it through typed child events, emissions, snapshots, or terminal output.
 *
 * **Details**
 *
 * Child emissions are delivered directly to the parent as events. Active
 * snapshots and terminal output can be mapped to parent events. The owning
 * state controls the child lifetime.
 *
 * **Gotchas**
 *
 * Active invoked machines must have unique child addresses. A machine starts
 * after its owning state's entry actions, so those actions cannot send events
 * to a newly entered child. Unrecovered child failures fail the parent.
 *
 * @see {@link invoke} for invoking lower-level process logic.
 * @see {@link sendTo} for sending events to the invoked machine.
 * @category constructors
 * @since 4.0.0
 */
export const invokeMachine: {
  <
    const States extends Machine.StateSchemas,
    const Events extends ReadonlyArray<Machine.TaggedSchema>,
    const Emits extends ReadonlyArray<Machine.TaggedSchema> = readonly [],
    const Input extends Schema.Top = typeof Schema.Void,
    UnhandledStates extends Machine.StateIdentifier<States> = Machine.StateIdentifier<States>,
    E = never,
    R = never,
    InitialE = never,
    InitialR = never,
    FinalStates extends Machine.StateIdentifier<States> = never,
    Output = never,
    SnapshotEvent = never,
    DoneEvent = never,
    Id extends string = string
  >(
    config:
      & {
        readonly child: ChildMachine<
          Id,
          Machine<
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
        >
        readonly snapshot?: (
          context: Machine.InvokeSnapshotContext<
            Machine.Snapshot<States>,
            | E
            | InitialE
            | ActionError<R | InitialR>
            | InfiniteTransitionError
            | MachineSchemaDecodeError
            | StartupError
            | StoppedError
            | UnhandledEventError,
            Output | undefined
          >
        ) => SnapshotEvent | undefined
        readonly onDone: (context: Machine.InvokeDoneContext<Output | undefined>) => DoneEvent | undefined
      }
      & InvokeMachineInput<Input>
  ): Machine.InvokeConfig<
    any,
    any,
    any,
    any,
    SnapshotEvent,
    Machine.Snapshot<States>,
    Machine.EventOf<Events>,
    E | ActionError<R> | InfiniteTransitionError | MachineSchemaDecodeError | StoppedError | UnhandledEventError,
    ExcludeCompatibleRuntime<
      Exclude<ExecutionServices<InitialR | R>, internalRuntime.MachineRuntime>,
      Machine.EventOf<Events>,
      Machine.EmitOf<Emits>
    >,
    Output | undefined,
    InitialE | ActionError<InitialR | R> | MachineSchemaDecodeError | StartupError | StoppedError,
    Machine.EmitOf<Emits>,
    DoneEvent
  >
  <
    const States extends Machine.StateSchemas,
    const Events extends ReadonlyArray<Machine.TaggedSchema>,
    const Emits extends ReadonlyArray<Machine.TaggedSchema> = readonly [],
    const Input extends Schema.Top = typeof Schema.Void,
    UnhandledStates extends Machine.StateIdentifier<States> = Machine.StateIdentifier<States>,
    E = never,
    R = never,
    InitialE = never,
    InitialR = never,
    FinalStates extends Machine.StateIdentifier<States> = never,
    Output = never,
    SnapshotEvent = never,
    Id extends string = string
  >(
    config:
      & {
        readonly child: ChildMachine<
          Id,
          Machine<
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
        >
        readonly snapshot?: (
          context: Machine.InvokeSnapshotContext<
            Machine.Snapshot<States>,
            | E
            | InitialE
            | ActionError<R | InitialR>
            | InfiniteTransitionError
            | MachineSchemaDecodeError
            | StartupError
            | StoppedError
            | UnhandledEventError,
            Output | undefined
          >
        ) => SnapshotEvent | undefined
        readonly onDone?: never
      }
      & InvokeMachineInput<Input>
  ): Machine.InvokeConfig<
    any,
    any,
    any,
    any,
    SnapshotEvent,
    Machine.Snapshot<States>,
    Machine.EventOf<Events>,
    E | ActionError<R> | InfiniteTransitionError | MachineSchemaDecodeError | StoppedError | UnhandledEventError,
    ExcludeCompatibleRuntime<
      Exclude<ExecutionServices<InitialR | R>, internalRuntime.MachineRuntime>,
      Machine.EventOf<Events>,
      Machine.EmitOf<Emits>
    >,
    Output | undefined,
    InitialE | ActionError<InitialR | R> | MachineSchemaDecodeError | StartupError | StoppedError,
    Machine.EmitOf<Emits>
  >
} = ((config: {
  readonly child: ChildMachine.Any
  readonly input?: unknown
  readonly snapshot?: (context: Machine.InvokeSnapshotContext<any, any, any>) => unknown
  readonly onDone?: (context: Machine.InvokeDoneContext<any>) => unknown
}) => {
  const machine = config.child.machine
  return {
    id: config.child.id,
    addressable: true,
    src: () =>
      machine.input === undefined
        ? internalProcess.toProcessLogic(machine)
        : internalProcess.toProcessLogic(machine, config.input),
    snapshot: config.snapshot,
    onDone: config.onDone,
    [InvokeTypeId]: undefined as any
  }
}) as any

/**
 * Plans the initial state for a machine without running deferred actions.
 *
 * **Details**
 *
 * The returned plan contains the settled initial snapshot, staged actions,
 * emitted events, and optional final output. Planning may evaluate transition
 * logic and follow completion, eventless, and raised-event steps, but it does
 * not execute effects passed to `action`.
 *
 * **Gotchas**
 *
 * Callers that execute a plan manually must run actions sequentially before
 * publishing its state or delivering its emitted events. `start` performs this
 * protocol automatically.
 *
 * @see {@link plan} for planning a received event.
 * @see {@link start} for the managed runtime protocol.
 * @category constructors
 * @since 4.0.0
 */
export const planInitial: <
  const States extends Machine.StateSchemas,
  const Events extends ReadonlyArray<Machine.TaggedSchema>,
  const Emits extends ReadonlyArray<Machine.TaggedSchema> = readonly [],
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
      Effect.Effect<void, ActionError<InitialR | R>, ActionServices<InitialR | R>>
    >
    readonly emittedEvents: ReadonlyArray<Machine.EmitOf<Emits>>
    readonly output: Output | undefined
  },
  InitialE | MachineSchemaDecodeError | StartupError,
  ExcludeCompatibleRuntime<PlanningServices<InitialR | R>, Machine.EventOf<Events>, Machine.EmitOf<Emits>>
> = internalPlanner.planInitial as any

/**
 * Returns the event tags handled by the current state snapshot.
 *
 * @category getters
 * @since 4.0.0
 */
export const enabled = <
  const States extends Machine.StateSchemas,
  const Events extends ReadonlyArray<Machine.TaggedSchema>,
  const Emits extends ReadonlyArray<Machine.TaggedSchema>,
  const Input extends Schema.Top = typeof Schema.Void,
  UnhandledStates extends Machine.StateIdentifier<States> = Machine.StateIdentifier<States>,
  E = never,
  R = never,
  InitialE = never,
  InitialR = never,
  FinalStates extends Machine.StateIdentifier<States> = never,
  Output = never,
  OutputStates extends Machine.StateIdentifier<States> = never
>(
  machine: Machine<
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
    Emits,
    OutputStates
  >,
  state: Machine.Snapshot<States>
): ReadonlyArray<Machine.TagOf<Events[number]>> => internalPlanner.enabled(machine, state)

/**
 * Plans the next state snapshot without running deferred actions.
 *
 * **Details**
 *
 * Planning selects child transitions before conflicting ancestors, permits
 * non-conflicting transitions in parallel regions, processes completion and
 * eventless transitions, and drains raised events in FIFO order. Exit paths
 * are deepest-first and entry paths are parent-first.
 *
 * **Gotchas**
 *
 * `plan` returns data; it does not implement the runtime commit protocol. Run
 * actions sequentially, publish `next` only after they succeed, and then
 * deliver `emittedEvents`. A failed action must retain the previously
 * published state and suppress emissions. An external event with no enabled
 * transition fails with `UnhandledEventError`; an unhandled event produced by
 * `raise` is discarded while the current macrostep continues settling.
 *
 * @see {@link planInitial} for planning machine startup.
 * @see {@link start} for managed execution and lifecycle observation.
 * @category combinators
 * @since 4.0.0
 */
export const plan: <
  const States extends Machine.StateSchemas,
  const Events extends ReadonlyArray<Machine.TaggedSchema>,
  const Emits extends ReadonlyArray<Machine.TaggedSchema> = readonly [],
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
  {
    readonly next: Machine.Snapshot<States>
    readonly actions: ReadonlyArray<Effect.Effect<void, ActionError<R>, ActionServices<R>>>
    readonly emittedEvents: ReadonlyArray<Machine.EmitOf<Emits>>
    readonly microsteps: ReadonlyArray<{
      readonly next: Machine.Snapshot<States>
      readonly event: Machine.EventOf<Events> | InitialEvent
      readonly actions: ReadonlyArray<Effect.Effect<void, ActionError<R>, ActionServices<R>>>
      readonly raisedEvents: ReadonlyArray<Machine.EventOf<Events>>
      readonly emittedEvents: ReadonlyArray<Machine.EmitOf<Emits>>
      readonly exitPaths: ReadonlyArray<string>
      readonly entryPaths: ReadonlyArray<string>
      readonly changed: boolean
    }>
    readonly output: Output | undefined
  },
  E | InfiniteTransitionError | MachineSchemaDecodeError | UnhandledEventError,
  ExcludeCompatibleRuntime<PlanningServices<R>, Machine.EventOf<Events>, Machine.EmitOf<Emits>>
> = internalPlanner.plan as any

/**
 * Defers an effectful action until the current machine step is planned.
 *
 * **Details**
 *
 * The action's error and service requirements are retained in the machine
 * type without becoming requirements of `plan` or `planInitial`. The managed
 * runtime executes staged actions sequentially before publishing the planned
 * state.
 *
 * **Example** (Typed staged action)
 *
 * ```ts
 * import { Context, Effect } from "effect"
 * import { Machine } from "effect/unstable/machine"
 *
 * class Audit extends Context.Service<Audit, {
 *   readonly write: Effect.Effect<void, "AuditError">
 * }>()("example/Audit") {}
 *
 * const writeAudit = Machine.action(
 *   Effect.flatMap(Audit, (audit) => audit.write)
 * )
 * ```
 *
 * @see {@link plan} for inspecting staged actions without executing them.
 * @category combinators
 * @since 4.0.0
 */
export const action = <E, R>(
  effect: Effect.Effect<void, E, R>
): Effect.Effect<void, never, ActionRequirement<E, R>> => internalPlanner.action(effect)

const processLocal = (operation: string): Effect.Effect<never> => Effect.die(new ProcessLocalErrorValue({ operation }))

const standaloneProcessRuntime = internalRuntime.MachineRuntime.of({
  self: {
    id: "Machine.runActions",
    sessionId: "Machine.runActions",
    stop: processLocal("stop self"),
    send: () => processLocal("send to self")
  },
  parent: undefined,
  spawn: () => processLocal("spawn"),
  sendParent: () => processLocal("send to parent"),
  sendTo: () => processLocal("send to child"),
  stopChild: () => processLocal("stop child"),
  failCause: () => processLocal("fail process")
} as internalRuntime.ProcessScope<any>)

/**
 * Runs staged machine actions sequentially with the supplied runtime.
 *
 * **When to use**
 *
 * Use when you implement a commit protocol around `plan` or `planInitial` and
 * need to execute their staged actions before publishing the planned snapshot.
 *
 * **Gotchas**
 *
 * This function only runs actions. The caller remains responsible for
 * publishing the planned state and delivering planned emitted events after all
 * actions succeed. Process-local operations such as `spawn`, `sendTo`, and
 * `stopChild` fail with `ProcessLocalError` because no managed machine process
 * owns the actions.
 *
 * @see {@link plan} for creating a transition plan.
 * @see {@link planInitial} for creating an initial plan.
 * @category running
 * @since 4.0.0
 */
export const runActions = <E, R, Events, Emits>(
  actions: Iterable<Effect.Effect<void, E, R>>,
  runtime: Runtime<Events, Emits>
): Effect.Effect<
  void,
  E | ProcessLocalError,
  Exclude<ExcludeCompatibleRuntime<R, Events, Emits>, MachineRuntimeRequirement>
> =>
  internalRuntime.provideMachineRuntime(
    internalPlanner.runActions(actions, runtime),
    standaloneProcessRuntime
  ).pipe(
    Effect.catchDefect((defect) =>
      defect instanceof ProcessLocalErrorValue
        ? Effect.fail(defect)
        : Effect.die(defect)
    )
  )

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
> => internalPlanner.runtime<Protocol>()

/**
 * Creates a one-shot child process from an Effect.
 *
 * **When to use**
 *
 * Use when you need side effects that produce one typed output or error.
 *
 * **Details**
 *
 * The Effect may run arbitrary side effects. Its success value is the process
 * output, its typed error is preserved, and its services are inferred. When
 * invoked, the output is sent to the owning machine as an event unless it is
 * `void`.
 *
 * **Gotchas**
 *
 * This process has no incoming event protocol. Its Effect runs once. Use
 * `transition` for a process that receives events over time and `logic` for
 * direct machine-local communication or intermediate snapshots.
 *
 * **Example** (Recover a child failure as output)
 *
 * ```ts
 * import { Effect, Schema } from "effect"
 * import { Machine } from "effect/unstable/machine"
 *
 * class LoadFailed extends Schema.TaggedClass<LoadFailed>("LoadFailed")("LoadFailed", {
 *   reason: Schema.String
 * }) {}
 *
 * const load = Machine.effect(
 *   Effect.fail("unavailable").pipe(
 *     Effect.catch((reason) => Effect.succeed(new LoadFailed({ reason })))
 *   )
 * )
 * ```
 *
 * @see {@link transition} for event-driven state.
 * @see {@link logic} for direct control over intermediate snapshots.
 * @category constructors
 * @since 4.0.0
 */
export const effect = <Output, Error = never, Requirements = never>(
  effect: Effect.Effect<Output, Error, Requirements>
): Logic<void, never, Error, Requirements, Output> => ({
  initial: () => Effect.void,
  run: () => effect
})

/**
 * Creates advanced stateful process logic from explicit initialization and
 * execution methods.
 *
 * **When to use**
 *
 * Use when you need a machine-scoped process to publish intermediate snapshots
 * directly.
 *
 * **Details**
 *
 * Initialization produces the first state before `run` starts. The running
 * context receives events, reads or updates state, manages child processes,
 * and can communicate with its owning machine. Errors and service requirements
 * from both phases remain in the returned `Logic` type.
 *
 * **Gotchas**
 *
 * This is the low-level process constructor. Parent messages sent directly
 * through its scope are intentionally `unknown` because the logic does not know
 * which machine will eventually own it. Prefer typed output, typed child
 * addresses, or invoke snapshot mapping when possible.
 *
 * @see {@link effect} for one-shot work.
 * @see {@link transition} for event-driven state.
 * @category constructors
 * @since 4.0.0
 */
export const logic = <
  State,
  Event = any,
  Output = void,
  Error = never,
  Requirements = never,
  InitialError = never,
  InitialRequirements = never
>(
  options: {
    readonly initial:
      | State
      | ((
        scope: Logic.Scope<Event>
      ) => Effect.Effect<State, InitialError, InitialRequirements>)
    readonly run: (
      context: Logic.Context<State, Event>
    ) => Effect.Effect<Output, Error, Requirements>
  }
): Logic<State, Event, Error, Requirements | InitialRequirements, Output, InitialError> => ({
  initial: (scope) =>
    typeof options.initial === "function"
      ? (options.initial as (
        scope: Logic.Scope<Event>
      ) => Effect.Effect<State, InitialError, InitialRequirements>)(scope)
      : Effect.succeed(options.initial),
  run: options.run
})

/**
 * Creates child process logic from an initial state and a transition function.
 *
 * **When to use**
 *
 * Use when a child process only needs sequential event-driven state updates and
 * does not need direct control over intermediate snapshots or child ownership.
 *
 * **Details**
 *
 * Each received event runs the transition Effect against the latest state. The
 * resulting state is published before the next queued event is processed.
 *
 * @see {@link effect} for one-shot work.
 * @see {@link logic} for direct process lifecycle control.
 * @category constructors
 * @since 4.0.0
 */
export const transition = <State, Event, Error = never, Requirements = never>(
  initial: State,
  transition: (state: State, event: Event) => Effect.Effect<State, Error, Requirements>
): Logic<State, Event, Error, Requirements, never> =>
  logic<State, Event, never, Error, Requirements>({
    initial,
    run: ({ receive, updateState }) =>
      receive.pipe(
        Effect.flatMap((event) => updateState((state) => transition(state, event))),
        Effect.forever
      )
  })

/**
 * Creates a typed parent-local child address or complete machine descriptor.
 *
 * **When to use**
 *
 * Use with a complete machine to create the descriptor shared by
 * `invokeMachine`, `sendTo`, and child lookup APIs. The one-argument form
 * creates an event-only address for lower-level process logic.
 *
 * @category constructors
 * @since 4.0.0
 */
export const child: {
  <const Id extends string, M extends Machine.Any>(id: Id, machine: M): ChildMachine<Id, M>
  <Event>(id: string): ChildAddress<Event>
} = ((id: string, machine?: Machine.Any) =>
  machine === undefined
    ? id
    : { [ChildMachineTypeId]: ChildMachineTypeId, id, machine }) as any

/**
 * Spawns a child process owned by the currently running machine.
 *
 * **When to use**
 *
 * Use to create child processes from machine actions when the child
 * should be addressed or stopped by the owning machine instead of tied to a
 * single state's `invoke` lifecycle.
 *
 * **Gotchas**
 *
 * This effect requires the machine runtime, so it only runs from machine
 * actions. A named child id must be unique for the current parent machine until
 * that child stops.
 *
 * @see {@link invoke} for children that start and stop with a state.
 * @see {@link sendTo} for sending events to named children.
 * @category runtime
 * @since 4.0.0
 */
export const spawn: {
  <ChildState, ChildEvent, ChildError, ChildRequirements, ChildOutput, ChildInitialError = never>(
    logic: Logic<
      ChildState,
      ChildEvent,
      ChildError,
      ChildRequirements,
      ChildOutput,
      ChildInitialError
    >
  ): SpawnResult<ChildState, ChildEvent, ChildError, ChildRequirements, ChildOutput, never, ChildInitialError>
  <
    ChildState,
    ChildEvent,
    ChildError,
    ChildRequirements,
    ChildOutput,
    Options extends SpawnOptions,
    ChildInitialError = never
  >(
    logic: Logic<
      ChildState,
      ChildEvent,
      ChildError,
      ChildRequirements,
      ChildOutput,
      ChildInitialError
    >,
    options: Options & ChildAddress.OptionsCompatibility<Options, ChildEvent>
  ): SpawnResult<
    ChildState,
    ChildEvent,
    ChildError,
    ChildRequirements,
    ChildOutput,
    SpawnError<Options>,
    ChildInitialError
  >
} = ((
  logic: Logic<any, any, any, any, any, any>,
  options?: SpawnOptions
) =>
  Effect.flatMap(
    internalRuntime.MachineRuntime,
    (runtime) => options === undefined ? runtime.spawn(logic) : (runtime.spawn as any)(logic, options)
  )) as any

/**
 * Sends an event to a named child process of the running machine.
 *
 * @category runtime
 * @since 4.0.0
 */
export const sendTo: {
  <Child extends ChildMachine.Any>(
    child: Child,
    event: ChildMachine.Event<Child>
  ): Effect.Effect<void, StoppedError, MachineRuntimeRequirement>
  <Address extends string>(
    id: Address,
    event: ChildAddress.Event<Address>
  ): Effect.Effect<void, StoppedError, MachineRuntimeRequirement>
} = ((child: string | ChildMachine.Any, event: unknown) =>
  Effect.flatMap(
    internalRuntime.MachineRuntime,
    (runtime) => runtime.sendTo(typeof child === "string" ? child : child.id, event)
  )) as any

/**
 * Stops a named child process of the running machine.
 *
 * @category runtime
 * @since 4.0.0
 */
export const stopChild: (
  child: string | ChildMachine.Any
) => Effect.Effect<void, never, MachineRuntimeRequirement> = ((child: string | ChildMachine.Any) =>
  Effect.flatMap(
    internalRuntime.MachineRuntime,
    (runtime) => runtime.stopChild(typeof child === "string" ? child : child.id)
  )) as any

/**
 * Returns a stream of terminal lifecycle outcomes for a running machine.
 *
 * @category combinators
 * @since 4.0.0
 */
export const watch = <State, Event, Error = never, Output = never>(
  ref: MachineRef<State, Event, Error, Output>
): Stream.Stream<RuntimeOutcome<State, Error, Output>> => internalRuntime.watch(ref)

/**
 * Starts a machine.
 *
 * **When to use**
 *
 * Use when you want asynchronous event delivery, lifecycle snapshots, `join`,
 * and machine-owned spawned or invoked children.
 *
 * **Details**
 *
 * For each accepted event the runtime plans the complete macrostep, runs staged
 * actions sequentially, stops invokes for exited states, publishes the new
 * state, delivers emitted events, and then starts invokes for entered states.
 * If an action fails, the previous published state is retained and emissions
 * from that plan are suppressed.
 *
 * **Gotchas**
 *
 * The returned handle's `send` operation only enqueues events. Transition
 * failures are reported through the runtime snapshot, `changes`, and `join`
 * rather than being returned by `send`. Sending after the machine reaches any
 * terminal state fails immediately with `StoppedError`.
 *
 * @see {@link plan} for inspecting the same transition plan without executing it.
 * @see {@link watch} for classified terminal outcomes.
 * @category constructors
 * @since 4.0.0
 */
export const start: <
  const States extends Machine.StateSchemas,
  const Events extends ReadonlyArray<Machine.TaggedSchema>,
  const Emits extends ReadonlyArray<Machine.TaggedSchema> = readonly [],
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
  MachineRef<
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
    ExecutionServices<InitialR | R>,
    Machine.EventOf<Events>,
    Machine.EmitOf<Emits>
  >
> = internalProcess.start as any
