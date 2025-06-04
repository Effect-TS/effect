/**
 * @since 1.0.0
 */
import * as HttpApiEndpoint from "@effect/platform/HttpApiEndpoint"
import * as HttpApiGroup from "@effect/platform/HttpApiGroup"
import * as Rpc from "@effect/rpc/Rpc"
import * as RpcGroup from "@effect/rpc/RpcGroup"
import * as Schema from "effect/Schema"
import { AlreadyProcessingMessage, EntityNotManagedByRunner, MailboxFull, PersistenceError } from "./ClusterError.js"
import type * as Entity from "./Entity.js"

const clientErrors = [
  MailboxFull,
  AlreadyProcessingMessage,
  PersistenceError,
  EntityNotManagedByRunner
] as const

/**
 * @since 1.0.0
 * @category Constructors
 */
export const toRpcGroup = <Rpcs extends Rpc.Any, const Prefix extends string = "">(
  entity: Entity.Entity<Rpcs>,
  options?: {
    readonly prefix?: Prefix | undefined
  }
): RpcGroup.RpcGroup<ConvertRpcs<Rpcs, Prefix>> => {
  const prefix = options?.prefix ?? ""
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
        payload: parentRpc.payloadSchema.make(input.payload, options)
      }, options)
    }
    const rpc = Rpc.make(`${prefix}${parentRpc._tag}`, {
      payload: payloadSchema,
      error: Schema.Union(parentRpc.errorSchema, ...clientErrors),
      success: parentRpc.successSchema
    }).annotateContext(parentRpc.annotations)
    rpcs.push(rpc)
  }
  return RpcGroup.make(...rpcs) as any as RpcGroup.RpcGroup<ConvertRpcs<Rpcs, Prefix>>
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
> ? Rpc.Rpc<
    `${Prefix}${_Tag}`,
    Schema.Struct<{
      entityId: typeof Schema.String
      payload: _Payload
    }>,
    _Success,
    Schema.Schema<
      _Error["Type"] | MailboxFull | AlreadyProcessingMessage | PersistenceError | EntityNotManagedByRunner,
      | _Error["Encoded"]
      | typeof MailboxFull["Encoded"]
      | typeof AlreadyProcessingMessage["Encoded"]
      | typeof PersistenceError["Encoded"]
      | typeof EntityNotManagedByRunner["Encoded"],
      _Error["Context"]
    >
  >
  : never

const entityIdPath = Schema.Struct({
  entityId: Schema.String
})

/**
 * @since 1.0.0
 * @category Constructors
 */
export const toHttpApiGroup = <const Name extends string, Rpcs extends Rpc.Any>(
  name: Name,
  entity: Entity.Entity<Rpcs>
): HttpApiGroup.HttpApiGroup<Name, ConvertHttpApi<Rpcs>> => {
  let group = HttpApiGroup.make(name)
  for (const parentRpc_ of entity.protocol.requests.values()) {
    const parentRpc = parentRpc_ as any as Rpc.AnyWithProps
    const endpoint = HttpApiEndpoint.post(parentRpc._tag, "/:entityId")
      .setPath(entityIdPath)
      .setPayload(parentRpc.payloadSchema)
      .addSuccess(parentRpc.successSchema)
      .addError(Schema.Union(parentRpc.errorSchema, ...clientErrors))
      .annotateContext(parentRpc.annotations)

    group = group.add(endpoint) as any
  }
  return group as any as HttpApiGroup.HttpApiGroup<Name, ConvertHttpApi<Rpcs>>
}

/**
 * @since 1.0.0
 */
export type ConvertHttpApi<Rpcs extends Rpc.Any> = Rpcs extends Rpc.Rpc<
  infer _Tag,
  infer _Payload,
  infer _Success,
  infer _Error,
  infer _Middleware
> ? HttpApiEndpoint.HttpApiEndpoint<
    _Tag,
    "POST",
    { readonly entityId: string },
    never,
    _Payload["Type"],
    never,
    _Success["Type"],
    _Error["Type"] | MailboxFull | AlreadyProcessingMessage | PersistenceError | EntityNotManagedByRunner,
    _Payload["Context"] | _Success["Context"],
    _Error["Context"]
  > :
  never
