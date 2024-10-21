/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import * as HashMap from "effect/HashMap"
import * as HashSet from "effect/HashSet"
import * as Option from "effect/Option"
import { type Pipeable, pipeArguments } from "effect/Pipeable"
import * as Predicate from "effect/Predicate"
import type * as Schema from "effect/Schema"
import * as AST from "effect/SchemaAST"
import type * as HttpApiEndpoint from "./HttpApiEndpoint.js"
import { HttpApiDecodeError } from "./HttpApiError.js"
import type * as HttpApiGroup from "./HttpApiGroup.js"
import type * as HttpApiMiddleware from "./HttpApiMiddleware.js"
import * as HttpApiSchema from "./HttpApiSchema.js"
import type { HttpMethod } from "./HttpMethod.js"
import type { PathInput } from "./HttpRouter.js"

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
export const isHttpApi = (u: unknown): u is HttpApi.Any => Predicate.hasProperty(u, TypeId)

/**
 * An `HttpApi` is a collection of `HttpApiEndpoint`s. You can use an `HttpApi` to
 * represent a portion of your domain.
 *
 * The endpoints can be implemented later using the `HttpApiBuilder.make` api.
 *
 * @since 1.0.0
 * @category models
 */
export interface HttpApi<
  out Groups extends HttpApiGroup.HttpApiGroup.Any = never,
  in out E = never,
  out R = never
> extends Pipeable {
  new(_: never): {}
  readonly [TypeId]: TypeId
  readonly groups: HashMap.HashMap<string, Groups>
  readonly annotations: Context.Context<never>
  readonly errorSchema: Schema.Schema<E, unknown, R>
  readonly middlewares: HashSet.HashSet<HttpApiMiddleware.TagClassAny>

  /**
   * Add an endpoint to the `HttpApi`.
   */
  add<A extends HttpApiGroup.HttpApiGroup.Any>(group: A): HttpApi<Groups | A, E, R>
  /**
   * Add an global error to the `HttpApi`.
   */
  addError<A, I, RX>(
    schema: Schema.Schema<A, I, RX>,
    annotations?: {
      readonly status?: number | undefined
    }
  ): HttpApi<Groups, E | A, R | RX>
  /**
   * Prefix all endpoints in the `HttpApi`.
   */
  prefix(prefix: PathInput): HttpApi<Groups, E, R>
  /**
   * Add a middleware to a `HttpApi`. It will be applied to all endpoints in the
   * `HttpApi`.
   */
  middleware<I extends HttpApiMiddleware.HttpApiMiddleware.AnyId, S>(
    middleware: Context.Tag<I, S>
  ): HttpApi<
    Groups,
    E | HttpApiMiddleware.HttpApiMiddleware.Error<I>,
    R | I | HttpApiMiddleware.HttpApiMiddleware.ErrorContext<I>
  >
  /**
   * Annotate the `HttpApi`.
   */
  annotate<I, S>(tag: Context.Tag<I, S>, value: S): HttpApi<Groups, E, R>
  /**
   * Annotate the `HttpApi` with a Context.
   */
  annotateContext<I>(context: Context.Context<I>): HttpApi<Groups, E, R>
}

/**
 * @since 1.0.0
 * @category tags
 */
export class Api extends Context.Tag("@effect/platform/HttpApi/Api")<
  Api,
  {
    readonly api: HttpApi<HttpApiGroup.HttpApiGroup.AnyWithProps>
    readonly context: Context.Context<never>
  }
>() {}

/**
 * @since 1.0.0
 * @category models
 */
export declare namespace HttpApi {
  /**
   * @since 1.0.0
   * @category models
   */
  export interface Any {
    readonly [TypeId]: TypeId
  }

  /**
   * @since 1.0.0
   * @category models
   */
  export type AnyWithProps = HttpApi<HttpApiGroup.HttpApiGroup.AnyWithProps, any, any>
}

const Proto = {
  [TypeId]: TypeId,
  pipe() {
    return pipeArguments(this, arguments)
  },
  add(
    this: HttpApi.AnyWithProps,
    group: HttpApiGroup.HttpApiGroup.AnyWithProps
  ) {
    return makeProto({
      groups: HashMap.set(this.groups, group.identifier, group),
      errorSchema: this.errorSchema,
      annotations: this.annotations,
      middlewares: this.middlewares
    })
  },
  addError(
    this: HttpApi.AnyWithProps,
    schema: Schema.Schema.Any,
    annotations?: { readonly status?: number }
  ) {
    return makeProto({
      groups: this.groups,
      errorSchema: HttpApiSchema.UnionUnify(
        this.errorSchema,
        schema.annotations(HttpApiSchema.annotations({
          status: annotations?.status ?? HttpApiSchema.getStatusError(schema)
        }))
      ),
      annotations: this.annotations,
      middlewares: this.middlewares
    })
  },
  prefix(this: HttpApi.AnyWithProps, prefix: PathInput) {
    return makeProto({
      groups: HashMap.map(this.groups, (group) => group.prefix(prefix)),
      errorSchema: this.errorSchema,
      annotations: this.annotations,
      middlewares: this.middlewares
    })
  },
  middleware(this: HttpApi.AnyWithProps, tag: HttpApiMiddleware.TagClassAny) {
    return makeProto({
      groups: this.groups,
      errorSchema: HttpApiSchema.UnionUnify(
        this.errorSchema,
        tag.failure.annotations(HttpApiSchema.annotations({
          status: HttpApiSchema.getStatusError(tag.failure)
        }) as any)
      ),
      annotations: this.annotations,
      middlewares: HashSet.add(this.middlewares, tag)
    })
  },
  annotate(this: HttpApi.AnyWithProps, tag: Context.Tag<any, any>, value: any) {
    return makeProto({
      groups: this.groups,
      errorSchema: this.errorSchema,
      annotations: Context.add(this.annotations, tag, value),
      middlewares: this.middlewares
    })
  },
  annotateContext(this: HttpApi.AnyWithProps, context: Context.Context<any>) {
    return makeProto({
      groups: this.groups,
      errorSchema: this.errorSchema,
      annotations: Context.merge(this.annotations, context),
      middlewares: this.middlewares
    })
  }
}

