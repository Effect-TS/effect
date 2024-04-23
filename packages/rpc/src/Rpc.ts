/**
 * @since 1.0.0
 */
import * as Headers from "@effect/platform/Http/Headers"
import type * as ParseResult from "@effect/schema/ParseResult"
import * as Schema from "@effect/schema/Schema"
import type * as Serializable from "@effect/schema/Serializable"
import type * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as FiberRef from "effect/FiberRef"
import { dual, pipe } from "effect/Function"
import { globalValue } from "effect/GlobalValue"
import { type Pipeable, pipeArguments } from "effect/Pipeable"
import * as Predicate from "effect/Predicate"
import type * as PrimaryKey from "effect/PrimaryKey"
import type * as Record from "effect/Record"
import type * as EffectRequest from "effect/Request"
import type * as RequestResolver from "effect/RequestResolver"
import type { Scope } from "effect/Scope"
import * as Stream from "effect/Stream"
import type * as Types from "effect/Types"
import * as Internal from "./internal/rpc.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId = Symbol.for("@effect/rpc/Rpc")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category refinements
 */
export const isRpc = (u: unknown): u is Rpc<any, any> => Predicate.hasProperty(u, TypeId)

/**
 * @since 1.0.0
 * @category models
 */
export type Rpc<Req extends Schema.TaggedRequest.Any, R> = RpcEffect<Req, R> | RpcStream<Req, R>

/**
 * @since 1.0.0
 * @category models
 */
export interface RpcEffect<Req extends Schema.TaggedRequest.Any, R> extends Rpc.Proto<Req> {
  readonly _tag: "Effect"
  readonly handler: (
    request: Req
  ) => Effect.Effect<
    EffectRequest.Request.Success<Req>,
    EffectRequest.Request.Error<Req>,
    R
  >
}

/**
 * @since 1.0.0
 * @category models
 */
