/**
 * @since 1.0.0
 */
import * as Schema from "@effect/schema/Schema"
import * as Chunk from "effect/Chunk"
import * as Context from "effect/Context"
import { dual } from "effect/Function"
import { type Pipeable, pipeArguments } from "effect/Pipeable"
import * as Predicate from "effect/Predicate"
import * as HttpApiEndpoint from "./HttpApiEndpoint.js"
import type { HttpApiDecodeError } from "./HttpApiError.js"
import * as HttpApiSchema from "./HttpApiSchema.js"
import type { PathInput } from "./HttpRouter.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("@effect/platform/HttpApiGroup")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category guards
 */
export const isHttpApiGroup = (u: unknown): u is HttpApiGroup.Any => Predicate.hasProperty(u, TypeId)

/**
 * An `HttpApiGroup` is a collection of `HttpApiEndpoint`s. You can use an `HttpApiGroup` to
 * represent a portion of your domain.
 *
 * The endpoints can be implemented later using the `HttpApiBuilder.group` api.
 *
 * @since 1.0.0
 * @category models
 */
export interface HttpApiGroup<
  out Name extends string,
  out Endpoints extends HttpApiEndpoint.HttpApiEndpoint.All = never,
  in out Error = HttpApiDecodeError,
  out ErrorR = never
