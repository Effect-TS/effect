/**
 * @since 1.0.0
 */
import * as Headers from "@effect/platform/Headers"
import type * as Rpc from "@effect/rpc/Rpc"
import type { Context } from "effect/Context"
import * as Effect from "effect/Effect"
import { globalValue } from "effect/GlobalValue"
import type { ParseError } from "effect/ParseResult"
import * as Predicate from "effect/Predicate"
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
export type Envelope<Rpc extends Rpc.Any> = Request<Rpc> | AckChunk | Interrupt

/**
 * @since 1.0.0
 * @category models
 */
export type EnvelopeWithContext<Rpc extends Rpc.Any> = RequestWithContext<Rpc> | AckChunk | Interrupt

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
  export type Encoded = Request.Encoded | (typeof AckChunk)["Encoded"] | (typeof Interrupt)["Encoded"]

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
  readonly id: Snowflake
  readonly address: EntityAddress
  readonly tag: Rpc.Tag<Rpc>
  readonly payload: Rpc.Payload<Rpc>
  readonly headers: Headers.Headers
  readonly traceId: string
  readonly spanId: string
  readonly sampled: boolean
}

/**
 * @since 1.0.0
 * @category models
 */
export class AckChunk extends Schema.TaggedClass<AckChunk>("@effect/cluster/Envelope/AckChunk")("AckChunk", {
  address: EntityAddress,
  envelopeId: SnowflakeFromString,
  replyId: SnowflakeFromString
}) {
  /**
   * @since 1.0.0
   */
  readonly [TypeId]: TypeId = TypeId
}

/**
 * @since 1.0.0
 * @category models
 */
export class Interrupt extends Schema.TaggedClass<Interrupt>("@effect/cluster/Envelope/Interrupt")("Interrupt", {
  address: EntityAddress,
  envelopeId: SnowflakeFromString
}) {
  /**
   * @since 1.0.0
   */
  readonly [TypeId]: TypeId = TypeId
}

/**
 * @since 1.0.0
 * @category models
 */
