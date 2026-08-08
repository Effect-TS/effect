/**
 * Defines the MCP protocol implementations that an `McpServer` can support.
 *
 * @since 4.0.0
 */
import { protocol as protocol2024_11_05 } from "./internal/mcpProtocol/v2024_11_05.ts"
import { protocol as protocol2025_03_26 } from "./internal/mcpProtocol/v2025_03_26.ts"
import { protocol as protocol2025_06_18 } from "./internal/mcpProtocol/v2025_06_18.ts"

/**
 * The MCP 2025-06-18 protocol implementation.
 *
 * @category protocols
 * @since 4.0.0
 */
export const v2025_06_18 = protocol2025_06_18

/**
 * The MCP 2025-03-26 protocol implementation.
 *
 * @category protocols
 * @since 4.0.0
 */
export const v2025_03_26 = protocol2025_03_26

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
export const v2024_11_05 = protocol2024_11_05

/**
 * An implemented MCP protocol that can be supplied to `McpServer`.
 *
 * @category models
 * @since 4.0.0
 */
export type ProtocolAdapter = typeof v2024_11_05 | typeof v2025_03_26 | typeof v2025_06_18

/**
 * The MCP protocol versions implemented by this release.
 *
 * @category models
 * @since 4.0.0
 */
export type ProtocolVersion = ProtocolAdapter["protocolVersion"]
