/**
 * @since 1.0.0
 */
import * as Headers from "@effect/platform/Headers"
import type * as Rpc from "@effect/rpc/Rpc"
import * as Predicate from "effect/Predicate"
import * as PrimaryKey from "effect/PrimaryKey"
import type { ReadonlyRecord } from "effect/Record"
import * as Schema from "effect/Schema"
import { EntityAddress, EntityAddressFromSelf } from "./EntityAddress.js"
import { type Snowflake, SnowflakeFromString } from "./Snowflake.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("@effect/cluster/Envelope")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category models
 */
export type Envelope<R extends Rpc.Any> = Request<R> | AckChunk | Interrupt

/**
 * @since 1.0.0
 */
export declare namespace Envelope {
  /**
   * @since 1.0.0
   * @category models
   */
  export type Any = Envelope<any>

  /**
   * @since 1.0.0
   * @category models
   */
  export type Encoded = Request.Encoded | typeof AckChunk.Encoded | typeof Interrupt.Encoded

  /**
   * @since 1.0.0
   * @category models
   */
  export type PartialEncoded = Request.PartialEncoded | AckChunk | Interrupt
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Request<in out Rpc extends Rpc.Any> {
  readonly [TypeId]: TypeId
  readonly _tag: "Request"
  readonly requestId: Snowflake
  readonly address: EntityAddress
  readonly tag: Rpc.Tag<Rpc>
  readonly payload: Rpc.Payload<Rpc>
  readonly headers: Headers.Headers
  readonly traceId?: string | undefined
  readonly spanId?: string | undefined
  readonly sampled?: boolean | undefined
}

/**
 * @since 1.0.0
 * @category models
 */
export class AckChunk extends Schema.TaggedClass<AckChunk>("@effect/cluster/Envelope/AckChunk")("AckChunk", {
  id: SnowflakeFromString,
  address: EntityAddress,
  requestId: SnowflakeFromString,
  replyId: SnowflakeFromString
}) {
  /**
   * @since 1.0.0
   */
  readonly [TypeId]: TypeId = TypeId

  /**
   * @since 1.0.0
   */
  withRequestId(requestId: Snowflake): AckChunk {
    return new AckChunk({
      ...this,
      requestId
    })
  }
}

/**
 * @since 1.0.0
 * @category models
 */
export class Interrupt extends Schema.TaggedClass<Interrupt>("@effect/cluster/Envelope/Interrupt")("Interrupt", {
  id: SnowflakeFromString,
  address: EntityAddress,
  requestId: SnowflakeFromString
}) {
  /**
   * @since 1.0.0
   */
  readonly [TypeId]: TypeId = TypeId

  /**
   * @since 1.0.0
   */
  withRequestId(requestId: Snowflake): Interrupt {
    return new Interrupt({
      ...this,
      requestId
    })
  }
}

/**
 * @since 1.0.0
 */
export declare namespace Request {
  /**
   * @since 1.0.0
   * @category models
   */
  export type Any = Request<any>

