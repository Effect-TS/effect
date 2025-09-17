/**
 * @since 1.0.0
 */
import * as Headers from "@effect/platform/Headers"
import type * as HttpLayerRouter from "@effect/platform/HttpLayerRouter"
import type * as HttpRouter from "@effect/platform/HttpRouter"
import type { RpcMessage } from "@effect/rpc"
import type * as Rpc from "@effect/rpc/Rpc"
import * as RpcClient from "@effect/rpc/RpcClient"
import type * as RpcGroup from "@effect/rpc/RpcGroup"
import * as RpcSerialization from "@effect/rpc/RpcSerialization"
import * as RpcServer from "@effect/rpc/RpcServer"
import * as Arr from "effect/Array"
import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Exit from "effect/Exit"
import * as JsonSchema from "effect/JSONSchema"
import * as Layer from "effect/Layer"
import * as Logger from "effect/Logger"
import * as Mailbox from "effect/Mailbox"
import * as Option from "effect/Option"
import * as RcMap from "effect/RcMap"
import * as Schema from "effect/Schema"
import * as AST from "effect/SchemaAST"
import type { Sink } from "effect/Sink"
import type { Stream } from "effect/Stream"
import type * as Types from "effect/Types"
import * as FindMyWay from "find-my-way-ts"
import type {
  Annotations,
  CallTool,
  Complete,
  GetPrompt,
  Param,
  PromptArgument,
  PromptMessage,
  ReadResourceResult,
  ServerCapabilities
} from "./McpSchema.js"
import {
  CallToolResult,
  ClientNotificationRpcs,
  ClientRpcs,
  CompleteResult,
  Elicit,
  ElicitationDeclined,
  GetPromptResult,
  InternalError,
  InvalidParams,
  ListPromptsResult,
  ListResourcesResult,
  ListResourceTemplatesResult,
  ListToolsResult,
  McpServerClient,
  McpServerClientMiddleware,
  ParamAnnotation,
  Prompt,
  Resource,
  ResourceTemplate,
  ServerNotificationRpcs,
  ServerRequestRpcs,
  TextContent,
  Tool,
  ToolAnnotations
} from "./McpSchema.js"
import * as AiTool from "./Tool.js"
import type * as Toolkit from "./Toolkit.js"

/**
 * @since 1.0.0
 * @category McpServer
 */
export class McpServer extends Context.Tag("@effect/ai/McpServer")<
  McpServer,
  {
    readonly notifications: RpcClient.RpcClient<RpcGroup.Rpcs<typeof ServerNotificationRpcs>>
    readonly notificationsMailbox: Mailbox.ReadonlyMailbox<RpcMessage.Request<any>>
    readonly initializedClients: Set<number>

    readonly tools: ReadonlyArray<Tool>
    readonly addTool: (options: {
      readonly tool: Tool
      readonly handle: (payload: any) => Effect.Effect<CallToolResult, never, McpServerClient>
    }) => Effect.Effect<void>
    readonly callTool: (
      requests: typeof CallTool.payloadSchema.Type
    ) => Effect.Effect<CallToolResult, InternalError | InvalidParams, McpServerClient>

    readonly resources: ReadonlyArray<Resource>
    readonly addResource: (
      resource: Resource,
      handle: Effect.Effect<typeof ReadResourceResult.Type, InternalError, McpServerClient>
    ) => Effect.Effect<void>

    readonly resourceTemplates: ReadonlyArray<ResourceTemplate>
    readonly addResourceTemplate: (options: {
      readonly template: ResourceTemplate
      readonly routerPath: string
      readonly completions: Record<string, (input: string) => Effect.Effect<CompleteResult, InternalError>>
      readonly handle: (uri: string, params: Array<string>) => Effect.Effect<
        typeof ReadResourceResult.Type,
        InvalidParams | InternalError,
        McpServerClient
      >
    }) => Effect.Effect<void>

    readonly findResource: (uri: string) => Effect.Effect<
      typeof ReadResourceResult.Type,
      InvalidParams | InternalError,
      McpServerClient
    >

    readonly prompts: ReadonlyArray<Prompt>
    readonly addPrompt: (options: {
      readonly prompt: Prompt
      readonly completions: Record<
        string,
        (input: string) => Effect.Effect<CompleteResult, InternalError, McpServerClient>
      >
      readonly handle: (
        params: Record<string, string>
      ) => Effect.Effect<GetPromptResult, InternalError | InvalidParams, McpServerClient>
    }) => Effect.Effect<void>
    readonly getPromptResult: (
      request: typeof GetPrompt.payloadSchema.Type
    ) => Effect.Effect<GetPromptResult, InternalError | InvalidParams, McpServerClient>

    readonly completion: (
      complete: typeof Complete.payloadSchema.Type
    ) => Effect.Effect<CompleteResult, InternalError, McpServerClient>
  }
