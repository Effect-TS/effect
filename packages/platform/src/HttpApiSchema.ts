/**
 * @since 1.0.0
 */
import type { Brand } from "effect/Brand"
import * as Effect from "effect/Effect"
import * as Effectable from "effect/Effectable"
import type { LazyArg } from "effect/Function"
import { constant, constVoid, dual } from "effect/Function"
import { globalValue } from "effect/GlobalValue"
import * as Option from "effect/Option"
import { hasProperty } from "effect/Predicate"
import * as Schema from "effect/Schema"
import * as AST from "effect/SchemaAST"
import * as Struct from "effect/Struct"
import type * as Unify from "effect/Unify"
import type * as FileSystem from "./FileSystem.js"
import type * as Multipart_ from "./Multipart.js"

/**
 * @since 1.0.0
 * @category annotations
 */
export const AnnotationMultipart: unique symbol = Symbol.for(
  "@effect/platform/HttpApiSchema/AnnotationMultipart"
)

/**
 * @since 1.0.0
 * @category annotations
 */
export const AnnotationMultipartStream: unique symbol = Symbol.for(
  "@effect/platform/HttpApiSchema/AnnotationMultipartStream"
)

/**
 * @since 1.0.0
 * @category annotations
 */
export const AnnotationStatus: unique symbol = Symbol.for("@effect/platform/HttpApiSchema/AnnotationStatus")

/**
 * @since 1.0.0
 * @category annotations
 */
export const AnnotationEmptyDecodeable: unique symbol = Symbol.for(
  "@effect/platform/HttpApiSchema/AnnotationEmptyDecodeable"
)

/**
 * @since 1.0.0
 * @category annotations
 */
export const AnnotationEncoding: unique symbol = Symbol.for("@effect/platform/HttpApiSchema/AnnotationEncoding")

/**
 * @since 1.0.0
 * @category annotations
 */
export const AnnotationParam: unique symbol = Symbol.for(
  "@effect/platform/HttpApiSchema/AnnotationParam"
)

/**
 * @since 1.0.0
 * @category annotations
 */
export const extractAnnotations = (ast: AST.Annotations): AST.Annotations => {
  const result: Record<symbol, unknown> = {}
  if (AnnotationStatus in ast) {
    result[AnnotationStatus] = ast[AnnotationStatus]
  }
  if (AnnotationEmptyDecodeable in ast) {
    result[AnnotationEmptyDecodeable] = ast[AnnotationEmptyDecodeable]
  }
  if (AnnotationEncoding in ast) {
    result[AnnotationEncoding] = ast[AnnotationEncoding]
  }
  if (AnnotationParam in ast) {
    result[AnnotationParam] = ast[AnnotationParam]
  }
  if (AnnotationMultipart in ast) {
    result[AnnotationMultipart] = ast[AnnotationMultipart]
  }
  if (AnnotationMultipartStream in ast) {
    result[AnnotationMultipartStream] = ast[AnnotationMultipartStream]
  }
  return result
}

const mergedAnnotations = (ast: AST.AST): Record<symbol, unknown> =>
  ast._tag === "Transformation" ?
    {
      ...ast.to.annotations,
      ...ast.annotations
    } :
    ast.annotations

const getAnnotation = <A>(ast: AST.AST, key: symbol): A | undefined => mergedAnnotations(ast)[key] as A

/**
 * @since 1.0.0
 * @category annotations
 */
export const getStatus = (ast: AST.AST, defaultStatus: number): number =>
  getAnnotation<number>(ast, AnnotationStatus) ?? defaultStatus

/**
 * @since 1.0.0
 * @category annotations
 */
export const getEmptyDecodeable = (ast: AST.AST): boolean =>
  getAnnotation<boolean>(ast, AnnotationEmptyDecodeable) ?? false

/**
 * @since 1.0.0
 * @category annotations
 */
export const getMultipart = (ast: AST.AST): Multipart_.withLimits.Options | undefined =>
  getAnnotation<Multipart_.withLimits.Options>(ast, AnnotationMultipart)

/**
 * @since 1.0.0
 * @category annotations
 */
