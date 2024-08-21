/**
 * @since 1.0.0
 */
import * as AST from "@effect/schema/AST"
import * as Schema from "@effect/schema/Schema"
import * as Chunk from "effect/Chunk"
import { dual } from "effect/Function"
import * as Option from "effect/Option"
import { type Pipeable, pipeArguments } from "effect/Pipeable"
import * as ApiEndpoint from "./ApiEndpoint.js"
import type { PathInput } from "./HttpRouter.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("@effect/platform/ApiGroup")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category models
 */
export interface ApiGroup<
  out Name extends string,
  out Endpoints extends ApiEndpoint.ApiEndpoint.Any = never,
  in out Error = never,
  out ErrorR = never
> extends Pipeable {
  readonly [TypeId]: TypeId
  readonly name: Name
  readonly endpoints: Chunk.Chunk<Endpoints>
  readonly error: Schema.Schema<Error, unknown, ErrorR>
}

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace ApiGroup {
  /**
   * @since 1.0.0
   * @category models
   */
  export type Any = ApiGroup<any, any, any, any> | ApiGroup<any, any, any, never> | ApiGroup<any, any, never, never>

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
  export type ToService<Group> = Group extends ApiGroup<infer Name, infer _Endpoints, infer _Error, infer _ErrorR>
    ? Service<Name>
    : never

  /**
   * @since 1.0.0
   * @category models
   */
  export type WithName<Group extends Any, Name extends string> = Extract<Group, { readonly name: Name }>

  /**
   * @since 1.0.0
   * @category models
   */
  export type Endpoints<Group> = Group extends ApiGroup<infer _Name, infer _Endpoints, infer _Error, infer _ErrorR>
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
  export type Error<Group> = Group extends ApiGroup<infer _Name, infer _Endpoints, infer _Error, infer _ErrorR> ? _Error
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
  export type Context<Group> = Group extends ApiGroup<infer _Name, infer _Endpoints, infer _Error, infer _ErrorR>
    ? _ErrorR | ApiEndpoint.ApiEndpoint.Context<_Endpoints>
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

const makeProto = <Name extends string, Endpoints extends ApiEndpoint.ApiEndpoint.Any, Error, ErrorR>(options: {
  readonly name: Name
  readonly endpoints: Chunk.Chunk<Endpoints>
  readonly error: Schema.Schema<Error, unknown, ErrorR>
}): ApiGroup<Name, Endpoints, Error, ErrorR> => {
  const self = Object.create(Proto)
  self.name = options.name
  self.endpoints = options.endpoints
  self.error = options.error
  return self
}

/**
 * @since 1.0.0
 * @category constructors
 */
export const make = <Name extends string>(name: Name): ApiGroup<Name> =>
  makeProto({ name, endpoints: Chunk.empty(), error: Schema.Never as any })

/**
 * @since 1.0.0
 * @category endpoints
 */
export const add: {
  <A extends ApiEndpoint.ApiEndpoint.Any>(
    endpoint: A
  ): <Name extends string, Endpoints extends ApiEndpoint.ApiEndpoint.Any, Error, ErrorR>(
    self: ApiGroup<Name, Endpoints, Error, ErrorR>
  ) => ApiGroup<Name, Endpoints | A, Error, ErrorR>
  <
    Name extends string,
    Endpoints extends ApiEndpoint.ApiEndpoint.Any,
    Error,
    ErrorR,
    A extends ApiEndpoint.ApiEndpoint.Any
  >(
    self: ApiGroup<Name, Endpoints, Error, ErrorR>,
    endpoint: A
  ): ApiGroup<Name, Endpoints | A, Error, ErrorR>
} = dual(2, <
  Name extends string,
  Endpoints extends ApiEndpoint.ApiEndpoint.Any,
  Error,
  ErrorR,
  A extends ApiEndpoint.ApiEndpoint.Any
>(
  self: ApiGroup<Name, Endpoints, Error, ErrorR>,
  endpoint: A
): ApiGroup<Name, Endpoints | A, Error, ErrorR> =>
  makeProto({
    ...self,
    endpoints: Chunk.append(self.endpoints, endpoint)
  }))

/**
 * @since 1.0.0
 * @category errors
 */
export const addError: {
  <A, I, R>(
    schema: Schema.Schema<A, I, R>,
    annotations?: {
      readonly status?: number | undefined
    }
  ): <Name extends string, Endpoints extends ApiEndpoint.ApiEndpoint.Any, Error, ErrorR>(
    self: ApiGroup<Name, Endpoints, Error, ErrorR>
  ) => ApiGroup<Name, Endpoints, Error | A, ErrorR | R>
  <Name extends string, Endpoints extends ApiEndpoint.ApiEndpoint.Any, Error, ErrorR, A, I, R>(
    self: ApiGroup<Name, Endpoints, Error, ErrorR>,
    schema: Schema.Schema<A, I, R>,
    annotations?: {
      readonly status?: number | undefined
    }
  ): ApiGroup<Name, Endpoints, Error | A, ErrorR | R>
} = dual(2, <Name extends string, Endpoints extends ApiEndpoint.ApiEndpoint.Any, Error, ErrorR, A, I, R>(
  self: ApiGroup<Name, Endpoints, Error, ErrorR>,
  schema: Schema.Schema<A, I, R>,
  annotations?: {
    readonly status?: number | undefined
  }
): ApiGroup<Name, Endpoints, Error | A, ErrorR | R> =>
  makeProto({
    ...self,
    error: Schema.Union(
      self.error,
      schema.annotations({
        [ApiEndpoint.AnnotationStatus]: annotations?.status ??
          Option.getOrElse(AST.getAnnotation(schema.ast, ApiEndpoint.AnnotationStatus), () => 500)
      })
    )
  }))

/**
 * @since 1.0.0
 * @category endpoints
 */
export const prefix: {
  (
    prefix: PathInput
  ): <Name extends string, Endpoints extends ApiEndpoint.ApiEndpoint.Any, Error, ErrorR>(
    self: ApiGroup<Name, Endpoints, Error, ErrorR>
  ) => ApiGroup<Name, Endpoints, Error, ErrorR>
  <Name extends string, Endpoints extends ApiEndpoint.ApiEndpoint.Any, Error, ErrorR>(
    self: ApiGroup<Name, Endpoints, Error, ErrorR>,
    prefix: PathInput
  ): ApiGroup<Name, Endpoints, Error, ErrorR>
} = dual(2, <Name extends string, Endpoints extends ApiEndpoint.ApiEndpoint.Any, Error, ErrorR>(
  self: ApiGroup<Name, Endpoints, Error, ErrorR>,
  prefix: PathInput
): ApiGroup<Name, Endpoints, Error, ErrorR> =>
  makeProto({
    ...self,
    endpoints: Chunk.map(self.endpoints, ApiEndpoint.prefix(prefix))
  }))