>() {
  /**
   * @since 1.0.0
   */
  static readonly make = Effect.gen(function*() {
    const matcher = makeUriMatcher<
      | {
        readonly _tag: "ResourceTemplate"
        readonly handle: (
          uri: string,
          params: Array<string>
        ) => Effect.Effect<typeof ReadResourceResult.Type, InternalError | InvalidParams, McpServerClient>
      }
      | {
        readonly _tag: "Resource"
        readonly effect: Effect.Effect<typeof ReadResourceResult.Type, InternalError, McpServerClient>
      }
    >()
    const tools = Arr.empty<Tool>()
    const toolMap = new Map<
      string,
      (payload: any) => Effect.Effect<CallToolResult, InternalError, McpServerClient>
    >()
    const resources: Array<Resource> = []
    const resourceTemplates: Array<ResourceTemplate> = []
    const prompts: Array<Prompt> = []
    const promptMap = new Map<
      string,
      (params: Record<string, string>) => Effect.Effect<GetPromptResult, InternalError | InvalidParams, McpServerClient>
    >()
    const completionsMap = new Map<
      string,
      (input: string) => Effect.Effect<CompleteResult, InternalError, McpServerClient>
    >()
    const notificationsMailbox = yield* Mailbox.make<RpcMessage.Request<any>>()
    const listChangedHandles = new Map<string, any>()
    const notifications = yield* RpcClient.makeNoSerialization(ServerNotificationRpcs, {
      spanPrefix: "McpServer/Notifications",
      onFromClient(options): Effect.Effect<void> {
        const message = options.message
        if (message._tag !== "Request") {
          return Effect.void
        }
        if (message.tag.includes("list_changed")) {
          if (!listChangedHandles.has(message.tag)) {
            listChangedHandles.set(
              message.tag,
              setTimeout(() => {
                notificationsMailbox.unsafeOffer(message)
                listChangedHandles.delete(message.tag)
              }, 0)
            )
          }
        } else {
          notificationsMailbox.unsafeOffer(message)
        }
        return notifications.write({
          clientId: 0,
          requestId: message.id,
          _tag: "Exit",
          exit: Exit.void as any
        })
      }
    })

    return McpServer.of({
      notifications: notifications.client,
      notificationsMailbox,
      initializedClients: new Set<number>(),
      get tools() {
        return tools
      },
      addTool: (options) =>
        Effect.suspend(() => {
          tools.push(options.tool)
          toolMap.set(options.tool.name, options.handle)
          return notifications.client["notifications/tools/list_changed"]({})
        }),
      callTool: (request) =>
        Effect.suspend((): Effect.Effect<CallToolResult, InternalError | InvalidParams, McpServerClient> => {
          const handle = toolMap.get(request.name)
          if (!handle) {
            return Effect.fail(
              new InvalidParams({
                message: `Tool '${request.name}' not found`
              })
            )
          }
          return handle(request.arguments)
        }),
      get resources() {
        return resources
      },
      get resourceTemplates() {
        return resourceTemplates
      },
      addResource: (resource, effect) =>
        Effect.suspend(() => {
          resources.push(resource)
          matcher.add(resource.uri, { _tag: "Resource", effect })
          return notifications.client["notifications/resources/list_changed"](
            {}
          )
        }),
      addResourceTemplate: ({ completions, handle, routerPath, template }) =>
        Effect.suspend(() => {
          resourceTemplates.push(template)
          matcher.add(routerPath, { _tag: "ResourceTemplate", handle })
          for (const [param, handle] of Object.entries(completions)) {
            completionsMap.set(
              `ref/resource/${template.uriTemplate}/${param}`,
              handle
            )
          }
          return notifications.client["notifications/resources/list_changed"](
            {}
          )
        }),
      findResource: (uri) =>
        Effect.suspend(() => {
          const match = matcher.find(uri)
          if (!match) {
            return Effect.succeed({ contents: [] })
          } else if (match.handler._tag === "Resource") {
            return match.handler.effect
          }
          const params: Array<string> = []
          for (const key of Object.keys(match.params)) {
            params[Number(key)] = match.params[key]!
          }
          return match.handler.handle(uri, params)
        }),
      get prompts() {
        return prompts
      },
      addPrompt: (options) =>
        Effect.suspend(() => {
          prompts.push(options.prompt)
          promptMap.set(options.prompt.name, options.handle)
          for (const [param, handle] of Object.entries(options.completions)) {
            completionsMap.set(
              `ref/prompt/${options.prompt.name}/${param}`,
              handle
            )
          }
          return notifications.client["notifications/prompts/list_changed"]({})
        }),
      getPromptResult: Effect.fnUntraced(function*({ arguments: params, name }) {
        const handler = promptMap.get(name)
        if (!handler) {
          return yield* new InvalidParams({
            message: `Prompt '${name}' not found`
          })
        }
        return yield* handler(params ?? {})
      }),
      completion: Effect.fnUntraced(function*(complete) {
        const ref = complete.ref
        const key = ref.type === "ref/resource"
          ? `ref/resource/${ref.uri}/${complete.argument.name}`
          : `ref/prompt/${ref.name}/${complete.argument.name}`
        const handler = completionsMap.get(key)
        return handler
          ? yield* handler(complete.argument.value)
          : CompleteResult.empty
      })
    })
  })

  /**
   * @since 1.0.0
   */
  static readonly layer: Layer.Layer<McpServer | McpServerClient> = Layer.scoped(McpServer, McpServer.make) as any
}

const LATEST_PROTOCOL_VERSION = "2025-06-18"
const SUPPORTED_PROTOCOL_VERSIONS = [
  LATEST_PROTOCOL_VERSION,
  "2025-03-26",
  "2024-11-05",
  "2024-10-07"
]

/**
 * @since 1.0.0
 * @category Constructors
 */
