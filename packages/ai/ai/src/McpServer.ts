/**
 * @since 1.0.0
 */
import * as Headers from "@effect/platform/Headers"
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
import * as Schema from "effect/Schema"
import * as AST from "effect/SchemaAST"
import type { Sink } from "effect/Sink"
import type { Stream } from "effect/Stream"
import type * as Types from "effect/Types"
import * as FindMyWay from "find-my-way-ts"
import * as AiTool from "./AiTool.js"
import type * as AiToolkit from "./AiToolkit.js"
import type { CallTool, Complete, GetPrompt, Param, ServerCapabilities } from "./McpSchema.js"
import {
  Annotations,
  BlobResourceContents,
  CallToolResult,
  ClientRpcs,
  CompleteResult,
  GetPromptResult,
  InternalError,
  InvalidParams,
  ListPromptsResult,
  ListResourcesResult,
  ListResourceTemplatesResult,
  ListToolsResult,
  ParamAnnotation,
  Prompt,
  PromptArgument,
  PromptMessage,
  ReadResourceResult,
  Resource,
  ResourceTemplate,
  ServerNotificationRpcs,
  TextContent,
  TextResourceContents,
  Tool,
  ToolAnnotations
} from "./McpSchema.js"

/**
 * @since 1.0.0
 * @category McpServer
 */
export class McpServer extends Context.Tag("@effect/ai/McpServer")<
  McpServer,
  {
    readonly notifications: RpcClient.RpcClient<RpcGroup.Rpcs<typeof ServerNotificationRpcs>>
    readonly notificationsMailbox: Mailbox.ReadonlyMailbox<RpcMessage.Request<any>>
    readonly tools: ReadonlyArray<Tool>
    readonly addTool: (options: {
      readonly tool: Tool
      readonly handle: (payload: any) => Effect.Effect<CallToolResult>
    }) => Effect.Effect<void>
    readonly callTool: (
      requests: typeof CallTool.payloadSchema.Type
    ) => Effect.Effect<CallToolResult, InternalError | InvalidParams>
    readonly resources: ReadonlyArray<Resource>
    readonly addResource: (
      resource: Resource,
      handle: Effect.Effect<ReadResourceResult, InternalError>
    ) => Effect.Effect<void>
    readonly resourceTemplates: ReadonlyArray<ResourceTemplate>
    readonly addResourceTemplate: (
      options: {
        readonly template: ResourceTemplate
        readonly routerPath: string
        readonly completions: Record<string, (input: string) => Effect.Effect<CompleteResult, InternalError>>
        readonly handle: (
          uri: string,
          params: Array<string>
        ) => Effect.Effect<ReadResourceResult, InvalidParams | InternalError>
      }
    ) => Effect.Effect<void>
    readonly findResource: (uri: string) => Effect.Effect<ReadResourceResult, InvalidParams | InternalError>
    readonly addPrompt: (options: {
      readonly prompt: Prompt
      readonly completions: Record<string, (input: string) => Effect.Effect<CompleteResult, InternalError>>
      readonly handle: (params: Record<string, string>) => Effect.Effect<GetPromptResult, InternalError | InvalidParams>
    }) => Effect.Effect<void>
    readonly prompts: ReadonlyArray<Prompt>
    readonly getPromptResult: (
      request: typeof GetPrompt.payloadSchema.Type
    ) => Effect.Effect<GetPromptResult, InternalError | InvalidParams>
    readonly completion: (complete: typeof Complete.payloadSchema.Type) => Effect.Effect<CompleteResult, InternalError>
  }