const makeProto = <Groups extends HttpApiGroup.HttpApiGroup.Any, E, I, R>(
  options: {
    readonly groups: HashMap.HashMap<string, Groups>
    readonly errorSchema: Schema.Schema<E, I, R>
    readonly annotations: Context.Context<never>
    readonly middlewares: HashSet.HashSet<HttpApiMiddleware.TagClassAny>
  }
): HttpApi<Groups, E, R> => {
  function HttpApi() {}
  Object.setPrototypeOf(HttpApi, Proto)
  HttpApi.groups = options.groups
  HttpApi.errorSchema = options.errorSchema
  HttpApi.annotations = options.annotations
  HttpApi.middlewares = options.middlewares
  return HttpApi as any
}

/**
 * An `HttpApi` is a collection of `HttpApiEndpoint`s. You can use an `HttpApi` to
 * represent a portion of your domain.
 *
 * The endpoints can be implemented later using the `HttpApiBuilder.make` api.
 *
 * @since 1.0.0
 * @category constructors
 */
export const empty: HttpApi<never, HttpApiDecodeError> = makeProto({
  groups: HashMap.empty(),
  errorSchema: HttpApiDecodeError,
  annotations: Context.empty(),
  middlewares: HashSet.empty()
})

/**
 * Extract metadata from an `HttpApi`, which can be used to generate documentation
 * or other tooling.
 *
 * See the `OpenApi` & `HttpApiClient` modules for examples of how to use this function.
 *
 * @since 1.0.0
 * @category reflection
 */
export const reflect = <Groups extends HttpApiGroup.HttpApiGroup.Any, Error, R>(
  self: HttpApi<Groups, Error, R>,
  options: {
    readonly onGroup: (options: {
      readonly group: HttpApiGroup.HttpApiGroup.AnyWithProps
      readonly mergedAnnotations: Context.Context<never>
    }) => void
    readonly onEndpoint: (options: {
      readonly group: HttpApiGroup.HttpApiGroup.AnyWithProps
      readonly endpoint: HttpApiEndpoint.HttpApiEndpoint<string, HttpMethod>
      readonly mergedAnnotations: Context.Context<never>
      readonly middleware: HashSet.HashSet<HttpApiMiddleware.TagClassAny>
      readonly successes: ReadonlyMap<number, Option.Option<AST.AST>>
      readonly errors: ReadonlyMap<number, Option.Option<AST.AST>>
    }) => void
  }
) => {
  const apiErrors = extractMembers(self.errorSchema.ast, new Map(), HttpApiSchema.getStatusErrorAST)
  const groups = self.groups as Iterable<[string, HttpApiGroup.HttpApiGroup.AnyWithProps]>
  for (const [, group] of groups) {
    const groupErrors = extractMembers(group.errorSchema.ast, apiErrors, HttpApiSchema.getStatusErrorAST)
    const groupAnnotations = Context.merge(self.annotations, group.annotations)
    options.onGroup({
      group,
      mergedAnnotations: groupAnnotations
    })
    const endpoints = group.endpoints as Iterable<[string, HttpApiEndpoint.HttpApiEndpoint<string, HttpMethod>]>
    for (const [, endpoint] of endpoints) {
      const errors = extractMembers(endpoint.errorSchema.ast, groupErrors, HttpApiSchema.getStatusErrorAST)
      options.onEndpoint({
        group,
        endpoint,
        middleware: HashSet.union(group.middlewares, endpoint.middlewares),
        mergedAnnotations: Context.merge(groupAnnotations, endpoint.annotations),
        successes: extractMembers(endpoint.successSchema.ast, new Map(), HttpApiSchema.getStatusSuccessAST),
        errors
      })
    }
  }
}

// -------------------------------------------------------------------------------------

const extractMembers = (
  topAst: AST.AST,
  inherited: ReadonlyMap<number, Option.Option<AST.AST>>,
  getStatus: (ast: AST.AST) => number
): ReadonlyMap<number, Option.Option<AST.AST>> => {
  const members = new Map(inherited)
  function process(ast: AST.AST) {
    if (ast._tag === "NeverKeyword") {
      return
    }
    ast = AST.annotations(ast, {
      ...topAst.annotations,
      ...ast.annotations
    })
    const status = getStatus(ast)
    const emptyDecodeable = HttpApiSchema.getEmptyDecodeable(ast)
    const current = members.get(status) ?? Option.none()
    members.set(
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
  if (topAst._tag === "Union") {
    for (const type of topAst.types) {
      process(type)
    }
  } else {
    process(topAst)
  }
  return members
}
