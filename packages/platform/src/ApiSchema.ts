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
  "@effect/platform/ApiSchema/AnnotationMultipart"
)

/**
 * @since 1.0.0
 * @category annotations
 */
export const AnnotationStatus: unique symbol = Symbol.for("@effect/platform/ApiSchema/AnnotationStatus")

/**
 * @since 1.0.0
 * @category annotations
 */
export const AnnotationEmptyDecodeable: unique symbol = Symbol.for(
  "@effect/platform/ApiSchema/AnnotationEmptyDecodeable"
)

/**
 * @since 1.0.0
 * @category annotations
 */
export const getStatus = (ast: AST.AST, defaultStatus: number): number => {
  const annotations = ast._tag === "Transformation" ?
    {
      ...ast.to.annotations,
      ...ast.annotations
    } :
    ast.annotations
  return annotations[AnnotationStatus] as number ?? defaultStatus
}

/**
 * @since 1.0.0
 * @category annotations
 */
export const getEmptyDecodeable = (ast: AST.AST): boolean => {
  const annotations = ast._tag === "Transformation" ?
    {
      ...ast.to.annotations,
      ...ast.annotations
    } :
    ast.annotations
  return annotations[AnnotationEmptyDecodeable] as boolean ?? false
}

/**
 * @since 1.0.0
 * @category annotations
 */
export const getMultipart = (ast: AST.AST): boolean => {
  const annotations = ast._tag === "Transformation" ?
    {
      ...ast.to.annotations,
      ...ast.annotations
    } :
    ast.annotations
  return annotations[AnnotationMultipart] as boolean ?? false
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
export const MultipartTypeId: unique symbol = Symbol.for("@effect/platform/ApiSchema/Multipart")

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