export const run: (options: {
  readonly name: string
  readonly version: string
}) => Effect.Effect<never, never, McpServer | RpcServer.Protocol> = Effect.fnUntraced(function*(options: {
  readonly name: string
  readonly version: string
}) {
  const protocol = yield* RpcServer.Protocol
  const handlers = yield* Layer.build(layerHandlers(options))
  const server = yield* McpServer

  const clients = yield* RcMap.make({
    lookup: Effect.fnUntraced(function*(clientId: number) {
      let write!: (
        message: RpcMessage.FromServerEncoded
      ) => Effect.Effect<void>
      const client = yield* RpcClient.make(ServerRequestRpcs, {
        spanPrefix: "McpServer/Client"
      }).pipe(
        Effect.provideServiceEffect(
          RpcClient.Protocol,
          RpcClient.Protocol.make(
            Effect.fnUntraced(function*(writeResponse) {
              write = writeResponse
              return {
                send(request, _transferables) {
                  return protocol.send(clientId, {
                    ...request,
                    headers: undefined,
                    traceId: undefined,
                    spanId: undefined,
                    sampled: undefined
                  } as any)
                },
                supportsAck: true,
                supportsTransferables: false
              }
            })
          )
        )
      )

      return { client, write } as const
    }),
    idleTimeToLive: 10000
  })

  const clientMiddleware = McpServerClientMiddleware.of(({ clientId }) =>
    Effect.sync(() =>
      McpServerClient.of({
        clientId,
        getClient: RcMap.get(clients, clientId).pipe(
          Effect.map(({ client }) => client)
        )
      })
    )
  )

  const patchedProtocol = RpcServer.Protocol.of({
    ...protocol,
    run: (f) =>
      protocol.run((clientId, request_) => {
        const request = request_ as any as
          | RpcMessage.FromServerEncoded
          | RpcMessage.FromClientEncoded
        switch (request._tag) {
          case "Request": {
            if (ClientNotificationRpcs.requests.has(request.tag)) {
              if (request.tag === "notifications/cancelled") {
                return f(clientId, {
                  _tag: "Interrupt",
                  requestId: String((request.payload as any).requestId)
                })
              }
              const handler = handlers.unsafeMap.get(
                request.tag
              ) as Rpc.Handler<string>
              return handler
                ? handler.handler(request.payload, {
                  clientId,
                  headers: Headers.fromInput(request.headers)
                }) as Effect.Effect<void>
                : Effect.void
            }
            return f(clientId, request)
          }
          case "Ping":
          case "Ack":
          case "Interrupt":
          case "Eof":
            return f(clientId, request)
          case "Pong":
          case "Exit":
          case "Chunk":
          case "ClientProtocolError":
          case "Defect":
            return RcMap.get(clients, clientId).pipe(
              Effect.flatMap(({ write }) => write(request)),
              Effect.scoped
            )
        }
      })
  })

  const encodeNotification = Schema.encode(
    Schema.Union(
      ...Array.from(
        ServerNotificationRpcs.requests.values(),
        (rpc) => rpc.payloadSchema
      )
    )
  )
  yield* server.notificationsMailbox.take.pipe(
    Effect.flatMap(Effect.fnUntraced(function*(request) {
      const encoded = yield* encodeNotification(request.payload)
      const message: RpcMessage.RequestEncoded = {
        _tag: "Request",
        tag: request.tag,
        payload: encoded
      } as any
      const clientIds = yield* patchedProtocol.clientIds
      for (const clientId of server.initializedClients) {
        if (!clientIds.has(clientId)) {
          server.initializedClients.delete(clientId)
          continue
        }
        yield* patchedProtocol.send(clientId, message as any)
      }
    })),
    Effect.catchAllCause(() => Effect.void),
    Effect.forever,
    Effect.forkScoped
  )

  return yield* RpcServer.make(ClientRpcs, {
    spanPrefix: "McpServer",
    disableFatalDefects: true
  }).pipe(
    Effect.provideService(RpcServer.Protocol, patchedProtocol),
    Effect.provideService(McpServerClientMiddleware, clientMiddleware),
    Effect.provide(handlers)
  )
}, Effect.scoped)

/**
 * @since 1.0.0
 * @category Layers
 */
export const layer = (options: {
  readonly name: string
  readonly version: string
}): Layer.Layer<McpServer | McpServerClient, never, RpcServer.Protocol> =>
  Layer.scopedDiscard(Effect.forkScoped(run(options))).pipe(
    Layer.provideMerge(McpServer.layer)
  )

