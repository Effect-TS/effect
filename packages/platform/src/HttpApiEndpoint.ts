/**
 * @since 1.0.0
 */
import type { Brand } from "effect/Brand"
import * as Context from "effect/Context"
import type { Effect } from "effect/Effect"
import * as Option from "effect/Option"
import { type Pipeable, pipeArguments } from "effect/Pipeable"
import * as Predicate from "effect/Predicate"
import * as Schema from "effect/Schema"
import type * as Stream from "effect/Stream"
import type * as Types from "effect/Types"
import type * as HttpApiMiddleware from "./HttpApiMiddleware.js"
import * as HttpApiSchema from "./HttpApiSchema.js"
import type { HttpMethod } from "./HttpMethod.js"
import * as HttpRouter from "./HttpRouter.js"
import type { HttpServerRequest } from "./HttpServerRequest.js"
import type { HttpServerResponse } from "./HttpServerResponse.js"
import type * as Multipart from "./Multipart.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("@effect/platform/HttpApiEndpoint")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category guards
 */
export const isHttpApiEndpoint = (u: unknown): u is HttpApiEndpoint<any, any, any> => Predicate.hasProperty(u, TypeId)

/**
 * Represents a path segment. A path segment is a string that represents a
 * segment of a URL path.
 *
 * @since 1.0.0
 * @category models
 */
export type PathSegment = `/${string}`

/**
 * Represents an API endpoint. An API endpoint is mapped to a single route on
 * the underlying `HttpRouter`.
 *
 * @since 1.0.0
 * @category models
 */
export interface HttpApiEndpoint<
  out Name extends string,
  out Method extends HttpMethod,
  in out Path = never,
  in out UrlParams = never,
  in out Payload = never,
  in out Headers = never,
  in out Success = void,
  in out Error = never,
  out R = never,
  out RE = never
