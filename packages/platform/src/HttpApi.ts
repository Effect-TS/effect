/**
 * @since 1.0.0
 */
import * as AST from "@effect/schema/AST"
import type * as Schema from "@effect/schema/Schema"
import * as Chunk from "effect/Chunk"
import * as Context from "effect/Context"
import { dual } from "effect/Function"
import * as Option from "effect/Option"
import type { Pipeable } from "effect/Pipeable"
import { pipeArguments } from "effect/Pipeable"
import * as Predicate from "effect/Predicate"
import * as HttpApiEndpoint from "./HttpApiEndpoint.js"
import { HttpApiDecodeError } from "./HttpApiError.js"
import * as HttpApiGroup from "./HttpApiGroup.js"
import * as HttpApiSchema from "./HttpApiSchema.js"
import type { HttpMethod } from "./HttpMethod.js"
import type * as HttpRouter from "./HttpRouter.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("@effect/platform/HttpApi")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category guards
 */
export const isHttpApi = (u: unknown): u is HttpApi<any, any> => Predicate.hasProperty(u, TypeId)

/**
 * An `HttpApi` represents a collection of `HttpApiGroup`s. You can use an `HttpApi` to
 * represent your entire domain.
 *
 * @since 1.0.0
 * @category models
 */
export interface HttpApi<
  out Groups extends HttpApiGroup.HttpApiGroup.Any = never,
  in out Error = never,
  out ErrorR = never
> extends Pipeable {
  new(_: never): {}
  readonly [TypeId]: TypeId
  readonly groups: Chunk.Chunk<Groups>
  readonly errorSchema: Schema.Schema<Error, unknown, ErrorR>
  readonly annotations: Context.Context<never>
}

/**
 * @since 1.0.0
 * @category tags
 */
