/**
 * @since 1.0.0
 */
import type { Headers } from "@effect/platform/Headers"
import * as Context_ from "effect/Context"
import type { Effect } from "effect/Effect"
import type { Exit as Exit_ } from "effect/Exit"
import { globalValue } from "effect/GlobalValue"
import * as Option from "effect/Option"
import { type Pipeable, pipeArguments } from "effect/Pipeable"
import * as Predicate from "effect/Predicate"
import * as Schema from "effect/Schema"
import type * as AST from "effect/SchemaAST"
import type { Stream } from "effect/Stream"
import type * as RpcMiddleware from "./RpcMiddleware.js"
import * as RpcSchema from "./RpcSchema.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("@effect/rpc/Rpc")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category guards
 */
export const isRpc = (u: unknown): u is Rpc<any, any, any> => Predicate.hasProperty(u, TypeId)

/**
 * Represents an API endpoint. An API endpoint is mapped to a single route on
 * the underlying `HttpRouter`.
 *
 * @since 1.0.0
 * @category models
 */
export interface Rpc<
  out Tag extends string,
  out Payload extends AnyStructSchema = Schema.Struct<{}>,
  out Success extends Schema.Schema.Any = typeof Schema.Void,
  out Error extends Schema.Schema.All = typeof Schema.Never,
  out Middleware extends RpcMiddleware.TagClassAny = never
> extends Pipeable {
  readonly [TypeId]: TypeId
  readonly _tag: Tag
  readonly key: string
  readonly payloadSchema: Payload
  readonly successSchema: Success
  readonly errorSchema: Error
  readonly annotations: Context_.Context<never>
  readonly middlewares: ReadonlySet<Middleware>

  /**
   * Set the schema for the success response of the rpc.
   */
  setSuccess<S extends Schema.Schema.Any>(schema: S): Rpc<
    Tag,
    Payload,
    S,
    Error,
    Middleware
  >

  /**
   * Set the schema for the error response of the rpc.
   */
  setError<E extends Schema.Schema.Any>(schema: E): Rpc<
    Tag,
    Payload,
    Success,
    E,
    Middleware
  >

  /**
   * Set the schema for the payload of the rpc.
   */
  setPayload<P extends Schema.Struct<any> | Schema.Struct.Fields>(
    schema: P
  ): Rpc<
    Tag,
    P extends Schema.Struct<infer _> ? P : P extends Schema.Struct.Fields ? Schema.Struct<P> : never,
    Success,
    Error,
    Middleware
  >

  /**
   * Add an `RpcMiddleware` to this procedure.
   */
  middleware<M extends RpcMiddleware.TagClassAny>(middleware: M): Rpc<
    Tag,
    Payload,
    Success,
    Error,
    Middleware | M
  >

  /**
   * Add an annotation on the rpc.
   */
  annotate<I, S>(
    tag: Context_.Tag<I, S>,
    value: S
  ): Rpc<Tag, Payload, Success, Error, Middleware>

  /**
   * Merge the annotations of the rpc with the provided context.
   */
  annotateContext<I>(
    context: Context_.Context<I>
  ): Rpc<Tag, Payload, Success, Error, Middleware>
}

/**
 * Represents an implemented rpc.
 *
 * @since 1.0.0
 * @category models
 */
export interface Handler<Tag extends string> {
  readonly _: unique symbol
  readonly tag: Tag
  readonly handler: (request: any, headers: Headers) => Effect<any, any> | Stream<any, any>
  readonly context: Context<never>
}

/**
 * @since 1.0.0
 * @category models
 */
export interface Any extends Pipeable {
  readonly [TypeId]: TypeId
  readonly _tag: string
  readonly key: string
}

/**
 * @since 1.0.0
 * @category models
 */
export interface AnyWithProps {
  readonly [TypeId]: TypeId
  readonly _tag: string
  readonly key: string
  readonly payloadSchema: AnyStructSchema
  readonly successSchema: Schema.Schema.Any
  readonly errorSchema: Schema.Schema.All
  readonly annotations: Context_.Context<never>
  readonly middlewares: ReadonlySet<RpcMiddleware.TagClassAnyWithProps>
}

/**
 * @since 1.0.0
 * @category models
 */
export type Tag<R> = R extends Rpc<
  infer _Tag,
  infer _Payload,
  infer _Success,
  infer _Error,
  infer _Middleware