export const getMultipartStream = (ast: AST.AST): Multipart_.withLimits.Options | undefined =>
  getAnnotation<Multipart_.withLimits.Options>(ast, AnnotationMultipartStream)

const encodingJson: Encoding = {
  kind: "Json",
  contentType: "application/json"
}

/**
 * @since 1.0.0
 * @category annotations
 */
export const getEncoding = (ast: AST.AST, fallback = encodingJson): Encoding =>
  getAnnotation<Encoding>(ast, AnnotationEncoding) ?? fallback

/**
 * @since 1.0.0
 * @category annotations
 */
export const getParam = (ast: AST.AST | Schema.PropertySignature.AST): string | undefined => {
  const annotations = ast._tag === "PropertySignatureTransformation" ? ast.to.annotations : ast.annotations
  return (annotations[AnnotationParam] as any)?.name as string | undefined
}

/**
 * @since 1.0.0
 * @category annotations
 */
export const annotations = <A>(
  annotations: Schema.Annotations.Schema<NoInfer<A>> & {
    readonly status?: number | undefined
  }
): Schema.Annotations.Schema<A> => {
  const result: Record<symbol, unknown> = Struct.omit(annotations, "status")
  if (annotations.status !== undefined) {
    result[AnnotationStatus] = annotations.status
  }
  return result
}

/**
 * @since 1.0.0
 * @category reflection
 */
export const isVoid = (ast: AST.AST): boolean => {
  switch (ast._tag) {
    case "VoidKeyword": {
      return true
    }
    case "Transformation": {
      return isVoid(ast.from)
    }
    case "Suspend": {
      return isVoid(ast.f())
    }
    default: {
      return false
    }
  }
}

/**
 * @since 1.0.0
 * @category reflection
 */
export const getStatusSuccessAST = (ast: AST.AST): number => getStatus(ast, isVoid(ast) ? 204 : 200)

/**
 * @since 1.0.0
 * @category reflection
 */
export const getStatusSuccess = <A extends Schema.Schema.Any>(self: A): number => getStatusSuccessAST(self.ast)

/**
 * @since 1.0.0
 * @category reflection
 */
export const getStatusErrorAST = (ast: AST.AST): number => getStatus(ast, 500)

/**
 * @since 1.0.0
 * @category reflection
 */
export const getStatusError = <A extends Schema.Schema.All>(self: A): number => getStatusErrorAST(self.ast)

/**
 * Extracts all individual types from a union type recursively.
 *
 * **Details**
 *
 * This function traverses an AST and collects all the types within a union,
 * even if they are nested. It ensures that every type in a union (including
 * deeply nested unions) is included in the resulting array. The returned array
 * contains each type as an individual AST node, preserving the order in which
 * they appear.
 *
 * @internal
 */
export const extractUnionTypes = (ast: AST.AST): ReadonlyArray<AST.AST> => {
  function process(ast: AST.AST): void {
    if (AST.isUnion(ast)) {
      for (const type of ast.types) {
        process(type)
      }
    } else {
      out.push(ast)
    }
  }
  const out: Array<AST.AST> = []
  process(ast)
  return out
}

/** @internal */
export const UnionUnifyAST = (self: AST.AST, that: AST.AST): AST.AST =>
  AST.Union.make(Array.from(new Set<AST.AST>([...extractUnionTypes(self), ...extractUnionTypes(that)])))

/**
 * @since 1.0.0
 */
export const UnionUnify = <A extends Schema.Schema.All, B extends Schema.Schema.All>(self: A, that: B): Schema.Schema<
  A["Type"] | B["Type"],
  A["Encoded"] | B["Encoded"],
  A["Context"] | B["Context"]
> => Schema.make(UnionUnifyAST(self.ast, that.ast))

type Void$ = typeof Schema.Void

/**
 * @since 1.0.0
 * @category path params
 */
export interface Param<Name extends string, S extends Schema.Schema.Any | Schema.PropertySignature.Any>
  extends Schema.Schema<Schema.Schema.Type<S>, Schema.Schema.Encoded<S>, Schema.Schema.Context<S>>
{
  readonly [AnnotationParam]: {
    readonly name: Name
    readonly schema: S
  }
}

