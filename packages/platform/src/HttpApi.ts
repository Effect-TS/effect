/**
 * @since 1.0.0
 */
import * as Context from "effect/Context"
import * as Option from "effect/Option"
import { type Pipeable, pipeArguments } from "effect/Pipeable"
import * as Predicate from "effect/Predicate"
import * as Record from "effect/Record"
import type * as Schema from "effect/Schema"
import * as AST from "effect/SchemaAST"
import type { Mutable } from "effect/Types"
import type * as HttpApiEndpoint from "./HttpApiEndpoint.js"
import { HttpApiDecodeError } from "./HttpApiError.js"
import type * as HttpApiGroup from "./HttpApiGroup.js"
import type * as HttpApiMiddleware from "./HttpApiMiddleware.js"
import * as HttpApiSchema from "./HttpApiSchema.js"
import type { HttpMethod } from "./HttpMethod.js"

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
  out Id extends string,
  out Groups extends HttpApiGroup.HttpApiGroup.Any = never,
  in out E = never,
  out R = never
> extends Pipeable {
  new(_: never): {}
  readonly [TypeId]: TypeId
  readonly identifier: Id
  readonly groups: Record.ReadonlyRecord<string, Groups>
  readonly annotations: Context.Context<never>
  readonly errorSchema: Schema.Schema<E, unknown, R>
  readonly middlewares: ReadonlySet<HttpApiMiddleware.TagClassAny>

  /**
   * Add a `HttpApiGroup` to the `HttpApi`.
   */
  add<A extends HttpApiGroup.HttpApiGroup.Any>(group: A): HttpApi<Id, Groups | A, E, R>
  /**
   * Add another `HttpApi` to the `HttpApi`.
   */
  addHttpApi<Id2 extends string, Groups2 extends HttpApiGroup.HttpApiGroup.Any, E2, R2>(
    api: HttpApi<Id2, Groups2, E2, R2>
  ): HttpApi<
    Id,
    Groups | HttpApiGroup.HttpApiGroup.AddContext<Groups2, R2>,
    E | E2,
    R
  >
  /**
   * Add an global error to the `HttpApi`.
   */
  addError<A, I, RX>(
    schema: Schema.Schema<A, I, RX>,
    annotations?: {
      readonly status?: number | undefined
    }
  ): HttpApi<Id, Groups, E | A, R | RX>
  /**
   * Prefix all endpoints in the `HttpApi`.
   */
  prefix(prefix: HttpApiEndpoint.PathSegment): HttpApi<Id, Groups, E, R>
  /**
   * Add a middleware to a `HttpApi`. It will be applied to all endpoints in the
   * `HttpApi`.
   */
  middleware<I extends HttpApiMiddleware.HttpApiMiddleware.AnyId, S>(
    middleware: Context.Tag<I, S>
  ): HttpApi<
    Id,
    Groups,
    E | HttpApiMiddleware.HttpApiMiddleware.Error<I>,
    R | I | HttpApiMiddleware.HttpApiMiddleware.ErrorContext<I>
  >
  /**
   * Annotate the `HttpApi`.
   */
  annotate<I, S>(tag: Context.Tag<I, S>, value: S): HttpApi<Id, Groups, E, R>
  /**
   * Annotate the `HttpApi` with a Context.
   */
  annotateContext<I>(context: Context.Context<I>): HttpApi<Id, Groups, E, R>
}

/**
 * @since 1.0.0
 * @category tags
 */
