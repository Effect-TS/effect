/**
 * @since 1.0.0
 */
import { type Handler, StreamRequestTypeId } from "@effect/platform/Handler"
import * as Headers from "@effect/platform/Http/Headers"
import type * as ParseResult from "@effect/schema/ParseResult"
import * as Schema from "@effect/schema/Schema"
import type * as Serializable from "@effect/schema/Serializable"
import * as Effect from "effect/Effect"
import * as FiberRef from "effect/FiberRef"
import { dual, pipe } from "effect/Function"
import { globalValue } from "effect/GlobalValue"
import type * as PrimaryKey from "effect/PrimaryKey"
import type * as Record from "effect/Record"
import type * as EffectRequest from "effect/Request"
import type * as RequestResolver from "effect/RequestResolver"
import type { Scope } from "effect/Scope"
import * as Stream from "effect/Stream"
import * as Internal from "./internal/request.js"

/**
 * @since 1.0.0
 * @category models
 */
export interface Request<A extends Schema.TaggedRequest.Any> extends
  EffectRequest.Request<
    EffectRequest.Request.Success<A>,
    EffectRequest.Request.Error<A>
  >,
  PrimaryKey.PrimaryKey,
  Serializable.WithResult<
    Serializable.WithResult.Context<A>,
    Schema.Schema.Encoded<A[typeof Serializable.symbolResult]["Failure"]>,
    Schema.Schema.Type<A[typeof Serializable.symbolResult]["Failure"]>,
    Schema.Schema.Encoded<A[typeof Serializable.symbolResult]["Success"]>,
    Schema.Schema.Type<A[typeof Serializable.symbolResult]["Success"]>
  >
{
  readonly request: A
  readonly traceId: string
  readonly spanId: string
  readonly sampled: boolean
  readonly headers: Headers.Headers
}

/**
 * @since 1.0.0
 * @category models
 */
export interface RequestFrom<A> {
  readonly request: A
  readonly traceId: string
  readonly spanId: string
  readonly sampled: boolean
  readonly headers: Record<string, string>
}

/**
 * @since 1.0.0
 * @category schemas
 */
export const RequestSchema = <A, I, R>(
  schema: Schema.Schema<A, I, R>
): Schema.Schema<RequestFrom<A>, RequestFrom<I>, R> =>
  Schema.Struct({
    request: schema,
    traceId: Schema.String,
    spanId: Schema.String,
    sampled: Schema.Boolean,
    headers: Schema.Record(Schema.String, Schema.String)
  })

/**
 * @since 1.0.0
 * @category headers
 */
export const currentHeaders: FiberRef.FiberRef<Headers.Headers> = globalValue(
  "@effect/rpc/Rpc/currentHeaders",
  () => FiberRef.unsafeMake(Headers.empty)
)

/**
 * @since 1.0.0
 * @category headers
 */
export const annotateHeaders: {
  (headers: Headers.Input): <A, E, R>(self: Effect.Effect<A, E, R>) => Effect.Effect<A, E, R>
  <A, E, R>(self: Effect.Effect<A, E, R>, headers: Headers.Input): Effect.Effect<A, E, R>
} = dual(2, (self, headers) => {
  const resolved = Headers.fromInput(headers)
  return Effect.locallyWith(self, currentHeaders, (prev) => ({ ...prev, ...resolved }))
})

/**
 * @since 1.0.0
 * @category headers
 */
export const schemaHeaders = <R, I extends Record.ReadonlyRecord<string, string | undefined>, A>(
  schema: Schema.Schema<R, I, A>
): Effect.Effect<R, ParseResult.ParseError, A> => {
  const decode = Schema.decodeUnknown(schema)
  return Effect.flatMap(FiberRef.get(currentHeaders), decode)
}

/**
 * @since 1.0.0
 * @category requests
 */
export const request = <A extends Schema.TaggedRequest.Any>(
  request: A,
  options?: {
    readonly spanPrefix?: string
  }
): Effect.Effect<Request<A>, never, Scope> =>
  pipe(
    Effect.makeSpanScoped(`${options?.spanPrefix ?? "Rpc.request "}${request._tag}`),
    Effect.zip(FiberRef.get(currentHeaders)),
    Effect.map(([span, headers]) =>
      Internal.makeRequest({
        request,
        traceId: span.traceId,
        spanId: span.spanId,
        sampled: span.sampled,
        headers
      })
    )
  )

/**
 * @since 1.0.0
 * @category requests
 */
export const call = <
  A extends Schema.TaggedRequest.Any,
  R extends
    | RequestResolver.RequestResolver<Request<A>>
    | Effect.Effect<RequestResolver.RequestResolver<Request<A>>, never, any>
>(
  req: A,
  resolver: R,
  options?: {
    readonly spanPrefix?: string
  }
): R extends Effect.Effect<infer _A, infer _E, infer R> ? Handler.Result<A, R> : Handler.Result<A> => {
  const isStream = StreamRequestTypeId in req
  const res = pipe(
    request(req, options),
    Effect.flatMap((_) => Effect.request(_, resolver))
  )
  return isStream ? Stream.unwrapScoped(res as any) : Effect.scoped(res) as any
}
