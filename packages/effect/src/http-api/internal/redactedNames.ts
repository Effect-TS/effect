import type * as Schema from "../../Schema.ts"
import * as SchemaAST from "../../SchemaAST.ts"

/**
 * Names matched like `Headers.isRedactedName`: strings case-insensitively,
 * regular expressions by test.
 *
 * @internal
 */
export type RedactedName = string | RegExp

// Matches every name. Used when the wire names of a schema cannot be known.
const redactAll: ReadonlyArray<RedactedName> = [/^/]

/**
 * Returns the wire names of the query parameters or headers whose schema holds
 * a `Redacted` value, so they are redacted in spans without being listed.
 *
 * Only the schema's structure is inspected, so no encoder runs. A name is
 * exact for a struct whose keys are encoded as is. Any other shape that can
 * hold a `Redacted` value redacts every name, so a renamed key cannot leak.
 *
 * @internal
 */
export const getRedactedNames = (schema: Schema.Top | undefined): ReadonlyArray<RedactedName> => {
  if (schema === undefined || !containsRedacted(schema.ast, new Set())) return []
  const ast = schema.ast
  if (
    !SchemaAST.isObjects(ast) ||
    ast.encoding !== undefined ||
    ast.indexSignatures.some((is) => containsRedacted(is.type, new Set()))
  ) {
    return redactAll
  }
  const names: Array<string> = []
  for (const ps of ast.propertySignatures) {
    if (!containsRedacted(ps.type, new Set())) continue
    // A symbol or numeric key has no wire name that can be matched.
    if (typeof ps.name !== "string") return redactAll
    names.push(ps.name)
  }
  return names
}

/**
 * Returns the path parameter names whose schema holds a `Redacted` value.
 *
 * @internal
 */
export const getRedactedParamNames = (schema: Schema.Top | undefined): ReadonlyArray<string> => {
  if (schema === undefined) return []
  const names = getRedactedNames(schema)
  if (names.length === 0) return []
  // Every path parameter is redacted when the names are unknown. Path params
  // that are not a struct have no known names, so none are redacted there.
  if (names.some((name) => typeof name !== "string")) return Array.from(paramNamesOf(schema))
  return names as ReadonlyArray<string>
}

const paramNamesOf = (schema: Schema.Top): ReadonlySet<string> => {
  const ast = SchemaAST.getLastEncoding(schema.ast)
  return SchemaAST.isObjects(ast)
    ? new Set(ast.propertySignatures.map((ps) => String(ps.name)))
    : new Set()
}

// Walks the type side of a schema. `seen` holds suspended schemas already
// visited, so recursive schemas terminate. A suspended schema that was already
// visited adds nothing new, because the first visit has already looked at it.
const containsRedacted = (ast: SchemaAST.AST, seen: Set<SchemaAST.AST>): boolean => {
  switch (ast._tag) {
    case "Declaration":
      return (ast.annotations as { readonly representation?: { readonly id?: string } } | undefined)
            ?.representation?.id === "effect/schema/Redacted" ||
        ast.typeParameters.some((ast) => containsRedacted(ast, seen))
    case "Objects":
      return ast.propertySignatures.some((ps) => containsRedacted(ps.type, seen)) ||
        ast.indexSignatures.some((is) => containsRedacted(is.type, seen))
    case "Union":
      return ast.types.some((ast) => containsRedacted(ast, seen))
    case "Arrays":
      return ast.elements.some((ast) => containsRedacted(ast, seen)) ||
        ast.rest.some((ast) => containsRedacted(ast, seen))
    case "Suspend":
      if (seen.has(ast)) return false
      seen.add(ast)
      return containsRedacted(ast.thunk(), seen)
    default:
      return false
  }
}
