/**
 * @since 1.0.0
 */
import * as Schema from "@effect/schema/Schema"
import * as Context from "effect/Context"
import type { Effect } from "effect/Effect"
import { dual } from "effect/Function"
import * as Option from "effect/Option"
import { type Pipeable, pipeArguments } from "effect/Pipeable"
import * as Predicate from "effect/Predicate"
import type * as Types from "effect/Types"
import * as ApiSchema from "./ApiSchema.js"
import type { HttpMethod } from "./HttpMethod.js"
import * as HttpRouter from "./HttpRouter.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("@effect/platform/ApiEndpoint")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category symbols
 */
export const Ignored: unique symbol = Symbol.for("@effect/platform/ApiEndpoint/Ignored")

/**
 * @since 1.0.0
 * @category symbols
 */
export type Ignored = typeof Ignored

/**
 * @since 1.0.0
 * @category guards
 */
export const isApiEndpoint = (u: unknown): u is ApiEndpoint<any, any, any> => Predicate.hasProperty(u, TypeId)

/**
 * @since 1.0.0
 * @category models
 */
export interface ApiEndpoint<
  out Name extends string,
  out Method extends HttpMethod,
  out Path extends Schema.Schema.Any = PathParams,
  out Payload extends Schema.Schema.All = typeof Schema.Never,
  out Success extends Schema.Schema.Any = Empty,
  out Error extends Schema.Schema.All = typeof Schema.Never
> extends Pipeable {
  readonly [TypeId]: TypeId
  readonly name: Name
  readonly path: HttpRouter.PathInput
  readonly method: Method
  readonly pathSchema: Option.Option<Path>
  readonly payloadSchema: Option.Option<Payload>
  readonly successSchema: Success
  readonly errorSchema: Error
  readonly annotations: Context.Context<never>
}

/**
 * @since 1.0.0
 * @category models
 */
