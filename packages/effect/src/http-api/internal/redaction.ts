import type * as Schema from "../../Schema.ts"
import * as SchemaAST from "../../SchemaAST.ts"

// Checks every check as well as the node, as `annotate` targets the last check.
const isSensitive = (ast: SchemaAST.AST): boolean =>
  ast.annotations?.httpApiSensitive === true || (ast.checks?.some(isSensitiveCheck) ?? false)

const isSensitiveCheck = (check: SchemaAST.Check<unknown>): boolean =>
  check.annotations?.httpApiSensitive === true ||
  (check._tag === "FilterGroup" && check.checks.some(isSensitiveCheck))

/**
 * Collects the wire names of query or header fields whose schema contains a
 * `Redacted` value or an `HttpApiSchema.sensitive` annotation.
 *
 * Struct-level encodings can rename keys arbitrarily, so names are only exact
 * for structs whose keys are encoded as is. `undefined` redacts every field.
 * Only the schema's structure is inspected: no encoder is executed.
 *
 * @internal
 */
export const getRedactedNames = (schema: Schema.Top | undefined): ReadonlyArray<string> | undefined => {
  if (schema === undefined) return []
  const ast = schema.ast
  if (!containsSecret(ast)) return []
  if (
    isSensitive(ast) || !SchemaAST.isObjects(ast) || ast.encoding !== undefined ||
    ast.indexSignatures.some((is) => containsSecret(is.type))
  ) {
    return undefined
  }
  return ast.propertySignatures.flatMap((ps) => typeof ps.name === "string" && containsSecret(ps.type) ? [ps.name] : [])
}

/**
 * Selects the keys to redact, including bracketed descendants such as
 * `nested[token]` of a redacted `nested` field.
 *
 * @internal
 */
export const getRedactedKeys = (
  keys: ReadonlyArray<string>,
  names: ReadonlyArray<string> | undefined
): ReadonlyArray<string> =>
  names === undefined
    ? keys
    : keys.filter((key) => names.some((name) => key === name || key.startsWith(`${name}[`)))

const containsSecret = (ast: SchemaAST.AST, seen = new Set<SchemaAST.AST>()): boolean => {
  if (seen.has(ast)) return false
  seen.add(ast)
  if (isSensitive(ast)) return true
  const recur = (ast: SchemaAST.AST) => containsSecret(ast, seen)
  // Annotations can sit on an encoded side, such as before a `Schema.decodeTo`.
  if (ast.encoding?.some((link) => recur(link.to))) return true
  switch (ast._tag) {
    case "Declaration":
      return (ast.annotations as Schema.Annotations.Declaration<unknown> | undefined)?.representation?.id ===
          "effect/schema/Redacted" ||
        ast.typeParameters.some(recur)
    case "Objects":
      return ast.propertySignatures.some((ps) => recur(ps.type)) ||
        ast.indexSignatures.some((is) => recur(is.type))
    case "Union":
      return ast.types.some(recur)
    case "Arrays":
      return ast.elements.some(recur) || ast.rest.some(recur)
    case "Suspend":
      return recur(ast.thunk())
    default:
      return false
  }
}