  /**
   * @since 1.0.0
   * @category models
   */
  export interface Encoded {
    readonly _tag: "Request"
    readonly requestId: string
    readonly address: typeof EntityAddress.Encoded
    readonly tag: string
    readonly payload: unknown
    readonly headers: ReadonlyRecord<string, string>
    readonly traceId?: string | undefined
    readonly spanId?: string | undefined
    readonly sampled?: boolean | undefined
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface PartialEncoded {
    readonly _tag: "Request"
    readonly requestId: Snowflake
    readonly address: EntityAddress
    readonly tag: string
    readonly payload: unknown
    readonly headers: Headers.Headers
    readonly traceId?: string | undefined
    readonly spanId?: string | undefined
    readonly sampled?: boolean | undefined
  }
}

/**
 * @since 1.0.0
 * @category refinements
 */
export const isEnvelope = (u: unknown): u is Envelope<any> => Predicate.hasProperty(u, TypeId)

/**
 * @since 1.0.0
 * @category constructors
 */
export const makeRequest = <Rpc extends Rpc.Any>(
  options: {
    readonly requestId: Snowflake
    readonly address: EntityAddress
    readonly tag: Rpc.Tag<Rpc>
    readonly payload: Rpc.Payload<Rpc>
    readonly headers: Headers.Headers
    readonly traceId?: string | undefined
    readonly spanId?: string | undefined
    readonly sampled?: boolean | undefined
  }
): Request<Rpc> => ({
  [TypeId]: TypeId,
  _tag: "Request",
  requestId: options.requestId,
  tag: options.tag,
  address: options.address,
  payload: options.payload,
  headers: options.headers,
  traceId: options.traceId,
  spanId: options.spanId,
  sampled: options.sampled
})

/**
 * @since 1.0.0
 * @category serialization / deserialization
 */
export const EnvelopeFromSelf: Schema.Schema<
  Envelope.Any,
  Envelope.Any
> = Schema.declare(isEnvelope, {
  typeConstructor: { _tag: "effect/cluster/Envelope" },
  identifier: "Envelope"
})

/**
 * @since 1.0.0
 * @category serialization / deserialization
 */
export const RequestFromSelf: Schema.Schema<
  Request.Any,
  Request.Any
> = Schema.declare((u): u is Request.Any => isEnvelope(u) && u._tag === "Request", {
  typeConstructor: { _tag: "effect/cluster/Envelope.Request" },
  identifier: "Envelope"
})

/**
 * @since 1.0.0
 * @category serialization / deserialization
 */
export const PartialEncodedRequest: Schema.Struct<
  {
    _tag: Schema.Literal<["Request"]>
    requestId: Schema.Schema<Snowflake, string>
    address: typeof EntityAddress
    tag: typeof Schema.String
    payload: typeof Schema.Unknown
    headers: Schema.Schema<Headers.Headers, ReadonlyRecord<string, string>>
    traceId: Schema.optional<typeof Schema.String>
    spanId: Schema.optional<typeof Schema.String>
    sampled: Schema.optional<typeof Schema.Boolean>
  }
> = Schema.Struct({
  _tag: Schema.Literal("Request"),
  requestId: SnowflakeFromString,
  address: EntityAddress,
  tag: Schema.String,
  payload: Schema.Unknown,
  headers: Headers.schema,
  traceId: Schema.optional(Schema.String),
  spanId: Schema.optional(Schema.String),
  sampled: Schema.optional(Schema.Boolean)
}) satisfies Schema.Schema<Request.PartialEncoded, Request.Encoded>

/**
 * @since 1.0.0
 * @category serialization / deserialization
 */
export const PartialEncoded: Schema.Union<
  [
    Schema.Struct<
      {
        _tag: Schema.Literal<["Request"]>
        requestId: Schema.Schema<Snowflake, string>
        address: typeof EntityAddress
        tag: typeof Schema.String
        payload: typeof Schema.Unknown
        headers: Schema.Schema<Headers.Headers, ReadonlyRecord<string, string>>
        traceId: Schema.optional<typeof Schema.String>
        spanId: Schema.optional<typeof Schema.String>
        sampled: Schema.optional<typeof Schema.Boolean>
      }
    >,
    typeof AckChunk,
    typeof Interrupt
  ]
> = Schema.Union(PartialEncodedRequest, AckChunk, Interrupt) satisfies Schema.Schema<
  Envelope.PartialEncoded,
  Envelope.Encoded
>

/**
 * @since 1.0.0
 * @category serialization / deserialization
 */
export const PartialEncodedArray: Schema.Schema<
  Array<Envelope.PartialEncoded>,
  Array<Envelope.Encoded>
> = Schema.mutable(Schema.Array(PartialEncoded))

/**
 * @since 1.0.0
 * @category serialization / deserialization
 */
export const PartialEncodedRequestFromSelf: Schema.Struct<
  {
    _tag: Schema.Literal<["Request"]>
    requestId: Schema.Schema<Snowflake>
    address: Schema.Schema<EntityAddress>
    tag: typeof Schema.String
    payload: typeof Schema.Unknown
    headers: Schema.Schema<Headers.Headers>
    traceId: Schema.optional<typeof Schema.String>
    spanId: Schema.optional<typeof Schema.String>
    sampled: Schema.optional<typeof Schema.Boolean>
  }
> = Schema.Struct({
  _tag: Schema.Literal("Request"),
  requestId: Schema.typeSchema(SnowflakeFromString),
  address: EntityAddressFromSelf,
  tag: Schema.String,
  payload: Schema.Unknown,
  headers: Headers.schemaFromSelf,
  traceId: Schema.optional(Schema.String),
  spanId: Schema.optional(Schema.String),
  sampled: Schema.optional(Schema.Boolean)
}) satisfies Schema.Schema<Request.PartialEncoded>

/**
 * @since 1.0.0
 * @category serialization / deserialization
 */
export const PartialEncodedFromSelf: Schema.Union<
  [
    Schema.Struct<
      {
        _tag: Schema.Literal<["Request"]>
        requestId: Schema.Schema<Snowflake>
        address: Schema.Schema<EntityAddress>
        tag: typeof Schema.String
        payload: typeof Schema.Unknown
        headers: Schema.Schema<Headers.Headers>
        traceId: Schema.optional<typeof Schema.String>
        spanId: Schema.optional<typeof Schema.String>
        sampled: Schema.optional<typeof Schema.Boolean>
      }
    >,
    Schema.Schema<AckChunk>,
    Schema.Schema<Interrupt>
  ]
> = Schema.Union(
  PartialEncodedRequestFromSelf,
  Schema.typeSchema(AckChunk),
  Schema.typeSchema(Interrupt)
) satisfies Schema.Schema<Envelope.PartialEncoded>

/**
 * @since 1.0.0
 * @category primary key
 */
export const primaryKey = <R extends Rpc.Any>(envelope: Envelope<R>): string | null => {
  if (envelope._tag !== "Request" || !(Predicate.hasProperty(envelope.payload, PrimaryKey.symbol))) {
    return null
  }
  return primaryKeyByAddress({
    address: envelope.address,
    tag: envelope.tag,
    id: PrimaryKey.value(envelope.payload)
  })
}

/**
 * @since 1.0.0
 * @category primary key
 */
export const primaryKeyByAddress = (options: {
  readonly address: EntityAddress
  readonly tag: string
  readonly id: string
}): string =>
  // hash the entity address to save space?
  `${options.address.entityType}/${options.address.entityId}/${options.tag}/${options.id}`