> ? _Tag
  : never

/**
 * @since 1.0.0
 * @category models
 */
export type Success<R> = R extends Rpc<
  infer _Tag,
  infer _Payload,
  infer _Success,
  infer _Error,
  infer _Middleware
> ? _Success["Type"]
  : never

/**
 * @since 1.0.0
 * @category models
 */
export type SuccessEncoded<R> = R extends Rpc<
  infer _Tag,
  infer _Payload,
  infer _Success,
  infer _Error,
  infer _Middleware
> ? _Success["Encoded"]
  : never

/**
 * @since 1.0.0
 * @category models
 */
export type SuccessExit<R> = Success<R> extends infer T ? T extends Stream<infer _A, infer _E, infer _Env> ? void : T
  : never

/**
 * @since 1.0.0
 * @category models
 */
export type SuccessExitEncoded<R> = SuccessEncoded<R> extends infer T ?
  T extends Stream<infer _A, infer _E, infer _Env> ? void : T
  : never

/**
 * @since 1.0.0
 * @category models
 */
export type SuccessChunk<R> = Success<R> extends Stream<infer _A, infer _E, infer _Env> ? _A : never

/**
 * @since 1.0.0
 * @category models
 */
export type SuccessChunkEncoded<R> = SuccessEncoded<R> extends Stream<infer _A, infer _E, infer _Env> ? _A : never

/**
 * @since 1.0.0
 * @category models
 */
export type ErrorSchema<R> = R extends Rpc<
  infer _Tag,
  infer _Payload,
  infer _Success,
  infer _Error,
  infer _Middleware
> ? _Error | _Middleware
  : never

/**
 * @since 1.0.0
 * @category models
 */
export type Error<R> = Schema.Schema.Type<ErrorSchema<R>>

/**
 * @since 1.0.0
 * @category models
 */
export type ErrorEncoded<R> = Schema.Schema.Encoded<ErrorSchema<R>>
/**
 * @since 1.0.0
 * @category models
 */
export type ErrorExit<R> = Success<R> extends Stream<infer _A, infer _E, infer _Env> ? _E | Error<R> : Error<R>

/**
 * @since 1.0.0
 * @category models
 */
export type ErrorExitEncoded<R> = SuccessEncoded<R> extends Stream<infer _A, infer _E, infer _Env>
  ? _E | ErrorEncoded<R>
  : ErrorEncoded<R>

/**
 * @since 1.0.0
 * @category models
 */
export type Exit<R> = Exit_<SuccessExit<R>, ErrorExit<R>>

/**
 * @since 1.0.0
 * @category models
 */
export type ExitEncoded<R, Defect = unknown> = Schema.ExitEncoded<SuccessExitEncoded<R>, ErrorExitEncoded<R>, Defect>

/**
 * @since 1.0.0
 * @category models
 */
export type PayloadConstructor<R> = R extends Rpc<
  infer _Tag,
  infer _Payload,
  infer _Success,
  infer _Error,
  infer _Middleware
> ?
  Schema.Struct.Constructor<_Payload["fields"]> extends infer T ?
    [keyof T] extends [never] ? void | {} : Schema.Simplify<T>
  : never
  : never

/**
 * @since 1.0.0
 * @category models
 */
export type Payload<R> = R extends Rpc<
  infer _Tag,
  infer _Payload,
  infer _Success,
  infer _Error,
  infer _Middleware
> ? _Payload["Type"]
  : never

/**
 * @since 1.0.0
 * @category models
 */
export type Context<R> = R extends Rpc<
  infer _Tag,
  infer _Payload,
  infer _Success,
  infer _Error,
  infer _Middleware
> ? _Payload["Context"] | _Success["Context"] | _Error["Context"]
  : never

/**
 * @since 1.0.0
 * @category models
 */
export type Middleware<R> = R extends Rpc<
  infer _Tag,
  infer _Payload,
  infer _Success,
  infer _Error,
  infer _Middleware
> ? Context_.Tag.Identifier<_Middleware>
  : never

/**
 * @since 1.0.0
 * @category models
 */
export type MiddlewareClient<R> = R extends Rpc<
  infer _Tag,
  infer _Payload,
  infer _Success,
  infer _Error,
  infer _Middleware
> ?
  _Middleware extends { readonly requiredForClient: true }
    ? RpcMiddleware.ForClient<Context_.Tag.Identifier<_Middleware>>
  : never
  : never

