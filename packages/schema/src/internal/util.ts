import * as Predicate from "effect/Predicate"
import type * as AST from "../AST.js"

/** @internal */
export const getKeysForIndexSignature = (
  input: { readonly [x: PropertyKey]: unknown },
  parameter: AST.Parameter
): ReadonlyArray<string> | ReadonlyArray<symbol> => {
  switch (parameter._tag) {
    case "StringKeyword":
    case "TemplateLiteral":
      return Object.keys(input)
    case "SymbolKeyword":
      return Object.getOwnPropertySymbols(input)
    case "Refinement":
      return getKeysForIndexSignature(input, parameter.from)
  }
}

/** @internal */
export const ownKeys = (o: object): Array<PropertyKey> =>
  (Object.keys(o) as Array<PropertyKey>).concat(Object.getOwnPropertySymbols(o))

/** @internal */
export const memoizeThunk = <A>(f: () => A): () => A => {
  let done = false
  let a: A
  return () => {
    if (done) {
      return a
    }
    a = f()
    done = true
    return a
  }
}

/** @internal */
export const formatUnknown = (u: unknown): string => {
  if (Predicate.isString(u)) {
    return JSON.stringify(u)
  } else if (
    Predicate.isNumber(u)
    || u == null
    || Predicate.isBoolean(u)
    || Predicate.isSymbol(u)
    || Predicate.isDate(u)
  ) {
    return String(u)
  } else if (Predicate.isBigInt(u)) {
    return String(u) + "n"
  } else if (
    !Array.isArray(u)
    && Predicate.hasProperty(u, "toString")
    && Predicate.isFunction(u["toString"])
    && u["toString"] !== Object.prototype.toString
  ) {
    return u["toString"]()
  }
  try {
    JSON.stringify(u)
    if (Array.isArray(u)) {
      return `[${u.map(formatUnknown).join(",")}]`
    } else {
      return `{${
        ownKeys(u).map((k) =>
          `${Predicate.isString(k) ? JSON.stringify(k) : String(k)}:${formatUnknown((u as any)[k])}`
        ).join(",")
      }}`
    }
  } catch (e) {
    return String(u)
  }
}

/** @internal */
export const formatPropertyKey = (name: PropertyKey): string =>
  typeof name === "string" ? JSON.stringify(name) : String(name)
