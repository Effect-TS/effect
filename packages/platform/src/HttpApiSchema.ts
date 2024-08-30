/**
 * @since 1.0.0
 */
import * as AST from "@effect/schema/AST"
import * as Schema from "@effect/schema/Schema"
import type { Brand } from "effect/Brand"
import type { LazyArg } from "effect/Function"
import { constVoid, dual } from "effect/Function"
import * as Struct from "effect/Struct"

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
export const getMultipart = (ast: AST.AST): boolean => getAnnotation<boolean>(ast, AnnotationMultipart) ?? false

const encodingJson: Encoding = {
  kind: "Json",
  contentType: "application/json"
}

/**
 * @since 1.0.0
 * @category annotations
 */
export const getEncoding = (ast: AST.AST): Encoding => getAnnotation<Encoding>(ast, AnnotationEncoding) ?? encodingJson

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
 * @since 1.0.0
 */
export const UnionUnify = <A extends Schema.Schema.All, B extends Schema.Schema.All>(self: A, that: B): Schema.Schema<
  A["Type"] | B["Type"],
  A["Encoded"] | B["Encoded"],
  A["Context"] | B["Context"]
> => {
  const selfTypes = self.ast._tag === "Union" ? self.ast.types : [self.ast]
  const thatTypes = that.ast._tag === "Union" ? that.ast.types : [that.ast]
  return Schema.make(AST.Union.make([
    ...selfTypes,
    ...thatTypes
  ]))
}

/**
 * @since 1.0.0
 * @category params
 */
export interface PathParams extends Schema.Record$<typeof Schema.String, typeof Schema.String> {}

type Void$ = typeof Schema.Void

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
      readonly decode?: LazyArg<Schema.Schema.Type<S>>
    }
  ): asEmpty<S>
} = dual(
  2,
  <S extends Schema.Schema.Any>(
    self: S,
    options: {
      readonly status: number
      readonly decode?: LazyArg<Schema.Schema.Type<S>>
    }
  ): asEmpty<S> =>
    Schema.transform(
      Schema.Void,
      Schema.typeSchema(self),
      {
        decode: options.decode as any,
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
export const Multipart = <S extends Schema.Schema.Any>(self: S): Multipart<S> =>
  self.annotations({
    [AnnotationMultipart]: true
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
