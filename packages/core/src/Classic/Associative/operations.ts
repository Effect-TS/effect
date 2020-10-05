import type { Ord } from "../Ord"
import { max, min } from "../Ord"
import type { Associative } from "./definition"

export const makeAssociative = <A>(f: (r: A) => (l: A) => A): Associative<A> => ({
  Associative: "Associative",
  combine: f
})

/**
 * Fold `Associative` through an `Array`
 */
export function fold<A>(S: Associative<A>): (a: A, as: ReadonlyArray<A>) => A {
  return (a, as) => as.reduce((x, y) => S.combine(y)(x), a)
}

/**
 * `Associative` that returns first element
 */
export function first<A = never>(): Associative<A> {
  return makeAssociative(() => (x) => x)
}

/**
 * `Associative` that returns last element
 */
export function last<A = never>(): Associative<A> {
  return makeAssociative((y) => () => y)
}

/**
 * Given a tuple of `Associative` returns an `Associative` for the tuple
 */
export function tuple<T extends ReadonlyArray<Associative<any>>>(
  ...associatives: T
): Associative<{ [K in keyof T]: T[K] extends Associative<infer A> ? A : never }> {
  return makeAssociative((y) => (x) =>
    associatives.map((s, i) => s.combine(y[i])(x[i])) as any
  )
}

/**
 * The dual of a `Associative`, obtained by swapping the arguments of `combine`.
 */
export function dual<A>(S: Associative<A>): Associative<A> {
  return makeAssociative((y) => (x) => S.combine(x)(y))
}

/**
 * `Associative` for function combination
 */
export function func<S>(S: Associative<S>): <A = never>() => Associative<(a: A) => S> {
  return () => makeAssociative((g) => (f) => (a) => S.combine(g(a))(f(a)))
}

/**
 * `Associative` for a structure
 */
export function struct<O extends Record<string, any>>(
  associatives: { [K in keyof O]: Associative<O[K]> }
): Associative<O> {
  return makeAssociative((y) => (x) => {
    const r: any = {}
    for (const key of Object.keys(associatives)) {
      r[key] = associatives[key].combine(y[key])(x[key])
    }
    return r
  })
}

/**
 * `Associative` that returns last `Min` of elements
 */
export function meet<A>(O: Ord<A>): Associative<A> {
  return makeAssociative(min(O))
}

/**
 * `Associative` that returns last `Max` of elements
 */
export function join<A>(O: Ord<A>): Associative<A> {
  return makeAssociative(max(O))
}

/**
 * Returns a `Associative` instance for objects preserving their type
 */
export function object<A extends object = never>(): Associative<A> {
  return makeAssociative((y) => (x) => Object.assign({}, x, y))
}

/**
 * Boolean `Associative`  under conjunction
 */
export const all: Associative<boolean> = makeAssociative((y) => (x) => x && y)

/**
 * Boolean `Associative` under disjunction
 */
export const any: Associative<boolean> = makeAssociative((y) => (x) => x || y)

/**
 * Number `Associative` under addition
 */
export const sum: Associative<number> = makeAssociative((y) => (x) => x + y)

/**
 * Number `Associative` under multiplication
 */
export const product: Associative<number> = makeAssociative((y) => (x) => x * y)

/**
 * String `Associative` under concatenation
 */
export const string: Associative<string> = makeAssociative((y) => (x) => x + y)

/**
 * Void `Associative`
 */
const void_: Associative<void> = makeAssociative(() => () => undefined as void)

export { void_ as void }

/**
 * You can glue items between and stay associative
 */
export function intercalate<A>(a: A): (S: Associative<A>) => Associative<A> {
  return (S) => makeAssociative((y) => (x) => S.combine(S.combine(y)(a))(x))
}