/**
 * Run the McpServer, using stdio for input and output.
 *
 * ```ts
 * import { McpSchema, McpServer } from "@effect/ai"
 * import { NodeRuntime, NodeSink, NodeStream } from "@effect/platform-node"
 * import { Effect, Layer, Logger, Schema } from "effect"
 *
 * const idParam = McpSchema.param("id", Schema.NumberFromString)
 *
 * // Define a resource template for a README file
 * const ReadmeTemplate = McpServer.resource`file://readme/${idParam}`({
 *   name: "README Template",
 *   // You can add auto-completion for the ID parameter
 *   completion: {
 *     id: (_) => Effect.succeed([1, 2, 3, 4, 5])
 *   },
 *   content: Effect.fn(function*(_uri, id) {
 *     return `# MCP Server Demo - ID: ${id}`
 *   })
 * })
 *
 * // Define a test prompt with parameters
 * const TestPrompt = McpServer.prompt({
 *   name: "Test Prompt",
 *   description: "A test prompt to demonstrate MCP server capabilities",
 *   parameters: Schema.Struct({
 *     flightNumber: Schema.String
 *   }),
 *   completion: {
 *     flightNumber: () => Effect.succeed(["FL123", "FL456", "FL789"])
 *   },
 *   content: ({ flightNumber }) => Effect.succeed(`Get the booking details for flight number: ${flightNumber}`)
 * })
 *
 * // Merge all the resources and prompts into a single server layer
 * const ServerLayer = Layer.mergeAll(
 *   ReadmeTemplate,
 *   TestPrompt
 * ).pipe(
 *   // Provide the MCP server implementation
 *   Layer.provide(McpServer.layerStdio({
 *     name: "Demo Server",
 *     version: "1.0.0",
 *     stdin: NodeStream.stdin,
 *     stdout: NodeSink.stdout
 *   })),
 *   // add a stderr logger
 *   Layer.provide(Logger.add(Logger.prettyLogger({ stderr: true })))
 * )
 *
 * Layer.launch(ServerLayer).pipe(NodeRuntime.runMain)
 * ```
 *
 * @since 1.0.0
 * @category Layers
 */
export const layerStdio = <EIn, RIn, EOut, ROut>(options: {
  readonly name: string
  readonly version: string
  readonly stdin: Stream<Uint8Array, EIn, RIn>
  readonly stdout: Sink<unknown, Uint8Array | string, unknown, EOut, ROut>
}): Layer.Layer<McpServer | McpServerClient, never, RIn | ROut> =>
  layer(options).pipe(
    Layer.provide(
      RpcServer.layerProtocolStdio({
        stdin: options.stdin,
        stdout: options.stdout
      })
    ),
    Layer.provide(RpcSerialization.layerNdJsonRpc()),
    // remove stdout loggers
    Layer.provideMerge(Logger.remove(Logger.defaultLogger)),
    Layer.provideMerge(Logger.remove(Logger.prettyLoggerDefault))
  )

/**
 * Run the McpServer, using HTTP for input and output.
 *
 * ```ts
 * import { McpSchema, McpServer } from "@effect/ai"
 * import { HttpRouter } from "@effect/platform"
 * import { NodeHttpServer, NodeRuntime } from "@effect/platform-node"
 * import { Effect, Layer, Schema } from "effect"
 * import { createServer } from "node:http"
 *
 * const idParam = McpSchema.param("id", Schema.NumberFromString)
 *
 * // Define a resource template for a README file
 * const ReadmeTemplate = McpServer.resource`file://readme/${idParam}`({
 *   name: "README Template",
 *   // You can add auto-completion for the ID parameter
 *   completion: {
 *     id: (_) => Effect.succeed([1, 2, 3, 4, 5])
 *   },
 *   content: Effect.fn(function*(_uri, id) {
 *     return `# MCP Server Demo - ID: ${id}`
 *   })
 * })
 *
 * // Define a test prompt with parameters
 * const TestPrompt = McpServer.prompt({
 *   name: "Test Prompt",
 *   description: "A test prompt to demonstrate MCP server capabilities",
 *   parameters: Schema.Struct({
 *     flightNumber: Schema.String
 *   }),
 *   completion: {
 *     flightNumber: () => Effect.succeed(["FL123", "FL456", "FL789"])
 *   },
 *   content: ({ flightNumber }) => Effect.succeed(`Get the booking details for flight number: ${flightNumber}`)
 * })
 *
 * // Merge all the resources and prompts into a single server layer
 * const ServerLayer = Layer.mergeAll(
 *   ReadmeTemplate,
 *   TestPrompt,
 *   HttpRouter.Default.serve()
 * ).pipe(
 *   // Provide the MCP server implementation
 *   Layer.provide(McpServer.layerHttp({
 *     name: "Demo Server",
 *     version: "1.0.0",
 *     path: "/mcp"
 *   })),
 *   Layer.provide(NodeHttpServer.layer(createServer, { port: 3000 }))
 * )
 *
 * Layer.launch(ServerLayer).pipe(NodeRuntime.runMain)
 * ```
 *
 * @since 1.0.0
 * @category Layers
 */
export const layerHttp = <I = HttpRouter.Default>(options: {
  readonly name: string
  readonly version: string
  readonly path: HttpRouter.PathInput
  readonly routerTag?: HttpRouter.HttpRouter.TagClass<I, string, any, any>
}): Layer.Layer<McpServer | McpServerClient> =>
  layer(options).pipe(
    Layer.provide(RpcServer.layerProtocolHttp(options)),
    Layer.provide(RpcSerialization.layerJsonRpc())
  )

/**
 * Run the McpServer, using HTTP for input and output.
 *
 * Uses a `HttpLayerRouter` to register the McpServer routes.
 *
 * @since 1.0.0
 * @category Layers
 */
export const layerHttpRouter = (options: {
  readonly name: string
  readonly version: string
  readonly path: HttpRouter.PathInput
}): Layer.Layer<
  McpServer | McpServerClient,
  never,
  HttpLayerRouter.HttpRouter
> =>
  layer(options).pipe(
    Layer.provide(RpcServer.layerProtocolHttpRouter(options)),
    Layer.provide(RpcSerialization.layerJsonRpc())
  )

/**
 * Register an AiToolkit with the McpServer.
 *
 * @since 1.0.0
 * @category Tools
 */
