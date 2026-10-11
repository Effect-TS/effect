import * as McpProtocol from "effect/ai/McpProtocol"
import * as McpServer from "effect/ai/McpServer"
import { constVoid } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Logger from "effect/Logger"
import * as References from "effect/References"
import type * as Schema from "effect/Schema"

const noopLogger = Logger.make(constVoid)

export const makeServerLayer = (options: {
  readonly name: string
  readonly version?: string | undefined
  readonly instructions?: string | undefined
  readonly protocols?:
    | readonly [
      McpProtocol.ProtocolAdapter,
      ...Array<McpProtocol.ProtocolAdapter>
    ]
    | undefined
  readonly extensions?: Readonly<Record<`${string}/${string}`, Schema.Json>> | undefined
  readonly allowedOrigins?: ReadonlyArray<string> | undefined
  readonly allowSessionTermination?: boolean | undefined
  readonly mode?: "server" | "request" | undefined
}) => {
  const common = {
    name: options.name,
    version: options.version ?? "1.0.0",
    instructions: options.instructions,
    path: "/mcp" as const,
    protocols: options.protocols ?? [McpProtocol.v2025_06_18],
    allowedOrigins: ["https://allowed.example"],
    extensions: options.extensions
  }
  const layer = options.mode === "request"
    ? McpServer.layerHttpRequestScoped({
      ...common,
      // Request-mode callers supply stateless adapters.
      protocols: common.protocols as Parameters<typeof McpServer.layerHttpRequestScoped>[0]["protocols"]
    })
    : McpServer.layerHttp({ ...common, allowSessionTermination: options.allowSessionTermination })
  return layer.pipe(
    Layer.provideMerge(Layer.succeed(
      References.CurrentLoggers,
      new Set([noopLogger])
    ))
  )
}
