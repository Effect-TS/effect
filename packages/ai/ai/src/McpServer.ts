/**
 * @since 1.0.0
 */
import * as Headers from "@effect/platform/Headers"
import type * as Rpc from "@effect/rpc/Rpc"
import * as RpcSerialization from "@effect/rpc/RpcSerialization"
import * as RpcServer from "@effect/rpc/RpcServer"
import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as JsonSchema from "effect/JSONSchema"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import * as AST from "effect/SchemaAST"
import type { Sink } from "effect/Sink"
import type { Stream } from "effect/Stream"
import type * as Types from "effect/Types"
import * as FindMyWay from "find-my-way-ts"
import * as AiTool from "./AiTool.js"
import type * as AiToolkit from "./AiToolkit.js"
import type { Complete, Implementation, Param, Resource, ServerCapabilities } from "./McpSchema.js"
import {
  Annotations,
  BlobResourceContents,
  CallToolResult,
  ClientRpcs,
  CompleteResult,
  InternalError,
  InvalidParams,
  ListResourcesResult,
  ListResourceTemplatesResult,
  ListToolsResult,
  ParamAnnotation,
  ReadResourceResult,
  ResourceTemplate,
  TextContent,
  TextResourceContents,
  Tool,
  ToolAnnotations
} from "./McpSchema.js"

/**
 * @since 1.0.0
 * @category Registry
 */
export class Registry extends Context.Tag("@effect/ai/McpServer/Registry")<
  Registry,
  {
    readonly tools: Map<string, {
      readonly tool: AiTool.AnyWithProtocol
      readonly handle: (payload: any) => Effect.Effect<CallToolResult>
    }>
    readonly resources: Array<Resource>
    readonly addResource: (resource: Resource, handle: Effect.Effect<ReadResourceResult, InternalError>) => void
    readonly resourceTemplates: Array<ResourceTemplate>
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
    ) => void
    readonly findResource: (uri: string) => Effect.Effect<ReadResourceResult, InvalidParams | InternalError>
    readonly completion: (complete: typeof Complete.payloadSchema.Type) => Effect.Effect<CompleteResult, InternalError>
  }
