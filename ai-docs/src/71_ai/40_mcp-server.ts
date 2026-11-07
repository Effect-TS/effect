/**
 * @title Serving MCP over a custom socket transport
 *
 * Compose the public MCP serializer with a socket protocol while preserving
 * protocol version selection, message framing and connection cleanup.
 */
import { NodeSocketServer } from "@effect/platform-node"
import { Layer } from "effect"
import { McpProtocol, McpServer } from "effect/ai"
import { RpcServer } from "effect/rpc"

// Keep the same protocol declaration on the serializer and server. Modern
// clients send request metadata; legacy clients negotiate during initialize.
const protocols = [McpProtocol.v2026_07_28, McpProtocol.v2025_11_25] as const

// The socket protocol creates a parser for each connection and reports closes.
// MCP supplies the framing, batch policy and error handling rather than the
// default Effect RPC serializer, whose control messages are not MCP messages.
const SocketProtocol = RpcServer.layerProtocolSocketServer.pipe(
  Layer.provide(McpServer.layerSerialization({ protocols })),
  // Bind to loopback for a local workspace service. Custom transports must
  // establish their own authentication and transport security when exposed.
  Layer.provide(NodeSocketServer.layer({ host: "127.0.0.1", port: 3001 }))
)

// Pass application resource, prompt and toolkit layers as `registrations` to
// build them before the server begins reading requests. Launch this layer at
// the application's entry point; its scope owns the listening socket.
export const WorkspaceServer = McpServer.layer({
  name: "Local Workspace",
  version: "1.0.0",
  protocols
}).pipe(Layer.provide(SocketProtocol))
