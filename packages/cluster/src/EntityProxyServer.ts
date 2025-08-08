/**
 * @since 1.0.0
 */
import type * as HttpApi from "@effect/platform/HttpApi"
import * as HttpApiBuilder from "@effect/platform/HttpApiBuilder"
import type { ApiGroup, HttpApiGroup } from "@effect/platform/HttpApiGroup"
import type * as Rpc from "@effect/rpc/Rpc"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import type * as Entity from "./Entity.js"
import type { Sharding } from "./Sharding.js"

/**
 * @since 1.0.0
 * @category Layers
 */
export const layerHttpApi = <
  ApiId extends string,
  Groups extends HttpApiGroup.Any,
  ApiE,
  ApiR,
  Name extends HttpApiGroup.Name<Groups>,
  Type extends string,
  Rpcs extends Rpc.Any
>(
  api: HttpApi.HttpApi<ApiId, Groups, ApiE, ApiR>,
  name: Name,
  entity: Entity.Entity<Type, Rpcs>
): Layer.Layer<ApiGroup<ApiId, Name>, never, Sharding | Rpc.Context<Rpcs>> =>
  HttpApiBuilder.group(
    api,
    name,
    Effect.fnUntraced(function*(handlers_) {
      const client = yield* entity.client
      let handlers = handlers_
      for (const parentRpc_ of entity.protocol.requests.values()) {
        const parentRpc = parentRpc_ as any as Rpc.AnyWithProps
        handlers = handlers
          .handle(
            parentRpc._tag as any,
            (({ path, payload }: { path: { entityId: string }; payload: any }) =>
              (client(path.entityId) as any as Record<string, (p: any) => Effect.Effect<any>>)[parentRpc._tag](
                payload
              ).pipe(
                Effect.tapDefect(Effect.logError),
                Effect.annotateLogs({
                  module: "EntityProxyServer",
                  entity: entity.type,
                  entityId: path.entityId,
                  method: parentRpc._tag
                })
              )) as any
          )
          .handle(
            `${parentRpc._tag}Discard` as any,
            (({ path, payload }: { path: { entityId: string }; payload: any }) =>
              (client(path.entityId) as any as Record<string, (p: any, o: {}) => Effect.Effect<any>>)[parentRpc._tag](
                payload,
                { discard: true }
              ).pipe(
                Effect.tapDefect(Effect.logError),
                Effect.annotateLogs({
                  module: "EntityProxyServer",
                  entity: entity.type,
                  entityId: path.entityId,
                  method: `${parentRpc._tag}Discard`
                })
              )) as any
          ) as any
      }
      return handlers as HttpApiBuilder.Handlers<never, never, never>
    })
  )

/**
 * @since 1.0.0
 * @category Layers
 */
export const layerRpcHandlers = <
  const Type extends string,
  Rpcs extends Rpc.Any
>(entity: Entity.Entity<Type, Rpcs>): Layer.Layer<RpcHandlers<Rpcs, Type>, never, Sharding | Rpc.Context<Rpcs>> =>
  Layer.effectContext(Effect.gen(function*() {
    const context = yield* Effect.context<never>()
    const client = yield* entity.client
    const handlers = new Map<string, Rpc.Handler<string>>()
    for (const parentRpc_ of entity.protocol.requests.values()) {
      const parentRpc = parentRpc_ as any as Rpc.AnyWithProps
      const tag = `${entity.type}.${parentRpc._tag}` as const
      const key = `@effect/rpc/Rpc/${tag}`
      handlers.set(key, {
        context,
        tag,
        handler: ({ entityId, payload }: any) => (client(entityId) as any)[parentRpc._tag](payload) as any
      } as any)
      handlers.set(`${key}Discard`, {
        context,
        tag,
        handler: ({ entityId, payload }: any) =>
          (client(entityId) as any)[parentRpc._tag](payload, { discard: true }) as any
      } as any)
    }
    return Context.unsafeMake(handlers)
  }))

/**
 * @since 1.0.0
 */
export type RpcHandlers<Rpcs extends Rpc.Any, Prefix extends string> = Rpcs extends Rpc.Rpc<
  infer _Tag,
  infer _Payload,
  infer _Success,
  infer _Error,
  infer _Middleware
> ? Rpc.Handler<`${Prefix}.${_Tag}`> | Rpc.Handler<`${Prefix}.${_Tag}Discard`>
  : never
