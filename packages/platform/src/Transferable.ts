/**
 * @since 1.0.0
 */

import * as AST from "@effect/schema/AST"
import * as ParseResult from "@effect/schema/ParseResult"
import * as Schema from "@effect/schema/Schema"
import { dual } from "effect/Function"

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
  ): <I>(self: Schema.Schema<I, A>) => Schema.Schema<I, A & Transferable>
  <I, A>(
    self: Schema.Schema<I, A>,
    f: (_: A) => ReadonlyArray<globalThis.Transferable>
  ): Schema.Schema<I, A & Transferable>
} = dual<
  <A>(
    f: (_: A) => ReadonlyArray<globalThis.Transferable>
  ) => <I>(self: Schema.Schema<I, A>) => Schema.Schema<I, A & Transferable>,
  <I, A>(
    self: Schema.Schema<I, A>,
    f: (_: A) => ReadonlyArray<globalThis.Transferable>
  ) => Schema.Schema<I, A & Transferable>
>(2, <I, A>(
  self: Schema.Schema<I, A>,
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
      }) as A & Transferable,
    (output) => output as A
  ))

/**
 * @since 1.0.0
 * @category schema
 */
export const schemaFromSelf = <I, A>(
  item: Schema.Schema<I, A>
): Schema.Schema<I & Transferable, A & Transferable> => {
  return Schema.declare(
    [item],
    item,
    (isDecoding, item) => {
      const parse = isDecoding ? Schema.parse(item) : Schema.encode(item)
      return (u, options, ast) => {
        if (!isTransferable(u)) {
          return ParseResult.fail(ParseResult.type(ast, u))
        }
        const proto = {
          __proto__: Object.getPrototypeOf(u),
          [symbol]: u[symbol]
        }
        return ParseResult.map(
          parse(u, options),
          (a) => Object.setPrototypeOf(a, proto)
        )
      }
    },
    { [AST.IdentifierAnnotationId]: "Transferable" }
  )
}