export const registerToolkit: <Tools extends Record<string, AiTool.Any>>(
  toolkit: Toolkit.Toolkit<Tools>
) => Effect.Effect<
  void,
  never,
  | McpServer
  | AiTool.HandlersFor<Tools>
  | Exclude<AiTool.Requirements<Tools>, McpServerClient>
> = Effect.fnUntraced(function*<Tools extends Record<string, AiTool.Any>>(
  toolkit: Toolkit.Toolkit<Tools>
) {
  const registry = yield* McpServer
  const built = yield* toolkit as any as Effect.Effect<
    Toolkit.WithHandler<Tools>,
    never,
    Exclude<AiTool.HandlersFor<Tools>, McpServerClient>
  >
  const context = yield* Effect.context<never>()
  for (const tool of Object.values(built.tools)) {
    const mcpTool = new Tool({
      name: tool.name,
      description: tool.description,
      inputSchema: makeJsonSchema(tool.parametersSchema.ast),
      annotations: new ToolAnnotations({
        ...Context.getOption(tool.annotations, AiTool.Title).pipe(
          Option.map((title) => ({ title })),
          Option.getOrUndefined
        ),
        readOnlyHint: Context.get(tool.annotations, AiTool.Readonly),
        destructiveHint: Context.get(tool.annotations, AiTool.Destructive),
        idempotentHint: Context.get(tool.annotations, AiTool.Idempotent),
        openWorldHint: Context.get(tool.annotations, AiTool.OpenWorld)
      })
    })
    yield* registry.addTool({
      tool: mcpTool,
      handle(payload) {
        return built.handle(tool.name as any, payload).pipe(
          Effect.provide(context as Context.Context<any>),
          Effect.match({
            onFailure: (error) =>
              new CallToolResult({
                isError: true,
                structuredContent: typeof error === "object" ? error : undefined,
                content: [
                  {
                    type: "text",
                    text: JSON.stringify(error)
                  }
                ]
              }),
            onSuccess: (result) =>
              new CallToolResult({
                isError: false,
                structuredContent: typeof result.encodedResult === "object"
                  ? result.encodedResult
                  : undefined,
                content: [
                  {
                    type: "text",
                    text: JSON.stringify(result.encodedResult)
                  }
                ]
              })
          })
        ) as any
      }
    })
  }
})

/**
 * Register an AiToolkit with the McpServer.
 *
 * @since 1.0.0
 * @category Tools
 */
export const toolkit = <Tools extends Record<string, AiTool.Any>>(
  toolkit: Toolkit.Toolkit<Tools>
): Layer.Layer<
  never,
  never,
  | AiTool.HandlersFor<Tools>
  | Exclude<AiTool.Requirements<Tools>, McpServerClient>
> =>
  Layer.effectDiscard(registerToolkit(toolkit)).pipe(
    Layer.provide(McpServer.layer)
  )

/**
 * @since 1.0.0
 */
export type ValidateCompletions<
  Completions,
  Keys extends string
> =
  & Completions
  & {
    readonly [K in keyof Completions]: K extends Keys ? (input: string) => any
      : never
  }

/**
 * @since 1.0.0
 */
export type ResourceCompletions<
  Schemas extends ReadonlyArray<Schema.Schema.Any>
> = {
  readonly [
    K in Extract<
      keyof Schemas,
      `${number}`
    > as Schemas[K] extends Param<infer Id, infer _S> ? Id : `param${K}`
  ]: (
    input: string
  ) => Effect.Effect<Array<Schema.Schema.Type<Schemas[K]>>, any, any>
}

/**
 * Register a resource with the McpServer.
 *
 * @since 1.0.0
 * @category Resources
 */