/**
 * @since 1.0.0
 * @category path params
 */
export const param: {
  <Name extends string>(
    name: Name
  ): <S extends Schema.Schema.Any | Schema.PropertySignature.Any>(
    schema:
      & S
      & ([Schema.Schema.Encoded<S> & {}] extends [string] ? unknown : "Schema must be encodable to a string")
  ) => Param<Name, S>
  <Name extends string, S extends Schema.Schema.Any | Schema.PropertySignature.Any>(
    name: Name,
    schema:
      & S
      & ([Schema.Schema.Encoded<S> & {}] extends [string] ? unknown : "Schema must be encodable to a string")
  ): Param<Name, S>
} = dual(
  2,
  <Name extends string, S extends Schema.Schema.Any | Schema.PropertySignature.Any>(
    name: Name,
    schema: S
  ): Param<Name, S> => {
    const annotations: Record<string | symbol, unknown> = {
      [AnnotationParam]: { name, schema }
    }
    if (Schema.isSchema(schema)) {
      const identifier = AST.getIdentifierAnnotation(schema.ast)
      if (Option.isSome(identifier)) {
        annotations[AST.IdentifierAnnotationId] = identifier.value
      }
    }
    return schema.annotations(annotations) as any
  }
)

/**
 * @since 1.0.0
 * @category empty response
 */
export const Empty = (status: number): typeof Schema.Void => Schema.Void.annotations(annotations({ status }))

/**
 * @since 1.0.0
 * @category empty response
 */
export interface asEmpty<
  S extends Schema.Schema.Any
> extends Schema.transform<typeof Schema.Void, S> {}

/**
 * @since 1.0.0
 * @category empty response
 */
export const asEmpty: {
  <S extends Schema.Schema.Any>(options: {
    readonly status: number
    readonly decode: LazyArg<Schema.Schema.Type<S>>
  }): (self: S) => asEmpty<S>
  <S extends Schema.Schema.Any>(
    self: S,
    options: {
      readonly status: number
      readonly decode: LazyArg<Schema.Schema.Type<S>>
    }
  ): asEmpty<S>
} = dual(
  2,
  <S extends Schema.Schema.Any>(
    self: S,
    options: {
      readonly status: number
      readonly decode: LazyArg<Schema.Schema.Type<S>>
    }
  ): asEmpty<S> =>
    Schema.transform(
      Schema.Void.annotations(self.ast.annotations),
      Schema.typeSchema(self),
      {
        decode: options.decode,
        encode: constVoid
      }
    ).annotations(annotations({
      status: options.status,
      [AnnotationEmptyDecodeable]: true
    })) as any
)

/**
 * @since 1.0.0
 * @category empty response
 */
export interface Created extends Void$ {
  readonly _: unique symbol
}

/**
 * @since 1.0.0
 * @category empty response
 */
export const Created: Created = Empty(201) as any

/**
 * @since 1.0.0
 * @category empty response
 */
export interface Accepted extends Void$ {
  readonly _: unique symbol
}

/**
 * @since 1.0.0
 * @category empty response
 */
export const Accepted: Accepted = Empty(202) as any

/**
 * @since 1.0.0
 * @category empty response
 */
export interface NoContent extends Void$ {
  readonly _: unique symbol
}

/**
 * @since 1.0.0
 * @category empty response
 */
export const NoContent: NoContent = Empty(204) as any

/**
 * @since 1.0.0
 * @category multipart
 */
export const MultipartTypeId: unique symbol = Symbol.for("@effect/platform/HttpApiSchema/Multipart")

/**
 * @since 1.0.0
 * @category multipart
 */
export type MultipartTypeId = typeof MultipartTypeId

/**
 * @since 1.0.0
 * @category multipart
 */
export interface Multipart<S extends Schema.Schema.Any>
  extends
    Schema.Schema<Schema.Schema.Type<S> & Brand<MultipartTypeId>, Schema.Schema.Encoded<S>, Schema.Schema.Context<S>>
{}

/**
 * @since 1.0.0
 * @category multipart
 */
