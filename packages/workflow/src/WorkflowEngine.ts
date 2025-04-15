/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
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
      workflow: Workflow.Workflow<{}, Schema.Schema.Any, Schema.Schema.All, never>,
      execute: (payload: object) => Effect.Effect<unknown, unknown, WorkflowInstance>
    ) => Effect.Effect<void>

    /**
     * Execute a registered workflow.
     */
    readonly execute: (
      workflow: Workflow.Workflow<{}, Schema.Schema.Any, Schema.Schema.All, never>,
      executionId: string,
      payload: object
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
    readonly executionId: string

    /**
     * The workflow definition.
     */
    readonly workflow: Workflow.Workflow<{}, Schema.Schema.Any, Schema.Schema.All, never>

    /**
     * Execute an Activity within the workflow.
     */
    readonly activity: (
      activity: Activity.Activity<Schema.Schema.Any, Schema.Schema.All, never>,
      attempt: number
    ) => Effect.Effect<unknown, unknown>
  }
>() {}
