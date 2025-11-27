/**
 * @since 1.0.0
 */
import type { Headers } from "@effect/platform/Headers"
import * as Context_ from "effect/Context"
import type { Effect } from "effect/Effect"
import type { Exit as Exit_ } from "effect/Exit"
import { globalValue } from "effect/GlobalValue"
import type { ReadonlyMailbox } from "effect/Mailbox"
import * as Option from "effect/Option"
import { type Pipeable, pipeArguments } from "effect/Pipeable"
import * as Predicate from "effect/Predicate"
import * as PrimaryKey from "effect/PrimaryKey"
import * as Schema from "effect/Schema"
import type * as AST from "effect/SchemaAST"
import type { Stream } from "effect/Stream"
import type { NoInfer } from "effect/Types"
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
  in out Tag extends string,
  out Payload extends AnySchema = typeof Schema.Void,
  out Success extends Schema.Schema.Any = typeof Schema.Void,
  out Error extends Schema.Schema.All = typeof Schema.Never,
  out Middleware extends RpcMiddleware.TagClassAny = never
> extends Pipeable {
  new(_: never): {}

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
   * Set the schema for the error response of the rpc.
   */
  prefix<const Prefix extends string>(prefix: Prefix): Rpc<
    `${Prefix}${Tag}`,
    Payload,
    Success,
    Error,
    Middleware
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
  readonly handler: (request: any, options: {
    readonly clientId: number
    readonly headers: Headers
  }) => Effect<any, any> | Stream<any, any>
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
  readonly payloadSchema: AnySchema
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
export type SuccessSchema<R> = R extends Rpc<
  infer _Tag,
  infer _Payload,
  infer _Success,
  infer _Error,
  infer _Middleware
> ? _Success
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
export type SuccessExit<R> = SuccessSchema<R> extends infer S ?
  S extends RpcSchema.Stream<infer _A, infer _E> ? void : Schema.Schema.Type<S>
  : never

/**
 * @since 1.0.0
 * @category models
 */
export type SuccessExitEncoded<R> = SuccessSchema<R> extends infer S ?
  S extends RpcSchema.Stream<infer _A, infer _E> ? void : Schema.Schema.Encoded<S>
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
export type ErrorExit<R> = SuccessSchema<R> extends RpcSchema.Stream<infer _A, infer _E> ? _E["Type"] | Error<R>
  : Error<R>

/**
 * @since 1.0.0
 * @category models
 */
export type ErrorExitEncoded<R> = SuccessSchema<R> extends RpcSchema.Stream<infer _A, infer _E> ?
  _E["Encoded"] | ErrorEncoded<R>
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
  _Payload extends { readonly fields: Schema.Struct.Fields } ?
    Schema.Simplify<Schema.Struct.Constructor<_Payload["fields"]>>
  : _Payload["Type"]
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
export type ToHandlerFn<Current extends Any, R = any> = (
  payload: Payload<Current>,
  options: {
    readonly clientId: number
    readonly headers: Headers
  }
) => ResultFrom<Current, R> | Wrapper<ResultFrom<Current, R>>

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

/**
 * @since 1.0.0
 * @category models
 */
export type ResultFrom<R extends Any, Context> = R extends Rpc<
  infer _Tag,
  infer _Payload,
  infer _Success,
  infer _Error,
  infer _Middleware
> ? [_Success] extends [RpcSchema.Stream<infer _SA, infer _SE>] ?
      | Stream<
        _SA["Type"],
        _SE["Type"] | _Error["Type"],
        Context
      >
      | Effect<
        ReadonlyMailbox<_SA["Type"], _SE["Type"] | _Error["Type"]>,
        _SE["Type"] | Schema.Schema.Type<_Error>,
        Context
      > :
  Effect<
    _Success["Type"],
    _Error["Type"],
    Context
  > :
  never

/**
 * @since 1.0.0
 * @category models
 */
export type Prefixed<Rpcs extends Any, Prefix extends string> = Rpcs extends Rpc<
  infer _Tag,
  infer _Payload,
  infer _Success,
  infer _Error,
  infer _Middleware
> ? Rpc<
    `${Prefix}${_Tag}`,
    _Payload,
    _Success,
    _Error,
    _Middleware
  >
  : never

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
      _tag: this._tag,
      payloadSchema: this.payloadSchema,
      successSchema,
      errorSchema: this.errorSchema,
      annotations: this.annotations,
      middlewares: this.middlewares
    })
  },
  setError(this: AnyWithProps, errorSchema: Schema.Schema.All) {
    return makeProto({
      _tag: this._tag,
      payloadSchema: this.payloadSchema,
      successSchema: this.successSchema,
      errorSchema,
      annotations: this.annotations,
      middlewares: this.middlewares
    })
  },
  setPayload(this: AnyWithProps, payloadSchema: Schema.Struct<any> | Schema.Struct.Fields) {
    return makeProto({
      _tag: this._tag,
      payloadSchema: Schema.isSchema(payloadSchema) ? payloadSchema as any : Schema.Struct(payloadSchema as any),
      successSchema: this.successSchema,
      errorSchema: this.errorSchema,
      annotations: this.annotations,
      middlewares: this.middlewares
    })
  },
  middleware(this: AnyWithProps, middleware: RpcMiddleware.TagClassAny) {
    return makeProto({
      _tag: this._tag,
      payloadSchema: this.payloadSchema,
      successSchema: this.successSchema,
      errorSchema: this.errorSchema,
      annotations: this.annotations,
      middlewares: new Set([...this.middlewares, middleware])
    })
  },
  prefix(this: AnyWithProps, prefix: string) {
    return makeProto({
      _tag: `${prefix}${this._tag}`,
      payloadSchema: this.payloadSchema,
      successSchema: this.successSchema,
      errorSchema: this.errorSchema,
      annotations: this.annotations,
      middlewares: this.middlewares
    })
  },
  annotate(this: AnyWithProps, tag: Context_.Tag<any, any>, value: any) {
    return makeProto({
      _tag: this._tag,
      payloadSchema: this.payloadSchema,
      successSchema: this.successSchema,
      errorSchema: this.errorSchema,
      middlewares: this.middlewares,
      annotations: Context_.add(this.annotations, tag, value)
    })
  },
  annotateContext(this: AnyWithProps, context: Context_.Context<any>) {
    return makeProto({
      _tag: this._tag,
      payloadSchema: this.payloadSchema,
      successSchema: this.successSchema,
      errorSchema: this.errorSchema,
      middlewares: this.middlewares,
      annotations: Context_.merge(this.annotations, context)
    })
  }
}

