import type { Sync } from "../../io-light/Sync"
import type { Either } from "../Either/core"
import type { Tag } from "../Has"
import type { Option } from "../Option"
import { none, some } from "../Option"
import type { UnionToIntersection } from "./types"

export function intersect<AS extends unknown[] & { 0: unknown }>(
  ...as: AS
): UnionToIntersection<{ [k in keyof AS]: AS[k] }[number]> {
  return as.reduce((a: any, b: any) => ({ ...a, ...b })) as any
}

export const pattern: <N extends string>(
  n: N
) => {
  <
    X extends { [k in N]: string },
    K extends {
      [k in X[N]]: (
        _: Extract<X, { [_tag in N]: k }>,
        __: Extract<X, { [_tag in N]: k }>
      ) => any
    }
  >(
    _: K
  ): (m: X) => ReturnType<K[keyof K]>
  <
    X extends { [k in N]: string },
    K extends Partial<{
      [k in X[N]]: (
        _: Extract<X, { [_tag in N]: k }>,
        __: Extract<X, { [_tag in N]: k }>
      ) => any
    }>,
    H
  >(
    _: K & {
      [k in X[N]]?: (
        _: Extract<X, { [_tag in N]: k }>,
        __: Extract<X, { [_tag in N]: k }>
      ) => any
    },
    __: (_: Exclude<X, { _tag: keyof K }>, __: Exclude<X, { _tag: keyof K }>) => H
  ): (m: X) => { [k in keyof K]: ReturnType<NonNullable<K[k]>> }[keyof K] | H
} = (n) =>
  ((_: any, d: any) => (m: any) => {
    return (_[m[n]] ? _[m[n]](m, m) : d(m, m)) as any
  }) as any

export const matchTag = pattern("_tag")

export const pattern_: <N extends string>(
  n: N
) => {
  <
    X extends { [k in N]: string },
    K extends {
      [k in X[N]]: (
        _: Extract<X, { [_tag in N]: k }>,
        __: Extract<X, { [_tag in N]: k }>
      ) => any
    }
  >(
    m: X,
    _: K
  ): ReturnType<K[keyof K]>
  <
    X extends { [k in N]: string },
    K extends Partial<{
      [k in X[N]]: (
        _: Extract<X, { [_tag in N]: k }>,
        __: Extract<X, { [_tag in N]: k }>
      ) => any
    }>,
    H
  >(
    m: X,
    _: K & {
      [k in X[N]]?: (
        _: Extract<X, { [_tag in N]: k }>,
        __: Extract<X, { [_tag in N]: k }>
      ) => any
    },
    __: (_: Exclude<X, { _tag: keyof K }>, __: Exclude<X, { _tag: keyof K }>) => H
  ): { [k in keyof K]: ReturnType<NonNullable<K[k]>> }[keyof K] | H
} = (n) =>
  ((m: any, _: any, d: any) => {
    return (_[m[n]] ? _[m[n]](m, m) : d(m, m)) as any
  }) as any

export const matchTag_ = pattern_("_tag")

export const patternFor: <N extends string>(
  n: N
) => <X extends { [k in N]: string }>() => {
  <
    K extends {
      [k in X[N]]: (
        _: Extract<X, { [_tag in N]: k }>,
        __: Extract<X, { [_tag in N]: k }>
      ) => any
    }
  >(
    _: K
  ): (m: X) => ReturnType<K[keyof K]>
  <
    K extends Partial<{
      [k in X[N]]: (
        _: Extract<X, { [_tag in N]: k }>,
        __: Extract<X, { [_tag in N]: k }>
      ) => any
    }>,
    H
  >(
    _: K & {
      [k in X[N]]?: (
        _: Extract<X, { [_tag in N]: k }>,
        __: Extract<X, { [_tag in N]: k }>
      ) => any
    },
    __: (_: Exclude<X, { _tag: keyof K }>, __: Exclude<X, { _tag: keyof K }>) => H
  ): (m: X) => { [k in keyof K]: ReturnType<NonNullable<K[k]>> }[keyof K] | H
} = (n) => () =>
  ((_: any, d: any) => (m: any) => {
    return (_[m[n]] ? _[m[n]](m, m) : d(m, m)) as any
  }) as any

export const matchTagFor = patternFor("_tag")

export function isEither(u: unknown): u is Either<unknown, unknown> {
  return (
    typeof u === "object" &&
    u != null &&
    "_tag" in u &&
    (u["_tag"] === "Left" || u["_tag"] === "Right")
  )
}

export function isOption(u: unknown): u is Option<unknown> {
  return (
    typeof u === "object" &&
    u != null &&
    "_tag" in u &&
    (u["_tag"] === "Some" || u["_tag"] === "None")
  )
}

export function isTag(u: unknown): u is Tag<unknown> {
  return typeof u === "object" && u != null && "_tag" in u && u["_tag"] === "Tag"
}

export function isSync(u: unknown): u is Sync<unknown, unknown, unknown> {
  return typeof u === "object" && u != null && "_tag" in u && u["_tag"] === "XPure"
}

export function isAdtElement<A extends { _tag: string }, K extends A["_tag"]>(
  tag: K
): (adt: A) => adt is Extract<A, { _tag: K }> {
  return (adt: A): adt is Extract<A, { _tag: K }> => adt["_tag"] === tag
}

export function isGenericAdtElement<T extends string>(
  _t: T
): <A extends { [k in T]: string }, K extends A[T]>(
  tag: K
) => (adt: A) => adt is Extract<A, { [k in T]: K }> {
  return <A extends { [k in T]: string }, K extends A[T]>(tag: K) =>
    (adt: A): adt is Extract<A, { [k in T]: K }> =>
      adt[_t] === tag
}

export function onAdtElement<A extends { _tag: string }, K extends A["_tag"], B>(
  tag: K,
  f: (_: Extract<A, { _tag: K }>) => B
): (adt: A) => Option<B> {
  return (adt: A) => {
    if (adt["_tag"] === tag) {
      return some(f(adt as any))
    }
    return none
  }
}

export function onGenericAdtElement<T extends string>(_t: T) {
  return <A extends { [k in T]: string }, K extends A[T], B>(
      tag: K,
      f: (_: Extract<A, { [k in T]: K }>) => B
    ) =>
    (adt: A): Option<B> => {
      if (adt[_t] === tag) {
        return some(f(adt as any))
      }
      return none
    }
}