export interface RpcStream<Req extends Schema.TaggedRequest.Any, R> extends Rpc.Proto<Req> {
  readonly _tag: "Stream"
  readonly handler: (
    request: Req
  ) => Stream.Stream<
    Req extends Serializable.WithResult<infer A, infer _I, infer _E, infer _EI, infer _R> ? A : never,
    Req extends Serializable.WithResult<infer _A, infer _I, infer E, infer _EI, infer _R> ? E : never,
    R
  >
}

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace Rpc {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Proto<Req extends Schema.TaggedRequest.Any> extends Pipeable {
    readonly [TypeId]: TypeId
    readonly _tag: string
    readonly schema: Schema.Schema<Req, unknown, any>
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export type Context<A extends Rpc<any, any>> = A extends Rpc<infer Req, infer R>
    ? R | Serializable.SerializableWithResult.Context<Req>
    : never

  /**
   * @since 1.0.0
   * @category models
   */
  export type Request<A extends Rpc<any, any>> = Schema.Schema.Type<A["schema"]>

  /**
   * @since 1.0.0
   * @category models
   */
  export type Result<A extends Schema.TaggedRequest.Any, R = never> = EffectRequest.Request.Success<A> extends
    Stream.Stream<infer A, infer E, infer _R> ? Stream.Stream<A, E, R>
    : Effect.Effect<EffectRequest.Request.Success<A>, EffectRequest.Request.Error<A>, R>

  /**
   * @since 1.0.0
   * @category models
   */
  export type ResultUndecoded<A extends Schema.TaggedRequest.Any, R = never> = A extends
    Serializable.WithResult<infer _A, infer I, infer _E, infer _EI, infer _R>
    ? EffectRequest.Request.Success<A> extends Stream.Stream<infer _A, infer E, infer _R> ? Stream.Stream<I, E, R>
    : Effect.Effect<I, EffectRequest.Request.Error<A>, R>
    : never
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const effect = <Req extends Schema.TaggedRequest.Any, SR, I, R>(
  schema: Schema.Schema<Req, I, SR>,
  handler: (request: Req) => Effect.Effect<EffectRequest.Request.Success<Req>, EffectRequest.Request.Error<Req>, R>
): Rpc<Req, R> => ({
  [TypeId]: TypeId,
  _tag: "Effect",
  schema: schema as any,
  handler,
  pipe() {
    return pipeArguments(this, arguments)
  }
})

/**
 * @since 1.0.0
 * @category schemas
 */
export interface StreamRequest<Tag extends string, SR, SI, S, RR, EI, E, AI, A>
  extends
    EffectRequest.Request<Stream.Stream<A, E, never>>,
    Serializable.SerializableWithResult<S, SI, SR, A, AI, E, EI, RR>
{
  readonly _tag: Tag
}

/**
 * @since 1.0.0
 * @category schemas
 */
export declare namespace StreamRequest {
  /**
   * @since 1.0.0
   * @category schemas
   */
  export type Any =
    | StreamRequest<string, any, any, any, any, any, any, any, any>
    | StreamRequest<string, any, any, any, any, never, never, any, any>
}

/**
 * @since 1.0.0
 * @category schemas
 */
export interface StreamRequestConstructor<Tag extends string, Self, R, IS, S, RR, IE, E, IA, A>
  extends Schema.Schema<Self, Types.Simplify<IS & { readonly _tag: Tag }>, R>
{
  new(
    props: Types.Equals<S, {}> extends true ? void : S,
    disableValidation?: boolean
  ): StreamRequest<Tag, R, IS & { readonly _tag: Tag }, Self, RR, IE, E, IA, A> & S
}

/**
 * @since 1.0.0
 * @category schemas
 */
export const StreamRequest =
  <Self>() =>
  <Tag extends string, E, IE, RE, A, IA, RA, Fields extends Schema.Struct.Fields>(
    tag: Tag,
    failure: Schema.Schema<E, IE, RE>,
    success: Schema.Schema<A, IA, RA>,
    fields: Fields
  ): StreamRequestConstructor<
    Tag,
    Self,
    Schema.Schema.Context<Fields[keyof Fields]>,
    Types.Simplify<Schema.Struct.Encoded<Fields>>,
    Types.Simplify<Schema.Struct.Type<Fields>>,
    RE | RA,
    IE,
    E,
    IA,
    A
  > => {
    return class extends (Schema.TaggedRequest<{}>()(tag, failure, success, fields) as any) {
      constructor(props: any, disableValidation?: boolean) {
        super(props, disableValidation)
        ;(this as any)[Internal.StreamRequestTypeId] = Internal.StreamRequestTypeId
      }
    } as any
  }

/**
 * @since 1.0.0
 * @category constructors
 */
export const stream = <Req extends StreamRequest.Any, I, SR, R>(
  schema: Schema.Schema<Req, I, SR>,
  handler: (
    request: Req
  ) => Stream.Stream<
    Req extends Serializable.WithResult<infer A, infer _I, infer _E, infer _EI, infer _R> ? A : never,
    Req extends Serializable.WithResult<infer _A, infer _I, infer E, infer _EI, infer _R> ? E : never,
    R
  >
): Rpc<Req, R> => ({
  [TypeId]: TypeId,
  _tag: "Stream",
  schema: schema as any,
  handler,
  pipe() {
    return pipeArguments(this, arguments)
  }
})

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
    Effect.makeSpanScoped(`${options?.spanPrefix ?? "Rpc.request "}${request._tag}`, {
      kind: "client"
    }),
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
): R extends Effect.Effect<infer _A, infer _E, infer R> ? Rpc.Result<A, R> : Rpc.Result<A> => {
  const isStream = Internal.StreamRequestTypeId in req
  const res = pipe(
    request(req, options),
    Effect.flatMap((_) => Effect.request(_, resolver))
  )
  return isStream ? Stream.unwrapScoped(res as any) : Effect.scoped(res) as any
}

/**
 * @since 1.0.0
 * @category context
 */
export const provideServiceEffect: {
  <I, S, E, R2>(
    tag: Context.Tag<I, S>,
    effect: Effect.Effect<S, E, R2>
  ): <Req extends Schema.TaggedRequest.Any, R>(self: Rpc<Req, R>) => Rpc<Req, Exclude<R, I> | R2>
  <Req extends Schema.TaggedRequest.Any, R, I, S, E, R2>(
    self: Rpc<Req, R>,
    tag: Context.Tag<I, S>,
    effect: Effect.Effect<S, E, R2>
  ): Rpc<Req, Exclude<R, I> | R2>
} = dual(3, <Req extends Schema.TaggedRequest.Any, R, I, S, E, R2>(
  self: Rpc<Req, R>,
  tag: Context.Tag<I, S>,
  make: Effect.Effect<S, E, R2>
): Rpc<Req, Exclude<R, I> | R2> =>
  self._tag === "Effect"
    ? effect(self.schema, (req) => Effect.provideServiceEffect(self.handler(req), tag, Effect.orDie(make))) as any
    : stream(
      self.schema as any,
      (req) => Stream.provideServiceEffect(self.handler(req as any), tag, Effect.orDie(make))
    ))

/**
 * @since 1.0.0
 * @category context
 */
export const provideService: {
  <I, S>(
    tag: Context.Tag<I, S>,
    service: S
  ): <Req extends Schema.TaggedRequest.Any, R>(self: Rpc<Req, R>) => Rpc<Req, Exclude<R, I>>
  <Req extends Schema.TaggedRequest.Any, R, I, S>(
    self: Rpc<Req, R>,
    tag: Context.Tag<I, S>,
    service: S
  ): Rpc<Req, Exclude<R, I>>
} = dual(3, <Req extends Schema.TaggedRequest.Any, R, I, S>(
  self: Rpc<Req, R>,
  tag: Context.Tag<I, S>,
  service: S
): Rpc<Req, Exclude<R, I>> =>
  self._tag === "Effect"
    ? effect(self.schema, (req) => Effect.provideService(self.handler(req), tag, service)) as any
    : stream(
      self.schema as any,
      (req) => Stream.provideService(self.handler(req as any), tag, service)
    ))
