import { memoize } from "../../Function.ts"
import type * as Schema from "../../Schema.ts"
import type * as SchemaAST from "../../SchemaAST.ts"

/** @internal */
export function resolve(ast: SchemaAST.AST): Schema.Annotations.Annotations | undefined {
  return ast.checks ? ast.checks[ast.checks.length - 1].annotations : ast.annotations
}

/** @internal */
export function resolveAt<A>(key: string) {
  return (ast: SchemaAST.AST): A | undefined => resolve(ast)?.[key] as A | undefined
}

/** @internal */
export const identifierFallbackKey = "~identifier"

/** @internal */
export const resolveIdentifier = resolveAt<string>("identifier")

/** @internal */
export const resolveIdentifierFallback = resolveAt<string>(identifierFallbackKey)

/** @internal */
export const resolveTitle = resolveAt<string>("title")

/** @internal */
export const resolveDescription = resolveAt<string>("description")

/** @internal */
export const resolveBrands = resolveAt<ReadonlyArray<string>>("brands")

/** @internal */
export const getExpected = memoize((ast: SchemaAST.AST): string => {
  const identifier = resolveIdentifier(ast)
  if (typeof identifier === "string") return identifier
  return ast.getExpected(getExpected)
})

/** @internal */
export function collectBrands(annotations: Schema.Annotations.Annotations | undefined): ReadonlyArray<string> {
  return annotations !== undefined && Array.isArray(annotations.brands) ? annotations.brands : []
}

/** @internal */
export const annotationExcludedKeys = new Set([
  "~sentinels",
  "~structural",
  "representation",
  "arbitrary",
  "brands",
  "toJsonSchema",
  "toCode",
  "toArbitrary",
  "toEquivalence",
  "toFormatter",
  "toCodec",
  "toCodecJson",
  "toCodecIso"
])
