/**
 * @since 1.0.0
 */

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
  <A extends object>(
    f: (_: A) => ReadonlyArray<globalThis.Transferable>
  ): <R, I>(self: Schema.Schema<A, I, R>) => Schema.Schema<A, I, R>
  <R, I, A extends object>(
    self: Schema.Schema<A, I, R>,
    f: (_: A) => ReadonlyArray<globalThis.Transferable>
  ): Schema.Schema<A, I, R>
} = dual(2, <R, I, A extends object>(
  self: Schema.Schema<A, I, R>,
  f: (_: A) => ReadonlyArray<globalThis.Transferable>
) => {
  const fn: Transferable[typeof symbol] = function(this: A) {
    return f(this)
  }
  return Schema.transform(
    self,
    schemaFromSelf(Schema.to(self)),
    (input) => addProxy(input, fn),
    identity
  )
})

const schemaParse =
  <R, A extends object>(parse: ParseResult.DecodeUnknown<R, A>): ParseResult.DeclarationDecodeUnknown<R, A> =>
  (u, options, ast) => {
    if (!isTransferable(u)) {
      return ParseResult.fail(ParseResult.type(ast, u))
    }
    const f = u[symbol]
    return ParseResult.map(parse(u, options), (a): A => addProxy(a, f))
  }

/**
 * @since 1.0.0
 * @category schema
 */
export const schemaFromSelf = <R, I extends object, A extends object>(
  item: Schema.Schema<A, I, R>
): Schema.Schema<A, I, R> => {
  return Schema.declare(
    [item],
    (item) => schemaParse(ParseResult.decodeUnknown(item)),
    (item) => schemaParse(ParseResult.encodeUnknown(item)),
    { identifier: "Transferable" }
  )
}

const addProxy = <A extends object>(self: A, f: Transferable[typeof symbol]): A & Transferable => {
  return new Proxy(self, {
    get(target, key) {
      if (key === symbol) {
        return f
      }
      return target[key as keyof A]
    },
    has(target, p) {
      if (p === symbol) {
        return true
      }
      return p in target
    }
  }) as any
}