export const HttpApi: Context.Tag<HttpApi.Service, HttpApi.Any> = Context.GenericTag<HttpApi.Service, HttpApi.Any>(
  "@effect/platform/HttpApi"
)

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace HttpApi {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Service {
    readonly _: unique symbol
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export interface Any extends Pipeable {
    new(_: never): {}
    readonly [TypeId]: TypeId
    readonly groups: Chunk.Chunk<HttpApiGroup.HttpApiGroup.Any>
    readonly errorSchema: Schema.Schema.All
    readonly annotations: Context.Context<never>
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export type Context<A> = A extends HttpApi<infer _Groups, infer _ApiError, infer _ApiErrorR>
    ? _ApiErrorR | HttpApiGroup.HttpApiGroup.Context<_Groups>
    : never
}

const Proto = {
  [TypeId]: TypeId,
  pipe() {
    return pipeArguments(this, arguments)
  }
}

const makeProto = <Groups extends HttpApiGroup.HttpApiGroup.Any, Error, ErrorR>(options: {
  readonly groups: Chunk.Chunk<Groups>
  readonly errorSchema: Schema.Schema<Error, unknown, ErrorR>
  readonly annotations: Context.Context<never>
}): HttpApi<Groups, Error, ErrorR> => {
  function HttpApi() {}
  Object.setPrototypeOf(HttpApi, Proto)
  return Object.assign(HttpApi, options) as any
}

/**
 * An empty `HttpApi`. You can use this to start building your `HttpApi`.
 *
 * You can add groups to this `HttpApi` using the `addGroup` function.
 *
 * @since 1.0.0
 * @category constructors
 */
export const empty: HttpApi = makeProto({
  groups: Chunk.empty(),
  errorSchema: HttpApiDecodeError as any,
  annotations: Context.empty()
})

/**
 * Add a `HttpApiGroup` to an `HttpApi`.
 *
 * @since 1.0.0
 * @category constructors
 */
export const addGroup: {
  <Group extends HttpApiGroup.HttpApiGroup.Any>(
    group: Group
  ): <Groups extends HttpApiGroup.HttpApiGroup.Any, Error, ErrorR>(
    self: HttpApi<Groups, Error, ErrorR>
  ) => HttpApi<Groups | Group, Error, ErrorR>
  <Group extends HttpApiGroup.HttpApiGroup.Any>(
    path: HttpRouter.PathInput,
    group: Group
  ): <Groups extends HttpApiGroup.HttpApiGroup.Any, Error, ErrorR>(
    self: HttpApi<Groups, Error, ErrorR>
  ) => HttpApi<Groups | Group, Error, ErrorR>
  <Groups extends HttpApiGroup.HttpApiGroup.Any, Error, ErrorR, Group extends HttpApiGroup.HttpApiGroup.Any>(
    self: HttpApi<Groups, Error, ErrorR>,
    group: Group
  ): HttpApi<Groups | Group, Error, ErrorR>
  <Groups extends HttpApiGroup.HttpApiGroup.Any, Error, ErrorR, Group extends HttpApiGroup.HttpApiGroup.Any>(
    self: HttpApi<Groups, Error, ErrorR>,
    path: HttpRouter.PathInput,
    group: Group
  ): HttpApi<Groups | Group, Error, ErrorR>
} = dual(
  (args) => isHttpApi(args[0]),
  (
    self: HttpApi.Any,
    ...args: [group: HttpApiGroup.HttpApiGroup.Any] | [path: HttpRouter.PathInput, group: HttpApiGroup.HttpApiGroup.Any]
  ): HttpApi.Any => {
    const group = args.length === 1 ? args[0] : HttpApiGroup.prefix(args[1] as any, args[0])
    return makeProto({
      errorSchema: self.errorSchema as any,
      annotations: self.annotations,
      groups: Chunk.append(self.groups, group)
    })
  }
)
/**
 * Add an error schema to an `HttpApi`, which is shared by all endpoints in the
 * `HttpApi`.
 *
 * Useful for adding error types from middleware or other shared error types.
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
  ): <Groups extends HttpApiGroup.HttpApiGroup.Any, Error, ErrorR>(
    self: HttpApi<Groups, Error, ErrorR>
  ) => HttpApi<Groups, Error | A, ErrorR | R>
  <Groups extends HttpApiGroup.HttpApiGroup.Any, Error, ErrorR, A, I, R>(
    self: HttpApi<Groups, Error, ErrorR>,
    schema: Schema.Schema<A, I, R>,
    annotations?: {
      readonly status?: number | undefined
    }
  ): HttpApi<Groups, Error | A, ErrorR | R>
} = dual(
  (args) => isHttpApi(args[0]),
  <Groups extends HttpApiGroup.HttpApiGroup.Any, Error, ErrorR, A, I, R>(
    self: HttpApi<Groups, Error, ErrorR>,
    schema: Schema.Schema<A, I, R>,
    annotations?: {
      readonly status?: number | undefined
    }
  ): HttpApi<Groups, Error | A, ErrorR | R> =>
    makeProto({
      groups: self.groups,
      annotations: self.annotations,
      errorSchema: HttpApiSchema.UnionUnify(
        self.errorSchema,
        schema.annotations(HttpApiSchema.annotations({
          status: annotations?.status ?? HttpApiSchema.getStatusError(schema)
        }))
      )
    })
)

/**
 * @since 1.0.0
 * @category annotations
 */
export const annotateMerge: {
  <I>(context: Context.Context<I>): <A extends HttpApi.Any>(self: A) => A
  <A extends HttpApi.Any, I>(self: A, context: Context.Context<I>): A
} = dual(
  2,
  <A extends HttpApi.Any, I>(self: A, context: Context.Context<I>): A =>
    makeProto({
      groups: self.groups,
      errorSchema: self.errorSchema as any,
      annotations: Context.merge(self.annotations, context)
    }) as A
)

/**
 * @since 1.0.0
 * @category annotations
 */
export const annotate: {
  <I, S>(tag: Context.Tag<I, S>, value: S): <A extends HttpApi.Any>(self: A) => A
  <A extends HttpApi.Any, I, S>(self: A, tag: Context.Tag<I, S>, value: S): A
} = dual(
  3,
  <A extends HttpApi.Any, I, S>(self: A, tag: Context.Tag<I, S>, value: S): A =>
    makeProto({
      groups: self.groups,
      errorSchema: self.errorSchema as any,
      annotations: Context.add(self.annotations, tag, value)
    }) as A
)

/**
 * Extract metadata from an `HttpApi`, which can be used to generate documentation
 * or other tooling.
 *
 * See the `OpenApi` & `HttpApiClient` modules for examples of how to use this function.
 *
 * @since 1.0.0
 * @category reflection
 */
export const reflect = <Groups extends HttpApiGroup.HttpApiGroup.Any, Error, ErrorR>(
  self: HttpApi<Groups, Error, ErrorR>,
  options: {
    readonly onGroup: (options: {
      readonly group: HttpApiGroup.HttpApiGroup<string, any>
      readonly mergedAnnotations: Context.Context<never>
    }) => void
    readonly onEndpoint: (options: {
      readonly group: HttpApiGroup.HttpApiGroup<string, any>
      readonly endpoint: HttpApiEndpoint.HttpApiEndpoint<string, HttpMethod>
      readonly mergedAnnotations: Context.Context<never>
      readonly successAST: Option.Option<AST.AST>
      readonly successStatus: number
      readonly successEncoding: HttpApiSchema.Encoding
      readonly errors: ReadonlyMap<number, Option.Option<AST.AST>>
    }) => void
  }
) => {
  const apiErrors = extractErrors(self.errorSchema.ast, new Map())

  const groups = self.groups as Iterable<HttpApiGroup.HttpApiGroup<string, any>>
  for (const group of groups) {
    const groupErrors = extractErrors(group.errorSchema.ast, apiErrors)
    const groupAnnotations = Context.merge(self.annotations, group.annotations)
    options.onGroup({
      group,
      mergedAnnotations: groupAnnotations
    })
    const endpoints = group.endpoints as Iterable<HttpApiEndpoint.HttpApiEndpoint<string, HttpMethod>>
    for (const endpoint of endpoints) {
      options.onEndpoint({
        group,
        endpoint,
        mergedAnnotations: Context.merge(groupAnnotations, endpoint.annotations),
        successAST: HttpApiEndpoint.schemaSuccess(endpoint).pipe(
          Option.map((schema) => schema.ast)
        ),
        successStatus: HttpApiSchema.getStatusSuccess(endpoint.successSchema),
        successEncoding: HttpApiSchema.getEncoding(endpoint.successSchema.ast),
        errors: extractErrors(endpoint.errorSchema.ast, groupErrors)
      })
    }
  }
}

// -------------------------------------------------------------------------------------

const extractErrors = (
  ast: AST.AST,
  inherited: ReadonlyMap<number, Option.Option<AST.AST>>
): ReadonlyMap<number, Option.Option<AST.AST>> => {
  const topStatus = HttpApiSchema.getStatusErrorAST(ast)
  const errors = new Map(inherited)
  function process(ast: AST.AST) {
    if (ast._tag === "NeverKeyword") {
      return
    }
    const status = HttpApiSchema.getStatus(ast, topStatus)
    const emptyDecodeable = HttpApiSchema.getEmptyDecodeable(ast)
    const current = errors.get(status) ?? Option.none()
    errors.set(
      status,
      current.pipe(
        Option.map((current) =>
          AST.Union.make(
            current._tag === "Union" ? [...current.types, ast] : [current, ast]
          )
        ),
        Option.orElse(() =>
          !emptyDecodeable && AST.encodedAST(ast)._tag === "VoidKeyword" ? Option.none() : Option.some(ast)
        )
      )
    )
  }
  if (ast._tag === "Union") {
    for (const type of ast.types) {
      process(type)
    }
  } else {
    process(ast)
  }
  return errors
}
