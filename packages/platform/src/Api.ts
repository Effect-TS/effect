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
import * as ApiEndpoint from "./ApiEndpoint.js"
import { ApiDecodeError } from "./ApiError.js"
import * as ApiGroup from "./ApiGroup.js"
import * as ApiSchema from "./ApiSchema.js"
import type { HttpMethod } from "./HttpMethod.js"
import type * as HttpRouter from "./HttpRouter.js"

/**
 * @since 1.0.0
 * @category type ids
 */
export const TypeId: unique symbol = Symbol.for("@effect/platform/Api")

/**
 * @since 1.0.0
 * @category type ids
 */
export type TypeId = typeof TypeId

/**
 * @since 1.0.0
 * @category guards
 */
export const isApi = (u: unknown): u is Api<any, any> => Predicate.hasProperty(u, TypeId)

/**
 * An `Api` represents a collection of `ApiGroup`s. You can use an `Api` to
 * represent your entire domain.
 *
 * @since 1.0.0
 * @category models
 */
export interface Api<
  out Groups extends ApiGroup.ApiGroup.Any = never,
  in out Error = never,
  out ErrorR = never
> extends Pipeable {
  readonly [TypeId]: TypeId
  readonly groups: Chunk.Chunk<Groups>
  readonly errorSchema: Schema.Schema<Error, unknown, ErrorR>
  readonly annotations: Context.Context<never>
}

/**
 * @since 1.0.0
 * @category tags
 */
export const Api: Context.Tag<Api.Service, Api.Any> = Context.GenericTag<Api.Service, Api.Any>("@effect/platform/Api")

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace Api {
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
  export type Any = Api<any, any, any> | Api<any, any, never> | Api<any, never, never>

  /**
   * @since 1.0.0
   * @category models
   */
  export type Context<A> = A extends Api<infer _Groups, infer _ApiError, infer _ApiErrorR>
    ? _ApiErrorR | ApiGroup.ApiGroup.Context<_Groups>
    : never
}

const Proto = {
  [TypeId]: TypeId,
  pipe() {
    return pipeArguments(this, arguments)
  }
}

const makeProto = <Groups extends ApiGroup.ApiGroup.Any, Error, ErrorR>(options: {
  readonly groups: Chunk.Chunk<Groups>
  readonly errorSchema: Schema.Schema<Error, unknown, ErrorR>
  readonly annotations: Context.Context<never>
}): Api<Groups, Error, ErrorR> => Object.assign(Object.create(Proto), options)

/**
 * An empty `Api`. You can use this to start building your `Api`.
 *
 * You can add groups to this `Api` using the `addGroup` function.
 *
 * @since 1.0.0
 * @category constructors
 */
export const empty: Api = makeProto({
  groups: Chunk.empty(),
  errorSchema: ApiDecodeError as any,
  annotations: Context.empty()
})

/**
 * Add a `ApiGroup` to an `Api`.
 *
 * @since 1.0.0
 * @category constructors
 */
export const addGroup: {
  <Group extends ApiGroup.ApiGroup.Any>(
    group: Group
  ): <Groups extends ApiGroup.ApiGroup.Any, Error, ErrorR>(
    self: Api<Groups, Error, ErrorR>
  ) => Api<Groups | Group, Error, ErrorR>
  <Group extends ApiGroup.ApiGroup.Any>(
    path: HttpRouter.PathInput,
    group: Group
  ): <Groups extends ApiGroup.ApiGroup.Any, Error, ErrorR>(
    self: Api<Groups, Error, ErrorR>
  ) => Api<Groups | Group, Error, ErrorR>
  <Groups extends ApiGroup.ApiGroup.Any, Error, ErrorR, Group extends ApiGroup.ApiGroup.Any>(
    self: Api<Groups, Error, ErrorR>,
    group: Group
  ): Api<Groups | Group, Error, ErrorR>
  <Groups extends ApiGroup.ApiGroup.Any, Error, ErrorR, Group extends ApiGroup.ApiGroup.Any>(
    self: Api<Groups, Error, ErrorR>,
    path: HttpRouter.PathInput,
    group: Group
  ): Api<Groups | Group, Error, ErrorR>
} = dual(
  (args) => isApi(args[0]),
  (
    self: Api.Any,
    ...args: [group: ApiGroup.ApiGroup.Any] | [path: HttpRouter.PathInput, group: ApiGroup.ApiGroup.Any]
  ): Api.Any => {
    const group = args.length === 1 ? args[0] : ApiGroup.prefix(args[1] as any, args[0])
    return makeProto({
      ...self as any,
      groups: Chunk.append(self.groups, group)
    })
  }
)
/**
 * Add an error schema to an `Api`, which is shared by all endpoints in the
 * `Api`.
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
  ): <Groups extends ApiGroup.ApiGroup.Any, Error, ErrorR>(
    self: Api<Groups, Error, ErrorR>
  ) => Api<Groups, Error | A, ErrorR | R>
  <Groups extends ApiGroup.ApiGroup.Any, Error, ErrorR, A, I, R>(
    self: Api<Groups, Error, ErrorR>,
    schema: Schema.Schema<A, I, R>,
    annotations?: {
      readonly status?: number | undefined
    }
  ): Api<Groups, Error | A, ErrorR | R>
} = dual(
  (args) => isApi(args[0]),
  <Groups extends ApiGroup.ApiGroup.Any, Error, ErrorR, A, I, R>(
    self: Api<Groups, Error, ErrorR>,
    schema: Schema.Schema<A, I, R>,
    annotations?: {
      readonly status?: number | undefined
    }
  ): Api<Groups, Error | A, ErrorR | R> =>
    makeProto({
      ...self,
      errorSchema: ApiSchema.UnionUnify(
        self.errorSchema,
        schema.annotations(ApiSchema.annotations({
          status: annotations?.status ?? ApiSchema.getStatusError(schema)
        }))
      )
    })
)

/**
 * @since 1.0.0
 * @category annotations
 */