export interface RequestWithContext<out Rpc extends Rpc.Any> extends Request<Rpc> {
  readonly rpc: Rpc
  readonly context: Context<Rpc.Context<Rpc>>
  encodedCache?: Request.Encoded
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
    readonly id: string
    readonly address: typeof EntityAddress.Encoded
    readonly tag: string
    readonly payload: unknown
    readonly headers: ReadonlyRecord<string, string>
    readonly traceId: string
    readonly spanId: string
    readonly sampled: boolean
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface PartialEncoded {
    readonly _tag: "Request"
    readonly id: Snowflake
    readonly address: EntityAddress
    readonly tag: string
    readonly payload: unknown
    readonly headers: Headers.Headers
    readonly traceId: string
    readonly spanId: string
    readonly sampled: boolean
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
    readonly id: Snowflake
    readonly address: EntityAddress
    readonly tag: Rpc.Tag<Rpc>
    readonly payload: Rpc.Payload<Rpc>
    readonly headers: Headers.Headers
    readonly traceId: string
    readonly spanId: string
    readonly sampled: boolean
  }
): Envelope<Rpc> => ({
  [TypeId]: TypeId,
  _tag: "Request",
  id: options.id,
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
 * @category constructors
 */
export const makeRequestWithContext = <Rpc extends Rpc.Any>(
  options: {
    readonly id: Snowflake
    readonly address: EntityAddress
    readonly payload: Rpc.Payload<Rpc>
    readonly headers: Headers.Headers
    readonly traceId: string
    readonly spanId: string
    readonly sampled: boolean
    readonly rpc: Rpc
    readonly context: Context<Rpc.Context<Rpc>>
  }
): RequestWithContext<Rpc> => {
  const self = makeRequest({
    ...options,
    tag: options.rpc._tag as Rpc.Tag<Rpc>
  }) as any
  self.rpc = options.rpc
  self.context = options.context
  Object.defineProperty(self, "encodeCache", {
    enumerable: false,
    writable: true,
    value: undefined
  })
  return self
}

const encodeCache = globalValue(
  "@effect/cluster/Envelope/encodeCache",
  () => new WeakMap<Rpc.Any, (u: unknown) => Effect.Effect<Envelope.Encoded, ParseError>>()
)

const getEncode = <Rpc extends Rpc.Any>(
  request: RequestWithContext<Rpc>
): (u: unknown) => Effect.Effect<Envelope.Encoded, ParseError> => {
  let encode = encodeCache.get(request.rpc)
  if (encode !== undefined) {
    return encode
  }
  encode = Schema.encode(Schema.Union(
    Schema.Struct({
      ...PartialEncodedRequest.fields,
      payload: (request.rpc as any as Rpc.AnyWithProps).payloadSchema
    }),
    AckChunk,
    Interrupt
  )) as any
  encodeCache.set(request.rpc, encode!)
  return encode!
}

/**
 * @since 1.0.0
 * @category serialization / deserialization
 */
export const serialize = <Rpc extends Rpc.Any>(
  envelope: EnvelopeWithContext<Rpc>
): Effect.Effect<Envelope.Encoded, ParseError> => {
  return Effect.suspend(() => {
    if (envelope._tag !== "Request") {
      return Schema.encode(PartialEncoded)(envelope)
    }

    if (envelope.encodedCache !== undefined) {
      return Effect.succeed(envelope.encodedCache)
    }
    return Effect.provide(
      Effect.tap(getEncode(envelope)(envelope), (encoded) => {
        envelope.encodedCache = encoded as Request.Encoded
      }),
      envelope.context as Context<unknown>
    )
  })
}

/**
 * @since 1.0.0
 * @category serialization / deserialization
 */
export const EnvelopeFromSelf: Schema.Schema<
  Envelope.Any,
  Envelope.Any
> = Schema.declare(isEnvelope, {
  identifier: "Envelope"
})

/**
 * @since 1.0.0
 * @category serialization / deserialization
 */
const PartialEncodedRequest: Schema.Struct<
  {
    _tag: Schema.Literal<["Request"]>
    id: Schema.Schema<Snowflake, string>
    address: typeof EntityAddress
    tag: typeof Schema.String
    payload: typeof Schema.Unknown
    headers: Schema.Schema<Headers.Headers, ReadonlyRecord<string, string>>
    traceId: typeof Schema.String
    spanId: typeof Schema.String
    sampled: typeof Schema.Boolean
  }
> = Schema.Struct({
  _tag: Schema.Literal("Request"),
  id: SnowflakeFromString,
  address: EntityAddress,
  tag: Schema.String,
  payload: Schema.Unknown,
  headers: Headers.schema,
  traceId: Schema.String,
  spanId: Schema.String,
  sampled: Schema.Boolean
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
        id: Schema.Schema<Snowflake, string>
        address: typeof EntityAddress
        tag: typeof Schema.String
        payload: typeof Schema.Unknown
        headers: Schema.Schema<Headers.Headers, ReadonlyRecord<string, string>>
        traceId: typeof Schema.String
        spanId: typeof Schema.String
        sampled: typeof Schema.Boolean
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
export const PartialEncodedRequestFromSelf: Schema.Struct<
  {
    _tag: Schema.Literal<["Request"]>
    id: Schema.Schema<Snowflake>
    address: Schema.Schema<EntityAddress>
    tag: typeof Schema.String
    payload: typeof Schema.Unknown
    headers: Schema.Schema<Headers.Headers>
    traceId: typeof Schema.String
    spanId: typeof Schema.String
    sampled: typeof Schema.Boolean
  }
> = Schema.Struct({
  _tag: Schema.Literal("Request"),
  id: Schema.typeSchema(SnowflakeFromString),
  address: EntityAddressFromSelf,
  tag: Schema.String,
  payload: Schema.Unknown,
  headers: Headers.schemaFromSelf,
  traceId: Schema.String,
  spanId: Schema.String,
  sampled: Schema.Boolean
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
        id: Schema.Schema<Snowflake>
        address: Schema.Schema<EntityAddress>
        tag: typeof Schema.String
        payload: typeof Schema.Unknown
        headers: Schema.Schema<Headers.Headers>
        traceId: typeof Schema.String
        spanId: typeof Schema.String
        sampled: typeof Schema.Boolean
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
 * @category serialization / deserialization
 */
export const deserializePartial: (envelope: Envelope.Encoded) => Effect.Effect<
  Envelope.PartialEncoded,
  ParseError
> = Schema.decode(PartialEncoded)

/**
 * @since 1.0.0
 * @category serialization / deserialization
 */
export const deserialize = <Rpc extends Rpc.Any>(
  self: RequestWithContext<Rpc>,
  encoded: Envelope.Encoded
): Effect.Effect<
  EnvelopeWithContext<Rpc>,
  ParseError
> =>
  Effect.flatMap(deserializePartial(encoded), (partial): Effect.Effect<
    EnvelopeWithContext<Rpc>,
    ParseError
  > => {
    if (partial._tag !== "Request") {
      return Effect.succeed(partial)
    }
    return Schema.deserialize(self.payload, partial.payload).pipe(
      Effect.provide(self.context as Context<unknown>),
      Effect.map((payload) =>
        makeRequestWithContext({
          ...partial,
          payload: payload as Rpc.Payload<Rpc>,
          rpc: self.rpc,
          context: self.context
        })
      )
    )
  })
