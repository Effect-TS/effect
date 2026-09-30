/**
 * Registers task-only MCP tools using the existing Workflow engine.
 *
 * @stability unstable
 * @since 4.0.0
 */
import type * as Effect from "../Effect.ts"
import type * as Layer from "../Layer.ts"
import type * as Schema from "../Schema.ts"
import type * as Scope from "../Scope.ts"
import type { WorkflowEngine, WorkflowInstance } from "../workflow/WorkflowEngine.ts"
import type * as AiError from "./AiError.ts"
import * as internal from "./internal/mcpTasks.ts"
import type * as McpSchema from "./McpSchema.ts"
import type * as McpServer from "./McpServer.ts"
import type * as Tool from "./Tool.ts"
import type * as Toolkit from "./Toolkit.ts"

/**
 * Workflow namespace and trusted ownership resolver for a task toolkit.
 *
 * **Details**
 *
 * Use a new name when changing replay-incompatible handler behavior. Shared
 * ownership allows every client to access the toolkit's tasks.
 *
 * @stability unstable
 * @category models
 * @since 4.0.0
 */
export interface Options<R = never> {
  readonly name: string
  readonly owner: "shared" | Effect.Effect<string, never, R | McpSchema.McpRequestContext>
}

type Handlers<Tools extends Record<string, Tool.Any>> = {
  readonly [K in keyof Tools as Tool.RequiresHandler<Tools[K]> extends true ? K : never]: (
    params: Tool.Parameters<Tools[K]>,
    context: Toolkit.HandlerContext<Tools[K]>
  ) => Effect.Effect<Tool.Success<Tools[K]>, Tool.Failure<Tools[K]> | AiError.AiError | AiError.AiErrorReason, any>
}
type Services<H> = H extends (...args: any) => Effect.Effect<any, any, infer R> ? 0 extends (1 & R) ? never : R : never

/**
 * Registers every tool in a toolkit as a Workflow-backed MCP task.
 *
 * **Details**
 *
 * Provide an existing Workflow engine. Handlers can use Activities directly;
 * normal inline tools use `McpServer.toolkit`. Clients retrieve status and results
 * through `tasks/get`. Tasks have unlimited protocol retention, no progress or
 * interactive input, and cooperative cancellation through the supplied engine.
 *
 * **Gotchas**
 *
 * Persistent recovery depends on the engine. Creation waits until task identity
 * is readable. Workflow owns history cleanup; deleting that history makes task
 * handles unusable. A cancellation acknowledgement does not guarantee work stops.
 *
 * @stability unstable
 * @category layers
 * @since 4.0.0
 */
export const toolkit: <
  Tools extends Record<string, Tool.Any>,
  H extends Handlers<NoInfer<Tools>>,
  EX = never,
  RX = never,
  R = never
>(
  tools: Toolkit.Toolkit<Tools>,
  handlers: H | Effect.Effect<H, EX, RX>,
  options: Options<R>
) => Layer.Layer<
  never,
  EX | Schema.SchemaError,
  | McpServer.McpServer
  | WorkflowEngine
  | Exclude<RX, Scope.Scope>
  | Exclude<R, McpSchema.McpRequestContext>
  | Exclude<
    Tool.HandlerServices<Tools[keyof Tools]> | Services<H[keyof H]>,
    McpSchema.McpRequestContext | WorkflowEngine | WorkflowInstance
  >
> = internal.toolkit
