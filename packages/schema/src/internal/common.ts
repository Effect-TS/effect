/**
 * @since 1.0.0
 */

import type * as AST from "@effect/schema/AST"
import type * as S from "@effect/schema/Schema"

// ---------------------------------------------
// hooks
// ---------------------------------------------

/** @internal */
export const ArbitraryHookId = "@effect/schema/ArbitraryHookId"

/** @internal */
export const PrettyHookId = "@effect/schema/PrettyHookId"

// ---------------------------------------------
// Schema APIs
// ---------------------------------------------

/** @internal */
export const makeSchema = <I, A>(ast: AST.AST): S.Schema<I, A> => ({ ast }) as any

/** @internal */
export const getKeysForIndexSignature = (
  input: { readonly [x: PropertyKey]: unknown },
  parameter: AST.AST
): ReadonlyArray<string> | ReadonlyArray<symbol> => {
  switch (parameter._tag) {
    case "StringKeyword":
    case "TemplateLiteral":
      return Object.keys(input)
    case "SymbolKeyword":
      return Object.getOwnPropertySymbols(input)
    case "Refinement":
    case "Transform":
      return getKeysForIndexSignature(input, parameter.from)
  }
  return []
}

// ---------------------------------------------
// general helpers
// ---------------------------------------------

/** @internal */
export const ownKeys = (o: object): ReadonlyArray<PropertyKey> =>
  (Object.keys(o) as ReadonlyArray<PropertyKey>).concat(Object.getOwnPropertySymbols(o))

/** @internal */
export const memoize = <A, B>(f: (a: A) => B): (a: A) => B => {
  const cache = new Map()
  return (a) => {
    if (!cache.has(a)) {
      const b = f(a)
      cache.set(a, b)
      return b
    }
    return cache.get(a)
  }
}