export const Multipart = <S extends Schema.Schema.Any>(self: S, options?: {
  readonly maxParts?: Option.Option<number> | undefined
  readonly maxFieldSize?: FileSystem.SizeInput | undefined
  readonly maxFileSize?: Option.Option<FileSystem.SizeInput> | undefined
  readonly maxTotalSize?: Option.Option<FileSystem.SizeInput> | undefined
  readonly fieldMimeTypes?: ReadonlyArray<string> | undefined
}): Multipart<S> =>
  self.annotations({
    [AnnotationMultipart]: options ?? {}
  }) as any

/**
 * @since 1.0.0
 * @category multipart
 */
export const MultipartStreamTypeId: unique symbol = Symbol.for("@effect/platform/HttpApiSchema/MultipartStream")

/**
 * @since 1.0.0
 * @category multipart
 */
export type MultipartStreamTypeId = typeof MultipartStreamTypeId

/**
 * @since 1.0.0
 * @category multipart
 */
export interface MultipartStream<S extends Schema.Schema.Any> extends
  Schema.Schema<
    Schema.Schema.Type<S> & Brand<MultipartStreamTypeId>,
    Schema.Schema.Encoded<S>,
    Schema.Schema.Context<S>
  >
{}

/**
 * @since 1.0.0
 * @category multipart
 */
export const MultipartStream = <S extends Schema.Schema.Any>(self: S, options?: {
  readonly maxParts?: Option.Option<number> | undefined
  readonly maxFieldSize?: FileSystem.SizeInput | undefined
  readonly maxFileSize?: Option.Option<FileSystem.SizeInput> | undefined
  readonly maxTotalSize?: Option.Option<FileSystem.SizeInput> | undefined
  readonly fieldMimeTypes?: ReadonlyArray<string> | undefined
}): MultipartStream<S> =>
  self.annotations({
    [AnnotationMultipartStream]: options ?? {}
  }) as any

const defaultContentType = (encoding: Encoding["kind"]) => {
  switch (encoding) {
    case "Json": {
      return "application/json"
    }
    case "UrlParams": {
      return "application/x-www-form-urlencoded"
    }
    case "Uint8Array": {
      return "application/octet-stream"
    }
    case "Text": {
      return "text/plain"
    }
  }
}

/**
 * @since 1.0.0
 * @category encoding
 */
export interface Encoding {
  readonly kind: "Json" | "UrlParams" | "Uint8Array" | "Text"
  readonly contentType: string
}

/**
 * @since 1.0.0
 * @category encoding
 */
export declare namespace Encoding {
  /**
   * @since 1.0.0
   * @category encoding
   */
  export type Validate<A extends Schema.Schema.Any, Kind extends Encoding["kind"]> = Kind extends "Json" ? {}
    : Kind extends "UrlParams" ? [A["Encoded"]] extends [Readonly<Record<string, string | undefined>>] ? {}
      : `'UrlParams' kind can only be encoded to 'Record<string, string | undefined>'`
    : Kind extends "Uint8Array" ?
      [A["Encoded"]] extends [Uint8Array] ? {} : `'Uint8Array' kind can only be encoded to 'Uint8Array'`
    : Kind extends "Text" ? [A["Encoded"]] extends [string] ? {} : `'Text' kind can only be encoded to 'string'`
    : never
}

/**
 * @since 1.0.0
 * @category encoding
 */
export const withEncoding: {
  <A extends Schema.Schema.Any, Kind extends Encoding["kind"]>(
    options: {
      readonly kind: Kind
      readonly contentType?: string | undefined
    } & Encoding.Validate<A, Kind>
  ): (self: A) => A
  <A extends Schema.Schema.Any, Kind extends Encoding["kind"]>(
    self: A,
    options: {
      readonly kind: Kind
      readonly contentType?: string | undefined
    } & Encoding.Validate<A, Kind>
  ): A
} = dual(2, <A extends Schema.Schema.Any>(self: A, options: {
  readonly kind: Encoding["kind"]
  readonly contentType?: string | undefined
}): A =>
  self.annotations({
    [AnnotationEncoding]: {
      kind: options.kind,
      contentType: options.contentType ?? defaultContentType(options.kind)
    },
    ...(options.kind === "Uint8Array" ?
      {
        jsonSchema: {
          type: "string",
          format: "binary"
        }
      } :
      undefined)
  }) as any)