>() {
  /**
   * @since 1.0.0
   */
  static readonly layer = Layer.sync(Registry, () => {
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
    const resources: Array<Resource> = []
    const resourceTemplates: Array<ResourceTemplate> = []
    const completionsMap = new Map<string, (input: string) => Effect.Effect<CompleteResult, InternalError>>()

    return Registry.of({
      tools: new Map(),
      get resources() {
        return resources
      },
      get resourceTemplates() {
        return resourceTemplates
      },
      addResource(resource, effect) {
        resources.push(resource)
        matcher.add(resource.uri, { _tag: "Resource", effect })
      },
      addResourceTemplate({ completions, handle, routerPath, template }) {
        resourceTemplates.push(template)
        matcher.add(routerPath, { _tag: "ResourceTemplate", handle })
        for (const [param, handle] of Object.entries(completions)) {
          completionsMap.set(`ref/resource/${template.uriTemplate}/${param}`, handle)
        }
      },
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
}

/**
 * @since 1.0.0
 * @category Server info
 */
export class McpServerImplementation extends Context.Tag("@effect/ai/McpServer/Implementation")<
  McpServerImplementation,
  Implementation
>() {}

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
export const make = Effect.gen(function*() {
  const protocol = yield* RpcServer.Protocol
  const handlers = yield* Layer.build(ClientRpcHandlers)

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

  return yield* RpcServer.make(ClientRpcs, {
    spanPrefix: "McpServer",
    disableFatalDefects: true
  }).pipe(
    Effect.provideService(RpcServer.Protocol, patchedProtocol),
    Effect.provide(handlers)
  )
}).pipe(Effect.scoped)

/**
 * @since 1.0.0
 * @category Layers
 */
export const layer = (options: {
  readonly name: string
  readonly version: string
}): Layer.Layer<never, never, RpcServer.Protocol> =>
  Layer.scopedDiscard(Effect.forkScoped(make)).pipe(
    Layer.provide(Registry.layer),
    Layer.provide(Layer.succeed(McpServerImplementation, {
      name: options.name,
      version: options.version
    }))
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
}): Layer.Layer<never, never, RIn | ROut> =>
  layer(options).pipe(
    Layer.provide(RpcServer.layerProtocolStdio({
      stdin: options.stdin,
      stdout: options.stdout
    })),
    Layer.provide(RpcSerialization.layerNdJsonRpc())
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
  Registry | AiTool.ToHandler<Tools>
> = Effect.fnUntraced(function*<Tools extends AiTool.Any>(
  toolkit: AiToolkit.AiToolkit<Tools>
) {
  const registry = yield* Registry
  const built = yield* toolkit
  const context = yield* Effect.context<AiTool.Context<Tools>>()
  for (const tool of built.tools) {
    registry.tools.set(tool.name, {
      tool: tool as any,
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
): Layer.Layer<never, never, AiTool.ToHandler<Tools>> =>
  Layer.effectDiscard(registerToolkit(toolkit)).pipe(
    Layer.provide(Registry.layer)
  )

/**
 * Register a resource with the McpServer.
 *
 * @since 1.0.0
 * @category Resources
 */
export const registerResource: {
  <E, R>(options: {
    readonly resource: Resource
    readonly content: Effect.Effect<
      ReadResourceResult | string | Uint8Array,
      E,
      R
    >
  }): Effect.Effect<void, never, R | Registry>
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
    readonly paramCompletion?: Completions | undefined
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
    | Registry
  >
} = function() {
  if (arguments.length === 1) {
    const options = arguments[0] as {
      readonly resource: Resource
      readonly content: Effect.Effect<ReadResourceResult | string | Uint8Array>
    }
    return Effect.gen(function*() {
      const context = yield* Effect.context<any>()
      const registry = yield* Registry
      registry.addResource(
        options.resource,
        options.content.pipe(
          Effect.provide(context),
          Effect.map((content) => resolveResourceContent(options.resource.uri, content)),
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
    readonly paramCompletion?: Record<string, (input: string) => Effect.Effect<any>> | undefined
    readonly content: (uri: string, ...params: Array<any>) => Effect.Effect<
      ReadResourceResult | string | Uint8Array,
      E,
      R
    >
  }) {
    const context = yield* Effect.context<any>()
    const registry = yield* Registry
    const decode = Schema.decodeUnknown(schema)
    const template = new ResourceTemplate({
      ...options,
      uriTemplate: uriPath,
      annotations: new Annotations(options)
    })
    const completions: Record<string, (input: string) => Effect.Effect<CompleteResult, InternalError>> = {}
    for (const [param, handle] of Object.entries(options.paramCompletion ?? {})) {
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
    registry.addResourceTemplate({
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
    readonly resource: Resource
    readonly content: Effect.Effect<
      ReadResourceResult | string | Uint8Array,
      E,
      R
    >
  }): Layer.Layer<never, never, R>
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
    readonly paramCompletion?: (Completions & Record<keyof Completions, (input: string) => any>) | undefined
    readonly content: (uri: string, ...params: { readonly [K in keyof Schemas]: Schemas[K]["Type"] }) => Effect.Effect<
      ReadResourceResult | string | Uint8Array,
      E,
      R
    >
  }) => Layer.Layer<
    never,
    never,
    | R
    | (Completions[keyof Completions] extends (input: string) => infer Ret ?
      Ret extends Effect.Effect<infer _A, infer _E, infer _R> ? _R : never
      : never)
  >
} = function() {
  if (arguments.length === 1) {
    return Layer.effectDiscard(registerResource(arguments[0])).pipe(
      Layer.provide(Registry.layer)
    )
  }
  const register = registerResource(...(arguments as any as [any, any]))
  return (options: any) =>
    Layer.effectDiscard(register(options)).pipe(
      Layer.provide(Registry.layer)
    )
} as any

// -----------------------------------------------------------------------------
// Internal
// -----------------------------------------------------------------------------

const makeUriMatcher = <A>() => {
  const protocols = new Map<string, FindMyWay.Router<A>>()
  const add = (uri: string, value: A) => {
    const url = new URL(uri)
    let router = protocols.get(url.protocol)
    if (!router) {
      router = FindMyWay.make({
        ignoreTrailingSlash: true,
        ignoreDuplicateSlashes: true,
        caseSensitive: true
      })
      protocols.set(url.protocol, router)
    }
    router.on("GET", `${url.host}${url.pathname}` as any, value)
  }
  const find = (uri: string) => {
    const url = new URL(uri)
    const router = protocols.get(url.protocol)
    if (!router) {
      return undefined
    }
    return router.find("GET", `${url.host}${url.pathname}`)
  }

  return { add, find } as const
}

const compileUriTemplate = (segments: TemplateStringsArray, ...schemas: ReadonlyArray<Schema.Schema.Any>) => {
  let routerPath = segments[0]
  let uriPath = segments[0]
  const params: Record<string, Schema.Schema.Any> = {}
  let pathSchema = Schema.Tuple() as Schema.Schema.Any
  if (schemas.length > 0) {
    const arr: Array<Schema.Schema.Any> = []
    for (let i = 0; i < schemas.length; i++) {
      const schema = schemas[i]
      const key = String(i)
      arr.push(schema)
      routerPath += `:${key}${segments[i + 1]}`
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

const ClientRpcHandlers = ClientRpcs.toLayer(
  Effect.gen(function*() {
    const serverInfo = yield* McpServerImplementation
    const registry = yield* Registry

    return {
      // Requests
      ping: () => Effect.succeed({}),
      initialize(params) {
        const requestedVersion = params.protocolVersion
        const capabilities: Types.DeepMutable<ServerCapabilities> = {
          completions: {}
        }

        if (registry.tools.size > 0) {
          // TODO: support listChanged notifications
          capabilities.tools = { listChanged: false }
        }

        if (registry.resources.length > 0 || registry.resourceTemplates.length > 0) {
          // TODO: support listChanged notifications
          capabilities.resources = {
            listChanged: false,
            subscribe: false
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
      "prompts/get": () => InternalError.notImplemented,
      "prompts/list": () => InternalError.notImplemented,
      "resources/list": () => Effect.sync(() => new ListResourcesResult({ resources: registry.resources })),
      "resources/read": ({ uri }) => registry.findResource(uri),
      "resources/subscribe": () => InternalError.notImplemented,
      "resources/unsubscribe": () => InternalError.notImplemented,
      "resources/templates/list": () =>
        Effect.sync(() => new ListResourceTemplatesResult({ resourceTemplates: registry.resourceTemplates })),
      "tools/call": ({ arguments: params, name }) =>
        Effect.suspend(() => {
          const tool = registry.tools.get(name)
          if (!tool) {
            return Effect.fail(new InvalidParams({ message: `Tool '${name}' not found` }))
          }
          return tool.handle(params)
        }),
      "tools/list": () =>
        Effect.sync(() => {
          const tools = Array.from(registry.tools.values(), ({ tool }) =>
            new Tool({
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
            }))
          return new ListToolsResult({ tools })
        }),

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
