/**
 * @since 1.0.0
 */
import * as Schema from "@effect/schema/Schema"
import type { Brand } from "effect/Brand"
import * as Context from "effect/Context"
import type { Effect } from "effect/Effect"
import { dual } from "effect/Function"
import * as Option from "effect/Option"
import { type Pipeable, pipeArguments } from "effect/Pipeable"
import * as Predicate from "effect/Predicate"
import type { Redacted } from "effect/Redacted"
import type * as Types from "effect/Types"
import * as HttpApiSchema from "./HttpApiSchema.js"
import type { HttpMethod } from "./HttpMethod.js"
import * as HttpRouter from "./HttpRouter.js"
import type { HttpServerResponse } from "./HttpServerResponse.js"

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
  in out Payload = never,
  in out Headers = never,
  in out Success = void,
  in out Error = never,
  out R = never
> extends Pipeable {
  readonly [TypeId]: TypeId
  readonly name: Name
  readonly path: HttpRouter.PathInput
  readonly method: Method
  readonly pathSchema: Option.Option<Schema.Schema<Path, unknown, R>>
  readonly payloadSchema: Option.Option<Schema.Schema<Payload, unknown, R>>
  readonly headersSchema: Option.Option<Schema.Schema<Headers, unknown, R>>
  readonly successSchema: Schema.Schema<Success, unknown, R>
  readonly errorSchema: Schema.Schema<Error, unknown, R>
  readonly annotations: Context.Context<never>
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
    readonly path: HttpRouter.PathInput
    readonly method: HttpMethod
    readonly pathSchema: Option.Option<Schema.Schema.Any>
    readonly payloadSchema: Option.Option<Schema.Schema.Any>
    readonly headersSchema: Option.Option<Schema.Schema.Any>
    readonly successSchema: Schema.Schema.Any
    readonly errorSchema: Schema.Schema.Any
    readonly annotations: Context.Context<never>
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface All extends Pipeable {
    readonly [TypeId]: TypeId
    readonly name: string
    readonly path: HttpRouter.PathInput
    readonly method: HttpMethod
    readonly pathSchema: Option.Option<Schema.Schema.All>
    readonly payloadSchema: Option.Option<Schema.Schema.All>
    readonly headersSchema: Option.Option<Schema.Schema.All>
    readonly successSchema: Schema.Schema.Any
    readonly errorSchema: Schema.Schema.All
    readonly annotations: Context.Context<never>
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export type Success<Endpoint extends All> = Endpoint extends HttpApiEndpoint<
    infer _Name,
    infer _Method,
    infer _Path,
    infer _Payload,
    infer _Headers,
    infer _Success,
    infer _Error,
    infer _R
  > ? _Success
    : never

  /**
   * @since 1.0.0
   * @category models
   */
  export type Error<Endpoint extends All> = Endpoint extends HttpApiEndpoint<
    infer _Name,
    infer _Method,
    infer _Path,
    infer _Payload,
    infer _Headers,
    infer _Success,
    infer _Error,
    infer _R
  > ? _Error
    : never

  /**
   * @since 1.0.0
   * @category models
   */
  export type PathParsed<Endpoint extends All> = Endpoint extends HttpApiEndpoint<
    infer _Name,
    infer _Method,
    infer _Path,
    infer _Payload,
    infer _Headers,
    infer _Success,
    infer _Error,
    infer _R
  > ? _Path
    : never

  /**
   * @since 1.0.0
   * @category models
   */
  export type Payload<Endpoint extends All> = Endpoint extends HttpApiEndpoint<
    infer _Name,
    infer _Method,
    infer _Path,
    infer _Payload,
    infer _Headers,
    infer _Success,
    infer _Error,
    infer _R
  > ? _Payload
    : never

  /**
   * @since 1.0.0
   * @category models
   */
  export type Headers<Endpoint extends All> = Endpoint extends HttpApiEndpoint<
    infer _Name,
    infer _Method,
    infer _Path,
    infer _Payload,
    infer _Headers,
    infer _Success,
    infer _Error,
    infer _R
  > ? _Headers
    : never

  /**
   * @since 1.0.0
   * @category models
   */
  export type Request<Endpoint extends All> =
    & {
      readonly path: PathParsed<Endpoint>
    }
    & ([Payload<Endpoint>] extends [infer P] ? [P] extends [never] ? {} : { readonly payload: P } : {})
    & ([Headers<Endpoint>] extends [infer H] ? [H] extends [never] ? {} : { readonly headers: H } : {})

  /**
   * @since 1.0.0
   * @category models
   */
  export type ClientRequest<Path, Payload, Headers> = (
    & ([Path] extends [void] ? {} : { readonly path: Path })
    & ([Headers] extends [never] ? {} : { readonly headers: Headers })
    & ([Payload] extends [never] ? {}
      : [Payload] extends [Brand<HttpApiSchema.MultipartTypeId>] ? { readonly payload: FormData }
      : { readonly payload: Payload })
  ) extends infer Req ? keyof Req extends never ? void : Req : void

  /**
   * @since 1.0.0
   * @category models
   */
  export type Context<Endpoint> = Endpoint extends HttpApiEndpoint<
    infer _Name,
    infer _Method,
    infer _Path,
    infer _Payload,
    infer _Headers,
    infer _Success,
    infer _Error,
    infer _R
  > ? _R
    : never

  /**
   * @since 1.0.0
   * @category models
   */
  export type Handler<Endpoint extends All, E, R> = (
    request: Types.Simplify<Request<Endpoint>>
  ) => Effect<Success<Endpoint>, E, R>

  /**
   * @since 1.0.0
   * @category models
   */
  export type HandlerRedacted<Endpoint extends All, E, R> = (
    request: Types.Simplify<Request<Endpoint>>
  ) => Effect<readonly [Success<Endpoint>, Redacted], E, R>

  /**
   * @since 1.0.0
   * @category models
   */
  export type HandlerResponse<Endpoint extends All, E, R> = (
    request: Types.Simplify<Request<Endpoint>>
  ) => Effect<HttpServerResponse, E, R>

  /**
   * @since 1.0.0
   * @category models
   */
  export type WithName<Endpoints extends All, Name extends string> = Endpoints extends infer Endpoint
    ? Endpoint extends { readonly name: Name } ? Endpoint : never
    : never

  /**
   * @since 1.0.0
   * @category models
   */
  export type ExcludeName<Endpoints extends All, Name extends string> = Exclude<Endpoints, { readonly name: Name }>

  /**
   * @since 1.0.0
   * @category models
   */
  export type HandlerWithName<Endpoints extends All, Name extends string, E, R> = Handler<
    WithName<Endpoints, Name>,
    E,
    R
  >

  /**
   * @since 1.0.0
   * @category models
   */
  export type HandlerResponseWithName<Endpoints extends All, Name extends string, E, R> = HandlerResponse<
    WithName<Endpoints, Name>,
    E,
    R
  >

  /**
   * @since 1.0.0
   * @category models
   */
  export type HandlerRedactedWithName<Endpoints extends All, Name extends string, E, R> = HandlerRedacted<
    WithName<Endpoints, Name>,
    E,
    R
  >

  /**
   * @since 1.0.0
   * @category models
   */
  export type SuccessWithName<Endpoints extends All, Name extends string> = Success<WithName<Endpoints, Name>>

  /**
   * @since 1.0.0
   * @category models
   */
  export type ErrorWithName<Endpoints extends All, Name extends string> = Error<WithName<Endpoints, Name>>

  /**
   * @since 1.0.0
   * @category models
   */
  export type ExcludeProvided<R> = Exclude<
    R,
    HttpRouter.HttpRouter.DefaultServices | HttpRouter.HttpRouter.Provided
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
  export type ValidateHeaders<S extends Schema.Schema.Any> = S extends Schema.Schema<infer _A, infer _I, infer _R>
    ? [_I] extends [Readonly<Record<string, string | undefined>>] ? {}
    : `Headers schema must be encodeable to strings`
    : {}

  /**
   * @since 1.0.0
   * @category models
   */
  export type ValidatePayload<Method extends HttpMethod, P extends Schema.Schema.All> = Method extends
    HttpMethod.NoBody ?
    P extends Schema.Schema<infer _A, infer _I, infer _R>
      ? [_I] extends [Readonly<Record<string, string | ReadonlyArray<string> | undefined>>] ? {}
      : `'${Method}' payload must be encodeable to strings`
    : {}
    : {}
}

const Proto = {
  [TypeId]: TypeId,
  pipe() {
    return pipeArguments(this, arguments)
  }
}

const makeProto = <
  Name extends string,
  Method extends HttpMethod,
  Path,
  Payload,
  Headers,
  Success,
  Error,
  R
>(options: {
  readonly name: Name
  readonly path: HttpRouter.PathInput
  readonly method: Method
  readonly pathSchema: Option.Option<Schema.Schema<Path, unknown, R>>
  readonly payloadSchema: Option.Option<Schema.Schema<Payload, unknown, R>>
  readonly headersSchema: Option.Option<Schema.Schema<Headers, unknown, R>>
  readonly successSchema: Schema.Schema<Success, unknown, R>
  readonly errorSchema: Schema.Schema<Error, unknown, R>
  readonly annotations: Context.Context<never>
}): HttpApiEndpoint<Name, Method, Path, Payload, Headers, Success, Error, R> =>
  Object.assign(Object.create(Proto), options)

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = <Method extends HttpMethod>(method: Method) =>
<const Name extends string>(
  name: Name,
  path: HttpRouter.PathInput
): HttpApiEndpoint<Name, Method> =>
  makeProto({
    name,
    path,
    method,
    pathSchema: Option.none(),
    payloadSchema: Option.none(),
    headersSchema: Option.none(),
    successSchema: HttpApiSchema.NoContent as any,
    errorSchema: Schema.Never as any,
    annotations: Context.empty()
  })

/**
 * @since 1.0.0
 * @category constructors
 */
export const get: <const Name extends string>(
  name: Name,
  path: HttpRouter.PathInput
) => HttpApiEndpoint<Name, "GET"> = make("GET")

/**
 * @since 1.0.0
 * @category constructors
 */
export const post: <const Name extends string>(
  name: Name,
  path: HttpRouter.PathInput
) => HttpApiEndpoint<Name, "POST"> = make("POST")

/**
 * @since 1.0.0
 * @category constructors
 */
export const put: <const Name extends string>(
  name: Name,
  path: HttpRouter.PathInput
) => HttpApiEndpoint<Name, "PUT"> = make("PUT")

/**
 * @since 1.0.0
 * @category constructors
 */
export const patch: <const Name extends string>(
  name: Name,
  path: HttpRouter.PathInput
) => HttpApiEndpoint<Name, "PATCH"> = make("PATCH")

/**
 * @since 1.0.0
 * @category constructors
 */
export const del: <const Name extends string>(
  name: Name,
  path: HttpRouter.PathInput
) => HttpApiEndpoint<Name, "DELETE"> = make("DELETE")

/**
 * Set the schema for the success response of the endpoint. The status code
 * will be inferred from the schema, otherwise it will default to 200.
 *
 * @since 1.0.0
 * @category result
 */
export const setSuccess: {
  <S extends Schema.Schema.Any>(
    schema: S,
    annotations?: {
      readonly status?: number | undefined
    }
  ): <
    Name extends string,
    Method extends HttpMethod,
    _Path,
    _P,
    _H,
    _S,
    _E,
    _R
  >(
    self: HttpApiEndpoint<Name, Method, _Path, _P, _H, _S, _E, _R>
  ) => HttpApiEndpoint<Name, Method, _Path, _P, _H, Schema.Schema.Type<S>, _E, _R | Schema.Schema.Context<S>>
  <
    Name extends string,
    Method extends HttpMethod,
    _Path,
    _P,
    _H,
    _S,
    _E,
    _R,
    S extends Schema.Schema.Any
  >(
    self: HttpApiEndpoint<Name, Method, _Path, _P, _H, _S, _E, _R>,
    schema: S,
    annotations?: {
      readonly status?: number | undefined
    }
  ): HttpApiEndpoint<Name, Method, _Path, _P, _H, Schema.Schema.Type<S>, _E, _R | Schema.Schema.Context<S>>
} = dual(
  (args) => isHttpApiEndpoint(args[0]),
  <
    Name extends string,
    Method extends HttpMethod,
    _Path,
    _P,
    _H,
    _S,
    _E,
    _R,
    S extends Schema.Schema.Any
  >(
    self: HttpApiEndpoint<Name, Method, _Path, _P, _H, _S, _E, _R>,
    schema: S,
    annotations?: {
      readonly status?: number | undefined
    }
  ): HttpApiEndpoint<Name, Method, _Path, _P, Schema.Schema.Type<S>, _E, _R | Schema.Schema.Context<S>> =>
    makeProto({
      ...self as any,
      successSchema: schema.annotations(HttpApiSchema.annotations({
        status: annotations?.status ?? HttpApiSchema.getStatusSuccess(schema)
      }))
    })
)

/**
 * Add an error response schema to the endpoint. The status code
 * will be inferred from the schema, otherwise it will default to 500.
 *
 * @since 1.0.0
 * @category result
 */
export const addError: {
  <E extends Schema.Schema.All>(
    schema: E,
    annotations?: {
      readonly status?: number | undefined
    }
  ): <
    Name extends string,
    Method extends HttpMethod,
    _Path,
    _P,
    _H,
    _S,
    _E,
    _R
  >(
    self: HttpApiEndpoint<Name, Method, _Path, _P, _H, _S, _E, _R>
  ) => HttpApiEndpoint<Name, Method, _Path, _P, _H, _S, _E | Schema.Schema.Type<E>, _R | Schema.Schema.Context<E>>
  <
    Name extends string,
    Method extends HttpMethod,
    _Path,
    _P,
    _H,
    _S,
    _E,
    _R,
    E extends Schema.Schema.All
  >(
    self: HttpApiEndpoint<Name, Method, _Path, _P, _H, _S, _E, _R>,
    schema: E,
    annotations?: {
      readonly status?: number | undefined
    }
  ): HttpApiEndpoint<Name, Method, _Path, _P, _H, _S, _E | Schema.Schema.Type<E>, _R | Schema.Schema.Context<E>>
} = dual(
  (args) => isHttpApiEndpoint(args[0]),
  <
    Name extends string,
    Method extends HttpMethod,
    _Path,
    _P,
    _H,
    _S,
    _E,
    _R,
    E extends Schema.Schema.All
  >(
    self: HttpApiEndpoint<Name, Method, _Path, _P, _H, _S, _E, _R>,
    schema: E,
    annotations?: {
      readonly status?: number | undefined
    }
  ): HttpApiEndpoint<Name, Method, _Path, _P, _H, _S, _E | Schema.Schema.Type<E>, _R | Schema.Schema.Context<E>> =>
    makeProto({
      ...self as any,
      errorSchema: HttpApiSchema.UnionUnify(
        self.errorSchema,
        schema.pipe(
          Schema.annotations(HttpApiSchema.annotations({
            status: annotations?.status ?? HttpApiSchema.getStatusError(schema)
          }))
        )
      )
    })
)

/**
 * Set the schema for the request body of the endpoint. The schema will be
 * used to validate the request body before the handler is called.
 *
 * For endpoints with no request body, the payload will use the url search
 * parameters.
 *
 * You can set a multipart schema to handle file uploads by using the
 * `HttpApiSchema.Multipart` combinator.
 *
 * @since 1.0.0
 * @category request
 */
export const setPayload: {
  <Method extends HttpMethod, P extends Schema.Schema.All>(
    schema: P & HttpApiEndpoint.ValidatePayload<Method, P>
  ): <
    Name extends string,
    _Path,
    _P,
    _H,
    _S,
    _E,
    _R
  >(
    self: HttpApiEndpoint<Name, Method, _Path, _P, _H, _S, _E, _R>
  ) => HttpApiEndpoint<Name, Method, _Path, Schema.Schema.Type<P>, _H, _S, _E, _R | Schema.Schema.Context<P>>
  <
    Name extends string,
    Method extends HttpMethod,
    _Path,
    _P,
    _H,
    _S,
    _E,
    _R,
    P extends Schema.Schema.All
  >(
    self: HttpApiEndpoint<Name, Method, _Path, _P, _H, _S, _E, _R>,
    schema: P & HttpApiEndpoint.ValidatePayload<Method, P>
  ): HttpApiEndpoint<Name, Method, _Path, Schema.Schema.Type<P>, _H, _S, _E, _R | Schema.Schema.Context<P>>
} = dual(
  2,
  <
    Name extends string,
    Method extends HttpMethod,
    _Path,
    _P,
    _H,
    _S,
    _E,
    _R,
    P extends Schema.Schema.All
  >(
    self: HttpApiEndpoint<Name, Method, _Path, _P, _H, _S, _E, _R>,
    schema: P & HttpApiEndpoint.ValidatePayload<Method, P>
  ): HttpApiEndpoint<Name, Method, _Path, Schema.Schema.Type<P>, _H, _S, _E, _R | Schema.Schema.Context<P>> =>
    makeProto({
      ...self as any,
      payloadSchema: Option.some(schema)
    })
)

/**
 * Set the schema for the path parameters of the endpoint. The schema will be
 * used to validate the path parameters before the handler is called.
 *
 * @since 1.0.0
 * @category request
 */
export const setPath: {
  <Path extends Schema.Schema.Any>(
    schema: Path & HttpApiEndpoint.ValidatePath<Path>
  ): <
    Name extends string,
    Method extends HttpMethod,
    _Path,
    _P,
    _H,
    _S,
    _E,
    _R
  >(
    self: HttpApiEndpoint<Name, Method, _Path, _P, _H, _S, _E, _R>
  ) => HttpApiEndpoint<Name, Method, Schema.Schema.Type<Path>, _P, _H, _S, _E, _R | Schema.Schema.Context<Path>>
  <
    Name extends string,
    Method extends HttpMethod,
    _Path,
    _P,
    _H,
    _S,
    _E,
    _R,
    Path extends Schema.Schema.Any
  >(
    self: HttpApiEndpoint<Name, Method, _Path, _P, _H, _S, _E, _R>,
    schema: Path & HttpApiEndpoint.ValidatePath<Path>
  ): HttpApiEndpoint<Name, Method, Schema.Schema.Type<Path>, _P, _H, _S, _E, _R | Schema.Schema.Context<Path>>
} = dual(
  2,
  <
    Name extends string,
    Method extends HttpMethod,
    _Path,
    _P,
    _H,
    _S,
    _E,
    _R,
    Path extends Schema.Schema.Any
  >(
    self: HttpApiEndpoint<Name, Method, _Path, _P, _H, _S, _E, _R>,
    schema: Path & HttpApiEndpoint.ValidatePath<Path>
  ): HttpApiEndpoint<Name, Method, Schema.Schema.Type<Path>, _P, _H, _S, _E, _R | Schema.Schema.Context<Path>> =>
    makeProto({
      ...self as any,
      pathSchema: Option.some(schema)
    })
)

/**
 * Set the schema for the headers of the endpoint. The schema will be
 * used to validate the headers before the handler is called.
 *
 * @since 1.0.0
 * @category request
 */
export const setHeaders: {
  <Method extends HttpMethod, H extends Schema.Schema.Any>(
    schema: H & HttpApiEndpoint.ValidateHeaders<H>
  ): <
    Name extends string,
    _Path,
    _P,
    _H,
    _S,
    _E,
    _R
  >(
    self: HttpApiEndpoint<Name, Method, _Path, _P, _H, _S, _E, _R>
  ) => HttpApiEndpoint<Name, Method, _Path, _P, Schema.Schema.Type<H>, _S, _E, _R | Schema.Schema.Context<H>>
  <
    Name extends string,
    Method extends HttpMethod,
    _Path,
    _P,
    _H,
    _S,
    _E,
    _R,
    H extends Schema.Schema.Any
  >(
    self: HttpApiEndpoint<Name, Method, _Path, _P, _H, _S, _E, _R>,
    schema: H & HttpApiEndpoint.ValidateHeaders<H>
  ): HttpApiEndpoint<Name, Method, _Path, _P, Schema.Schema.Type<H>, _S, _E, _R | Schema.Schema.Context<H>>
} = dual(
  2,
  <
    Name extends string,
    Method extends HttpMethod,
    _Path,
    _P,
    _H,
    _S,
    _E,
    _R,
    H extends Schema.Schema.Any
  >(
    self: HttpApiEndpoint<Name, Method, _Path, _P, _H, _S, _E, _R>,
    schema: H & HttpApiEndpoint.ValidateHeaders<H>
  ): HttpApiEndpoint<Name, Method, _Path, _P, Schema.Schema.Type<H>, _S, _E, _R | Schema.Schema.Context<H>> =>
    makeProto({
      ...self as any,
      headersSchema: Option.some(schema)
    })
)

/**
 * Add a prefix to the path of the endpoint.
 *
 * @since 1.0.0
 * @category request
 */
export const prefix: {
  (prefix: HttpRouter.PathInput): <A extends HttpApiEndpoint.All>(self: A) => A
  <A extends HttpApiEndpoint.All>(self: A, prefix: HttpRouter.PathInput): A
} = dual(2, <A extends HttpApiEndpoint.All>(self: A, prefix: HttpRouter.PathInput): A =>
  makeProto({
    ...self as any,
    path: HttpRouter.prefixPath(self.path, prefix)
  }) as A)

/**
 * @since 1.0.0
 * @category reflection
 */
export const schemaSuccess = <A extends HttpApiEndpoint.All>(
  self: A
): Option.Option<Schema.Schema<HttpApiEndpoint.Success<A>, unknown, HttpApiEndpoint.Context<A>>> =>
  HttpApiSchema.isVoid(self.successSchema.ast) ? Option.none() : Option.some(self.successSchema as any)

/**
 * Merge the annotations of the endpoint with the provided context.
 *
 * @since 1.0.0
 * @category annotations
 */
export const annotateMerge: {
  <I>(context: Context.Context<I>): <A extends HttpApiEndpoint.All>(self: A) => A
  <A extends HttpApiEndpoint.All, I>(self: A, context: Context.Context<I>): A
} = dual(
  2,
  <A extends HttpApiEndpoint.All, I>(self: A, context: Context.Context<I>): A =>
    makeProto({
      ...self as any,
      annotations: Context.merge(self.annotations, context)
    }) as A
)

/**
 * Add an annotation to the endpoint.
 *
 * @since 1.0.0
 * @category annotations
 */
export const annotate: {
  <I, S>(tag: Context.Tag<I, S>, value: S): <A extends HttpApiEndpoint.All>(self: A) => A
  <A extends HttpApiEndpoint.All, I, S>(self: A, tag: Context.Tag<I, S>, value: S): A
} = dual(
  3,
  <A extends HttpApiEndpoint.All, I, S>(self: A, tag: Context.Tag<I, S>, value: S): A =>
    makeProto({
      ...self as any,
      annotations: Context.add(self.annotations, tag, value)
    }) as A
)