export const annotateMerge: {
  <I>(context: Context.Context<I>): <A extends Api.Any>(self: A) => A
  <A extends Api.Any, I>(self: A, context: Context.Context<I>): A
} = dual(
  2,
  <A extends Api.Any, I>(self: A, context: Context.Context<I>): A =>
    makeProto({
      ...self as any,
      annotations: Context.merge(self.annotations, context)
    }) as A
)

/**
 * @since 1.0.0
 * @category annotations
 */
export const annotate: {
  <I, S>(tag: Context.Tag<I, S>, value: S): <A extends Api.Any>(self: A) => A
  <A extends Api.Any, I, S>(self: A, tag: Context.Tag<I, S>, value: S): A
} = dual(
  3,
  <A extends Api.Any, I, S>(self: A, tag: Context.Tag<I, S>, value: S): A =>
    makeProto({
      ...self as any,
      annotations: Context.add(self.annotations, tag, value)
    }) as A
)

/**
 * Extract metadata from an `Api`, which can be used to generate documentation
 * or other tooling.
 *
 * See the `OpenApi` & `ApiClient` modules for examples of how to use this function.
 *
 * @since 1.0.0
 * @category reflection
 */
export const reflect = <Groups extends ApiGroup.ApiGroup.Any, Error, ErrorR>(
  self: Api<Groups, Error, ErrorR>,
  options: {
    readonly onGroup: (options: {
      readonly group: ApiGroup.ApiGroup<string, any>
      readonly mergedAnnotations: Context.Context<never>
    }) => void
    readonly onEndpoint: (options: {
      readonly group: ApiGroup.ApiGroup<string, any>
      readonly endpoint: ApiEndpoint.ApiEndpoint<string, HttpMethod>
      readonly mergedAnnotations: Context.Context<never>
      readonly success: readonly [ast: Option.Option<AST.AST>, status: number]
      readonly errors: ReadonlyMap<number, Option.Option<AST.AST>>
    }) => void
  }
) => {
  const apiErrors = extractErrors(self.errorSchema.ast, new Map())

  const groups = self.groups as Iterable<ApiGroup.ApiGroup<string, any>>
  for (const group of groups) {
    const groupErrors = extractErrors(group.errorSchema.ast, apiErrors)
    const groupAnnotations = Context.merge(self.annotations, group.annotations)
    options.onGroup({
      group,
      mergedAnnotations: groupAnnotations
    })
    const endpoints = group.endpoints as Iterable<ApiEndpoint.ApiEndpoint<string, HttpMethod>>

    for (const endpoint of endpoints) {
      const errors = extractErrors(endpoint.errorSchema.ast, groupErrors)
      const annotations = Context.merge(groupAnnotations, endpoint.annotations)
      const success = [
        ApiEndpoint.schemaSuccess(endpoint).pipe(
          Option.map((schema) => schema.ast)
        ),
        ApiSchema.getStatusSuccess(endpoint.successSchema)
      ] as const
      options.onEndpoint({
        group,
        endpoint,
        mergedAnnotations: annotations,
        success,
        errors
      })
    }
  }
}

// -------------------------------------------------------------------------------------

const extractErrors = (
  ast: AST.AST,
  inherited: ReadonlyMap<number, Option.Option<AST.AST>>
): ReadonlyMap<number, Option.Option<AST.AST>> => {
  const topStatus = ApiSchema.getStatusErrorAST(ast)
  const errors = new Map(inherited)
  function process(ast: AST.AST) {
    if (ast._tag === "NeverKeyword") {
      return
    }
    const status = ApiSchema.getStatus(ast, topStatus)
    const emptyDecodeable = ApiSchema.getEmptyDecodeable(ast)
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
