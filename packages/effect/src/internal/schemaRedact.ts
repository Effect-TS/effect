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
 * Gives every `Schema.Redacted` node in `ast` the placeholder encoding, wherever
 * it is: in a field, an element or a union member, in a declaration's type
 * parameters (`Option`, `ReadonlyMap`, ...), behind a `suspend`, or on the
 * encoded side of a transformation. A node's own codec is replaced too, so
 * `RedactedFromValue` can't unwrap its value. Declaration type parameters
 * matter most: a declaration encodes its contents with them, before any JSON
 * codec derived for the declaration itself runs.
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