>() {
  /**
   * @since 1.0.0
   */
  static readonly make = Effect.gen(function*() {
    const matcher = makeUriMatcher<
      {
        readonly _tag: "ResourceTemplate"
        readonly handle: (
          uri: string,
          params: Array<string>
        ) => Effect.Effect<ReadResourceResult, InternalError | InvalidParams>
      } | {
        readonly _tag: "Resource"
        readonly effect: Effect.Effect<ReadResourceResult, InternalError>
      }
    >()
    const tools = Arr.empty<Tool>()
    const toolMap = new Map<string, (payload: any) => Effect.Effect<CallToolResult, InternalError>>()
    const resources: Array<Resource> = []
    const resourceTemplates: Array<ResourceTemplate> = []
    const prompts: Array<Prompt> = []
    const promptMap = new Map<
      string,
      (params: Record<string, string>) => Effect.Effect<GetPromptResult, InternalError | InvalidParams>
    >()
    const completionsMap = new Map<string, (input: string) => Effect.Effect<CompleteResult, InternalError>>()
    const notificationsMailbox = yield* Mailbox.make<RpcMessage.Request<any>>()
    const listChangedHandles = new Map<string, any>()
    const notifications = yield* RpcClient.makeNoSerialization(ServerNotificationRpcs, {
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
        Effect.suspend((): Effect.Effect<CallToolResult, InternalError | InvalidParams> => {
          const handle = toolMap.get(request.name)
          if (!handle) {
            return Effect.fail(new InvalidParams({ message: `Tool '${request.name}' not found` }))
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
          return notifications.client["notifications/resources/list_changed"]({})
        }),
      addResourceTemplate: ({ completions, handle, routerPath, template }) =>
        Effect.suspend(() => {
          resourceTemplates.push(template)
          matcher.add(routerPath, { _tag: "ResourceTemplate", handle })
          for (const [param, handle] of Object.entries(completions)) {
            completionsMap.set(`ref/resource/${template.uriTemplate}/${param}`, handle)
          }
          return notifications.client["notifications/resources/list_changed"]({})
        }),
      findResource: (uri) =>
        Effect.suspend(() => {
          const match = matcher.find(uri)
          if (!match) {
            return Effect.succeed(
              new ReadResourceResult({
                contents: []
              })
            )
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
            completionsMap.set(`ref/prompt/${options.prompt.name}/${param}`, handle)
          }
          return notifications.client["notifications/prompts/list_changed"]({})
        }),
      getPromptResult: Effect.fnUntraced(function*({ arguments: params, name }) {
        const handler = promptMap.get(name)
        if (!handler) {
          return yield* new InvalidParams({ message: `Prompt '${name}' not found` })
        }
        return yield* handler(params ?? {})
      }),
      completion: Effect.fnUntraced(function*(complete) {
        const ref = complete.ref
        const key = ref.type === "ref/resource"
          ? `ref/resource/${ref.uri}/${complete.argument.name}`
          : `ref/prompt/${ref.name}/${complete.argument.name}`
        const handler = completionsMap.get(key)
        return handler ? yield* handler(complete.argument.value) : CompleteResult.empty
      })
    })
  })

  /**
   * @since 1.0.0
   */
  static readonly layer: Layer.Layer<McpServer> = Layer.scoped(McpServer, McpServer.make)
}

const LATEST_PROTOCOL_VERSION = "2025-03-26"
const SUPPORTED_PROTOCOL_VERSIONS = [
  LATEST_PROTOCOL_VERSION,
  "2024-11-05",
  "2024-10-07"
]

/**
 * @since 1.0.0
 * @category Constructors
 */
export const run = Effect.fnUntraced(function*(options: {
  readonly name: string
  readonly version: string
}) {
  const protocol = yield* RpcServer.Protocol
  const handlers = yield* Layer.build(layerHandlers(options))
  const server = yield* McpServer

  const patchedProtocol = RpcServer.Protocol.of({
    ...protocol,
    run: (f) =>
      protocol.run((clientId, request) => {
        if (request._tag === "Request" && request.tag.startsWith("notifications/")) {
          if (request.tag === "notifications/cancelled") {
            return f(clientId, {
              _tag: "Interrupt",
              requestId: String((request.payload as any).requestId)
            })
          }
          const handler = handlers.unsafeMap.get(request.tag) as Rpc.Handler<string>
          return handler
            ? handler.handler(request.payload, Headers.fromInput(request.headers)) as Effect.Effect<void>
            : Effect.void
        }
        return f(clientId, request)
      })
  })

  const encodeNotification = Schema.encode(
    Schema.Union(...Array.from(ServerNotificationRpcs.requests.values(), (rpc) => rpc.payloadSchema))
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
      for (const clientId of clientIds) {
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
}): Layer.Layer<McpServer, never, RpcServer.Protocol> =>
  Layer.scopedDiscard(Effect.forkScoped(run(options))).pipe(
    Layer.provideMerge(McpServer.layer)
  )

/**
 * Run the McpServer, using stdio for input and output.
 *
 * @since 1.0.0
 * @category Layers
 */
export const layerStdio = <EIn, RIn, EOut, ROut>(options: {
  readonly name: string
  readonly version: string
  readonly stdin: Stream<Uint8Array, EIn, RIn>
  readonly stdout: Sink<unknown, Uint8Array | string, unknown, EOut, ROut>
}): Layer.Layer<McpServer, never, RIn | ROut> =>
  layer(options).pipe(
    Layer.provide(RpcServer.layerProtocolStdio({
      stdin: options.stdin,
      stdout: options.stdout
    })),
    Layer.provide(RpcSerialization.layerNdJsonRpc()),
    // remove stdout loggers
    Layer.provideMerge(Logger.remove(Logger.defaultLogger)),
    Layer.provideMerge(Logger.remove(Logger.prettyLoggerDefault))
  )

export const layerHttp = <I = HttpRouter.Default>(options: {
  readonly name: string
  readonly version: string
  readonly path: HttpRouter.PathInput
  readonly routerTag?: HttpRouter.HttpRouter.TagClass<I, string, any, any>
}): Layer.Layer<McpServer> =>
  layer(options).pipe(
    Layer.provide(RpcServer.layerProtocolHttp(options)),
    Layer.provide(RpcSerialization.layerJsonRpc())
  )

/**
 * Register an AiToolkit with the McpServer.
 *
 * @since 1.0.0
 * @category Tools
 */
export const registerToolkit: <Tools extends AiTool.Any>(toolkit: AiToolkit.AiToolkit<Tools>) => Effect.Effect<
  void,
  never,
  McpServer | AiTool.ToHandler<Tools>
> = Effect.fnUntraced(function*<Tools extends AiTool.Any>(
  toolkit: AiToolkit.AiToolkit<Tools>
) {
  const registry = yield* McpServer
  const built = yield* toolkit
  const context = yield* Effect.context<AiTool.Context<Tools>>()
  for (const tool of built.tools) {
    const mcpTool = new Tool({
      name: tool.name,
      description: tool.description,
      inputSchema: makeJsonSchema(tool.parametersSchema.ast),
      annotations: new ToolAnnotations({
        ...(Context.getOption(tool.annotations, AiTool.Title).pipe(
          Option.map((title) => ({ title })),
          Option.getOrUndefined
        )),
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
          Effect.provide(context),
          Effect.match({
            onFailure: (error) =>
              new CallToolResult({
                isError: true,
                content: [
                  new TextContent({
                    text: JSON.stringify(error)
                  })
                ]
              }),
            onSuccess: (result) =>
              new CallToolResult({
                isError: false,
                content: [
                  new TextContent({
                    text: JSON.stringify(result.encodedResult)
                  })
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
export const toolkit = <Tools extends AiTool.Any>(
  toolkit: AiToolkit.AiToolkit<Tools>
): Layer.Layer<never, never, AiTool.ToHandler<Tools> | McpServer> => Layer.effectDiscard(registerToolkit(toolkit))

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
      ReadResourceResult | string | Uint8Array,
      E,
      R
    >
  }): Effect.Effect<void, never, R | McpServer>
  <const Schemas extends ReadonlyArray<Schema.Schema.Any>>(
    segments: TemplateStringsArray,
    ...schemas:
      & Schemas
      & {
        readonly [K in keyof Schemas]: Schema.Schema.Encoded<Schemas[K]> extends string ? unknown
          : "Schema must be encodable to a string"
      }
  ): <
    E,
    R,
    const Completions extends {
      readonly [
        K in Extract<keyof Schemas, `${number}`> as Schemas[K] extends Param<infer Id, infer _S> ? Id
          : `param${K}`
      ]?: (input: string) => Effect.Effect<
        Array<Schema.Schema.Type<Schemas[K]>>,
        any,
        any
      >
    } = {}
  >(options: {
    readonly name: string
    readonly description?: string | undefined
    readonly mimeType?: string | undefined
    readonly audience?: ReadonlyArray<"user" | "assistant"> | undefined
    readonly priority?: number | undefined
    readonly completion?: (Completions & Record<keyof Completions, (input: string) => any>) | undefined
    readonly content: (uri: string, ...params: { readonly [K in keyof Schemas]: Schemas[K]["Type"] }) => Effect.Effect<
      ReadResourceResult | string | Uint8Array,
      E,
      R
    >
  }) => Effect.Effect<
    void,
    never,
    | R
    | (Completions[keyof Completions] extends (input: string) => infer Ret ?
      Ret extends Effect.Effect<infer _A, infer _E, infer _R> ? _R : never
      : never)
    | McpServer
  >
} = function() {
  if (arguments.length === 1) {
    const options = arguments[0] as Resource & Annotations & {
      readonly content: Effect.Effect<ReadResourceResult | string | Uint8Array>
    }
    return Effect.gen(function*() {
      const context = yield* Effect.context<any>()
      const registry = yield* McpServer
      yield* registry.addResource(
        new Resource({
          ...options,
          annotations: new Annotations(options)
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
  const {
    params,
    routerPath,
    schema,
    uriPath
  } = compileUriTemplate(...(arguments as any as [any, any]))
  return Effect.fnUntraced(function*<E, R>(options: {
    readonly name: string
    readonly description?: string | undefined
    readonly mimeType?: string | undefined
    readonly audience?: ReadonlyArray<"user" | "assistant"> | undefined
    readonly priority?: number | undefined
    readonly completion?: Record<string, (input: string) => Effect.Effect<any>> | undefined
    readonly content: (uri: string, ...params: Array<any>) => Effect.Effect<
      ReadResourceResult | string | Uint8Array,
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
      annotations: new Annotations(options)
    })
    const completions: Record<string, (input: string) => Effect.Effect<CompleteResult, InternalError>> = {}
    for (const [param, handle] of Object.entries(options.completion ?? {})) {
      const encodeArray = Schema.encodeUnknown(Schema.Array(params[param]))
      const handler = (input: string) =>
        handle(input).pipe(
          Effect.flatMap(encodeArray),
          Effect.map((values) =>
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
          Effect.mapError((error) => new InvalidParams({ message: error.message })),
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
      ReadResourceResult | string | Uint8Array,
      E,
      R
    >
  }): Layer.Layer<never, never, R | McpServer>
  <const Schemas extends ReadonlyArray<Schema.Schema.Any>>(
    segments: TemplateStringsArray,
    ...schemas:
      & Schemas
      & {
        readonly [K in keyof Schemas]: Schema.Schema.Encoded<Schemas[K]> extends string ? unknown
          : "Schema must be encodable to a string"
      }
  ): <
    E,
    R,
    const Completions extends {
      readonly [
        K in Extract<keyof Schemas, `${number}`> as Schemas[K] extends Param<infer Id, infer _S> ? Id
          : `param${K}`
      ]?: (input: string) => Effect.Effect<
        Array<Schema.Schema.Type<Schemas[K]>>,
        any,
        any
      >
    } = {}
  >(options: {
    readonly name: string
    readonly description?: string | undefined
    readonly mimeType?: string | undefined
    readonly audience?: ReadonlyArray<"user" | "assistant"> | undefined
    readonly priority?: number | undefined
    readonly completion?: (Completions & Record<keyof Completions, (input: string) => any>) | undefined
    readonly content: (uri: string, ...params: { readonly [K in keyof Schemas]: Schemas[K]["Type"] }) => Effect.Effect<
      ReadResourceResult | string | Uint8Array,
      E,
      R
    >
  }) => Layer.Layer<
    never,
    never,
    | McpServer
    | R
    | (Completions[keyof Completions] extends (input: string) => infer Ret ?
      Ret extends Effect.Effect<infer _A, infer _E, infer _R> ? _R : never
      : never)
  >
} = function() {
  if (arguments.length === 1) {
    return Layer.effectDiscard(registerResource(arguments[0]))
  }
  const register = registerResource(...(arguments as any as [any, any]))
  return (options: any) => Layer.effectDiscard(register(options))
} as any

/**
 * Register a prompt with the McpServer.
 *
 * @since 1.0.0
 * @category Resources
 */
export const registerPrompt = <
  E,
  R,
  Params = {},
  ParamsI extends Record<string, string> = {},
  ParamsR = never,
  const Completions extends {
    readonly [K in keyof Params]?: (input: string) => Effect.Effect<Array<Params[K]>, any, any>
  } = {}
>(
  options: {
    readonly name: string
    readonly description?: string | undefined
    readonly parameters?: Schema.Schema<Params, ParamsI, ParamsR> | undefined
    readonly completion?: (Completions & Record<keyof Completions, (input: string) => any>) | undefined
    readonly content: (params: Params) => Effect.Effect<Array<PromptMessage> | string, E, R>
  }
): Effect.Effect<void, never, ParamsR | R | McpServer> => {
  const args = Arr.empty<PromptArgument>()
  const props: Record<string, Schema.Schema.Any> = {}
  const propSignatures = options.parameters ? AST.getPropertySignatures(options.parameters.ast) : []
  for (const prop of propSignatures) {
    args.push(
      new PromptArgument({
        name: prop.name as string,
        description: Option.getOrUndefined(AST.getDescriptionAnnotation(prop)),
        required: !prop.isOptional
      })
    )
    props[prop.name as string] = Schema.make(prop.type)
  }
  const prompt = new Prompt({
    name: options.name,
    description: options.description,
    arguments: args
  })
  const decode = options.parameters ? Schema.decodeUnknown(options.parameters) : () => Effect.succeed({} as Params)
  const completion: Record<string, (input: string) => Effect.Effect<any>> = options.completion ?? {}
  return Effect.gen(function*() {
    const registry = yield* McpServer
    const context = yield* Effect.context<R | ParamsR>()
    const completions: Record<string, (input: string) => Effect.Effect<CompleteResult, InternalError>> = {}
    for (const [param, handle] of Object.entries(completion)) {
      const encodeArray = Schema.encodeUnknown(Schema.Array(props[param]))
      const handler = (input: string) =>
        handle(input).pipe(
          Effect.flatMap(encodeArray),
          Effect.map((values) =>
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
      completions[param] = handler as any
    }
    yield* registry.addPrompt({
      prompt,
      completions,
      handle: (params) =>
        decode(params).pipe(
          Effect.mapError((error) => new InvalidParams({ message: error.message })),
          Effect.flatMap((params) => options.content(params)),
          Effect.map((messages) => {
            messages = typeof messages === "string" ?
              [
                new PromptMessage({
                  role: "user",
                  content: new TextContent({ text: messages })
                })
              ] :
              messages
            return new GetPromptResult({ messages, description: prompt.description })
          }),
          Effect.catchAllCause((cause) => {
            const prettyError = Cause.prettyErrors(cause)[0]
            return new InternalError({ message: prettyError.message })
          }),
          Effect.provide(context)
        )
    })
  })
}

/**
 * Register a prompt with the McpServer.
 *
 * @since 1.0.0
 * @category Resources
 */
export const prompt = <
  E,
  R,
  Params = {},
  ParamsI extends Record<string, string> = {},
  ParamsR = never,
  const Completions extends {
    readonly [K in keyof Params]?: (input: string) => Effect.Effect<Array<Params[K]>, any, any>
  } = {}
>(
  options: {
    readonly name: string
    readonly description?: string | undefined
    readonly parameters?: Schema.Schema<Params, ParamsI, ParamsR> | undefined
    readonly completion?: (Completions & Record<keyof Completions, (input: string) => any>) | undefined
    readonly content: (params: Params) => Effect.Effect<Array<PromptMessage> | string, E, R>
  }
): Layer.Layer<never, never, ParamsR | R | McpServer> => Layer.effectDiscard(registerPrompt(options))

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

const compileUriTemplate = (segments: TemplateStringsArray, ...schemas: ReadonlyArray<Schema.Schema.Any>) => {
  let routerPath = segments[0].replace(":", "::")
  let uriPath = segments[0]
  const params: Record<string, Schema.Schema.Any> = {}
  let pathSchema = Schema.Tuple() as Schema.Schema.Any
  if (schemas.length > 0) {
    const arr: Array<Schema.Schema.Any> = []
    for (let i = 0; i < schemas.length; i++) {
      const schema = schemas[i]
      const key = String(i)
      arr.push(schema)
      routerPath += `:${key}${segments[i + 1].replace(":", "::")}`
      const paramName = AST.getAnnotation(ParamAnnotation)(schema.ast).pipe(
        Option.getOrElse(() => `param${key}`)
      )
      params[paramName as string] = schema
      uriPath += `{${paramName}}`
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
      const registry = yield* McpServer

      return {
        // Requests
        ping: () => Effect.succeed({}),
        initialize(params) {
          const requestedVersion = params.protocolVersion
          const capabilities: Types.DeepMutable<ServerCapabilities> = {
            completions: {}
          }

          if (registry.tools.length > 0) {
            capabilities.tools = { listChanged: true }
          }

          if (registry.resources.length > 0 || registry.resourceTemplates.length > 0) {
            capabilities.resources = {
              listChanged: true,
              subscribe: false
            }
          }

          if (registry.prompts.length > 0) {
            capabilities.prompts = {
              listChanged: true
            }
          }

          return Effect.succeed({
            capabilities,
            serverInfo,
            protocolVersion: SUPPORTED_PROTOCOL_VERSIONS.includes(requestedVersion)
              ? requestedVersion
              : LATEST_PROTOCOL_VERSION
          })
        },
        "completion/complete": registry.completion,
        "logging/setLevel": () => InternalError.notImplemented,
        "prompts/get": registry.getPromptResult,
        "prompts/list": () => Effect.sync(() => new ListPromptsResult({ prompts: registry.prompts })),
        "resources/list": () => Effect.sync(() => new ListResourcesResult({ resources: registry.resources })),
        "resources/read": ({ uri }) => registry.findResource(uri),
        "resources/subscribe": () => InternalError.notImplemented,
        "resources/unsubscribe": () => InternalError.notImplemented,
        "resources/templates/list": () =>
          Effect.sync(() => new ListResourceTemplatesResult({ resourceTemplates: registry.resourceTemplates })),
        "tools/call": registry.callTool,
        "tools/list": () => Effect.sync(() => new ListToolsResult({ tools: registry.tools })),

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

const resolveResourceContent = (uri: string, content: ReadResourceResult | string | Uint8Array) => {
  if (typeof content === "string") {
    return new ReadResourceResult({
      contents: [
        new TextResourceContents({
          uri,
          text: content
        })
      ]
    })
  } else if (content instanceof Uint8Array) {
    return new ReadResourceResult({
      contents: [
        new BlobResourceContents({
          uri,
          blob: content
        })
      ]
    })
  }
  return content
}
