/**
 * The Tasks extension (2026-07-28): wire schemas and capability checks.
 */
import * as DateTime from "../../DateTime.ts"
import * as Effect from "../../Effect.ts"
import * as Predicate from "../../Predicate.ts"
import * as Rpc from "../../rpc/Rpc.ts"
import * as RpcGroup from "../../rpc/RpcGroup.ts"
import * as Schema from "../../Schema.ts"
import type * as McpTasks from "../McpTasks.ts"
import type * as McpCore from "./mcpCore.ts"
import * as McpProtocol from "./mcpProtocol.ts"
import * as Stateless from "./mcpSchema/v2026_07_28.ts"

/**
 * @internal
 */
export const EXTENSION_ID = "io.modelcontextprotocol/tasks"

/**
 * The only revision that carries the extension.
 *
 * @internal
 */
export const PROTOCOL_VERSION = Stateless.protocolVersion

// =============================================================================
// Wire schemas
// =============================================================================

const taskResult = <Fields extends Schema.Struct.Fields>(fields: Fields) =>
  Schema.StructWithRest(
    Schema.Struct({
      ...Stateless.ResultMeta,
      ...Stateless.Task.fields,
      resultType: Schema.Literal("complete"),
      ...fields
    }),
    [Schema.JsonObject]
  )

/**
 * @internal
 */
export const GetTaskResult = Schema.Union([
  taskResult({ status: Schema.Literals(["working", "cancelled"]) }),
  taskResult({ status: Schema.Literal("input_required"), inputRequests: Stateless.InputRequests }),
  taskResult({ status: Schema.Literal("completed"), result: Schema.JsonObject }),
  taskResult({ status: Schema.Literal("failed"), error: Stateless.McpError })
])

/**
 * @internal
 */
export const TaskAcknowledgement = Schema.StructWithRest(
  Schema.Struct({ ...Stateless.ResultMeta, resultType: Schema.Literal("complete") }),
  [Schema.JsonObject]
)

// Optional so a server without task tools answers `Method not found` before validating it.
const taskIdField = { taskId: Schema.optionalKey(Schema.String) }

/**
 * @internal
 */
export class GetTask extends Rpc.make("tasks/get", {
  success: GetTaskResult,
  error: Stateless.McpError,
  payload: { ...Stateless.RequestParams.fields, ...taskIdField }
}) {}

/**
 * @internal
 */
export class UpdateTask extends Rpc.make("tasks/update", {
  success: TaskAcknowledgement,
  error: Stateless.McpError,
  payload: { ...Stateless.RequestParams.fields, ...taskIdField, inputResponses: Stateless.InputResponses }
}) {}

/**
 * @internal
 */
export class CancelTask extends Rpc.make("tasks/cancel", {
  success: TaskAcknowledgement,
  error: Stateless.McpError,
  payload: { ...Stateless.RequestParams.fields, ...taskIdField }
}) {}

/**
 * The extension's methods on revision 2026-07-28.
 *
 * @internal
 */
export class StatelessRpcs extends RpcGroup.make(GetTask, UpdateTask, CancelTask) {}

/**
 * Projects the fields shared by created and polled tasks.
 *
 * @internal
 */
export const projectTask = (task: McpTasks.Task) => ({
  taskId: task.taskId,
  status: task.status,
  createdAt: DateTime.formatIso(task.createdAt),
  lastUpdatedAt: DateTime.formatIso(task.lastUpdatedAt),
  ttlMs: task.ttlMs,
  ...(task.pollIntervalMs === undefined ? {} : { pollIntervalMs: task.pollIntervalMs }),
  ...(task.statusMessage === undefined ? {} : { statusMessage: task.statusMessage })
})

// =============================================================================
// Capabilities
// =============================================================================

/**
 * @internal
 */
export const supportsTasks = (
  profile: Pick<McpCore.NegotiatedProtocolProfile<string>, "protocolVersion" | "clientCapabilities">
): boolean =>
  profile.protocolVersion === PROTOCOL_VERSION &&
  Predicate.isReadonlyObject(profile.clientCapabilities.extensions?.[EXTENSION_ID])

/**
 * @internal
 */
export const missingCapability = {
  code: Stateless.MISSING_REQUIRED_CLIENT_CAPABILITY,
  message: "Client does not support the Tasks extension",
  data: { requiredCapabilities: { extensions: { [EXTENSION_ID]: {} } } }
}

/**
 * Fails with `Method not found` while no task tool is registered, as a server
 * that does not declare the extension, then requires the client capability.
 *
 * @internal
 */
export const requireTasks = (
  core: McpCore.McpCore,
  method: string,
  profile: McpCore.NegotiatedProtocolProfile<string>
) =>
  Effect.flatMap(core.registrationPresence, ({ tasks }) => {
    if (!tasks) {
      return Effect.fail(
        new McpProtocol.ProtocolError({ code: Stateless.METHOD_NOT_FOUND, message: `Method not found: ${method}` })
      )
    }
    return supportsTasks(profile) ? Effect.void : Effect.fail(new McpProtocol.ProtocolError(missingCapability))
  })