export const registerResource: {
  <E, R>(options: {
    readonly uri: string
    readonly name: string
    readonly description?: string | undefined
    readonly mimeType?: string | undefined
    readonly audience?: ReadonlyArray<"user" | "assistant"> | undefined
    readonly priority?: number | undefined
    readonly content: Effect.Effect<
      typeof ReadResourceResult.Type | string | Uint8Array,
      E,
      R
    >
  }): Effect.Effect<void, never, Exclude<R, McpServerClient> | McpServer>
  <const Schemas extends ReadonlyArray<Schema.Schema.Any>>(
    segments: TemplateStringsArray,
    ...schemas:
      & Schemas
      & {
        readonly [K in keyof Schemas]: Schema.Schema.Encoded<
          Schemas[K]
        > extends string ? unknown
          : "Schema must be encodable to a string"
      }
  ): <
    E,
    R,
    const Completions extends Partial<ResourceCompletions<Schemas>> = {}
  >(options: {
    readonly name: string
    readonly description?: string | undefined
    readonly mimeType?: string | undefined
    readonly audience?: ReadonlyArray<"user" | "assistant"> | undefined
    readonly priority?: number | undefined
    readonly completion?:
      | ValidateCompletions<Completions, keyof ResourceCompletions<Schemas>>
      | undefined
    readonly content: (
      uri: string,
      ...params: { readonly [K in keyof Schemas]: Schemas[K]["Type"] }
    ) => Effect.Effect<
      typeof ReadResourceResult.Type | string | Uint8Array,
      E,
      R
    >
  }) => Effect.Effect<
    void,
    never,
    | Exclude<
      | R
      | (Completions[keyof Completions] extends (input: string) => infer Ret
        ? Ret extends Effect.Effect<infer _A, infer _E, infer _R> ? _R
        : never
        : never),
      McpServerClient
    >
    | McpServer
  >
} = function() {
  if (arguments.length === 1) {
    const options = arguments[0] as
      & Resource
      & typeof Annotations.Type
      & {
        readonly content: Effect.Effect<
          typeof ReadResourceResult.Type | string | Uint8Array
        >
      }
    return Effect.gen(function*() {
      const context = yield* Effect.context<any>()
      const registry = yield* McpServer
      yield* registry.addResource(
        new Resource({
          ...options,
          annotations: options
        }),
        options.content.pipe(
          Effect.provide(context),
          Effect.map((content) => resolveResourceContent(options.uri, content)),
          Effect.catchAllCause((cause) => {
            const prettyError = Cause.prettyErrors(cause)[0]
            return new InternalError({ message: prettyError.message })
          })
        )
      )
    })
  }
  const { params, routerPath, schema, uriPath } = compileUriTemplate(
    ...(arguments as any as [any, any])
  )
  return Effect.fnUntraced(function*<E, R>(options: {
    readonly name: string
    readonly description?: string | undefined
    readonly mimeType?: string | undefined
    readonly audience?: ReadonlyArray<"user" | "assistant"> | undefined
    readonly priority?: number | undefined
    readonly completion?:
      | Record<string, (input: string) => Effect.Effect<any>>
      | undefined
    readonly content: (
      uri: string,
      ...params: Array<any>
    ) => Effect.Effect<
      typeof ReadResourceResult.Type | string | Uint8Array,
      E,
      R
    >
  }) {
    const context = yield* Effect.context<any>()
    const registry = yield* McpServer
    const decode = Schema.decodeUnknown(schema)
    const template = new ResourceTemplate({
      ...options,
      uriTemplate: uriPath,
      annotations: options
    })
    const completions: Record<
      string,
      (input: string) => Effect.Effect<CompleteResult, InternalError>
    > = {}
    for (const [param, handle] of Object.entries(options.completion ?? {})) {
      const encodeArray = Schema.encodeUnknown(Schema.Array(params[param]))
      const handler = (input: string) =>
        handle(input).pipe(
          Effect.flatMap(encodeArray),
          Effect.map(
            (values) =>
              new CompleteResult({
                completion: {
                  values: values as Array<string>,
                  total: values.length,
                  hasMore: false
                }
              })
          ),
          Effect.catchAllCause((cause) => {
            const prettyError = Cause.prettyErrors(cause)[0]
            return new InternalError({ message: prettyError.message })
          }),
          Effect.provide(context)
        )
      completions[param] = handler
    }
    yield* registry.addResourceTemplate({
      template,
      routerPath,
      completions,
      handle: (uri, params) =>
        decode(params).pipe(
          Effect.mapError(
            (error) => new InvalidParams({ message: error.message })
          ),
          Effect.flatMap((params) =>
            options.content(uri, ...params).pipe(
              Effect.map((content) => resolveResourceContent(uri, content)),
              Effect.catchAllCause((cause) => {
                const prettyError = Cause.prettyErrors(cause)[0]
                return new InternalError({ message: prettyError.message })
              })
            )
          ),
          Effect.provide(context)
        )
    })
  })
} as any

/**
 * Register a resource with the McpServer.
 *
 * @since 1.0.0
 * @category Resources
 */
export const resource: {
  <E, R>(options: {
    readonly uri: string
    readonly name: string
    readonly description?: string | undefined
    readonly mimeType?: string | undefined
    readonly audience?: ReadonlyArray<"user" | "assistant"> | undefined
    readonly priority?: number | undefined
    readonly content: Effect.Effect<
      typeof ReadResourceResult.Type | string | Uint8Array,
      E,
      R
    >
  }): Layer.Layer<never, never, Exclude<R, McpServerClient>>
  <const Schemas extends ReadonlyArray<Schema.Schema.Any>>(
    segments: TemplateStringsArray,
    ...schemas:
      & Schemas
      & {
        readonly [K in keyof Schemas]: Schema.Schema.Encoded<
          Schemas[K]
        > extends string ? unknown
          : "Schema must be encodable to a string"
      }
  ): <
    E,
    R,
    const Completions extends Partial<ResourceCompletions<Schemas>> = {}
  >(options: {
    readonly name: string
    readonly description?: string | undefined
    readonly mimeType?: string | undefined
    readonly audience?: ReadonlyArray<"user" | "assistant"> | undefined
    readonly priority?: number | undefined
    readonly completion?:
      | ValidateCompletions<Completions, keyof ResourceCompletions<Schemas>>
      | undefined
    readonly content: (
      uri: string,
      ...params: { readonly [K in keyof Schemas]: Schemas[K]["Type"] }
    ) => Effect.Effect<
      typeof ReadResourceResult.Type | string | Uint8Array,
      E,
      R
    >
  }) => Layer.Layer<
    never,
    never,
    Exclude<
      | R
      | (Completions[keyof Completions] extends (input: string) => infer Ret
        ? Ret extends Effect.Effect<infer _A, infer _E, infer _R> ? _R
        : never
        : never),
      McpServerClient
    >
  >
} = function() {
  if (arguments.length === 1) {
    return Layer.effectDiscard(registerResource(arguments[0])).pipe(
      Layer.provide(McpServer.layer)
    )
  }
  const register = registerResource(...(arguments as any as [any, any]))
  return (options: any) => Layer.effectDiscard(register(options)).pipe(Layer.provide(McpServer.layer))
} as any