/**
 * @since 1.0.0
 * @category models
 */
export type AddError<R extends Any, Error extends Schema.Schema.All> = R extends Rpc<
  infer _Tag,
  infer _Payload,
  infer _Success,
  infer _Error,
  infer _Middleware
> ? Rpc<
    _Tag,
    _Payload,
    _Success,
    _Error | Error,
    _Middleware
  > :
  never

/**
 * @since 1.0.0
 * @category models
 */
export type AddMiddleware<R extends Any, Middleware extends RpcMiddleware.TagClassAny> = R extends Rpc<
  infer _Tag,
  infer _Payload,
  infer _Success,
  infer _Error,
  infer _Middleware
> ? Rpc<
    _Tag,
    _Payload,
    _Success,
    _Error,
    _Middleware | Middleware
  > :
  never

/**
 * @since 1.0.0
 * @category models
 */
export type ToHandler<R extends Any> = R extends Rpc<
  infer _Tag,
  infer _Payload,
  infer _Success,
  infer _Error,
  infer _Middleware
> ? Handler<_Tag> :
  never

/**
 * @since 1.0.0
 * @category models
 */
export type IsStream<R extends Any, Tag extends string> = R extends
  Rpc<Tag, infer _Payload, RpcSchema.Stream<infer _A, infer _E>, infer _Error, infer _Middleware> ? true : never

/**
 * @since 1.0.0
 * @category models
 */
export type ExtractTag<R extends Any, Tag extends string> = R extends
  Rpc<Tag, infer _Payload, infer _Success, infer _Error, infer _Middleware> ? R : never

/**
 * @since 1.0.0
 * @category models
 */
export type ExtractProvides<R extends Any, Tag extends string> = R extends
  Rpc<Tag, infer _Payload, infer _Success, infer _Error, infer _Middleware> ? _Middleware extends {
    readonly provides: Context_.Tag<infer _I, infer _S>
  } ? _I :
  never :
  never

/**
 * @since 1.0.0
 * @category models
 */
export type ExcludeProvides<Env, R extends Any, Tag extends string> = Exclude<
  Env,
  ExtractProvides<R, Tag>
>

/**
 * @since 1.0.0
 * @category models
 */
export interface From<S extends AnyTaggedRequestSchema> extends Rpc<S["_tag"], S, S["success"], S["failure"]> {}

const Proto = {
  [TypeId]: TypeId,
  pipe() {
    return pipeArguments(this, arguments)
  },
  setSuccess(
    this: AnyWithProps,
    successSchema: Schema.Schema.Any
  ) {
    return makeProto({
      ...this,
      successSchema
    })
  },
  setError(this: AnyWithProps, errorSchema: Schema.Schema.All) {
    return makeProto({
      ...this,
      errorSchema
    })
  },
  setPayload(this: AnyWithProps, payloadSchema: Schema.Struct<any> | Schema.Struct.Fields) {
    return makeProto({
      ...this,
      payloadSchema: Schema.isSchema(payloadSchema) ? payloadSchema as any : Schema.Struct(payloadSchema as any)
    })
  },
  middleware(this: AnyWithProps, middleware: RpcMiddleware.TagClassAny) {
    return makeProto({
      ...this,
      middlewares: new Set([...this.middlewares, middleware])
    })
  },
  annotate(this: AnyWithProps, tag: Context_.Tag<any, any>, value: any) {
    return makeProto({
      ...this,
      annotations: Context_.add(this.annotations, tag, value)
    })
  },
  annotateContext(this: AnyWithProps, context: Context_.Context<any>) {
    return makeProto({
      ...this,
      annotations: Context_.merge(this.annotations, context)
    })
  }
}

const makeProto = <
  const Tag extends string,
  Payload extends AnyStructSchema,
  Success extends Schema.Schema.Any,
  Error extends Schema.Schema.All,
  Middleware extends RpcMiddleware.TagClassAny
>(options: {
  readonly _tag: Tag
  readonly payloadSchema: Payload
  readonly successSchema: Success
  readonly errorSchema: Error
  readonly annotations: Context_.Context<never>
  readonly middlewares: ReadonlySet<Middleware>
}): Rpc<Tag, Payload, Success, Error, Middleware> => {
  const self = Object.assign(Object.create(Proto), options)
  self.key = `@effect/rpc/Rpc/${options._tag}`
  return self
}

