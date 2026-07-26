import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Queue from "effect/Queue"
import * as Ref from "effect/Ref"
import { CurrentLogLevel } from "effect/References"
import * as Schema from "effect/Schema"
import type * as McpProtocol from "effect/unstable/ai/McpProtocol"
import * as McpSchema from "effect/unstable/ai/McpSchema"
import * as McpServer from "effect/unstable/ai/McpServer"
import * as Tool from "effect/unstable/ai/Tool"
import * as Toolkit from "effect/unstable/ai/Toolkit"
import * as RpcClient from "effect/unstable/rpc/RpcClient"
import { makeHttpHarness, makeServerLayer } from "../McpServerTest.ts"

type ReverseMethod = "roots/list" | "sampling/createMessage" | "elicitation/create"

interface RecordedRequest {
  readonly id: string | number
  readonly method: ReverseMethod
  readonly payload: unknown
}

type Handler = (
  request: RecordedRequest
) => Effect.Effect<unknown, typeof McpSchema.McpError.Type>

interface PeerOptions {
  readonly capabilities?: typeof McpSchema.ClientCapabilities.Type | undefined
  readonly clientInfo?: typeof McpSchema.Implementation.Type | undefined
  readonly handlers?: Partial<Record<ReverseMethod, Handler>> | undefined
}

interface McpTestPeer {
  readonly client: McpSchema.McpReverseClient
  readonly requests: Effect.Effect<ReadonlyArray<RecordedRequest>>
  readonly takeRequest: Effect.Effect<RecordedRequest>
}

const isReverseMethod = (method: string): method is ReverseMethod =>
  ["roots/list", "sampling/createMessage", "elicitation/create"].includes(method)

const makePeer = Effect.fn("McpConformanceTest.makePeer")(function*(
  protocol: McpProtocol.ProtocolAdapter,
  options: PeerOptions = {}
) {
  const requests = yield* Ref.make<ReadonlyArray<RecordedRequest>>([])
  const inbox = yield* Queue.unbounded<RecordedRequest>()
  const handlers = options.handlers ?? {}

  const rpcProtocol = yield* RpcClient.Protocol.make((writeResponse) =>
    Effect.succeed({
      send: (clientId, message) => {
        if (message._tag !== "Request" || !isReverseMethod(message.tag)) {
          return Effect.void
        }
        const request: RecordedRequest = {
          id: message.id,
          method: message.tag,
          payload: message.payload
        }
        return Effect.gen(function*() {
          yield* Ref.update(requests, (current) => [...current, request])
          yield* Queue.offer(inbox, request)

          const handler = handlers[request.method]
          const result = yield* Effect.exit(
            handler === undefined
              ? Effect.fail({
                code: -32601,
                message: `No test peer handler for ${request.method}`
              })
              : handler(request)
          )

          if (Exit.isSuccess(result)) {
            return yield* writeResponse(clientId, {
              _tag: "Exit",
              requestId: request.id,
              exit: {
                _tag: "Success",
                value: result.value
              }
            })
          }

          const failure = Cause.findErrorOption(result.cause)
          if (Option.isSome(failure)) {
            return yield* writeResponse(clientId, {
              _tag: "Exit",
              requestId: request.id,
              exit: {
                _tag: "Failure",
                cause: [{
                  _tag: "Fail",
                  error: failure.value
                }]
              }
            })
          }

          return yield* Effect.die(Cause.squash(result.cause))
        })
      },
      supportsAck: true,
      supportsTransferables: false,
      supportsStructuredClone: false
    })
  )

  const client = yield* protocol.makeReverseClient({
    protocolVersion: protocol.protocolVersion,
    clientCapabilities: options.capabilities ?? {},
    clientInfo: options.clientInfo ?? {
      name: "McpConformancePeer",
      version: "1.0.0"
    }
  }).pipe(
    Effect.provideService(RpcClient.Protocol, rpcProtocol)
  )

  return {
    client,
    requests: Ref.get(requests),
    takeRequest: Queue.take(inbox)
  } satisfies McpTestPeer
})

const SERVER_NAME = "McpConformance"
const SERVER_VERSION = "1.0.0"

const InitializeResponse = Schema.Struct({
  jsonrpc: Schema.Literal("2.0"),
  id: Schema.Number,
  result: McpSchema.InitializeResult
})

const ErrorResponse = Schema.Struct({
  jsonrpc: Schema.Literal("2.0"),
  id: Schema.NullOr(Schema.Union([Schema.String, Schema.Number])),
  error: McpSchema.McpError
})

