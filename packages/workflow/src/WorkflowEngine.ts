/**
 * @since 1.0.0
 */
import type * as Rpc from "@effect/rpc/Rpc"
import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"
import type * as Schema from "effect/Schema"
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
      execute: (payload: object) => Effect.Effect<unknown, unknown>
    ) => Effect.Effect<void>

    /**
     * Execute a registered workflow.
     */
    readonly send: (
      workflow: Workflow.Workflow<{}, Schema.Schema.Any, Schema.Schema.All, never>,
      executionId: string,
      payload: object
    ) => Effect.Effect<unknown, unknown>
  }
>() {
}