const constEmptyStruct = Schema.Struct({})

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = <
  const Tag extends string,
  Payload extends AnyStructSchema | Schema.Struct.Fields = Schema.Struct<{}>,
  Success extends Schema.Schema.Any = typeof Schema.Void,
  Error extends Schema.Schema.All = typeof Schema.Never,
  const Stream extends boolean = false
>(tag: Tag, options?: {
  readonly payload?: Payload
  readonly success?: Success
  readonly error?: Error
  readonly stream?: Stream
}): Rpc<
  Tag,
  Payload extends Schema.Struct.Fields ? Schema.Struct<Payload> : Payload,
  Stream extends true ? RpcSchema.Stream<Success, Error> : Success,
  Stream extends true ? typeof Schema.Never : Error
> => {
  const successSchema = options?.success ?? Schema.Void
  const errorSchema = options?.error ?? Schema.Never
  return makeProto({
    _tag: tag,
    payloadSchema: Schema.isSchema(options?.payload)
      ? options?.payload as any
      : options?.payload
      ? Schema.Struct(options?.payload as any)
      : constEmptyStruct,
    successSchema: options?.stream ?
      RpcSchema.Stream({
        success: successSchema,
        failure: errorSchema
      }) :
      successSchema,
    errorSchema: options?.stream ? Schema.Never : errorSchema,
    annotations: Context_.empty(),
    middlewares: new Set<never>()
  }) as any
}

/**
 * @since 1.0.0
 * @category constructors
 */
export interface AnyStructSchema extends Pipeable {
  readonly [Schema.TypeId]: any
  readonly make: any
  readonly Type: any
  readonly Encoded: any
  readonly Context: any
  readonly ast: AST.AST
  readonly fields: Schema.Struct.Fields
  readonly annotations: any
}

/**
 * @since 1.0.0
 * @category constructors
 */
export interface AnyTaggedRequestSchema extends AnyStructSchema {
  readonly _tag: string
  readonly success: Schema.Schema.Any
  readonly failure: Schema.Schema.All
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const fromTaggedRequest = <S extends AnyTaggedRequestSchema>(
  schema: S
): From<S> =>
  makeProto({
    _tag: schema._tag,
    payloadSchema: schema as any,
    successSchema: schema.success as any,
    errorSchema: schema.failure,
    annotations: Context_.empty(),
    middlewares: new Set()
  })

const exitSchemaCache = globalValue("@effect/rpc/Rpc/exitSchemaCache", () => new WeakMap<Any, Schema.Schema.Any>())

/**
 * @since 1.0.0
 * @category constructors
 */
export const exitSchema = <R extends Any>(
  self: R
): Schema.Schema<Exit<R>, ExitEncoded<R>, Context<R>> => {
  if (exitSchemaCache.has(self)) {
    return exitSchemaCache.get(self) as any
  }
  const rpc = self as any as AnyWithProps
  const streamSchemas = RpcSchema.getStreamSchemas(rpc.successSchema.ast)
  const schema = Schema.Exit({
    success: Option.isSome(streamSchemas) ? Schema.Void : rpc.successSchema,
    failure: Option.isSome(streamSchemas) ?
      Schema.Union(
        streamSchemas.value.failure,
        rpc.errorSchema
      ) :
      rpc.errorSchema,
    defect: Schema.Defect
  })
  exitSchemaCache.set(self, schema)
  return schema as any
}

/**
 * @since 1.0.0
 * @category Fork
 */
export const ForkTypeId: unique symbol = Symbol.for("@effect/rpc/Rpc/Fork")

/**
 * @since 1.0.0
 * @category Fork
 */
export type ForkTypeId = typeof ForkTypeId

/**
 * @since 1.0.0
 * @category Fork
 */
export interface Fork<A> {
  readonly [ForkTypeId]: ForkTypeId
  readonly value: A
}

/**
 * You can use `fork` to wrap a response Effect or Stream, to ensure that the
 * response is executed concurrently regardless of the RpcServer concurrency
 * setting.
 *
 * @since 1.0.0
 * @category Fork
 */
export const fork = <A>(value: A): Fork<A> => ({ [ForkTypeId]: ForkTypeId, value })

/**
 * @since 1.0.0
 * @category Fork
 */
export const isFork = (u: object): u is Fork<any> => ForkTypeId in u