export interface PathParams extends Schema.Record$<typeof Schema.String, typeof Schema.String> {}

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace ApiEndpoint {
  /**
   * @since 1.0.0
   * @category models
   */
  export type Any = ApiEndpoint<any, any, any, any, any, any>

  /**
   * @since 1.0.0
   * @category models
   */
  export type Success<Endpoint extends Any> = Endpoint extends
    ApiEndpoint<infer _Name, infer _Method, infer _Path, infer _Payload, infer _Success, infer _Error>
    ? Schema.Schema.Type<_Success>
    : never

  /**
   * @since 1.0.0
   * @category models
   */
  export type Error<Endpoint extends Any> = Endpoint extends
    ApiEndpoint<infer _Name, infer _Method, infer _Path, infer _Payload, infer _Success, infer _Error>
    ? Schema.Schema.Type<_Error>
    : never

  /**
   * @since 1.0.0
   * @category models
   */
  export type PathParsed<Endpoint extends Any> = Endpoint extends
    ApiEndpoint<infer _Name, infer _Method, infer _Path, infer _Payload, infer _Success, infer _Error>
    ? Schema.Schema.Type<_Path>
    : never

  /**
   * @since 1.0.0
   * @category models
   */
  export type Payload<Endpoint extends Any> = Endpoint extends
    ApiEndpoint<infer _Name, infer _Method, infer _Path, infer _Payload, infer _Success, infer _Error>
    ? Schema.Schema.Type<_Payload>
    : never

  /**
   * @since 1.0.0
   * @category models
   */
  export type Request<Endpoint extends Any> = {
    readonly path: PathParsed<Endpoint>
  } & ([Payload<Endpoint>] extends [infer P] ? [P] extends [never] ? {} : { readonly payload: P } : {})

  /**
   * @since 1.0.0
   * @category models
   */
  export type ClientRequest<Endpoint extends Any> = (
    & ([Endpoint["pathSchema"]] extends [Option.Option<PathParams>] ? {} : { readonly path: PathParsed<Endpoint> })
    & ([Payload<Endpoint>] extends [infer P] ? [P] extends [never] ? {} : { readonly payload: P } : {})
  ) extends infer Req ? keyof Req extends never ? void : Req : void

  /**
   * @since 1.0.0
   * @category models
   */
  export type Context<Endpoint> = Endpoint extends
    ApiEndpoint<infer _Name, infer _Method, infer _Path, infer _Payload, infer _Success, infer _Error> ?
      | Schema.Schema.Context<_Path>
      | Schema.Schema.Context<_Payload>
      | Schema.Schema.Context<_Success>
      | Schema.Schema.Context<_Error>
    : never

  /**
   * @since 1.0.0
   * @category models
   */
  export type Handler<Endpoint extends Any, E, R> = (
    request: Types.Simplify<Request<Endpoint>>
  ) => Effect<Success<Endpoint>, E, R>

  /**
   * @since 1.0.0
   * @category models
   */
  export type WithName<Endpoints extends Any, Name extends string> = Endpoints extends infer Endpoint
    ? Endpoint extends { readonly name: Name } ? Endpoint : never
    : never

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
  Path extends Schema.Schema.Any,
  Payload extends Schema.Schema.All,
  Success extends Schema.Schema.Any,
  Error extends Schema.Schema.All
>(options: {
  readonly name: Name
  readonly path: HttpRouter.PathInput
  readonly method: Method
  readonly pathSchema: Option.Option<Path>
  readonly payloadSchema: Option.Option<Payload>
  readonly successSchema: Success
  readonly errorSchema: Error
  readonly annotations: Context.Context<never>
}): ApiEndpoint<Name, Method, Path, Payload, Success, Error> => Object.assign(Object.create(Proto), options)

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = <Method extends HttpMethod>(method: Method) =>
<const Name extends string>(
  name: Name,
  path: HttpRouter.PathInput
): ApiEndpoint<Name, Method> =>
  makeProto({
    name,
    path,
    method,
    pathSchema: Option.none(),
    payloadSchema: Option.none(),
    successSchema: Empty,
    errorSchema: Schema.Never,
    annotations: Context.empty()
  })

/**
 * @since 1.0.0
 * @category constructors
 */
export const get: <const Name extends string>(
  name: Name,
  path: HttpRouter.PathInput
) => ApiEndpoint<Name, "GET"> = make("GET")

/**
 * @since 1.0.0
 * @category constructors
 */
export const post: <const Name extends string>(
  name: Name,
  path: HttpRouter.PathInput
) => ApiEndpoint<Name, "POST"> = make(
  "POST"
)

/**
 * @since 1.0.0
 * @category constructors
 */
export const put: <const Name extends string>(
  name: Name,
  path: HttpRouter.PathInput
) => ApiEndpoint<Name, "PUT"> = make(
  "PUT"
)

/**
 * @since 1.0.0
 * @category constructors
 */
export const patch: <const Name extends string>(
  name: Name,
  path: HttpRouter.PathInput
) => ApiEndpoint<Name, "PATCH"> = make(
  "PATCH"
)

/**
 * @since 1.0.0
 * @category constructors
 */
export const del: <const Name extends string>(
  name: Name,
  path: HttpRouter.PathInput
) => ApiEndpoint<Name, "DELETE"> = make(
  "DELETE"
)

type Void$ = typeof Schema.Void

/**
 * @since 1.0.0
 * @category schemas
 */
export interface Created extends Void$ {
  readonly _: unique symbol
}

/**
 * @since 1.0.0
 * @category schemas
 */
export const Created: Created = Schema.Void.annotations(ApiSchema.annotations({
  status: 201
})) as any

/**
 * @since 1.0.0
 * @category schemas
 */
export interface Accepted extends Void$ {
  readonly _: unique symbol
}

/**
 * @since 1.0.0
 * @category schemas
 */
export const Accepted: Accepted = Schema.Void.annotations(ApiSchema.annotations({
  status: 202
})) as any

/**
 * @since 1.0.0
 * @category schemas
 */
export interface Empty extends Void$ {
  readonly _: unique symbol
}

/**
 * @since 1.0.0
 * @category schemas
 */
export const Empty: Empty = Schema.Void.annotations(ApiSchema.annotations({
  status: 204
})) as any

/**
 * @since 1.0.0
 * @category result
 */
export const success: {
  <S extends Schema.Schema.Any>(
    schema: S,
    annotations?: {
      readonly status?: number | undefined
    }
  ): <
    Name extends string,
    Method extends HttpMethod,
    _Path extends Schema.Schema.Any,
    _P extends Schema.Schema.All,
    _S extends Schema.Schema.Any,
    _E extends Schema.Schema.All
  >(
    self: ApiEndpoint<Name, Method, _Path, _P, _S, _E>
  ) => ApiEndpoint<Name, Method, _Path, _P, S, _E>
  <
    Name extends string,
    Method extends HttpMethod,
    _Path extends Schema.Schema.Any,
    _P extends Schema.Schema.All,
    _S extends Schema.Schema.Any,
    _E extends Schema.Schema.All,
    S extends Schema.Schema.Any
  >(
    self: ApiEndpoint<Name, Method, _Path, _P, _S, _E>,
    schema: S,
    annotations?: {
      readonly status?: number | undefined
    }
  ): ApiEndpoint<Name, Method, _Path, _P, S, _E>
} = dual(
  (args) => isApiEndpoint(args[0]),
  <
    Name extends string,
    Method extends HttpMethod,
    _Path extends Schema.Schema.Any,
    _P extends Schema.Schema.All,
    _S extends Schema.Schema.Any,
    _E extends Schema.Schema.All,
    S extends Schema.Schema.Any
  >(
    self: ApiEndpoint<Name, Method, _Path, _P, _S, _E>,
    schema: S,
    annotations?: {
      readonly status?: number | undefined
    }
  ): ApiEndpoint<Name, Method, _Path, _P, S, _E> =>
    makeProto({
      ...self,
      successSchema: schema.annotations(ApiSchema.annotations({
        status: annotations?.status ?? ApiSchema.getStatusSuccess(schema)
      })) as S
    })
)

/**
 * @since 1.0.0
 * @category result
 */
export const error: {
  <E extends Schema.Schema.All>(
    schema: E,
    annotations?: {
      readonly status?: number | undefined
    }
  ): <
    Name extends string,
    Method extends HttpMethod,
    _Path extends Schema.Schema.Any,
    _P extends Schema.Schema.All,
    _S extends Schema.Schema.Any,
    _E extends Schema.Schema.All
  >(
    self: ApiEndpoint<Name, Method, _Path, _P, _S, _E>
  ) => ApiEndpoint<Name, Method, _Path, _P, _S, E>
  <
    Name extends string,
    Method extends HttpMethod,
    _Path extends Schema.Schema.Any,
    _P extends Schema.Schema.All,
    _S extends Schema.Schema.Any,
    _E extends Schema.Schema.All,
    E extends Schema.Schema.All
  >(
    self: ApiEndpoint<Name, Method, _Path, _P, _S, _E>,
    schema: E,
    annotations?: {
      readonly status?: number | undefined
    }
  ): ApiEndpoint<Name, Method, _Path, _P, _S, E>
} = dual(
  (args) => isApiEndpoint(args[0]),
  <
    Name extends string,
    Method extends HttpMethod,
    _Path extends Schema.Schema.Any,
    _P extends Schema.Schema.All,
    _S extends Schema.Schema.Any,
    _E extends Schema.Schema.All,
    E extends Schema.Schema.All
  >(
    self: ApiEndpoint<Name, Method, _Path, _P, _S, _E>,
    schema: E,
    annotations?: {
      readonly status?: number | undefined
    }
  ): ApiEndpoint<Name, Method, _Path, _P, _S, E> =>
    makeProto({
      ...self,
      errorSchema: schema.pipe(
        Schema.annotations(ApiSchema.annotations({
          status: annotations?.status ?? ApiSchema.getStatusError(schema)
        }))
      ) as E
    })
)

/**
 * @since 1.0.0
 * @category request
 */
export const payload: {
  <Method extends HttpMethod, P extends Schema.Schema.All>(
    schema: P & ApiEndpoint.ValidatePayload<Method, P>
  ): <
    Name extends string,
    _Path extends Schema.Schema.Any,
    _P extends Schema.Schema.All,
    _S extends Schema.Schema.Any,
    _E extends Schema.Schema.All
  >(
    self: ApiEndpoint<Name, Method, _Path, _P, _S, _E>
  ) => ApiEndpoint<Name, Method, _Path, P, _S, _E>
  <
    Name extends string,
    Method extends HttpMethod,
    _Path extends Schema.Schema.Any,
    _P extends Schema.Schema.All,
    _S extends Schema.Schema.Any,
    _E extends Schema.Schema.All,
    P extends Schema.Schema.All
  >(
    self: ApiEndpoint<Name, Method, _Path, _P, _S, _E>,
    schema: P & ApiEndpoint.ValidatePayload<Method, P>
  ): ApiEndpoint<Name, Method, _Path, P, _S, _E>
} = dual(
  2,
  <
    Name extends string,
    Method extends HttpMethod,
    _Path extends Schema.Schema.Any,
    _P extends Schema.Schema.All,
    _S extends Schema.Schema.Any,
    _E extends Schema.Schema.All,
    P extends Schema.Schema.All
  >(
    self: ApiEndpoint<Name, Method, _Path, _P, _S, _E>,
    schema: P & ApiEndpoint.ValidatePayload<Method, P>
  ): ApiEndpoint<Name, Method, _Path, P, _S, _E> =>
    makeProto({
      ...self,
      payloadSchema: Option.some(schema)
    })
)

/**
 * @since 1.0.0
 * @category request
 */
export const path: {
  <Path extends Schema.Schema.Any>(
    schema: Path & ApiEndpoint.ValidatePath<Path>
  ): <
    Name extends string,
    Method extends HttpMethod,
    _Path extends Schema.Schema.Any,
    _P extends Schema.Schema.All,
    _S extends Schema.Schema.Any,
    _E extends Schema.Schema.All
  >(
    self: ApiEndpoint<Name, Method, _Path, _P, _S, _E>
  ) => ApiEndpoint<Name, Method, Path, _P, _S, _E>
  <
    Name extends string,
    Method extends HttpMethod,
    _Path extends Schema.Schema.Any,
    _P extends Schema.Schema.All,
    _S extends Schema.Schema.Any,
    _E extends Schema.Schema.All,
    Path extends Schema.Schema.Any
  >(
    self: ApiEndpoint<Name, Method, _Path, _P, _S, _E>,
    schema: Path & ApiEndpoint.ValidatePath<Path>
  ): ApiEndpoint<Name, Method, Path, _P, _S, _E>
} = dual(
  2,
  <
    Name extends string,
    Method extends HttpMethod,
    _Path extends Schema.Schema.Any,
    _P extends Schema.Schema.All,
    _S extends Schema.Schema.Any,
    _E extends Schema.Schema.All,
    Path extends Schema.Schema.Any
  >(
    self: ApiEndpoint<Name, Method, _Path, _P, _S, _E>,
    schema: Path & ApiEndpoint.ValidatePath<Path>
  ): ApiEndpoint<Name, Method, Path, _P, _S, _E> =>
    makeProto({
      ...self,
      pathSchema: Option.some(schema)
    })
)

/**
 * @since 1.0.0
 * @category request
 */
export const prefix: {
  (prefix: HttpRouter.PathInput): <A extends ApiEndpoint.Any>(self: A) => A
  <A extends ApiEndpoint.Any>(self: A, prefix: HttpRouter.PathInput): A
} = dual(2, <A extends ApiEndpoint.Any>(self: A, prefix: HttpRouter.PathInput): A =>
  makeProto({
    ...self,
    path: HttpRouter.prefixPath(self.path, prefix)
  }) as A)

/**
 * @since 1.0.0
 * @category reflection
 */
export const successIsVoid = <A extends ApiEndpoint.Any>(self: A): boolean => {
  const ast = Schema.encodedSchema(self.successSchema).ast
  return ast._tag === "VoidKeyword"
}

/**
 * @since 1.0.0
 * @category reflection
 */
export const schemaSuccess = <A extends ApiEndpoint.Any>(self: A): Option.Option<A["successSchema"]> =>
  successIsVoid(self) ? Option.none() : Option.some(self.successSchema)

/**
 * @since 1.0.0
 * @category annotations
 */
export const annotateMerge: {
  <I>(context: Context.Context<I>): <A extends ApiEndpoint.Any>(self: A) => A
  <A extends ApiEndpoint.Any, I>(self: A, context: Context.Context<I>): A
} = dual(
  2,
  <A extends ApiEndpoint.Any, I>(self: A, context: Context.Context<I>): A =>
    makeProto({
      ...self,
      annotations: Context.merge(self.annotations, context)
    }) as A
)

/**
 * @since 1.0.0
 * @category annotations
 */
export const annotate: {
  <I, S>(tag: Context.Tag<I, S>, value: S): <A extends ApiEndpoint.Any>(self: A) => A
  <A extends ApiEndpoint.Any, I, S>(self: A, tag: Context.Tag<I, S>, value: S): A
} = dual(
  3,
  <A extends ApiEndpoint.Any, I, S>(self: A, tag: Context.Tag<I, S>, value: S): A =>
    makeProto({
      ...self,
      annotations: Context.add(self.annotations, tag, value)
    }) as A
)