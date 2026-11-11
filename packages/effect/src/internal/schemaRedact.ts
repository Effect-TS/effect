/**
 * The redacting walk shared by the message log and the loader's log keys.
 *
 * @internal
 */
import { memoize } from "../Function.ts"
import type * as Redacted from "../Redacted.ts"
import * as Schema from "../Schema.ts"
import * as SchemaAST from "../SchemaAST.ts"
import * as SchemaGetter from "../SchemaGetter.ts"

const isRedactedAST = (ast: SchemaAST.AST): boolean =>
  ast._tag === "Declaration" &&
  (ast.annotations?.representation as { readonly id?: unknown } | undefined)?.id === "effect/schema/Redacted"

const redactedLink = Schema.link<Redacted.Redacted<unknown>>()(
  Schema.Struct({ "~redacted": Schema.Literal(true) }),
  {
    decode: SchemaGetter.forbidden(() => "a redacted value was sent as a placeholder and can't be decoded"),
    encode: SchemaGetter.transform(() => ({ "~redacted": true as const }))
  }
)

/**
 * Replaces every `Schema.Redacted` node's encoding with a placeholder, including
 * fields, elements, union members, declaration type parameters, suspended schemas
 * and transformations' encoded sides. Replacing the node's own codec prevents
 * `RedactedFromValue` from unwrapping its value. Declaration type parameters
 * (such as those of `Option` and `ReadonlyMap`) encode contents before the
 * declaration's derived JSON codec runs, so they must also be redacted.
 *
 * Returns `ast` itself when it holds no `Schema.Redacted`.
 *
 * @internal
 */
export const redactAST: (ast: SchemaAST.AST) => SchemaAST.AST = memoize((ast: SchemaAST.AST): SchemaAST.AST => {
  if (isRedactedAST(ast)) {
    const out = SchemaAST.replaceEncoding(ast, [redactedLink])
    return ast.context === undefined ? out : SchemaAST.replaceContextLastLink(out, ast.context)
  }
  if (ast.encoding !== undefined) {
    const body = SchemaAST.replaceEncoding(ast, undefined)
    const redactedBody = redactAST(body)
    const encoding = SchemaAST.mapOrSame(ast.encoding, (link) => SchemaAST.mapLink(link, redactAST))
    return redactedBody === body && encoding === ast.encoding ? ast : SchemaAST.replaceEncoding(redactedBody, encoding)
  }
  return "recur" in ast ? ast.recur(redactAST) : ast
})
