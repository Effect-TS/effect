import { memoize } from "../../Function.ts"
import * as Redacted from "../../Redacted.ts"
import * as Schema from "../../Schema.ts"
import * as SchemaAST from "../../SchemaAST.ts"
import * as SchemaGetter from "../../SchemaGetter.ts"
import * as SchemaTransformation from "../../SchemaTransformation.ts"

/**
 * Builds an encoding-only query codec that preserves redaction until transmission.
 * @internal
 */
export const clientQuerySchema = (schema: Schema.Top, disableCodecs: boolean): Schema.Top => {
  // Endpoints retain the original schema inside their derived StringTree codec.
  const original = disableCodecs ? schema : (schema as Schema.toCodecStringTree<Schema.Top>).schema
  const ast = preserveRedacted(original.ast)
  if (ast === original.ast) return schema
  const redacted = Schema.make<Schema.Top>(ast)
  return disableCodecs ? redacted : Schema.toCodecStringTree(redacted)
}

const preserveRedacted = memoize((ast: SchemaAST.AST): SchemaAST.AST => {
  if (isRedactedSchema(ast)) return redactEncodedSchema(ast)
  if (ast.encoding !== undefined) {
    return SchemaAST.applyToLastLink(preserveRedacted)(ast)
  }
  switch (ast._tag) {
    case "Declaration":
    case "Arrays":
    case "Objects":
    case "Union":
    case "Suspend":
      return ast.recur(preserveRedacted)
    default:
      return ast
  }
})

const isRedactedSchema = (ast: SchemaAST.AST): boolean => {
  if (!SchemaAST.isDeclaration(ast)) return false
  const annotations = ast.annotations as Schema.Annotations.Declaration<unknown, readonly []> | undefined
  return annotations?.representation?.id === "effect/schema/Redacted"
}

const redactEncodedSchema = (ast: SchemaAST.AST): SchemaAST.AST => {
  const codec = Schema.toCodecStringTree(Schema.make(ast))
  // Validate and encode normally, then wrap the encoded leaves. Keeping the
  // tree shape preserves repeated parameters and nested query records.
  // Any prevents the final StringTree conversion from unwrapping them again.
  return SchemaAST.decodeTo(
    Schema.Any.ast,
    codec.ast,
    new SchemaTransformation.Transformation(
      SchemaGetter.forbidden(() => "Client query schemas only support encoding"),
      SchemaGetter.transform(redactEncoded)
    )
  )
}

const redactEncoded = (value: Schema.StringTree): Schema.Tree<Redacted.Redacted<string> | undefined> => {
  if (value === undefined) return value
  if (typeof value === "string") return Redacted.make(value)
  if (Array.isArray(value)) return value.map(redactEncoded)
  return Object.fromEntries(Object.entries(value).map(([key, value]) => [key, redactEncoded(value)]))
}
