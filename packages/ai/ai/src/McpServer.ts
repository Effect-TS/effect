/**
 * @since 1.0.0
 */
import * as Headers from "@effect/platform/Headers"
import type * as Rpc from "@effect/rpc/Rpc"
import * as RpcSerialization from "@effect/rpc/RpcSerialization"
import * as RpcServer from "@effect/rpc/RpcServer"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as JsonSchema from "effect/JSONSchema"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import * as AST from "effect/SchemaAST"
import type { Sink } from "effect/Sink"
import type { Stream } from "effect/Stream"
import * as FindMyWay from "find-my-way-ts"
import * as AiTool from "./AiTool.js"
import type * as AiToolkit from "./AiToolkit.js"
import type { Implementation, Resource, ResourceTemplate, ServerCapabilities } from "./McpSchema.js"
import {
  CallToolResult,
  ClientRpcs,
  InternalError,
  InvalidParams,
  ListResourcesResult,
  ListResourceTemplatesResult,
  ListToolsResult,
  ReadResourceResult,
  TextContent,
  Tool,
  ToolAnnotations
} from "./McpSchema.js"

export class McpServer extends Context.Tag("@effect/ai/McpServer")<
  McpServer,
  {}
>() {}

export class McpServerOptions extends Context.Tag("@effect/ai/McpServer/Options")<
  McpServerOptions,
  {
    readonly capabilities?: ServerCapabilities
  }
>() {}

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
    readonly resources: Array<{
      readonly resource: Resource
      readonly handle: Effect.Effect<ReadResourceResult>
    }>
    readonly resourceTemplates: Array<{
      readonly template: ResourceTemplate
      readonly routerPath: string
      readonly handle: (params: Array<string>) => Effect.Effect<ReadResourceResult>
    }>
  }
>() {
  /**
   * @since 1.0.0
   */
  static readonly layer = Layer.sync(Registry, () =>
    Registry.of({
      tools: new Map(),
      resourceTemplates: [],
      resources: []
    }))
}

export class McpServerImplementation extends Context.Tag("@effect/ai/McpServer/Implementation")<
  McpServerImplementation,
  Implementation
>() {}

export const LATEST_PROTOCOL_VERSION = "2025-03-26"
export const SUPPORTED_PROTOCOL_VERSIONS = [
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
  const scope = yield* Effect.scope
  const handlers = yield* Layer.buildWithMemoMap(ClientRpcHandlers, yield* Layer.CurrentMemoMap, scope)

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

const ClientRpcHandlers = ClientRpcs.toLayer(
  Effect.gen(function*() {
    const serverInfo = yield* McpServerImplementation
    const { capabilities = {} } = yield* McpServerOptions
    const registry = yield* Registry

    // TODO: move into registry to support dynamic registration
    const resourceRouter = makeUriMatcher<
      {
        readonly _tag: "Resource"
        readonly effect: Effect.Effect<ReadResourceResult>
      } | {
        readonly _tag: "ResourceTemplate"
        readonly handle: (params: Array<string>) => Effect.Effect<ReadResourceResult>
      }
    >()

    for (const { handle, routerPath } of registry.resourceTemplates) {
      resourceRouter.add(routerPath, {
        _tag: "ResourceTemplate",
        handle
      })
    }
    for (const { handle, resource } of registry.resources) {
      resourceRouter.add(resource.uri, {
        _tag: "Resource",
        effect: handle
      })
    }

    return {
      // Requests
      ping: () => Effect.succeed({}),
      initialize(params) {
        const requestedVersion = params.protocolVersion
        return Effect.succeed({
          capabilities,
          serverInfo,
          protocolVersion: SUPPORTED_PROTOCOL_VERSIONS.includes(requestedVersion)
            ? requestedVersion
            : LATEST_PROTOCOL_VERSION
        })
      },
      "completion/complete": () => InternalError.notImplemented,
      "logging/setLevel": () => InternalError.notImplemented,
      "prompts/get": () => InternalError.notImplemented,
      "prompts/list": () => InternalError.notImplemented,
      "resources/list": () =>
        Effect.sync(() =>
          new ListResourcesResult({
            resources: registry.resources.map(({ resource }) => resource)
          })
        ),
      "resources/read": ({ uri }) =>
        Effect.suspend(() => {
          const found = resourceRouter.find(uri)
          if (!found) {
            return Effect.succeed(
              new ReadResourceResult({
                contents: []
              })
            )
          } else if (found.handler._tag === "Resource") {
            return found.handler.effect
          }
          return found.handler.handle(found.params as any)
        }),
      "resources/subscribe": () => InternalError.notImplemented,
      "resources/unsubscribe": () => InternalError.notImplemented,
      "resources/templates/list": () =>
        Effect.sync(() =>
          new ListResourceTemplatesResult({
            resourceTemplates: registry.resourceTemplates.map(({ template }) => template)
          })
        ),
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
).pipe(Layer.provide(Registry.layer))

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

export const layer = (
  serverInfo: Context.Tag.Service<McpServerImplementation>,
  options?: Context.Tag.Service<McpServerOptions>
): Layer.Layer<never, never, RpcServer.Protocol> =>
  Layer.scopedDiscard(Effect.forkScoped(make)).pipe(
    Layer.provide([
      Layer.succeed(McpServerImplementation, serverInfo),
      Layer.succeed(McpServerOptions, options ?? {})
    ])
  )

export const layerStdio = <EIn, RIn, EOut, ROut>(
  serverInfo: Context.Tag.Service<McpServerImplementation>,
  options: Context.Tag.Service<McpServerOptions> & {
    readonly stdin: Stream<Uint8Array, EIn, RIn>
    readonly stdout: Sink<unknown, Uint8Array | string, unknown, EOut, ROut>
  }
): Layer.Layer<never, never, RIn | ROut> =>
  layer(serverInfo, options).pipe(
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
export const toolkit = <Tools extends AiTool.Any>(
  toolkit: AiToolkit.AiToolkit<Tools>
) =>
  Layer.effectDiscard(Effect.gen(function*() {
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
  })).pipe(Layer.provide(Registry.layer))

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
  let pathSchema = Schema.Tuple() as Schema.Schema.Any
  if (schemas.length > 0) {
    const arr: Array<Schema.Schema.Any> = []
    for (let i = 0; i < schemas.length; i++) {
      const schema = schemas[i]
      const key = String(i)
      arr.push(schema)
      routerPath += `:${key}${segments[i + 1]}`
      const paramName = AST.getIdentifierAnnotation(schema.ast).pipe(
        Option.getOrElse(() => `param${key}`)
      )
      uriPath += `{${paramName}}`
    }
    pathSchema = Schema.Tuple(...arr)
  }
  return {
    routerPath,
    uriPath,
    schema: pathSchema
  } as const
}
