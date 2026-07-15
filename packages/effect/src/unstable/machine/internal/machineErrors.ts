import type * as Cause from "../../../Cause.ts"
import * as Data from "../../../Data.ts"
import type * as Schema from "../../../Schema.ts"

/**
 * Error returned when a machine contract value does not match the schema or
 * structural configuration declared for a machine boundary.
 *
 * @category errors
 * @since 4.0.0
 */
export class MachineSchemaDecodeError extends Data.TaggedError("MachineSchemaDecodeError")<{
  readonly machineId: string | undefined
  readonly boundary: "input" | "event" | "emit" | "state" | "output" | "configuration"
  readonly state?: string
  readonly event?: string
  readonly cause: Schema.SchemaError | Cause.Cause<unknown>
}> {}

/**
 * Error returned when an event has no handler for the current state.
 *
 * @category errors
 * @since 4.0.0
 */
export class UnhandledEventError extends Data.TaggedError("UnhandledEventError")<{
  readonly machineId: string | undefined
  readonly state: string
  readonly event: string
}> {}

/**
 * Error returned when a machine does not stabilize within the maximum
 * number of macrostep iterations.
 *
 * @category errors
 * @since 4.0.0
 */
export class InfiniteTransitionError extends Data.TaggedError("InfiniteTransitionError")<{
  readonly machineId: string | undefined
  readonly state: string
  readonly maxIterations: number
}> {}

/**
 * Error returned when a machine fails while running startup lifecycle
 * logic after the initial state has been computed.
 *
 * @category errors
 * @since 4.0.0
 */
export class StartupError extends Data.TaggedError("StartupError")<{
  readonly cause: Cause.Cause<unknown>
}> {}

/**
 * Error returned by `spawn` when a child process with the same id already
 * exists for the current machine.
 *
 * @category errors
 * @since 4.0.0
 */
export class ChildAlreadyExistsError extends Data.TaggedError("ChildAlreadyExistsError")<{
  readonly id: string
}> {}

/**
 * Error returned by `join` when a running machine is stopped before
 * producing an output.
 *
 * @category errors
 * @since 4.0.0
 */
export class StoppedError extends Data.TaggedError("StoppedError") {}
