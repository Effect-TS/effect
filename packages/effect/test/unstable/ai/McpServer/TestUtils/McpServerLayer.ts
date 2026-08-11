import { constVoid } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Logger from "effect/Logger"
import * as References from "effect/References"
import * as McpProtocol from "effect/unstable/ai/McpProtocol"
import * as McpServer from "effect/unstable/ai/McpServer"

const noopLogger = Logger.make(constVoid)

export const makeServerLayer = (options: {
  readonly name: string
  readonly version?: string | undefined
  readonly protocols?:
    | readonly [
      McpProtocol.ProtocolAdapter,
      ...Array<McpProtocol.ProtocolAdapter>
    ]
    | undefined
  readonly extensions?: Record<`${string}/${string}`, unknown> | undefined
}) =>
  McpServer.layerHttp({
    name: options.name,
    version: options.version ?? "1.0.0",
    path: "/mcp",
    protocols: options.protocols ?? [McpProtocol.v2025_06_18],
    allowedOrigins: ["https://allowed.example"],
    extensions: options.extensions
  }).pipe(
    Layer.provideMerge(Layer.succeed(
      References.CurrentLoggers,
      new Set([noopLogger])
    ))
  )