/**
 * Register a prompt with the McpServer.
 *
 * @since 1.0.0
 * @category Prompts
 */
export const registerPrompt = <
  E,
  R,
  Params = {},
  ParamsI extends Record<string, string> = {},
  ParamsR = never,
  const Completions extends {
    readonly [K in keyof Params]?: (
      input: string
    ) => Effect.Effect<Array<Params[K]>, any, any>
  } = {}
>(options: {
  readonly name: string
  readonly description?: string | undefined
  readonly parameters?: Schema.Schema<Params, ParamsI, ParamsR> | undefined
  readonly completion?:
    | ValidateCompletions<Completions, Extract<keyof Params, string>>
    | undefined
  readonly content: (
    params: Params
  ) => Effect.Effect<Array<typeof PromptMessage.Type> | string, E, R>
}): Effect.Effect<
  void,
  never,
  Exclude<ParamsR | R, McpServerClient> | McpServer
> => {
  const args = Arr.empty<typeof PromptArgument.Type>()
  const props: Record<string, Schema.Schema.Any> = {}
  const propSignatures = options.parameters
    ? AST.getPropertySignatures(options.parameters.ast)
    : []
  for (const prop of propSignatures) {
    args.push({
      name: prop.name as string,
      description: Option.getOrUndefined(AST.getDescriptionAnnotation(prop)),
      required: !prop.isOptional
    })
    props[prop.name as string] = Schema.make(prop.type)
  }
  const prompt = new Prompt({
    name: options.name,
    description: options.description,
    arguments: args
  })
  const decode = options.parameters
    ? Schema.decodeUnknown(options.parameters)
    : () => Effect.succeed({} as Params)
  const completion: Record<string, (input: string) => Effect.Effect<any>> = options.completion ?? {}
  return Effect.gen(function*() {
    const registry = yield* McpServer
    const context = yield* Effect.context<Exclude<R | ParamsR, McpServerClient>>()
    const completions: Record<
      string,
      (
        input: string
      ) => Effect.Effect<CompleteResult, InternalError, McpServerClient>
    > = {}
    for (const [param, handle] of Object.entries(completion)) {
      const encodeArray = Schema.encodeUnknown(Schema.Array(props[param]))
      const handler = (input: string) =>
        handle(input).pipe(
          Effect.flatMap(encodeArray),
          Effect.map((values) => ({
            completion: {
              values: values as Array<string>,
              total: values.length,
              hasMore: false
            }
          })),
          Effect.catchAllCause((cause) => {
            const prettyError = Cause.prettyErrors(cause)[0]
            return new InternalError({ message: prettyError.message })
          }),
          Effect.provide(context)
        )
      completions[param] = handler as any
    }
    yield* registry.addPrompt({
      prompt,
      completions,
      handle: (params) =>
        decode(params).pipe(
          Effect.mapError(
            (error) => new InvalidParams({ message: error.message })
          ),
          Effect.flatMap((params) => options.content(params)),
          Effect.map((messages) => {
            messages = typeof messages === "string"
              ? [
                {
                  role: "user",
                  content: TextContent.make({ text: messages })
                }
              ]
              : messages
            return new GetPromptResult({
              messages,
              description: prompt.description
            })
          }),
          Effect.catchAllCause((cause) => {
            const prettyError = Cause.prettyErrors(cause)[0]
            return new InternalError({ message: prettyError.message })
          }),
          Effect.provide(context as Context.Context<ParamsR | R>)
        )
    })
  })
}

/**
 * Register a prompt with the McpServer.
 *
 * @since 1.0.0
 * @category Prompts
 */
export const prompt = <
  E,
  R,
  Params = {},
  ParamsI extends Record<string, string> = {},
  ParamsR = never,
  const Completions extends {
    readonly [K in keyof Params]?: (
      input: string
    ) => Effect.Effect<Array<Params[K]>, any, any>
  } = {}
>(options: {
  readonly name: string
  readonly description?: string | undefined
  readonly parameters?: Schema.Schema<Params, ParamsI, ParamsR> | undefined
  readonly completion?:
    | ValidateCompletions<Completions, Extract<keyof Params, string>>
    | undefined
  readonly content: (
    params: Params
  ) => Effect.Effect<Array<typeof PromptMessage.Type> | string, E, R>
}): Layer.Layer<never, never, Exclude<ParamsR | R, McpServerClient>> =>
  Layer.effectDiscard(registerPrompt(options)).pipe(
    Layer.provide(McpServer.layer)
  )

/**
 * Create an elicitation request
 *
 * @since 1.0.0
 * @category Elicitation
 */
