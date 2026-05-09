/**
 * @since 1.0.0
 */
import * as HttpApiEndpoint from "@effect/platform/HttpApiEndpoint"
import * as HttpApiGroup from "@effect/platform/HttpApiGroup"
import * as Rpc from "@effect/rpc/Rpc"
import * as RpcGroup from "@effect/rpc/RpcGroup"
import * as Schema from "effect/Schema"
import { AlreadyProcessingMessage, MailboxFull, PersistenceError } from "./ClusterError.js"
import type * as Entity from "./Entity.js"

const clientErrors = [
  MailboxFull,
  AlreadyProcessingMessage,
  PersistenceError
] as const

/**
 * Derives an `RpcGroup` from an `Entity`.
 *
 * ```ts
 * import { ClusterSchema, Entity, EntityProxy, EntityProxyServer } from "@effect/cluster"
 * import { Rpc, RpcServer } from "@effect/rpc"
 * import { Layer, Schema } from "effect"
 *
 * export const Counter = Entity.make("Counter", [
 *   Rpc.make("Increment", {
 *     payload: { id: Schema.String, amount: Schema.Number },
 *     primaryKey: ({ id }) => id,
 *     success: Schema.Number
 *   })
 * ]).annotateRpcs(ClusterSchema.Persisted, true)
 *
 * // Use EntityProxy.toRpcGroup to create a `RpcGroup` from the Counter entity
 * export class MyRpcs extends EntityProxy.toRpcGroup(Counter) {}
 *
 * // Use EntityProxyServer.layerRpcHandlers to create a layer that implements
 * // the rpc handlers
 * const RpcServerLayer = RpcServer.layer(MyRpcs).pipe(
 *   Layer.provide(EntityProxyServer.layerRpcHandlers(Counter))
 * )
 * ```
 *
 * @since 1.0.0
 * @category Constructors
 */
export const toRpcGroup = <Type extends string, Rpcs extends Rpc.Any>(
  entity: Entity.Entity<Type, Rpcs>
): RpcGroup.RpcGroup<ConvertRpcs<Rpcs, Type>> => {
  const rpcs: Array<Rpc.Any> = []
  for (const parentRpc_ of entity.protocol.requests.values()) {
    const parentRpc = parentRpc_ as any as Rpc.AnyWithProps
    const payloadSchema = Schema.Struct({
      entityId: Schema.String,
      payload: parentRpc.payloadSchema
    })
    const oldMake = payloadSchema.make
    payloadSchema.make = (input: any, options?: Schema.MakeOptions) => {
      return oldMake({
        entityId: input.entityId,
        payload: parentRpc.payloadSchema.make ? parentRpc.payloadSchema.make(input.payload, options) : input.payload
      }, options)
    }
    const rpc = Rpc.make(`${entity.type}.${parentRpc._tag}`, {
      payload: payloadSchema,
      error: Schema.Union(parentRpc.errorSchema, ...clientErrors),
      success: parentRpc.successSchema
    }).annotateContext(parentRpc.annotations)
    const rpcDiscard = Rpc.make(`${entity.type}.${parentRpc._tag}Discard`, {
      payload: payloadSchema,
      error: Schema.Union(...clientErrors)
    }).annotateContext(parentRpc.annotations)
    rpcs.push(rpc, rpcDiscard)
  }
  return RpcGroup.make(...rpcs) as any as RpcGroup.RpcGroup<ConvertRpcs<Rpcs, Type>>
}

/**
 * @since 1.0.0
 */
export type ConvertRpcs<Rpcs extends Rpc.Any, Prefix extends string> = Rpcs extends Rpc.Rpc<
  infer _Tag,
  infer _Payload,
  infer _Success,
  infer _Error,
  infer _Middleware
> ?
    | Rpc.Rpc<
      `${Prefix}.${_Tag}`,
      Schema.Struct<{
        entityId: typeof Schema.String
        payload: _Payload
      }>,
      _Success,
      Schema.Schema<
        | _Error["Type"]
        | MailboxFull
        | AlreadyProcessingMessage
        | PersistenceError
        | _Error["Encoded"]
        | typeof MailboxFull["Encoded"]
        | typeof AlreadyProcessingMessage["Encoded"]
        | typeof PersistenceError["Encoded"],
        _Error["Context"]
      >
    >
    | Rpc.Rpc<
      `${Prefix}.${_Tag}Discard`,
      Schema.Struct<{
        entityId: typeof Schema.String
        payload: _Payload
      }>,
      typeof Schema.Void,
      Schema.Union<[
        typeof MailboxFull,
        typeof AlreadyProcessingMessage,
        typeof PersistenceError
      ]>
    >
  : never

