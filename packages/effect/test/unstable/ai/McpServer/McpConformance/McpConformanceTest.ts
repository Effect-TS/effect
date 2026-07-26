import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Schema from "effect/Schema"
import type * as McpProtocol from "effect/unstable/ai/McpProtocol"
import * as McpSchema from "effect/unstable/ai/McpSchema"
import * as McpServer from "effect/unstable/ai/McpServer"
import * as Tool from "effect/unstable/ai/Tool"
import * as Toolkit from "effect/unstable/ai/Toolkit"
import { makeHttpHarness, makeServerLayer } from "../McpServerTest.ts"

const SERVER_NAME = "McpConformance"
const SERVER_VERSION = "1.0.0"

const InitializeResponse = Schema.Struct({
  jsonrpc: Schema.Literal("2.0"),
  id: Schema.Number,
  result: McpSchema.InitializeResult
})

const ErrorResponse = Schema.Struct({
  jsonrpc: Schema.Literal("2.0"),
  id: Schema.NullOr(Schema.Number),
  error: McpSchema.McpError
})

const BatchResponse = Schema.Array(Schema.Struct({
  id: Schema.Number,
  result: Schema.Struct({})
}))

const decodeInitializeResponse = Schema.decodeUnknownEffect(InitializeResponse)
const decodeErrorResponse = Schema.decodeUnknownEffect(ErrorResponse)
const decodeBatchResponse = Schema.decodeUnknownEffect(BatchResponse)

export interface InitializedSession {
  readonly response: Response
  readonly message: typeof InitializeResponse.Type
  readonly sessionId: string | null
}

export interface InitializeOptions {
  readonly id?: number | undefined
  readonly protocolVersion?: string | undefined
  readonly server?: "default" | "features" | undefined
}

export interface SendOptions {
  readonly includeProtocolVersion?: boolean | undefined
  readonly protocolVersion?: string | undefined
}

export interface Service {
  readonly protocol: McpProtocol.ProtocolAdapter
  readonly serverInfo: {
    readonly name: string
    readonly version: string
  }
  readonly initializeRequest: (options?: Omit<InitializeOptions, "server">) => {
    readonly jsonrpc: "2.0"
    readonly id: number
    readonly method: "initialize"
    readonly params: {
      readonly protocolVersion: string
      readonly capabilities: {}
      readonly clientInfo: {
        readonly name: string
        readonly version: string
      }
    }
  }
  readonly initializedNotification: {
    readonly jsonrpc: "2.0"
    readonly method: "notifications/initialized"
  }
  readonly pingRequest: (id?: number) => {
    readonly jsonrpc: "2.0"
    readonly id: number
    readonly method: "ping"
    readonly params: {}
  }
  readonly post: (body: unknown, headers?: HeadersInit) => Effect.Effect<Response>
  readonly initialize: (
    options?: InitializeOptions
  ) => Effect.Effect<InitializedSession, Schema.SchemaError>
  readonly send: (
    session: InitializedSession,
    body: unknown,
    options?: SendOptions
  ) => Effect.Effect<Response>
  readonly notifyInitialized: (
    session: InitializedSession,
    options?: SendOptions
  ) => Effect.Effect<Response>
  readonly ping: (
    session: InitializedSession,
    options?: SendOptions & { readonly id?: number | undefined }
  ) => Effect.Effect<Response>
  readonly decodeError: (response: Response) => Effect.Effect<typeof ErrorResponse.Type, Schema.SchemaError>
  readonly decodeBatchResponseIds: (
    response: Response
  ) => Effect.Effect<ReadonlyArray<number>, Schema.SchemaError>
}

export class McpConformanceTest extends Context.Service<McpConformanceTest, Service>()(
  "effect/test/unstable/ai/McpConformanceTest"
) {}

export type TestLayer = Layer.Layer<McpConformanceTest, unknown>

const TestTool = Tool.make("TestTool", {
  success: Schema.String
})
const TestToolkit = Toolkit.make(TestTool)
const TestToolkitLayer = McpServer.toolkit(TestToolkit).pipe(
  Layer.provide(TestToolkit.toLayer({
    TestTool: () => Effect.succeed("ok")
  }))
)

const makeFeaturesServerLayer = (protocol: McpProtocol.ProtocolAdapter) =>
  Layer.mergeAll(
    TestToolkitLayer,
    McpServer.resource({
      uri: "file:///test",
      name: "TestResource",
      content: Effect.succeed("test")
    }),
    McpServer.prompt({
      name: "TestPrompt",
      content: () => Effect.succeed("test")
    })
  ).pipe(
    Layer.provide(makeServerLayer({
      name: SERVER_NAME,
      protocols: [protocol],
      extensions: { "example/lifecycle": { enabled: true } }
    }))
  )

export const layer = (protocol: McpProtocol.ProtocolAdapter) =>
  Layer.effect(
    McpConformanceTest,
    Effect.gen(function*() {
      const defaultHarness = yield* makeHttpHarness(makeServerLayer({
        name: SERVER_NAME,
        protocols: [protocol]
      }))
      const featuresHarness = yield* makeHttpHarness(makeFeaturesServerLayer(protocol))

      const initializeRequest: Service["initializeRequest"] = (options) => ({
        jsonrpc: "2.0",
        id: options?.id ?? 1,
        method: "initialize",
        params: {
          protocolVersion: options?.protocolVersion ?? protocol.protocolVersion,
          capabilities: {},
          clientInfo: {
            name: "McpConformanceClient",
            version: "1.0.0"
          }
        }
      })

      const initializedNotification = {
        jsonrpc: "2.0",
        method: "notifications/initialized"
      } as const

      const pingRequest: Service["pingRequest"] = (id = 2) => ({
        jsonrpc: "2.0",
        id,
        method: "ping",
        params: {}
      })

      const initialize: Service["initialize"] = Effect.fnUntraced(function*(options) {
        const harness = options?.server === "features" ? featuresHarness : defaultHarness
        const response = yield* harness.post(initializeRequest(options))
        const body = yield* Effect.promise<unknown>(() => response.json())
        return {
          response,
          message: yield* decodeInitializeResponse(body),
          sessionId: response.headers.get("Mcp-Session-Id")
        }
      })

      const send: Service["send"] = (session, body, options) =>
        defaultHarness.post(body, {
          ...(session.sessionId === null ? {} : { "Mcp-Session-Id": session.sessionId }),
          ...(options?.includeProtocolVersion === false
            ? {}
            : {
              "Mcp-Protocol-Version": options?.protocolVersion ?? session.message.result.protocolVersion
            })
        })

      const notifyInitialized: Service["notifyInitialized"] = (session, options) =>
        send(session, initializedNotification, options)

      const ping: Service["ping"] = (session, options) => send(session, pingRequest(options?.id), options)

      return McpConformanceTest.of({
        protocol,
        serverInfo: {
          name: SERVER_NAME,
          version: SERVER_VERSION
        },
        initializeRequest,
        initializedNotification,
        pingRequest,
        post: defaultHarness.post,
        initialize,
        send,
        notifyInitialized,
        ping,
        decodeError: (response) =>
          Effect.promise<unknown>(() => response.json()).pipe(
            Effect.flatMap(decodeErrorResponse)
          ),
        decodeBatchResponseIds: (response) =>
          Effect.promise<unknown>(() => response.json()).pipe(
            Effect.flatMap(decodeBatchResponse),
            Effect.map((responses) => responses.map((message) => message.id))
          )
      })
    })
  )