export const elicit: <A, I extends Record<string, any>, R>(options: {
  readonly message: string
  readonly schema: Schema.Schema<A, I, R>
}) => Effect.Effect<A, ElicitationDeclined, McpServerClient | R> = Effect.fnUntraced(
  function*<A, I extends Record<string, any>, R>(options: {
    readonly message: string
    readonly schema: Schema.Schema<A, I, R>
  }) {
    const { getClient } = yield* McpServerClient
    const client = yield* getClient
    const request = Elicit.payloadSchema.make({
      message: options.message,
      requestedSchema: makeJsonSchema(options.schema.ast)
    })
    const res = yield* client["elicitation/create"](request).pipe(
      Effect.catchAllCause((cause) =>
        Effect.fail(
          new ElicitationDeclined({ cause: Cause.squash(cause), request })
        )
      )
    )
    switch (res.action) {
      case "accept":
        return yield* Effect.orDie(
          Schema.decodeUnknown(options.schema)(res.content)
        )
      case "cancel":
        return yield* Effect.interrupt
      case "decline":
        return yield* Effect.fail(new ElicitationDeclined({ request }))
    }
  },
  Effect.scoped
)

// -----------------------------------------------------------------------------
// Internal
// -----------------------------------------------------------------------------

const makeUriMatcher = <A>() => {
  const router = FindMyWay.make<A>({
    ignoreTrailingSlash: true,
    ignoreDuplicateSlashes: true,
    caseSensitive: true
  })
  const add = (uri: string, value: A) => {
    router.on("GET", uri as any, value)
  }
  const find = (uri: string) => router.find("GET", uri)

  return { add, find } as const
}

const compileUriTemplate = (
  segments: TemplateStringsArray,
  ...schemas: ReadonlyArray<Schema.Schema.Any>
) => {
  let routerPath = segments[0].replace(":", "::")
  let uriPath = segments[0]
  const params: Record<string, Schema.Schema.Any> = {}
  let pathSchema = Schema.Tuple() as Schema.Schema.Any
  if (schemas.length > 0) {
    const arr: Array<Schema.Schema.Any> = []
    for (let i = 0; i < schemas.length; i++) {
      const schema = schemas[i]
      const segment = segments[i + 1]
      const key = String(i)
      arr.push(schema)
      routerPath += `:${key}${segment.replace(":", "::")}`
      const paramName = AST.getAnnotation(ParamAnnotation)(schema.ast).pipe(
        Option.getOrElse(() => `param${key}`)
      )
      params[paramName as string] = schema
      uriPath += `{${paramName}}${segment}`
    }
    pathSchema = Schema.Tuple(...arr)
  }
  return {
    routerPath,
    uriPath,
    schema: pathSchema,
    params
  } as const
}

const layerHandlers = (serverInfo: {
  readonly name: string
  readonly version: string
}) =>
  ClientRpcs.toLayer(
    Effect.gen(function*() {
      const server = yield* McpServer

      return {
        // Requests
        ping: () => Effect.succeed({}),
        initialize(params, { clientId }) {
          const requestedVersion = params.protocolVersion
          const capabilities: Types.DeepMutable<
            typeof ServerCapabilities.Type
          > = {
            completions: {}
          }
          if (server.tools.length > 0) {
            capabilities.tools = { listChanged: true }
          }
          if (
            server.resources.length > 0 ||
            server.resourceTemplates.length > 0
          ) {
            capabilities.resources = {
              listChanged: true,
              subscribe: false
            }
          }
          if (server.prompts.length > 0) {
            capabilities.prompts = { listChanged: true }
          }
          server.initializedClients.add(clientId)
          return Effect.succeed({
            capabilities,
            serverInfo,
            protocolVersion: SUPPORTED_PROTOCOL_VERSIONS.includes(
                requestedVersion
              )
              ? requestedVersion
              : LATEST_PROTOCOL_VERSION
          })
        },
        "completion/complete": server.completion,
        "logging/setLevel": () => InternalError.notImplemented,
        "prompts/get": server.getPromptResult,
        "prompts/list": () => Effect.sync(() => new ListPromptsResult({ prompts: server.prompts })),
        "resources/list": () =>
          Effect.sync(
            () => new ListResourcesResult({ resources: server.resources })
          ),
        "resources/read": ({ uri }) => server.findResource(uri),
        "resources/subscribe": () => InternalError.notImplemented,
        "resources/unsubscribe": () => InternalError.notImplemented,
        "resources/templates/list": () =>
          Effect.sync(
            () =>
              new ListResourceTemplatesResult({
                resourceTemplates: server.resourceTemplates
              })
          ),
        "tools/call": server.callTool,
        "tools/list": () => Effect.sync(() => new ListToolsResult({ tools: server.tools })),

        // Notifications
        "notifications/cancelled": (_) => Effect.void,
        "notifications/initialized": (_) => Effect.void,
        "notifications/progress": (_) => Effect.void,
        "notifications/roots/list_changed": (_) => Effect.void
      }
    })
  )

const makeJsonSchema = (ast: AST.AST): JsonSchema.JsonSchema7 => {
  const props = AST.getPropertySignatures(ast)
  if (props.length === 0) {
    return {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false
    }
  }
  const $defs = {}
  const schema = JsonSchema.fromAST(ast, {
    definitions: $defs,
    topLevelReferenceStrategy: "skip"
  })
  if (Object.keys($defs).length === 0) return schema
  ;(schema as any).$defs = $defs
  return schema
}

const resolveResourceContent = (
  uri: string,
  content: typeof ReadResourceResult.Type | string | Uint8Array
): typeof ReadResourceResult.Type => {
  if (typeof content === "string") {
    return {
      contents: [
        {
          uri,
          text: content
        }
      ]
    }
  } else if (content instanceof Uint8Array) {
    return {
      contents: [
        {
          uri,
          blob: content
        }
      ]
    }
  }
  return content
}