export class Api extends Context.Tag("@effect/platform/HttpApi/Api")<
  Api,
  {
    readonly api: HttpApi<string, HttpApiGroup.HttpApiGroup.AnyWithProps>
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
  export type AnyWithProps = HttpApi<string, HttpApiGroup.HttpApiGroup.AnyWithProps, any, any>
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
      identifier: this.identifier,
      groups: Record.set(this.groups, group.identifier, group),
      errorSchema: this.errorSchema,
      annotations: this.annotations,
      middlewares: this.middlewares
    })
  },
  addHttpApi(
    this: HttpApi.AnyWithProps,
    api: HttpApi.AnyWithProps
  ) {
    const newGroups = { ...this.groups }
    for (const key in api.groups) {
      const newGroup: Mutable<HttpApiGroup.HttpApiGroup.AnyWithProps> = api.groups[key].annotateContext(Context.empty())
      newGroup.annotations = Context.merge(api.annotations, newGroup.annotations)
      newGroup.middlewares = new Set([...api.middlewares, ...newGroup.middlewares])
      newGroups[key] = newGroup as any
    }
    return makeProto({
      identifier: this.identifier,
      groups: newGroups,
      errorSchema: HttpApiSchema.UnionUnify(this.errorSchema, api.errorSchema),
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
      identifier: this.identifier,
      groups: this.groups,
      errorSchema: HttpApiSchema.UnionUnify(
        this.errorSchema,
        annotations?.status
          ? schema.annotations(HttpApiSchema.annotations({ status: annotations.status }))
          : schema
      ),
      annotations: this.annotations,
      middlewares: this.middlewares
    })
  },
  prefix(this: HttpApi.AnyWithProps, prefix: HttpApiEndpoint.PathSegment) {
    return makeProto({
      identifier: this.identifier,
      groups: Record.map(this.groups, (group) => group.prefix(prefix)),
      errorSchema: this.errorSchema,
      annotations: this.annotations,
      middlewares: this.middlewares
    })
  },
  middleware(this: HttpApi.AnyWithProps, tag: HttpApiMiddleware.TagClassAny) {
    return makeProto({
      identifier: this.identifier,
      groups: this.groups,
      errorSchema: HttpApiSchema.UnionUnify(this.errorSchema, tag.failure),
      annotations: this.annotations,
      middlewares: new Set([...this.middlewares, tag])
    })
  },
  annotate(this: HttpApi.AnyWithProps, tag: Context.Tag<any, any>, value: any) {
    return makeProto({
      identifier: this.identifier,
      groups: this.groups,
      errorSchema: this.errorSchema,
      annotations: Context.add(this.annotations, tag, value),
      middlewares: this.middlewares
    })
  },
  annotateContext(this: HttpApi.AnyWithProps, context: Context.Context<any>) {
    return makeProto({
      identifier: this.identifier,
      groups: this.groups,
      errorSchema: this.errorSchema,
      annotations: Context.merge(this.annotations, context),
      middlewares: this.middlewares
    })
  }
}

