/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import type * as Option from "effect/Option"
import type * as Schema from "effect/Schema"
import type { Scope } from "effect/Scope"
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
      execute: (
        payload: object,
        executionId: string
      ) => Effect.Effect<unknown, unknown, WorkflowInstance | WorkflowEngine>
    ) => Effect.Effect<void>

    /**
     * Execute a registered workflow.
     */
    readonly execute: <const Discard extends boolean>(
      options: {
        readonly workflow: Workflow.Any
        readonly executionId: string
        readonly payload: object
        readonly discard: Discard
      }
    ) => Effect.Effect<Discard extends true ? void : Workflow.Result<unknown, unknown>>

    /**
     * Interrupt a registered workflow.
     */
    readonly interrupt: (
      workflow: Workflow.Any,
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
    ) => Effect.Effect<Workflow.Result<unknown, unknown>, never, WorkflowInstance>

    /**
     * Try to retrieve the result of an DurableDeferred
     */
    readonly deferredResult: (
      deferred: DurableDeferred.Any
    ) => Effect.Effect<Option.Option<Schema.ExitEncoded<unknown, unknown, unknown>>, never, WorkflowInstance>

    /**
     * Set the result of a DurableDeferred, and then resume any waiting
     * workflows.
     */
    readonly deferredDone: (
      options: {
        readonly workflowName: string
        readonly executionId: string
        readonly deferred: DurableDeferred.Any
        readonly exit: Schema.ExitEncoded<unknown, unknown, unknown>
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
     * The workflow definition.
     */
    readonly workflow: Workflow.Any

    /**
     * A Scope that is only closed when the workflow completes.
     */
    readonly scope: Scope

    /**
     * Whether the workflow has requested to be suspended.
     */
    suspended: boolean
  }
>() {}