> extends Pipeable {
  readonly [TypeId]: TypeId
  readonly name: Name
  readonly path: PathSegment
  readonly method: Method
  readonly pathSchema: Option.Option<Schema.Schema<Path, unknown, R>>
  readonly urlParamsSchema: Option.Option<Schema.Schema<UrlParams, unknown, R>>
  readonly payloadSchema: Option.Option<Schema.Schema<Payload, unknown, R>>
  readonly headersSchema: Option.Option<Schema.Schema<Headers, unknown, R>>
  readonly successSchema: Schema.Schema<Success, unknown, R>
  readonly errorSchema: Schema.Schema<Error, unknown, RE>
  readonly annotations: Context.Context<never>
  readonly middlewares: ReadonlySet<HttpApiMiddleware.TagClassAny>

  /**
   * Add a schema for the success response of the endpoint. The status code
   * will be inferred from the schema, otherwise it will default to 200.
   */
  addSuccess<S extends Schema.Schema.Any>(
    schema: S,
    annotations?: {
      readonly status?: number | undefined
    }
  ): HttpApiEndpoint<
    Name,
    Method,
    Path,
    UrlParams,
    Payload,
    Headers,
    Exclude<Success, void> | Schema.Schema.Type<S>,
    Error,
    R | Schema.Schema.Context<S>,
    RE
  >

  /**
   * Add an error response schema to the endpoint. The status code
   * will be inferred from the schema, otherwise it will default to 500.
   */
  addError<E extends Schema.Schema.Any>(
    schema: E,
    annotations?: {
      readonly status?: number | undefined
    }
  ): HttpApiEndpoint<
    Name,
    Method,
    Path,
    UrlParams,
    Payload,
    Headers,
    Success,
    Error | Schema.Schema.Type<E>,
    R,
    RE | Schema.Schema.Context<E>
  >

  /**
   * Set the schema for the request body of the endpoint. The schema will be
   * used to validate the request body before the handler is called.
   *
   * For endpoints with no request body, the payload will use the url search
   * parameters.
   *
   * You can set a multipart schema to handle file uploads by using the
   * `HttpApiSchema.Multipart` combinator.
   */
  setPayload<P extends Schema.Schema.Any>(
    schema: P & HttpApiEndpoint.ValidatePayload<Method, P>
  ): HttpApiEndpoint<
    Name,
    Method,
    Path,
    UrlParams,
    Schema.Schema.Type<P>,
    Headers,
    Success,
    Error,
    R | Schema.Schema.Context<P>,
    RE
  >

  /**
   * Set the schema for the path parameters of the endpoint. The schema will be
   * used to validate the path parameters before the handler is called.
   */
  setPath<Path extends Schema.Schema.Any>(
    schema: Path & HttpApiEndpoint.ValidatePath<Path>
  ): HttpApiEndpoint<
    Name,
    Method,
    Schema.Schema.Type<Path>,
    UrlParams,
    Payload,
    Headers,
    Success,
    Error,
    R | Schema.Schema.Context<Path>,
    RE
  >

  /**
   * Set the schema for the url search parameters of the endpoint.
   */
  setUrlParams<UrlParams extends Schema.Schema.Any>(
    schema: UrlParams & HttpApiEndpoint.ValidateUrlParams<UrlParams>
  ): HttpApiEndpoint<
    Name,
    Method,
    Path,
    Schema.Schema.Type<UrlParams>,
    Payload,
    Headers,
    Success,
    Error,
    R | Schema.Schema.Context<Path>,
    RE
  >

  /**
   * Set the schema for the headers of the endpoint. The schema will be
   * used to validate the headers before the handler is called.
   */
  setHeaders<H extends Schema.Schema.Any>(
    schema: H & HttpApiEndpoint.ValidateHeaders<H>
  ): HttpApiEndpoint<
    Name,
    Method,
    Path,
    UrlParams,
    Payload,
    Schema.Schema.Type<H>,
    Success,
    Error,
    R | Schema.Schema.Context<H>,
    RE
  >

  /**
   * Add a prefix to the path of the endpoint.
   */
  prefix(
    prefix: PathSegment
  ): HttpApiEndpoint<Name, Method, Path, UrlParams, Payload, Headers, Success, Error, R, RE>

  /**
   * Add an `HttpApiMiddleware` to the endpoint.
   */
  middleware<I extends HttpApiMiddleware.HttpApiMiddleware.AnyId, S>(middleware: Context.Tag<I, S>): HttpApiEndpoint<
    Name,
    Method,
    Path,
    UrlParams,
    Payload,
    Headers,
    Success,
    Error | HttpApiMiddleware.HttpApiMiddleware.Error<I>,
    R | I,
    RE | HttpApiMiddleware.HttpApiMiddleware.ErrorContext<I>
  >

  /**
   * Add an annotation on the endpoint.
   */
  annotate<I, S>(
    tag: Context.Tag<I, S>,
    value: S
  ): HttpApiEndpoint<Name, Method, Path, UrlParams, Payload, Headers, Success, Error, R, RE>

  /**
   * Merge the annotations of the endpoint with the provided context.
   */
  annotateContext<I>(
    context: Context.Context<I>
  ): HttpApiEndpoint<Name, Method, Path, UrlParams, Payload, Headers, Success, Error, R, RE>
}

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace HttpApiEndpoint {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Any extends Pipeable {
    readonly [TypeId]: TypeId
    readonly name: string
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface AnyWithProps extends HttpApiEndpoint<string, HttpMethod, any, any, any, any, any, any, any> {}

  /**
   * @since 1.0.0
   * @category models
   */
  export type Name<Endpoint> = Endpoint extends HttpApiEndpoint<
    infer _Name,
    infer _Method,
    infer _Path,
    infer _UrlParams,
    infer _Payload,
    infer _Headers,
    infer _Success,
    infer _Error,
    infer _R,
    infer _RE
  > ? _Name
    : never

  /**
   * @since 1.0.0
   * @category models
   */
  export type Success<Endpoint extends Any> = Endpoint extends HttpApiEndpoint<
    infer _Name,
    infer _Method,
    infer _Path,
    infer _UrlParams,
    infer _Payload,
    infer _Headers,
    infer _Success,
    infer _Error,
    infer _R,
    infer _RE
  > ? _Success
    : never

  /**
   * @since 1.0.0
   * @category models
   */
  export type Error<Endpoint extends Any> = Endpoint extends HttpApiEndpoint<
    infer _Name,
    infer _Method,
    infer _Path,
    infer _UrlParams,
    infer _Payload,
    infer _Headers,
    infer _Success,
    infer _Error,
    infer _R,
    infer _RE
  > ? _Error
    : never

  /**
   * @since 1.0.0
   * @category models
   */
  export type PathParsed<Endpoint extends Any> = Endpoint extends HttpApiEndpoint<
    infer _Name,
    infer _Method,
    infer _Path,
    infer _UrlParams,
    infer _Payload,
    infer _Headers,
    infer _Success,
    infer _Error,
    infer _R,
    infer _RE
  > ? _Path
    : never

  /**
   * @since 1.0.0
   * @category models
   */
  export type UrlParams<Endpoint extends Any> = Endpoint extends HttpApiEndpoint<
    infer _Name,
    infer _Method,
    infer _Path,
    infer _UrlParams,
    infer _Payload,
    infer _Headers,
    infer _Success,
    infer _Error,
    infer _R,
    infer _RE
  > ? _UrlParams
    : never

  /**
   * @since 1.0.0
   * @category models
   */
  export type Payload<Endpoint extends Any> = Endpoint extends HttpApiEndpoint<
    infer _Name,
    infer _Method,
    infer _Path,
    infer _UrlParams,
    infer _Payload,
    infer _Headers,
    infer _Success,
    infer _Error,
    infer _R,
    infer _RE
  > ? _Payload
    : never

  /**
   * @since 1.0.0
   * @category models
   */
  export type Headers<Endpoint extends Any> = Endpoint extends HttpApiEndpoint<
    infer _Name,
    infer _Method,
    infer _Path,
    infer _UrlParams,
    infer _Payload,
    infer _Headers,
    infer _Success,
    infer _Error,
    infer _R,
    infer _RE
  > ? _Headers
    : never

  /**
   * @since 1.0.0
   * @category models
   */
  export type Request<Endpoint extends Any> = Endpoint extends HttpApiEndpoint<
    infer _Name,
    infer _Method,
    infer _Path,
    infer _UrlParams,
    infer _Payload,
    infer _Headers,
    infer _Success,
    infer _Error,
    infer _R,
    infer _RE
  > ?
      & ([_Path] extends [never] ? {} : { readonly path: _Path })
      & ([_UrlParams] extends [never] ? {} : { readonly urlParams: _UrlParams })
      & ([_Payload] extends [never] ? {}
        : _Payload extends Brand<HttpApiSchema.MultipartStreamTypeId> ?
          { readonly payload: Stream.Stream<Multipart.Part, Multipart.MultipartError> }
        : { readonly payload: _Payload })
      & ([_Headers] extends [never] ? {} : { readonly headers: _Headers })
      & { readonly request: HttpServerRequest }
    : {}

  /**
   * @since 1.0.0
   * @category models
   */
  export type RequestRaw<Endpoint extends Any> = Endpoint extends HttpApiEndpoint<
    infer _Name,
    infer _Method,
    infer _Path,
    infer _UrlParams,
    infer _Payload,
    infer _Headers,
    infer _Success,
    infer _Error,
    infer _R,
    infer _RE
  > ?
      & ([_Path] extends [never] ? {} : { readonly path: _Path })
      & ([_UrlParams] extends [never] ? {} : { readonly urlParams: _UrlParams })
      & ([_Headers] extends [never] ? {} : { readonly headers: _Headers })
      & { readonly request: HttpServerRequest }
    : {}

  /**
   * @since 1.0.0
   * @category models
   */
  export type ClientRequest<Path, UrlParams, Payload, Headers, WithResponse extends boolean> = (
    & ([Path] extends [void] ? {} : { readonly path: Path })
    & ([UrlParams] extends [never] ? {} : { readonly urlParams: UrlParams })
    & ([Headers] extends [never] ? {} : { readonly headers: Headers })
    & ([Payload] extends [never] ? {}
      : Payload extends infer P ?
        P extends Brand<HttpApiSchema.MultipartTypeId> | Brand<HttpApiSchema.MultipartStreamTypeId>
          ? { readonly payload: FormData }
        : { readonly payload: P }
      : { readonly payload: Payload })
  ) extends infer Req ? keyof Req extends never ? (void | { readonly withResponse?: WithResponse }) :
    Req & { readonly withResponse?: WithResponse } :
    void

  /**
   * @since 1.0.0
   * @category models
   */
  export type Context<Endpoint> = Endpoint extends HttpApiEndpoint<
    infer _Name,
    infer _Method,
    infer _Path,
    infer _UrlParams,
    infer _Payload,
    infer _Headers,
    infer _Success,
    infer _Error,
    infer _R,
    infer _RE
  > ? _R
    : never

  /**
   * @since 1.0.0
   * @category models
   */
  export type ErrorContext<Endpoint> = Endpoint extends HttpApiEndpoint<
    infer _Name,
    infer _Method,
    infer _Path,
    infer _UrlParams,
    infer _Payload,
    infer _Headers,
    infer _Success,
    infer _Error,
    infer _R,
    infer _RE
  > ? _RE
    : never

  /**
   * @since 1.0.0
   * @category models
   */
  export type Handler<Endpoint extends Any, E, R> = (
    request: Types.Simplify<Request<Endpoint>>
  ) => Effect<Success<Endpoint> | HttpServerResponse, Error<Endpoint> | E, R>

  /**
   * @since 1.0.0
   * @category models
   */
  export type HandlerRaw<Endpoint extends Any, E, R> = (
    request: Types.Simplify<RequestRaw<Endpoint>>
  ) => Effect<Success<Endpoint> | HttpServerResponse, Error<Endpoint> | E, R>

  /**
   * @since 1.0.0
   * @category models
   */
  export type WithName<Endpoints extends Any, Name extends string> = Extract<Endpoints, { readonly name: Name }>

  /**
   * @since 1.0.0
   * @category models
   */
  export type ExcludeName<Endpoints extends Any, Name extends string> = Exclude<Endpoints, { readonly name: Name }>

  /**
   * @since 1.0.0
   * @category models
   */
  export type HandlerWithName<Endpoints extends Any, Name extends string, E, R> = Handler<
    WithName<Endpoints, Name>,
    E,
    R
  >

  /**
   * @since 1.0.0
   * @category models
   */
  export type HandlerRawWithName<Endpoints extends Any, Name extends string, E, R> = HandlerRaw<
    WithName<Endpoints, Name>,
    E,
    R
  >

  /**
   * @since 1.0.0
   * @category models
   */
  export type SuccessWithName<Endpoints extends Any, Name extends string> = Success<WithName<Endpoints, Name>>

  /**
   * @since 1.0.0
   * @category models
   */
  export type ErrorWithName<Endpoints extends Any, Name extends string> = Error<WithName<Endpoints, Name>>

  /**
   * @since 1.0.0
   * @category models
   */
  export type ContextWithName<Endpoints extends Any, Name extends string> = Context<WithName<Endpoints, Name>>

  /**
   * @since 1.0.0
   * @category models
   */
  export type ErrorContextWithName<Endpoints extends Any, Name extends string> = ErrorContext<WithName<Endpoints, Name>>

  /**
   * @since 1.0.0
   * @category models
   */
  export type ExcludeProvided<Endpoints extends Any, Name extends string, R> = Exclude<
    R,
    | HttpRouter.HttpRouter.DefaultServices
    | HttpRouter.HttpRouter.Provided
    | HttpApiMiddleware.HttpApiMiddleware.ExtractProvides<ContextWithName<Endpoints, Name>>
  >

  /**
   * @since 1.0.0
   * @category models
   */
  export type ValidatePath<S extends Schema.Schema.Any> = S extends Schema.Schema<infer _A, infer _I, infer _R>
    ? [_I] extends [Readonly<Record<string, string | undefined>>] ? {}
    : `Path schema must be encodeable to strings`
    : {}

  /**
   * @since 1.0.0
   * @category models
   */
  export type ValidateUrlParams<S extends Schema.Schema.Any> = S extends Schema.Schema<infer _A, infer _I, infer _R>
    ? [_I] extends [Readonly<Record<string, string | ReadonlyArray<string> | undefined>>] ? {}
    : `UrlParams schema must be encodeable to strings`
    : {}

  /**
   * @since 1.0.0
   * @category models
   */
  export type ValidateHeaders<S extends Schema.Schema.Any> = S extends Schema.Schema<infer _A, infer _I, infer _R>
    ? [_I] extends [Readonly<Record<string, string | undefined>>] ? {}
    : `Headers schema must be encodeable to strings`
    : {}

  /**
   * @since 1.0.0
   * @category models
   */
  export type ValidatePayload<Method extends HttpMethod, P extends Schema.Schema.Any> = Method extends
    HttpMethod.NoBody ?
    P extends Schema.Schema<infer _A, infer _I, infer _R>
      ? [_I] extends [Readonly<Record<string, string | ReadonlyArray<string> | undefined>>] ? {}
      : `'${Method}' payload must be encodeable to strings`
    : {}
    : {}

  /**
   * @since 1.0.0
   * @category models
   */
  export type ValidateParams<
    Schemas extends ReadonlyArray<Schema.Schema.Any | Schema.PropertySignature.Any>,
    Prev extends (Schema.Schema.Any | Schema.PropertySignature.Any) = never
  > = Schemas extends [
    infer Head extends (Schema.Schema.Any | Schema.PropertySignature.Any),
    ...infer Tail extends ReadonlyArray<Schema.Schema.Any | Schema.PropertySignature.Any>
  ] ? [
      Head extends HttpApiSchema.Param<infer _Name, infer _S>
        ? HttpApiSchema.Param<_Name, any> extends Prev ? `Duplicate param: ${_Name}`
        : [Schema.Schema.Encoded<Head> & {}] extends [string] ? Head
        : `Must be encodeable to string: ${_Name}` :
        Head,
      ...ValidateParams<Tail, Prev | Head>
    ]
    : Schemas

  /**
   * @since 1.0.0
   * @category models
   */
  export type AddError<Endpoint extends Any, E, R> = Endpoint extends HttpApiEndpoint<
    infer _Name,
    infer _Method,
    infer _Path,
    infer _UrlParams,
    infer _Payload,
    infer _Headers,
    infer _Success,
    infer _Error,
    infer _R,
    infer _RE
  > ? HttpApiEndpoint<
      _Name,
      _Method,
      _Path,
      _UrlParams,
      _Payload,
      _Headers,
      _Success,
      _Error | E,
      _R,
      _RE | R
    > :
    never

  /**
   * @since 1.0.0
   * @category models
   */
  export type AddContext<Endpoint extends Any, R> = Endpoint extends HttpApiEndpoint<
    infer _Name,
    infer _Method,
    infer _Path,
    infer _UrlParams,
    infer _Payload,
    infer _Headers,
    infer _Success,
    infer _Error,
    infer _R,
    infer _RE
  > ? HttpApiEndpoint<
      _Name,
      _Method,
      _Path,
      _UrlParams,
      _Payload,
      _Headers,
      _Success,
      _Error | HttpApiMiddleware.HttpApiMiddleware.Error<R>,
      _R | R,
      _RE | HttpApiMiddleware.HttpApiMiddleware.ErrorContext<R>
    > :
    never

  /**
   * @since 1.0.0
   * @category models
   */
  export type PathEntries<Schemas extends ReadonlyArray<Schema.Schema.Any | Schema.PropertySignature.Any>> =
    Extract<keyof Schemas, string> extends infer K ?
      K extends keyof Schemas ? Schemas[K] extends HttpApiSchema.Param<infer _Name, infer _S> ? [_Name, _S] :
        Schemas[K] extends (Schema.Schema.Any | Schema.PropertySignature.Any) ? [K, Schemas[K]]
        : never
      : never
      : never

  type OptionalTypePropertySignature =
    | Schema.PropertySignature<"?:", any, PropertyKey, Schema.PropertySignature.Token, any, boolean, unknown>
    | Schema.PropertySignature<"?:", any, PropertyKey, Schema.PropertySignature.Token, never, boolean, unknown>
    | Schema.PropertySignature<"?:", never, PropertyKey, Schema.PropertySignature.Token, any, boolean, unknown>
    | Schema.PropertySignature<"?:", never, PropertyKey, Schema.PropertySignature.Token, never, boolean, unknown>

  /**
   * @since 1.0.0
   * @category models
   */
  export type ExtractPath<Schemas extends ReadonlyArray<Schema.Schema.Any | Schema.PropertySignature.Any>> =
    Schema.Simplify<
      & {
        readonly [
          Entry in Extract<PathEntries<Schemas>, [any, OptionalTypePropertySignature]> as Entry[0]
        ]?: Schema.Schema.Type<Entry[1]>
      }
      & {
        readonly [
          Entry in Exclude<PathEntries<Schemas>, [any, OptionalTypePropertySignature]> as Entry[0]
        ]: Schema.Schema.Type<Entry[1]>
      }
    >

  /**
   * @since 1.0.0
   * @category models
   */
  export type Constructor<Name extends string, Method extends HttpMethod> = <
    const Schemas extends ReadonlyArray<Schema.Schema.Any | Schema.PropertySignature.Any>
  >(
    segments: TemplateStringsArray,
    ...schemas: ValidateParams<Schemas>
  ) => HttpApiEndpoint<
    Name,
    Method,
    Schemas["length"] extends 0 ? never : Types.Simplify<ExtractPath<Schemas>>,
    never,
    never,
    never,
    void,
    never,
    Schema.Schema.Context<Schemas[number]>
  >
}

const Proto = {
  [TypeId]: TypeId,
  pipe() {
    return pipeArguments(this, arguments)
  },
  addSuccess(
    this: HttpApiEndpoint.AnyWithProps,
    schema: Schema.Schema.Any,
    annotations?: { readonly status?: number }
  ) {
    schema = annotations?.status ?
      schema.annotations(HttpApiSchema.annotations({ status: annotations.status })) :
      schema
    return makeProto({
      ...this,
      successSchema: this.successSchema === HttpApiSchema.NoContent ?
        schema :
        HttpApiSchema.UnionUnify(this.successSchema, schema)
    })
  },
  addError(this: HttpApiEndpoint.AnyWithProps, schema: Schema.Schema.Any, annotations?: { readonly status?: number }) {
    return makeProto({
      ...this,
      errorSchema: HttpApiSchema.UnionUnify(
        this.errorSchema,
        annotations?.status ? schema.annotations(HttpApiSchema.annotations({ status: annotations.status })) : schema
      )
    })
  },
  setPayload(this: HttpApiEndpoint.AnyWithProps, schema: Schema.Schema.Any) {
    return makeProto({
      ...this,
      payloadSchema: Option.some(schema)
    })
  },
  setPath(this: HttpApiEndpoint.AnyWithProps, schema: Schema.Schema.Any) {
    return makeProto({
      ...this,
      pathSchema: Option.some(schema)
    })
  },
  setUrlParams(this: HttpApiEndpoint.AnyWithProps, schema: Schema.Schema.Any) {
    return makeProto({
      ...this,
      urlParamsSchema: Option.some(schema)
    })
  },
  setHeaders(this: HttpApiEndpoint.AnyWithProps, schema: Schema.Schema.Any) {
    return makeProto({
      ...this,
      headersSchema: Option.some(schema)
    })
  },
  prefix(this: HttpApiEndpoint.AnyWithProps, prefix: PathSegment) {
    return makeProto({
      ...this,
      path: HttpRouter.prefixPath(this.path, prefix) as PathSegment
    })
  },
  middleware(this: HttpApiEndpoint.AnyWithProps, middleware: HttpApiMiddleware.TagClassAny) {
    return makeProto({
      ...this,
      errorSchema: HttpApiSchema.UnionUnify(this.errorSchema, middleware.failure),
      middlewares: new Set([...this.middlewares, middleware])
    })
  },
  annotate(this: HttpApiEndpoint.AnyWithProps, tag: Context.Tag<any, any>, value: any) {
    return makeProto({
      ...this,
      annotations: Context.add(this.annotations, tag, value)
    })
  },
  annotateContext(this: HttpApiEndpoint.AnyWithProps, context: Context.Context<any>) {
    return makeProto({
      ...this,
      annotations: Context.merge(this.annotations, context)
    })
  }
}

const makeProto = <
  Name extends string,
  Method extends HttpMethod,
  Path,
  UrlParams,
  Payload,
  Headers,
  Success,
  Error,
  R,
  RE
>(options: {
  readonly name: Name
  readonly path: PathSegment
  readonly method: Method
  readonly pathSchema: Option.Option<Schema.Schema<Path, unknown, R>>
  readonly urlParamsSchema: Option.Option<Schema.Schema<UrlParams, unknown, R>>
  readonly payloadSchema: Option.Option<Schema.Schema<Payload, unknown, R>>
  readonly headersSchema: Option.Option<Schema.Schema<Headers, unknown, R>>
  readonly successSchema: Schema.Schema<Success, unknown, R>
  readonly errorSchema: Schema.Schema<Error, unknown, RE>
  readonly annotations: Context.Context<never>
  readonly middlewares: ReadonlySet<HttpApiMiddleware.TagClassAny>
}): HttpApiEndpoint<Name, Method, Path, Payload, Headers, Success, Error, R, RE> =>
  Object.assign(Object.create(Proto), options)

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = <Method extends HttpMethod>(method: Method): {
  <const Name extends string>(name: Name): HttpApiEndpoint.Constructor<Name, Method>
  <const Name extends string>(name: Name, path: PathSegment): HttpApiEndpoint<Name, Method>
} =>
  ((name: string, ...args: [PathSegment]) => {
    if (args.length === 1) {
      return makeProto({
        name,
        path: args[0],
        method,
        pathSchema: Option.none(),
        urlParamsSchema: Option.none(),
        payloadSchema: Option.none(),
        headersSchema: Option.none(),
        successSchema: HttpApiSchema.NoContent as any,
        errorSchema: Schema.Never as any,
        annotations: Context.empty(),
        middlewares: new Set()
      })
    }
    return (
      segments: TemplateStringsArray,
      ...schemas: ReadonlyArray<Schema.Schema.Any | Schema.PropertySignature.Any>
    ) => {
      let path = segments[0].replace(":", "::") as PathSegment
      let pathSchema = Option.none<Schema.Schema.Any>()
      if (schemas.length > 0) {
        const obj: Record<string, Schema.Schema.Any | Schema.PropertySignature.Any> = {}
        for (let i = 0; i < schemas.length; i++) {
          const schema = schemas[i]
          const key = HttpApiSchema.getParam(schema.ast) ?? String(i)
          const optional = schema.ast._tag === "PropertySignatureTransformation" && schema.ast.from.isOptional ||
            schema.ast._tag === "PropertySignatureDeclaration" && schema.ast.isOptional
          obj[key] = schema
          path += `:${key}${optional ? "?" : ""}${segments[i + 1].replace(":", "::")}`
        }
        pathSchema = Option.some(Schema.Struct(obj))
      }
      return makeProto({
        name,
        path,
        method,
        pathSchema,
        urlParamsSchema: Option.none(),
        payloadSchema: Option.none(),
        headersSchema: Option.none(),
        successSchema: HttpApiSchema.NoContent as any,
        errorSchema: Schema.Never as any,
        annotations: Context.empty(),
        middlewares: new Set()
      })
    }
  }) as any

/**
 * @since 1.0.0
 * @category constructors
 */
export const get: {
  <const Name extends string>(name: Name): HttpApiEndpoint.Constructor<Name, "GET">
  <const Name extends string>(
    name: Name,
    path: PathSegment
  ): HttpApiEndpoint<Name, "GET">
} = make("GET")

/**
 * @since 1.0.0
 * @category constructors
 */
export const post: {
  <const Name extends string>(name: Name): HttpApiEndpoint.Constructor<Name, "POST">
  <const Name extends string>(
    name: Name,
    path: PathSegment
  ): HttpApiEndpoint<Name, "POST">
} = make("POST")

/**
 * @since 1.0.0
 * @category constructors
 */
export const put: {
  <const Name extends string>(name: Name): HttpApiEndpoint.Constructor<Name, "PUT">
  <const Name extends string>(
    name: Name,
    path: PathSegment
  ): HttpApiEndpoint<Name, "PUT">
} = make("PUT")

/**
 * @since 1.0.0
 * @category constructors
 */
export const patch: {
  <const Name extends string>(name: Name): HttpApiEndpoint.Constructor<Name, "PATCH">
  <const Name extends string>(
    name: Name,
    path: PathSegment
  ): HttpApiEndpoint<Name, "PATCH">
} = make("PATCH")

/**
 * @since 1.0.0
 * @category constructors
 */
export const del: {
  <const Name extends string>(name: Name): HttpApiEndpoint.Constructor<Name, "DELETE">
  <const Name extends string>(
    name: Name,
    path: PathSegment
  ): HttpApiEndpoint<Name, "DELETE">
} = make("DELETE")

/**
 * @since 1.0.0
 * @category constructors
 */
export const head: {
  <const Name extends string>(name: Name): HttpApiEndpoint.Constructor<Name, "HEAD">
  <const Name extends string>(
    name: Name,
    path: PathSegment
  ): HttpApiEndpoint<Name, "HEAD">
} = make("HEAD")

/**
 * @since 1.0.0
 * @category constructors
 */
export const options: {
  <const Name extends string>(name: Name): HttpApiEndpoint.Constructor<Name, "OPTIONS">
  <const Name extends string>(
    name: Name,
    path: PathSegment
  ): HttpApiEndpoint<Name, "OPTIONS">
} = make("OPTIONS")
