/**
 * Defines the MCP protocol implementations that an `McpServer` can support.
 *
 * @since 4.0.0
 */
import type * as RpcGroup from "../rpc/RpcGroup.ts"
import * as Internal from "./internal/mcpProtocol.ts"
import * as McpSchema from "./McpSchema.ts"

/**
 * The MCP 2025-06-18 protocol implementation.
 *
 * @category protocols
 * @since 4.0.0
 */
export const v2025_06_18: ProtocolAdapter = Internal.make({
  protocolVersion: "2025-06-18",
  transport: {
    acceptsJsonRpcBatches: false,
    requiresVersionHeader: true
  },
  clientRpcs: McpSchema.ClientRpcs,
  clientNotificationRpcs: McpSchema.ClientNotificationRpcs,
  serverRequestRpcs: McpSchema.ServerRequestRpcs,
  serverNotificationRpcs: McpSchema.ServerNotificationRpcs
})

/**
 * An implemented MCP protocol that can be supplied to `McpServer`.
 *
 * @category models
 * @since 4.0.0
 */
export type ProtocolAdapter = Internal.ProtocolAdapter<
  "2025-06-18",
  RpcGroup.Rpcs<typeof McpSchema.ClientRpcs>,
  RpcGroup.Rpcs<typeof McpSchema.ClientNotificationRpcs>,
  RpcGroup.Rpcs<typeof McpSchema.ServerRequestRpcs>,
  RpcGroup.Rpcs<typeof McpSchema.ServerNotificationRpcs>
>

/**
 * The MCP protocol versions implemented by this release.
 *
 * @category models
 * @since 4.0.0
 */
export type ProtocolVersion = ProtocolAdapter["protocolVersion"]
