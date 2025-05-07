/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import type * as Exit from "effect/Exit"
import type * as Option from "effect/Option"
import type * as Activity from "./Activity.js"
import type { DurableClock } from "./DurableClock.js"
import type * as DurableDeferred from "./DurableDeferred.js"
import type * as Workflow from "./Workflow.js"

/**
 * @since 1.0.0
 * @category Services
 */
export class WorkflowEngine extends Context.Tag("@effect/workflow/WorkflowEngine")<
  WorkflowEngine,
  {
    /**
     * Register a workflow with the engine.
     */
    readonly register: (
      workflow: Workflow.Any,
      execute: (payload: object) => Effect.Effect<unknown, unknown, WorkflowInstance>
    ) => Effect.Effect<void>

    /**
     * Execute a registered workflow.
     */
    readonly execute: (
      workflow: Workflow.Any,
      executionId: string,
      payload: object
    ) => Effect.Effect<Workflow.Result<unknown, unknown>>

    /**
     * Tell a workflow to resume execution.
     */
    readonly resume: (
      workflowName: string,
      executionId: string
    ) => Effect.Effect<void>

    /**
     * Execute an activity from a workflow.
     */
    readonly activityExecute: (
      options: {
        readonly activity: Activity.Any
        readonly attempt: number
      }
    ) => Effect.Effect<unknown, unknown, WorkflowInstance>

    /**
     * Try to retrieve the result of an DurableDeferred
     */
    readonly deferredResult: (
      options: {
        readonly workflow: Workflow.Any
        readonly executionId: string
        readonly deferred: DurableDeferred.Any
      }
    ) => Effect.Effect<Option.Option<Exit.Exit<unknown, unknown>>>

    /**
     * Set the result of a DurableDeferred
     */
    readonly deferredDone: (
      options: {
        readonly workflowName: string
        readonly executionId: string
        readonly deferred: DurableDeferred.Any
        readonly exit: Exit.Exit<unknown, unknown>
      }
    ) => Effect.Effect<void>

    /**
     * Schedule a wake up for a DurableClock
     */
    readonly scheduleClock: (options: {
      readonly workflow: Workflow.Any
      readonly executionId: string
      readonly clock: DurableClock
    }) => Effect.Effect<void>
  }
>() {}

/**
 * @since 1.0.0
 * @category Services
 */
export class WorkflowInstance extends Context.Tag("@effect/workflow/WorkflowEngine/WorkflowInstance")<
  WorkflowInstance,
  {
    /**
     * The workflow execution ID.
     */
    readonly executionId: string

    /**
     * The payload of the workflow.
     */
    readonly payload: object

    /**
     * The workflow definition.
     */
    readonly workflow: Workflow.Any
  }
>() {}
