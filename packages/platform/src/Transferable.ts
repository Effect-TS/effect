/**
 * @since 1.0.0
 */

import * as AST from "@effect/schema/AST"
import * as ParseResult from "@effect/schema/ParseResult"
import * as Schema from "@effect/schema/Schema"
import { dual, identity } from "effect/Function"

/**
 * @since 1.0.0
 * @category symbols
 */
export const symbol = Symbol.for("@effect/platform/Transferable")

/**
 * @since 1.0.0
 * @category models
 */
export interface Transferable {
  readonly [symbol]: () => ReadonlyArray<globalThis.Transferable>
}

/**
 * @since 1.0.0
 * @category predicates
 */
export const isTransferable = (u: unknown): u is Transferable => typeof u === "object" && u !== null && symbol in u

/**
 * @since 1.0.0
 * @category accessors
 */
export const get = (u: unknown): ReadonlyArray<globalThis.Transferable> => {
  if (isTransferable(u)) {
    return u[symbol]()
  }
  return []
}

/**
 * @since 1.0.0
 * @category schema
 */
export const schema: {
  <A>(
    f: (_: A) => ReadonlyArray<globalThis.Transferable>
  ): <R, I>(self: Schema.Schema<R, I, A>) => Schema.Schema<R, I, A>
  <R, I, A>(self: Schema.Schema<R, I, A>, f: (_: A) => ReadonlyArray<globalThis.Transferable>): Schema.Schema<R, I, A>
} = dual<
  <A>(
    f: (_: A) => ReadonlyArray<globalThis.Transferable>
  ) => <R, I>(self: Schema.Schema<R, I, A>) => Schema.Schema<R, I, A>,
  <R, I, A>(
    self: Schema.Schema<R, I, A>,
    f: (_: A) => ReadonlyArray<globalThis.Transferable>
  ) => Schema.Schema<R, I, A>
>(2, <R, I, A>(
  self: Schema.Schema<R, I, A>,
  f: (_: A) => ReadonlyArray<globalThis.Transferable>
) =>
  Schema.transform(
    self,
    schemaFromSelf(Schema.to(self)),
    (input) =>
      ({
        ...input,
        [symbol]() {
          return f(this as any)
        }
      }) as A,
    identity
  ))

/**
 * @since 1.0.0
 * @category schema
 */
export const schemaFromSelf = <R, I, A>(
  item: Schema.Schema<R, I, A>
): Schema.Schema<R, I, A> => {
  return Schema.declare(
    [item],
    item,
    (item) => {
      const parse = Schema.parse(item)
      return (u, options, ast) => {
        if (!isTransferable(u)) {
          return ParseResult.fail(ParseResult.type(ast, u))
        }
        const proto = {
          __proto__: Object.getPrototypeOf(u),
          [symbol]: u[symbol]
        }
        return ParseResult.map(parse(u, options), (a): A => Object.setPrototypeOf(a, proto))
      }
    },
    (item) => {
      const encode = Schema.encode(item)
      return (a, _, ast) => {
        if (!isTransferable(a)) {
          return ParseResult.fail(ParseResult.type(ast, a))
        }
        return encode(a)
      }
    },
    { [AST.IdentifierAnnotationId]: "Transferable" }
  )
}