const makeProto = <
  const Tag extends string,
  Payload extends Schema.Schema.Any,
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
  function Rpc() {}
  Object.setPrototypeOf(Rpc, Proto)
  Object.assign(Rpc, options)
  Rpc.key = `@effect/rpc/Rpc/${options._tag}`
  return Rpc as any
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = <
  const Tag extends string,
  Payload extends Schema.Schema.Any | Schema.Struct.Fields = typeof Schema.Void,
  Success extends Schema.Schema.Any = typeof Schema.Void,
  Error extends Schema.Schema.All = typeof Schema.Never,
  const Stream extends boolean = false
>(tag: Tag, options?: {
  readonly payload?: Payload
  readonly success?: Success
  readonly error?: Error
  readonly stream?: Stream
  readonly primaryKey?: [Payload] extends [Schema.Struct.Fields] ?
    ((payload: Schema.Simplify<Schema.Struct.Type<NoInfer<Payload>>>) => string) :
    never
}): Rpc<
  Tag,
  Payload extends Schema.Struct.Fields ? Schema.Struct<Payload> : Payload,
  Stream extends true ? RpcSchema.Stream<Success, Error> : Success,
  Stream extends true ? typeof Schema.Never : Error
> => {
  const successSchema = options?.success ?? Schema.Void
  const errorSchema = options?.error ?? Schema.Never
  let payloadSchema: any
  if (options?.primaryKey) {
    payloadSchema = class Payload extends Schema.Class<Payload>(`@effect/rpc/Rpc/${tag}`)(options.payload as any) {
      [PrimaryKey.symbol](): string {
        return options.primaryKey!(this as any)
      }
    }
  } else {
    payloadSchema = Schema.isSchema(options?.payload)
      ? options?.payload as any
      : options?.payload
      ? Schema.Struct(options?.payload as any)
      : Schema.Void
  }
  return makeProto({
    _tag: tag,
    payloadSchema,
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
export interface AnySchema extends Pipeable {
  readonly [Schema.TypeId]: any
  readonly Type: any
  readonly Encoded: any
  readonly Context: any
  readonly make?: (params: any, ...rest: ReadonlyArray<any>) => any
  readonly ast: AST.AST
  readonly annotations: any
}

/**
 * @since 1.0.0
 * @category constructors
 */
export interface AnyTaggedRequestSchema extends AnySchema {
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
  const failures = new Set<Schema.Schema.All>([rpc.errorSchema])
  const streamSchemas = RpcSchema.getStreamSchemas(rpc.successSchema.ast)
  if (Option.isSome(streamSchemas)) {
    failures.add(streamSchemas.value.failure)
  }
  for (const middleware of rpc.middlewares) {
    failures.add(middleware.failure)
  }
  const schema = Schema.Exit({
    success: Option.isSome(streamSchemas) ? Schema.Void : rpc.successSchema,
    failure: Schema.Union(...failures),
    defect: Schema.Defect
  })
  exitSchemaCache.set(self, schema)
  return schema as any
}

/**
 * @since 1.0.0
 * @category Wrapper
 */
export const WrapperTypeId: unique symbol = Symbol.for("@effect/rpc/Rpc/Wrapper")

/**
 * @since 1.0.0
 * @category Wrapper
 */
export type WrapperTypeId = typeof WrapperTypeId

/**
 * @since 1.0.0
 * @category Wrapper
 */
export interface Wrapper<A> {
  readonly [WrapperTypeId]: WrapperTypeId
  readonly value: A
  readonly fork: boolean
  readonly uninterruptible: boolean
}

/**
 * @since 1.0.0
 * @category Wrapper
 */
export const isWrapper = (u: object): u is Wrapper<any> => WrapperTypeId in u

/**
 * @since 1.0.0
 * @category Wrapper
 */
export const wrap = (options: {
  readonly fork?: boolean | undefined
  readonly uninterruptible?: boolean | undefined
}) =>
<A extends object>(value: A): A extends Wrapper<infer _> ? A : Wrapper<A> =>
  (isWrapper(value) ?
    {
      [WrapperTypeId]: WrapperTypeId,
      value: value.value,
      fork: options.fork ?? value.fork,
      uninterruptible: options.uninterruptible ?? value.uninterruptible
    } :
    {
      [WrapperTypeId]: WrapperTypeId,
      value,
      fork: options.fork ?? false,
      uninterruptible: options.uninterruptible ?? false
    }) as any

/**
 * You can use `fork` to wrap a response Effect or Stream, to ensure that the
 * response is executed concurrently regardless of the RpcServer concurrency
 * setting.
 *
 * @since 1.0.0
 * @category Wrapper
 */
export const fork: <A extends object>(value: A) => A extends Wrapper<infer _> ? A : Wrapper<A> = wrap({ fork: true })

/**
 * You can use `uninterruptible` to wrap a response Effect or Stream, to ensure
 * that it is executed inside an uninterruptible region.
 *
 * @since 1.0.0
 * @category Wrapper
 */
export const uninterruptible: <A extends object>(value: A) => A extends Wrapper<infer _> ? A : Wrapper<A> = wrap({
  uninterruptible: true
})