const ResultResponse = Schema.Struct({
  jsonrpc: Schema.Literal("2.0"),
  id: Schema.Union([Schema.String, Schema.Number]),
  result: Schema.Record(Schema.String, Schema.Unknown)
})

const BatchResponse = Schema.Array(Schema.Struct({
  id: Schema.Number,
  result: Schema.Struct({})
}))

const decodeInitializeResponse = Schema.decodeUnknownEffect(InitializeResponse)
const decodeErrorResponse = Schema.decodeUnknownEffect(ErrorResponse)
const decodeResultResponse = Schema.decodeUnknownEffect(ResultResponse)
const decodeBatchResponse = Schema.decodeUnknownEffect(BatchResponse)

export interface InitializedSession {
  readonly response: Response
  readonly message: typeof InitializeResponse.Type
  readonly sessionId: string | null
  readonly server: "default" | "features"
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

export interface Observations {
  readonly toolInvocations: number
  readonly promptInvocations: number
  readonly resourceTemplateInvocations: number
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
  readonly request: (request: Request) => Effect.Effect<Response>
  readonly initialize: (
    options?: InitializeOptions
  ) => Effect.Effect<InitializedSession, Schema.SchemaError>
  readonly send: (
    session: InitializedSession,
    body: unknown,
    options?: SendOptions
  ) => Effect.Effect<Response>
  readonly sendText: (
    session: InitializedSession,
    body: string,
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
  readonly makePeer: (
    options?: PeerOptions
  ) => ReturnType<typeof makePeer>
  readonly observations: Effect.Effect<Observations>
  readonly resetObservations: Effect.Effect<void>
  readonly decodeError: (response: Response) => Effect.Effect<typeof ErrorResponse.Type, Schema.SchemaError>
  readonly decodeResult: (response: Response) => Effect.Effect<typeof ResultResponse.Type, Schema.SchemaError>
  readonly decodeBatchResponseIds: (
    response: Response
  ) => Effect.Effect<ReadonlyArray<number>, Schema.SchemaError>
}

export class McpConformanceTest extends Context.Service<McpConformanceTest, Service>()(
  "effect/test/unstable/ai/McpConformanceTest"
) {}

export type TestLayer = Layer.Layer<McpConformanceTest, unknown>

const TestTool = Tool.make("TestTool", {
  description: "A test tool",
  parameters: Schema.Struct({
    value: Schema.String
  }),
  success: Schema.String
})
const StructuredTool = Tool.make("StructuredTool", {
  parameters: Tool.EmptyParams,
  success: Schema.Struct({
    value: Schema.String
  })
}).annotate(
  McpSchema.EnabledWhen,
  (client) => client.protocolVersion === "2025-06-18"
)
const LogLevelTool = Tool.make("LogLevelTool", {
  parameters: Tool.EmptyParams,
  success: Schema.String,
  dependencies: [CurrentLogLevel]
})
const TestToolkit = Toolkit.make(TestTool, StructuredTool, LogLevelTool)
const makeTestToolkitLayer = (observations: Ref.Ref<Observations>) =>
  McpServer.toolkit(TestToolkit).pipe(
    Layer.provide(TestToolkit.toLayer({
      TestTool: ({ value }) =>
        Ref.update(observations, (current) => ({
          ...current,
          toolInvocations: current.toolInvocations + 1
        })).pipe(Effect.as(value)),
      StructuredTool: () => Effect.succeed({ value: "structured" }),
      LogLevelTool: () => CurrentLogLevel
    }))
  )

const makeContentToolsLayer = (protocol: McpProtocol.ProtocolAdapter) =>
  Layer.effectDiscard(
    Effect.gen(function*() {
      const server = yield* McpServer.McpServer
      const add = (
        name: string,
        result: McpSchema.CallToolResult
      ) =>
        server.addTool({
          tool: new McpSchema.Tool({
            name,
            inputSchema: { type: "object", properties: {} }
          }),
          annotations: Context.empty(),
          supportedProtocolVersions: [protocol.protocolVersion],
          handle: () => Effect.succeed(result)
        })

      yield* add(
        "ImageTool",
        new McpSchema.CallToolResult({
          content: [{
            type: "image",
            data: new Uint8Array([1, 2, 3]),
            mimeType: "image/png"
          }]
        })
      )
      yield* add(
        "EmbeddedResourceTool",
        new McpSchema.CallToolResult({
          content: [{
            type: "resource",
            resource: {
              uri: "file:///embedded",
              mimeType: "text/plain",
              text: "embedded"
            }
          }]
        })
      )
      yield* add(
        "MultipleContentTool",
        new McpSchema.CallToolResult({
          content: [
            { type: "text", text: "first" },
            { type: "text", text: "second" }
          ]
        })
      )
      yield* add(
        "ErrorTool",
        new McpSchema.CallToolResult({
          content: [{ type: "text", text: "expected failure" }],
          isError: true
        })
      )
      yield* server.addTool({
        tool: new McpSchema.Tool({
          name: "DefectTool",
          inputSchema: { type: "object", properties: {} }
        }),
        annotations: Context.empty(),
        supportedProtocolVersions: [protocol.protocolVersion],
        handle: () => Effect.die("private defect details")
      })

      if (protocol.protocolVersion !== "2024-11-05") {
        yield* add(
          "AudioTool",
          new McpSchema.CallToolResult({
            content: [{
              type: "audio",
              data: new Uint8Array([4, 5, 6]),
              mimeType: "audio/wav"
            }]
          })
        )
      }
      if (protocol.protocolVersion === "2025-06-18") {
        yield* add(
          "ResourceLinkTool",
          new McpSchema.CallToolResult({
            content: [{
              type: "resource_link",
              uri: "file:///test",
              name: "TestResource",
              mimeType: "text/plain"
            }]
          })
        )
      }
    })
  )

const templatePath = McpSchema.param("path", Schema.String)
const TestResourceTemplate = McpServer.resource`file:///template/${templatePath}`({
  name: "TestResourceTemplate",
  description: "A test resource template",
  mimeType: "text/plain",
  completion: {
    path: () => Effect.succeed(["alpha", "beta"])
  },
  content: (uri, path) => Effect.succeed(`${uri}:${path}`)
})

const numericId = McpSchema.param("id", Schema.NumberFromString)
const makeNumericResourceTemplate = (observations: Ref.Ref<Observations>) =>
  McpServer.resource`file:///numeric/${numericId}`({
    name: "NumericResourceTemplate",
    content: (uri) =>
      Ref.update(observations, (current) => ({
        ...current,
        resourceTemplateInvocations: current.resourceTemplateInvocations + 1
      })).pipe(Effect.as(uri))
  })

const ImagePrompt = McpServer.prompt({
  name: "ImagePrompt",
  content: () =>
    Effect.succeed([{
      role: "user",
      content: McpSchema.ImageContent.make({
        data: new Uint8Array([1, 2, 3]),
        mimeType: "image/png"
      })
    }])
})

const AudioPrompt = McpServer.prompt({
  name: "AudioPrompt",
  content: () =>
    Effect.succeed([{
      role: "user",
      content: McpSchema.AudioContent.make({
        data: new Uint8Array([4, 5, 6]),
        mimeType: "audio/wav"
      })
    }])
})

const EmbeddedResourcePrompt = McpServer.prompt({
  name: "EmbeddedResourcePrompt",
  content: () =>
    Effect.succeed([{
      role: "user",
      content: McpSchema.EmbeddedResource.make({
        resource: {
          uri: "file:///embedded",
          mimeType: "text/plain",
          text: "embedded"
        }
      })
    }])
})

const ContextCompletionPrompt = McpServer.prompt({
  name: "ContextCompletionPrompt",
  parameters: {
    value: Schema.String
  },
  completion: {
    value: (...args: ReadonlyArray<unknown>) =>
      Effect.succeed(args.length > 1 ? ["context received"] : ["context missing"])
  },
  content: ({ value }) => Effect.succeed(value)
})

const makeFeaturesServerLayer = (
  protocol: McpProtocol.ProtocolAdapter,
  observations: Ref.Ref<Observations>
) =>
  Layer.mergeAll(
    makeTestToolkitLayer(observations),
    makeContentToolsLayer(protocol),
    McpServer.resource({
      uri: "file:///test",
      name: "TestResource",
      description: "A test resource",
      mimeType: "text/plain",
      content: Effect.succeed(McpSchema.ReadResourceResult.make({
        contents: [{
          uri: "file:///test",
          mimeType: "text/plain",
          text: "test"
        }]
      }))
    }),
    McpServer.resource({
      uri: "file:///binary",
      name: "BinaryResource",
      mimeType: "application/octet-stream",
      content: Effect.succeed(McpSchema.ReadResourceResult.make({
        contents: [{
          uri: "file:///binary",
          mimeType: "application/octet-stream",
          blob: new Uint8Array([1, 2, 3])
        }]
      }))
    }),
    McpServer.resource({
      uri: "file:///multiple",
      name: "MultipleResource",
      content: Effect.succeed(McpSchema.ReadResourceResult.make({
        contents: [
          {
            uri: "file:///multiple#first",
            mimeType: "text/plain",
            text: "first"
          },
          {
            uri: "file:///multiple#second",
            mimeType: "text/plain",
            text: "second"
          }
        ]
      }))
    }),
    TestResourceTemplate,
    makeNumericResourceTemplate(observations),
    McpServer.prompt({
      name: "TestPrompt",
      description: "A test prompt",
      parameters: {
        required: Schema.String,
        optional: Schema.optional(Schema.String)
      },
      completion: {
        required: (value) =>
          Effect.succeed(
            value === "limit"
              ? Array.from({ length: 101 }, (_, index) => `value-${index}`)
              : ["first", "second"]
          )
      },
      content: ({ optional, required }) =>
        Ref.update(observations, (current) => ({
          ...current,
          promptInvocations: current.promptInvocations + 1
        })).pipe(Effect.as(`${required}:${optional ?? "omitted"}`))
    }),
    McpServer.prompt({
      name: "NoArgumentPrompt",
      content: () => Effect.succeed("no arguments")
    }),
    ImagePrompt,
    EmbeddedResourcePrompt,
    ...(protocol.protocolVersion === "2024-11-05" ? [] : [AudioPrompt]),
    ...(protocol.protocolVersion === "2025-06-18" ? [ContextCompletionPrompt] : [])
  ).pipe(
    Layer.provide(makeServerLayer({
      name: SERVER_NAME,
      protocols: [protocol],
      allowedOrigins: ["https://allowed.example"],
      extensions: { "example/lifecycle": { enabled: true } }
    }))
  )

export const layer = (protocol: McpProtocol.ProtocolAdapter) =>
  Layer.effect(
    McpConformanceTest,
    Effect.gen(function*() {
      const defaultHarness = yield* makeHttpHarness(makeServerLayer({
        name: SERVER_NAME,
        protocols: [protocol],
        allowedOrigins: ["https://allowed.example"]
      }))
      const observations = yield* Ref.make<Observations>({
        toolInvocations: 0,
        promptInvocations: 0,
        resourceTemplateInvocations: 0
      })
      const featuresHarness = yield* makeHttpHarness(makeFeaturesServerLayer(protocol, observations))

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
        const server = options?.server ?? "default"
        const harness = server === "features" ? featuresHarness : defaultHarness
        const response = yield* harness.post(initializeRequest(options))
        const body = yield* Effect.promise<unknown>(() => response.json())
        return {
          response,
          message: yield* decodeInitializeResponse(body),
          sessionId: response.headers.get("Mcp-Session-Id"),
          server
        }
      })

      const sessionHeaders = (session: InitializedSession, options?: SendOptions): HeadersInit => ({
        ...(session.sessionId === null ? {} : { "Mcp-Session-Id": session.sessionId }),
        ...(options?.includeProtocolVersion ??
            protocol.transport.requiresProtocolVersionHeaderOnSubsequentHttpRequests
          ? {
            "Mcp-Protocol-Version": options?.protocolVersion ?? session.message.result.protocolVersion
          }
          : {})
      })

      const harnessFor = (session: InitializedSession) =>
        session.server === "features" ? featuresHarness : defaultHarness

      const sendText: Service["sendText"] = (session, body, options) =>
        harnessFor(session).postText(body, sessionHeaders(session, options))

      const send: Service["send"] = (session, body, options) =>
        harnessFor(session).post(body, sessionHeaders(session, options))

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
        request: (request) => Effect.promise(() => defaultHarness.handler(request)),
        initialize,
        send,
        sendText,
        notifyInitialized,
        ping,
        makePeer: (options) => makePeer(protocol, options),
        observations: Ref.get(observations),
        resetObservations: Ref.set(observations, {
          toolInvocations: 0,
          promptInvocations: 0,
          resourceTemplateInvocations: 0
        }),
        decodeError: (response) =>
          Effect.promise<unknown>(() => response.json()).pipe(
            Effect.flatMap(decodeErrorResponse)
          ),
        decodeResult: (response) =>
          Effect.promise<unknown>(() => response.json()).pipe(
            Effect.flatMap(decodeResultResponse)
          ),
        decodeBatchResponseIds: (response) =>
          Effect.promise<unknown>(() => response.json()).pipe(
            Effect.flatMap(decodeBatchResponse),
            Effect.map((responses) => responses.map((message) => message.id))
          )
      })
    })
  )