const makeProto = <Id extends string, Groups extends HttpApiGroup.HttpApiGroup.Any, E, I, R>(
  options: {
    readonly identifier: Id
    readonly groups: Record.ReadonlyRecord<string, Groups>
    readonly errorSchema: Schema.Schema<E, I, R>
    readonly annotations: Context.Context<never>
    readonly middlewares: ReadonlySet<HttpApiMiddleware.TagClassAny>
  }
): HttpApi<Id, Groups, E, R> => {
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
export const make = <const Id extends string>(identifier: Id): HttpApi<Id, never, HttpApiDecodeError> =>
  makeProto({
    identifier,
    groups: new Map() as any,
    errorSchema: HttpApiDecodeError,
    annotations: Context.empty(),
    middlewares: new Set()
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
export const reflect = <Id extends string, Groups extends HttpApiGroup.HttpApiGroup.Any, Error, R>(
  self: HttpApi<Id, Groups, Error, R>,
  options: {
    readonly predicate?: Predicate.Predicate<{
      readonly endpoint: HttpApiEndpoint.HttpApiEndpoint.AnyWithProps
      readonly group: HttpApiGroup.HttpApiGroup.AnyWithProps
    }>
    readonly onGroup: (options: {
      readonly group: HttpApiGroup.HttpApiGroup.AnyWithProps
      readonly mergedAnnotations: Context.Context<never>
    }) => void
    readonly onEndpoint: (options: {
      readonly group: HttpApiGroup.HttpApiGroup.AnyWithProps
      readonly endpoint: HttpApiEndpoint.HttpApiEndpoint<string, HttpMethod>
      readonly mergedAnnotations: Context.Context<never>
      readonly middleware: ReadonlySet<HttpApiMiddleware.TagClassAny>
      readonly payloads: ReadonlyMap<string, {
        readonly encoding: HttpApiSchema.Encoding
        readonly ast: AST.AST
      }>
      readonly successes: ReadonlyMap<number, {
        readonly ast: Option.Option<AST.AST>
        readonly description: Option.Option<string>
      }>
      readonly errors: ReadonlyMap<number, {
        readonly ast: Option.Option<AST.AST>
        readonly description: Option.Option<string>
      }>
    }) => void
  }
) => {
  const apiErrors = extractMembers(self.errorSchema.ast, new Map(), HttpApiSchema.getStatusErrorAST)
  const groups = Object.values(self.groups) as any as Array<HttpApiGroup.HttpApiGroup.AnyWithProps>
  for (const group of groups) {
    const groupErrors = extractMembers(group.errorSchema.ast, apiErrors, HttpApiSchema.getStatusErrorAST)
    const groupAnnotations = Context.merge(self.annotations, group.annotations)
    options.onGroup({
      group,
      mergedAnnotations: groupAnnotations
    })
    const endpoints = Object.values(group.endpoints) as Iterable<HttpApiEndpoint.HttpApiEndpoint<string, HttpMethod>>
    for (const endpoint of endpoints) {
      if (
        options.predicate && !options.predicate({
          endpoint,
          group
        } as any)
      ) continue

      const errors = extractMembers(endpoint.errorSchema.ast, groupErrors, HttpApiSchema.getStatusErrorAST)
      options.onEndpoint({
        group,
        endpoint,
        middleware: new Set([...group.middlewares, ...endpoint.middlewares]),
        mergedAnnotations: Context.merge(groupAnnotations, endpoint.annotations),
        payloads: endpoint.payloadSchema._tag === "Some" ? extractPayloads(endpoint.payloadSchema.value.ast) : emptyMap,
        successes: extractMembers(endpoint.successSchema.ast, new Map(), HttpApiSchema.getStatusSuccessAST),
        errors
      })
    }
  }
}

// -------------------------------------------------------------------------------------

const emptyMap = new Map<never, never>()

const extractMembers = (
  ast: AST.AST,
  inherited: ReadonlyMap<number, {
    readonly ast: Option.Option<AST.AST>
    readonly description: Option.Option<string>
  }>,
  getStatus: (ast: AST.AST) => number
): ReadonlyMap<number, {
  readonly ast: Option.Option<AST.AST>
  readonly description: Option.Option<string>
}> => {
  const members = new Map(inherited)
  function process(type: AST.AST) {
    if (AST.isNeverKeyword(type)) {
      return
    }
    const annotations = HttpApiSchema.extractAnnotations(ast.annotations)
    // Avoid changing the reference unless necessary
    // Otherwise, deduplication of the ASTs below will not be possible
    if (!Record.isEmptyRecord(annotations)) {
      type = AST.annotations(type, {
        ...annotations,
        ...type.annotations
      })
    }
    const status = getStatus(type)
    const emptyDecodeable = HttpApiSchema.getEmptyDecodeable(type)
    const current = members.get(status)
    members.set(
      status,
      {
        description: (current ? current.description : Option.none()).pipe(
          Option.orElse(() => getDescriptionOrIdentifier(type))
        ),
        ast: (current ? current.ast : Option.none()).pipe(
          // Deduplicate the ASTs
          Option.map((current) => HttpApiSchema.UnionUnifyAST(current, type)),
          Option.orElse(() =>
            !emptyDecodeable && AST.isVoidKeyword(AST.encodedAST(type)) ? Option.none() : Option.some(type)
          )
        )
      }
    )
  }

  HttpApiSchema.extractUnionTypes(ast).forEach(process)
  return members
}

const extractPayloads = (topAst: AST.AST): ReadonlyMap<string, {
  readonly encoding: HttpApiSchema.Encoding
  readonly ast: AST.AST
}> => {
  const members = new Map<string, {
    encoding: HttpApiSchema.Encoding
    ast: AST.AST
  }>()
  function process(ast: AST.AST) {
    if (ast._tag === "NeverKeyword") {
      return
    }
    ast = AST.annotations(ast, {
      ...HttpApiSchema.extractAnnotations(topAst.annotations),
      ...ast.annotations
    })
    const encoding = HttpApiSchema.getEncoding(ast)
    const contentType = HttpApiSchema.getMultipart(ast) || HttpApiSchema.getMultipartStream(ast)
      ? "multipart/form-data"
      : encoding.contentType
    const current = members.get(contentType)
    if (current === undefined) {
      members.set(contentType, {
        encoding,
        ast
      })
    } else {
      current.ast = AST.Union.make([current.ast, ast])
    }
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

const getDescriptionOrIdentifier = (ast: AST.PropertySignature | AST.AST): Option.Option<string> => {
  const annotations = "to" in ast ?
    {
      ...ast.to.annotations,
      ...ast.annotations
    } :
    ast.annotations
  return Option.fromNullable(annotations[AST.DescriptionAnnotationId] ?? annotations[AST.IdentifierAnnotationId] as any)
}

/**
 * Adds additional schemas to components/schemas.
 * The provided schemas must have a `identifier` annotation.
 *
 * @since 1.0.0
 * @category tags
 */
export class AdditionalSchemas extends Context.Tag("@effect/platform/HttpApi/AdditionalSchemas")<
  AdditionalSchemas,
  ReadonlyArray<Schema.Schema.All>
>() {}
