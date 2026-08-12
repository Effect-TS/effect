/**
 * Defines the MCP protocol implementations that an `McpServer` can support.
 *
 * @since 4.0.0
 */
import type * as McpProtocolInternal from "./internal/mcpProtocol.ts"
import { protocol as protocol2024_11_05 } from "./internal/mcpProtocol/v2024_11_05.ts"
import { protocol as protocol2025_03_26 } from "./internal/mcpProtocol/v2025_03_26.ts"
import { protocol as protocol2025_06_18 } from "./internal/mcpProtocol/v2025_06_18.ts"

/**
 * The MCP protocol versions implemented by this release.
 *
 * @category models
 * @since 4.0.0
 */
export type ProtocolVersion = "2024-11-05" | "2025-03-26" | "2025-06-18"

/**
 * An MCP protocol adapter that can be supplied to `McpServer`.
 *
 * @category models
 * @since 4.0.0
 */
export interface ProtocolAdapter<out Version extends ProtocolVersion = ProtocolVersion>
  extends McpProtocolInternal.AnyProtocolAdapter
{
  readonly protocolVersion: Version
}

/**
 * The MCP 2025-06-18 protocol implementation.
 *
 * @category protocols
 * @since 4.0.0
 */
export const v2025_06_18: ProtocolAdapter<"2025-06-18"> = protocol2025_06_18

/**
 * The MCP 2025-03-26 protocol implementation.
 *
 * @category protocols
 * @since 4.0.0
 */
export const v2025_03_26: ProtocolAdapter<"2025-03-26"> = protocol2025_03_26

/**
 * The MCP 2024-11-05 protocol implementation.
 *
 * **Details**
 *
 * It provides the dated schema and stdio behavior. When supplied to
 * `McpServer.layerHttp`, the server uses its single-endpoint Streamable HTTP
 * compatibility transport; it does not implement the historical two-endpoint
 * HTTP+SSE transport.
 *
 * @category protocols
 * @since 4.0.0
 */
export const v2024_11_05: ProtocolAdapter<"2024-11-05"> = protocol2024_11_05