> extends Pipeable {
  new(_: never): {}
  readonly [TypeId]: TypeId
  readonly identifier: Name
  readonly endpoints: Chunk.Chunk<Endpoints>
  readonly errorSchema: Schema.Schema<Error, unknown, ErrorR>
  readonly annotations: Context.Context<never>
}

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace HttpApiGroup {
  /**
   * @since 1.0.0
   * @category models
   */
  export type Any =
    | HttpApiGroup<any, any, any, any>
    | HttpApiGroup<any, any, any, never>
    | HttpApiGroup<any, any, never, never>

  /**
   * @since 1.0.0
   * @category models
   */
  export interface Service<Name extends string> {
    readonly _: unique symbol
    readonly name: Name
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export type ToService<Group> = Group extends HttpApiGroup<infer Name, infer _Endpoints, infer _Error, infer _ErrorR>
    ? Service<Name>
    : never

  /**
   * @since 1.0.0
   * @category models
   */
  export type WithName<Group, Name extends string> = Extract<Group, { readonly identifier: Name }>

  /**
   * @since 1.0.0
   * @category models
   */
  export type Endpoints<Group> = Group extends HttpApiGroup<infer _Name, infer _Endpoints, infer _Error, infer _ErrorR>
    ? _Endpoints
    : never

  /**
   * @since 1.0.0
   * @category models
   */
  export type EndpointsWithName<Group extends Any, Name extends string> = Endpoints<WithName<Group, Name>>

  /**
   * @since 1.0.0
   * @category models
   */
  export type Error<Group> = Group extends HttpApiGroup<infer _Name, infer _Endpoints, infer _Error, infer _ErrorR> ?
    _Error
    : never

  /**
   * @since 1.0.0
   * @category models
   */
  export type ErrorWithName<Group extends Any, Name extends string> = Error<WithName<Group, Name>>

  /**
   * @since 1.0.0
   * @category models
   */
  export type Context<Group> = Group extends HttpApiGroup<infer _Name, infer _Endpoints, infer _Error, infer _ErrorR>
    ? _ErrorR | HttpApiEndpoint.HttpApiEndpoint.Context<_Endpoints>
    : never

  /**
   * @since 1.0.0
   * @category models
   */
  export type ContextWithName<Group extends Any, Name extends string> = Context<WithName<Group, Name>>
}

const Proto = {
  [TypeId]: TypeId,
  pipe() {
    return pipeArguments(this, arguments)
  }
}

const makeProto = <Name extends string, Endpoints extends HttpApiEndpoint.HttpApiEndpoint.All, Error, ErrorR>(options: {
  readonly identifier: Name
  readonly endpoints: Chunk.Chunk<Endpoints>
  readonly errorSchema: Schema.Schema<Error, unknown, ErrorR>
  readonly annotations: Context.Context<never>
}): HttpApiGroup<Name, Endpoints, Error, ErrorR> => {
  function HttpApiGroup() {}
  Object.setPrototypeOf(HttpApiGroup, Proto)
  return Object.assign(HttpApiGroup, options) as any
}

/**
 * An `HttpApiGroup` is a collection of `HttpApiEndpoint`s. You can use an `HttpApiGroup` to
 * represent a portion of your domain.
 *
 * The endpoints can be implemented later using the `HttpApiBuilder.group` api.
 *
 * @since 1.0.0
 * @category constructors
 */
export const make = <Name extends string>(identifier: Name): HttpApiGroup<Name> =>
  makeProto({
    identifier,
    endpoints: Chunk.empty(),
    errorSchema: Schema.Never as any,
    annotations: Context.empty()
  })

/**
 * Add an `HttpApiEndpoint` to an `HttpApiGroup`.
 *
 * @since 1.0.0
 * @category endpoints
 */
export const add: {
  <A extends HttpApiEndpoint.HttpApiEndpoint.All>(
    endpoint: A
  ): <Name extends string, Endpoints extends HttpApiEndpoint.HttpApiEndpoint.All, Error, ErrorR>(
    self: HttpApiGroup<Name, Endpoints, Error, ErrorR>
  ) => HttpApiGroup<Name, Endpoints | A, Error, ErrorR>
  <
    Name extends string,
    Endpoints extends HttpApiEndpoint.HttpApiEndpoint.All,
    Error,
    ErrorR,
    A extends HttpApiEndpoint.HttpApiEndpoint.All
  >(
    self: HttpApiGroup<Name, Endpoints, Error, ErrorR>,
    endpoint: A
  ): HttpApiGroup<Name, Endpoints | A, Error, ErrorR>
} = dual(2, <
  Name extends string,
  Endpoints extends HttpApiEndpoint.HttpApiEndpoint.All,
  Error,
  ErrorR,
  A extends HttpApiEndpoint.HttpApiEndpoint.All
>(
  self: HttpApiGroup<Name, Endpoints, Error, ErrorR>,
  endpoint: A
): HttpApiGroup<Name, Endpoints | A, Error, ErrorR> =>
  makeProto({
    identifier: self.identifier,
    errorSchema: self.errorSchema,
    annotations: self.annotations,
    endpoints: Chunk.append(self.endpoints, endpoint)
  }))

/**
 * Add an error schema to an `HttpApiGroup`, which is shared by all endpoints in the
 * group.
 *
 * @since 1.0.0
 * @category errors
 */
export const addError: {
  <A, I, R>(
    schema: Schema.Schema<A, I, R>,
    annotations?: {
      readonly status?: number | undefined
    }
  ): <Name extends string, Endpoints extends HttpApiEndpoint.HttpApiEndpoint.All, Error, ErrorR>(
    self: HttpApiGroup<Name, Endpoints, Error, ErrorR>
  ) => HttpApiGroup<Name, Endpoints, Error | A, ErrorR | R>
  <Name extends string, Endpoints extends HttpApiEndpoint.HttpApiEndpoint.All, Error, ErrorR, A, I, R>(
    self: HttpApiGroup<Name, Endpoints, Error, ErrorR>,
    schema: Schema.Schema<A, I, R>,
    annotations?: {
      readonly status?: number | undefined
    }
  ): HttpApiGroup<Name, Endpoints, Error | A, ErrorR | R>
} = dual(
  (args) => isHttpApiGroup(args[0]),
  <Name extends string, Endpoints extends HttpApiEndpoint.HttpApiEndpoint.All, Error, ErrorR, A, I, R>(
    self: HttpApiGroup<Name, Endpoints, Error, ErrorR>,
    schema: Schema.Schema<A, I, R>,
    annotations?: {
      readonly status?: number | undefined
    }
  ): HttpApiGroup<Name, Endpoints, Error | A, ErrorR | R> =>
    makeProto({
      identifier: self.identifier,
      annotations: self.annotations,
      endpoints: self.endpoints,
      errorSchema: HttpApiSchema.UnionUnify(
        self.errorSchema,
        schema.annotations(HttpApiSchema.annotations({
          status: annotations?.status ?? HttpApiSchema.getStatusError(schema)
        }))
      )
    })
)

/**
 * Add a path prefix to all endpoints in an `HttpApiGroup`. Note that this will only
 * add the prefix to the endpoints before this api is called.
 *
 * @since 1.0.0
 * @category endpoints
 */
export const prefix: {
  (
    prefix: PathInput
  ): <Name extends string, Endpoints extends HttpApiEndpoint.HttpApiEndpoint.All, Error, ErrorR>(
    self: HttpApiGroup<Name, Endpoints, Error, ErrorR>
  ) => HttpApiGroup<Name, Endpoints, Error, ErrorR>
  <Name extends string, Endpoints extends HttpApiEndpoint.HttpApiEndpoint.All, Error, ErrorR>(
    self: HttpApiGroup<Name, Endpoints, Error, ErrorR>,
    prefix: PathInput
  ): HttpApiGroup<Name, Endpoints, Error, ErrorR>
} = dual(2, <Name extends string, Endpoints extends HttpApiEndpoint.HttpApiEndpoint.All, Error, ErrorR>(
  self: HttpApiGroup<Name, Endpoints, Error, ErrorR>,
  prefix: PathInput
): HttpApiGroup<Name, Endpoints, Error, ErrorR> =>
  makeProto({
    identifier: self.identifier,
    errorSchema: self.errorSchema,
    annotations: self.annotations,
    endpoints: Chunk.map(self.endpoints, HttpApiEndpoint.prefix(prefix))
  }))

/**
 * Merge the annotations of an `HttpApiGroup` with a new context.
 *
 * @since 1.0.0
 * @category annotations
 */
export const annotateMerge: {
  <I>(context: Context.Context<I>): <A extends HttpApiGroup.Any>(self: A) => A
  <A extends HttpApiGroup.Any, I>(self: A, context: Context.Context<I>): A
} = dual(
  2,
  <A extends HttpApiGroup.Any, I>(self: A, context: Context.Context<I>): A =>
    makeProto({
      ...self as any,
      annotations: Context.merge(self.annotations, context)
    }) as A
)

/**
 * Add an annotation to an `HttpApiGroup`.
 *
 * @since 1.0.0
 * @category annotations
 */
export const annotate: {
  <I, S>(tag: Context.Tag<I, S>, value: S): <A extends HttpApiGroup.Any>(self: A) => A
  <A extends HttpApiGroup.Any, I, S>(self: A, tag: Context.Tag<I, S>, value: S): A
} = dual(
  3,
  <A extends HttpApiGroup.Any, I, S>(self: A, tag: Context.Tag<I, S>, value: S): A =>
    makeProto({
      identifier: self.identifier,
      errorSchema: self.errorSchema as any,
      endpoints: self.endpoints,
      annotations: Context.add(self.annotations, tag, value)
    }) as A
)

/**
 * For each endpoint in an `HttpApiGroup`, update the annotations with a new
 * context.
 *
 * Note that this will only update the annotations before this api is called.
 *
 * @since 1.0.0
 * @category annotations
 */
export const annotateEndpointsMerge: {
  <I>(context: Context.Context<I>): <A extends HttpApiGroup.Any>(self: A) => A
  <A extends HttpApiGroup.Any, I>(self: A, context: Context.Context<I>): A
} = dual(
  2,
  <A extends HttpApiGroup.Any, I>(self: A, context: Context.Context<I>): A =>
    makeProto({
      identifier: self.identifier,
      errorSchema: self.errorSchema as any,
      annotations: self.annotations,
      endpoints: Chunk.map(self.endpoints, HttpApiEndpoint.annotateMerge(context))
    }) as A
)

/**
 * For each endpoint in an `HttpApiGroup`, add an annotation.
 *
 * Note that this will only add the annotation to the endpoints before this api
 * is called.
 *
 * @since 1.0.0
 * @category annotations
 */
export const annotateEndpoints: {
  <I, S>(tag: Context.Tag<I, S>, value: S): <A extends HttpApiGroup.Any>(self: A) => A
  <A extends HttpApiGroup.Any, I, S>(self: A, tag: Context.Tag<I, S>, value: S): A
} = dual(
  3,
  <A extends HttpApiGroup.Any, I, S>(self: A, tag: Context.Tag<I, S>, value: S): A =>
    makeProto({
      identifier: self.identifier,
      errorSchema: self.errorSchema as any,
      annotations: self.annotations,
      endpoints: Chunk.map(self.endpoints, HttpApiEndpoint.annotate(tag, value))
    }) as A
)
