import type { NonEmptyReadonlyArray } from "../../Array.js"
import type * as ParseResult from "../../ParseResult.js"
import * as Predicate from "../../Predicate.js"
import type * as AST from "../../SchemaAST.js"

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
export const formatDate = (date: Date): string => {
  try {
    return date.toISOString()
  } catch {
    return String(date)
  }
}

const CIRCULAR = "[Circular]"

/** @internal */
export function formatUnknown(input: unknown, whitespace: number | string | undefined = 0): string {
  const seen = new WeakSet<object>()
  const gap = !whitespace ? "" : (typeof whitespace === "number" ? " ".repeat(whitespace) : whitespace)
  const ind = (d: number) => gap.repeat(d)

  const safeToString = (x: any): string => {
    try {
      const s = x.toString()
      return typeof s === "string" ? s : String(s)
    } catch {
      return "[toString threw]"
    }
  }

  const wrap = (v: unknown, body: string): string => {
    const ctor = (v as any)?.constructor
    return ctor && ctor !== Object.prototype.constructor && ctor.name ? `${ctor.name}(${body})` : body
  }

  const ownKeys = (o: object): Array<PropertyKey> => {
    try {
      return Reflect.ownKeys(o)
    } catch {
      return ["[ownKeys threw]"]
    }
  }

  function go(v: unknown, d = 0): string {
    if (Array.isArray(v)) {
      if (seen.has(v)) return CIRCULAR
      seen.add(v)
      if (!gap || v.length <= 1) return `[${v.map((x) => go(x, d)).join(",")}]`
      const inner = v.map((x) => go(x, d + 1)).join(",\n" + ind(d + 1))
      return `[\n${ind(d + 1)}${inner}\n${ind(d)}]`
    }

    if (Predicate.isDate(v)) return formatDate(v)

    if (
      Predicate.hasProperty(v, "toString") &&
      Predicate.isFunction((v as any)["toString"]) &&
      (v as any)["toString"] !== Object.prototype.toString
    ) return safeToString(v)

    if (Predicate.isString(v)) return JSON.stringify(v)

    if (
      Predicate.isNumber(v) ||
      v == null ||
      Predicate.isBoolean(v) ||
      Predicate.isSymbol(v)
    ) return String(v)

    if (Predicate.isBigInt(v)) return String(v) + "n"

    if (v instanceof Set || v instanceof Map) {
      if (seen.has(v)) return CIRCULAR
      seen.add(v)
      return `${v.constructor.name}(${go(Array.from(v), d)})`
    }

    if (Predicate.isObject(v)) {
      if (seen.has(v)) return CIRCULAR
      seen.add(v)
      const keys = ownKeys(v)
      if (!gap || keys.length <= 1) {
        const body = `{${keys.map((k) => `${formatPropertyKey(k)}:${go((v as any)[k], d)}`).join(",")}}`
        return wrap(v, body)
      }
      const body = `{\n${
        keys.map((k) => `${ind(d + 1)}${formatPropertyKey(k)}: ${go((v as any)[k], d + 1)}`).join(",\n")
      }\n${ind(d)}}`
      return wrap(v, body)
    }

    return String(v)
  }

  return go(input, 0)
}

/** @internal */
export function formatPropertyKey(name: PropertyKey): string {
  return Predicate.isString(name) ? JSON.stringify(name) : String(name)
}

/** @internal */
export type SingleOrArray<A> = A | ReadonlyArray<A>

/** @internal */
export const isNonEmpty = <A>(x: ParseResult.SingleOrNonEmpty<A>): x is NonEmptyReadonlyArray<A> => Array.isArray(x)

/** @internal */
export const isSingle = <A>(x: A | ReadonlyArray<A>): x is A => !Array.isArray(x)

/** @internal */
export const formatPathKey = (key: PropertyKey): string => `[${formatPropertyKey(key)}]`

/** @internal */
export const formatPath = (path: ParseResult.Path): string =>
  isNonEmpty(path) ? path.map(formatPathKey).join("") : formatPathKey(path)
