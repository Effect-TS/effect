import * as Effect from "effect/Effect"
import { constVoid } from "effect/Function"
import * as Layer from "effect/Layer"
import * as Logger from "effect/Logger"
import * as References from "effect/References"
import * as McpProtocol from "effect/unstable/ai/McpProtocol"
import * as McpServer from "effect/unstable/ai/McpServer"
import * as HttpRouter from "effect/unstable/http/HttpRouter"

export const MCP_ENDPOINT = "http://localhost/mcp"

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
  readonly allowedOrigins?: ReadonlyArray<string> | undefined
}) =>
  McpServer.layerHttp({
    name: options.name,
    version: options.version ?? "1.0.0",
    path: "/mcp",
    protocols: options.protocols ?? [
      McpProtocol.v2025_06_18,
      McpProtocol.v2025_03_26,
      McpProtocol.v2024_11_05
    ],
    extensions: options.extensions,
    allowedOrigins: options.allowedOrigins
  }).pipe(
    Layer.provideMerge(Layer.succeed(
      References.CurrentLoggers,
      new Set([noopLogger])
    ))
  )

export const makeHttpHarness = Effect.fnUntraced(function*<A, E>(
  serverLayer: Layer.Layer<A, E, HttpRouter.HttpRouter>,
  options?: {
    readonly routerLayer?: Layer.Layer<never, never, HttpRouter.HttpRouter> | undefined
  }
) {
  const appLayer = options?.routerLayer ? Layer.merge(serverLayer, options.routerLayer) : serverLayer
  const { dispose, handler } = HttpRouter.toWebHandler(appLayer, { disableLogger: true })
  yield* Effect.addFinalizer(() => Effect.promise(() => dispose()))
  const responses: Array<Response> = []
  let sessionId: string | null = null
  let protocolVersion: string | null = null

  const fetch: typeof globalThis.fetch = async (input, init) => {
    const request = input instanceof Request ? input : new Request(input, init)
    if (sessionId !== null) {
      request.headers.set("Mcp-Session-Id", sessionId)
    }
    if (protocolVersion !== null && !request.headers.has("Mcp-Protocol-Version")) {
      request.headers.set("Mcp-Protocol-Version", protocolVersion)
    }
    const response = await handler(request)
    sessionId = response.headers.get("Mcp-Session-Id") ?? sessionId
    protocolVersion = response.headers.get("Mcp-Protocol-Version") ?? protocolVersion
    responses.push(response.clone())
    return response
  }

  const postText = (body: string, headers?: HeadersInit) =>
    Effect.promise(() =>
      handler(
        new Request(MCP_ENDPOINT, {
          method: "POST",
          headers: {
            accept: "application/json, text/event-stream",
            "content-type": "application/json",
            ...headers
          },
          body
        })
      )
    )

  const post = (body: unknown, headers?: HeadersInit) => postText(JSON.stringify(body), headers)

  return {
    handler,
    fetch,
    post,
    postText,
    responses
  } as const
})