/**
 * @since 1.0.0
 * @category encoding
 */
export const Text = (options?: {
  readonly contentType?: string
}): typeof Schema.String => withEncoding(Schema.String, { kind: "Text", ...options })

/**
 * @since 1.0.0
 * @category encoding
 */
export const Uint8Array = (options?: {
  readonly contentType?: string
}): typeof Schema.Uint8ArrayFromSelf => withEncoding(Schema.Uint8ArrayFromSelf, { kind: "Uint8Array", ...options })

const astCache = globalValue(
  "@effect/platform/HttpApiSchema/astCache",
  () => new WeakMap<AST.AST, Schema.Schema.Any>()
)

/**
 * @since 1.0.0
 */
export const deunionize = (
  schemas: Set<Schema.Schema.Any>,
  schema: Schema.Schema.Any
): void => {
  if (astCache.has(schema.ast)) {
    schemas.add(astCache.get(schema.ast)!)
    return
  }
  const ast = schema.ast
  if (ast._tag === "Union") {
    for (const astType of ast.types) {
      if (astCache.has(astType)) {
        schemas.add(astCache.get(astType)!)
        continue
      }
      const memberSchema = Schema.make(AST.annotations(astType, {
        ...ast.annotations,
        ...astType.annotations
      }))
      astCache.set(astType, memberSchema)
      schemas.add(memberSchema)
    }
  } else {
    astCache.set(ast, schema)
    schemas.add(schema)
  }
}

/**
 * @since 1.0.0
 * @category empty errors
 */
export interface EmptyError<Self, Tag> extends Effect.Effect<never, Self> {
  readonly _tag: Tag
  [Unify.typeSymbol]?: unknown
  [Unify.unifySymbol]?: EmptyErrorUnify<this>
  [Unify.ignoreSymbol]?: EmptyErrorUnifyIgnore
}

/**
 * @category models
 * @since 1.0.0
 */
export interface EmptyErrorUnify<A extends { [Unify.typeSymbol]?: any }> extends Effect.EffectUnify<A> {
  EmptyError?: () => A[Unify.typeSymbol] extends EmptyError<infer Self, infer _Tag> | infer _ ? Self
    : never
}

/**
 * @since 1.0.0
 * @category empty errors
 */
export interface EmptyErrorClass<Self, Tag> extends Schema.Schema<Self, void> {
  new(_: void): EmptyError<Self, Tag>
}

/**
 * @category models
 * @since 1.0.0
 */
export interface EmptyErrorUnifyIgnore extends Effect.EffectUnifyIgnore {
  Effect?: true
}

/**
 * @since 1.0.0
 * @category empty errors
 */
export const EmptyError = <Self>() =>
<const Tag extends string>(options: {
  readonly tag: Tag
  readonly status: number
}): EmptyErrorClass<Self, Tag> => {
  const symbol = Symbol.for(`@effect/platform/HttpApiSchema/EmptyError/${options.tag}`)
  class EmptyError extends Effectable.StructuralClass<never, Self> {
    readonly _tag: Tag = options.tag
    commit(): Effect.Effect<never, Self> {
      return Effect.fail(this) as any
    }
  }
  ;(EmptyError as any).prototype[symbol] = symbol
  Object.assign(EmptyError, {
    [Schema.TypeId]: Schema.Void[Schema.TypeId],
    pipe: Schema.Void.pipe,
    annotations(this: any, annotations: any) {
      return Schema.make(this.ast).annotations(annotations)
    }
  })
  let transform: Schema.Schema.Any | undefined
  Object.defineProperty(EmptyError, "ast", {
    get() {
      if (transform) {
        return transform.ast
      }
      const self = this as any
      transform = asEmpty(
        Schema.declare((u) => hasProperty(u, symbol), {
          identifier: options.tag,
          title: options.tag
        }),
        {
          status: options.status,
          decode: constant(new self())
        }
      )
      return transform.ast
    }
  })
  return EmptyError as any
}
