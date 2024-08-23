/**
 * @since 1.0.0
 */
import * as AST from "@effect/schema/AST"
import type * as Schema from "@effect/schema/Schema"
import * as Struct from "effect/Struct"

/**
 * @since 1.0.0
 * @category annotations
 */
export const AnnotationStatus: unique symbol = Symbol.for("@effect/platform/ApiSchema/AnnotationStatus")

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
export const getStatusSuccessAST = (ast: AST.AST): number => {
  const encoded = AST.encodedAST(ast)
  const isVoid = encoded._tag === "VoidKeyword"
  return getStatus(ast, isVoid ? 204 : 200)
}

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
