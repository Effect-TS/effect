/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import type * as Exit from "effect/Exit"
import type * as Option from "effect/Option"
import type * as Schema from "effect/Schema"
import type * as Activity from "./Activity.js"
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
    ) => Effect.Effect<unknown, unknown>

    /**
     * Tell a workflow to resume execution.
     */
    readonly resume: (
      workflow: Workflow.Any,
      executionId: string
    ) => Effect.Effect<void>

    /**
     * Try to retrieve the result of an activity execution.
     */
    readonly activityResult: (
      options: {
        readonly workflow: Workflow.Any
        readonly executionId: string
        readonly activity: Activity.Activity<Schema.Schema.Any, Schema.Schema.All, never>
        readonly attempt: number
      }
    ) => Effect.Effect<Option.Option<Exit.Exit<unknown, unknown>>>

    /**
     * Execute an activity from a workflow.
     */
    readonly activityExecute: (
      options: {
        readonly workflow: Workflow.Any
        readonly executionId: string
        readonly activity: Activity.Activity<Schema.Schema.Any, Schema.Schema.All, never>
        readonly attempt: number
      }
    ) => Effect.Effect<unknown, unknown>
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