const entityIdPath = Schema.Struct({
  entityId: Schema.String
})

/**
 * Derives an `HttpApiGroup` from an `Entity`.
 *
 * ```ts
 * import { ClusterSchema, Entity, EntityProxy, EntityProxyServer } from "@effect/cluster"
 * import { HttpApi, HttpApiBuilder } from "@effect/platform"
 * import { Rpc } from "@effect/rpc"
 * import { Layer, Schema } from "effect"
 *
 * export const Counter = Entity.make("Counter", [
 *   Rpc.make("Increment", {
 *     payload: { id: Schema.String, amount: Schema.Number },
 *     primaryKey: ({ id }) => id,
 *     success: Schema.Number
 *   })
 * ]).annotateRpcs(ClusterSchema.Persisted, true)
 *
 * // Use EntityProxy.toHttpApiGroup to create a `HttpApiGroup` from the
 * // Counter entity
 * export class MyApi extends HttpApi.make("api")
 *   .add(
 *     EntityProxy.toHttpApiGroup("counter", Counter)
 *       .prefix("/counter")
 *   )
 * {}
 *
 * // Use EntityProxyServer.layerHttpApi to create a layer that implements
 * // the handlers for the HttpApiGroup
 * const ApiLayer = HttpApiBuilder.api(MyApi).pipe(
 *   Layer.provide(EntityProxyServer.layerHttpApi(MyApi, "counter", Counter))
 * )
 * ```
 *
 * @since 1.0.0
 * @category Constructors
 */
export const toHttpApiGroup = <const Name extends string, Type extends string, Rpcs extends Rpc.Any>(
  name: Name,
  entity: Entity.Entity<Type, Rpcs>
): HttpApiGroup.HttpApiGroup<Name, ConvertHttpApi<Rpcs>> => {
  let group = HttpApiGroup.make(name)
  for (const parentRpc_ of entity.protocol.requests.values()) {
    const parentRpc = parentRpc_ as any as Rpc.AnyWithProps
    const endpoint = HttpApiEndpoint.post(parentRpc._tag, `/${tagToPath(parentRpc._tag)}/:entityId`)
      .setPath(entityIdPath)
      .setPayload(parentRpc.payloadSchema)
      .addSuccess(parentRpc.successSchema)
      .addError(Schema.Union(parentRpc.errorSchema, ...clientErrors))
      .annotateContext(parentRpc.annotations)
    const endpointDiscard = HttpApiEndpoint.post(
      `${parentRpc._tag}Discard`,
      `/${tagToPath(parentRpc._tag)}/:entityId/discard`
    )
      .setPath(entityIdPath)
      .setPayload(parentRpc.payloadSchema)
      .addError(Schema.Union(...clientErrors))
      .annotateContext(parentRpc.annotations)

    group = group.add(endpoint).add(endpointDiscard) as any
  }
  return group as any as HttpApiGroup.HttpApiGroup<Name, ConvertHttpApi<Rpcs>>
}

const tagToPath = (tag: string): string =>
  tag
    .replace(/[^a-zA-Z0-9]+/g, "-") // Replace non-alphanumeric characters with hyphen
    .replace(/([a-z])([A-Z])/g, "$1-$2") // Insert hyphen before uppercase letters
    .toLowerCase()

/**
 * @since 1.0.0
 */
export type ConvertHttpApi<Rpcs extends Rpc.Any> = Rpcs extends Rpc.Rpc<
  infer _Tag,
  infer _Payload,
  infer _Success,
  infer _Error,
  infer _Middleware
> ?
    | HttpApiEndpoint.HttpApiEndpoint<
      _Tag,
      "POST",
      { readonly entityId: string },
      never,
      _Payload["Type"],
      never,
      _Success["Type"],
      _Error["Type"] | MailboxFull | AlreadyProcessingMessage | PersistenceError,
      _Payload["Context"] | _Success["Context"],
      _Error["Context"]
    >
    | HttpApiEndpoint.HttpApiEndpoint<
      `${_Tag}Discard`,
      "POST",
      { readonly entityId: string },
      never,
      _Payload["Type"],
      never,
      void,
      MailboxFull | AlreadyProcessingMessage | PersistenceError
    >
  : never
