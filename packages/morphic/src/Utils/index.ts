import type { Array } from "@effect-ts/core/Array"
import * as R from "@effect-ts/core/Record"

export const mapRecord = <Dic extends { [k in keyof Dic]: any }, B>(
  d: Dic,
  f: (v: Dic[keyof Dic]) => B
): { [k in keyof Dic]: B } => R.map_(d, f) as { [k in keyof Dic]: B }

export const projectField = <T extends R.Record<any, R.Record<any, any>>>(t: T) => <
  K extends keyof T[keyof T]
>(
  k: K
): {
  [q in keyof T]: T[q][K]
} =>
  R.map_(t, (p) => p[k]) as {
    [q in keyof T]: T[q][K]
  }

export const projectFieldWithEnv = <
  T extends R.Record<any, (e: R) => R.Record<any, any>>,
  R
>(
  t: T,
  env: R
) => <K extends keyof ReturnType<T[keyof T]>>(
  k: K
): {
  [q in keyof T]: ReturnType<T[q]>[K]
} =>
  R.map_(t, (p) => p(env)[k]) as {
    [q in keyof T]: ReturnType<T[q]>[K]
  }

export const projectFieldWithEnv2 = <
  T extends R.Record<any, (e: R) => R.Record<any, any>>,
  R
>(
  t: T,
  env: R
): {
  [q in keyof T]: ReturnType<T[q]>
} =>
  R.map_(t, (p) => p(env)) as {
    [q in keyof T]: ReturnType<T[q]>
  }

export function conjunction<A, B>(...x: [A, B]): A & B
export function conjunction<A, B, C>(...x: [A, B, C]): A & B & C
export function conjunction<A, B, C, D>(...x: [A, B, C, D]): A & B & C & D
export function conjunction<A, B, C, D, E>(...x: [A, B, C, D, E]): A & B & C & D & E
export function conjunction<A, B, C, D, E, F>(
  ...x: [A, B, C, D, E, F]
): A & B & C & D & E & F
export function conjunction<A, B, C, D, E, F, G>(
  ...x: [A, B, C, D, E, F, G]
): A & B & C & D & E & F & G
export function conjunction<A, B, C, D, E, F, G, H>(
  ...x: [A, B, C, D, E, F, G, H]
): A & B & C & D & E & F & G & H
export function conjunction<A, B, C, D, E, F, G, H, I>(
  ...x: [A, B, C, D, E, F, G, H, I]
): A & B & C & D & E & F & G & H & I
export function conjunction<A, B, C, D, E, F, G, H, I, J>(
  ...x: [A, B, C, D, E, F, G, H, I, J]
): A & B & C & D & E & F & G & H & I & J
export function conjunction<A, B, C, D, E, F, G, H, I, J, K>(
  ...x: [A, B, C, D, E, F, G, H, I, J, K]
): A & B & C & D & E & F & G & H & I & J & K
export function conjunction<A, B, C, D, E, F, G, H, I, J, K, L>(
  ...x: [A, B, C, D, E, F, G, H, I, J, K, L]
): A & B & C & D & E & F & G & H & I & J & K & L

export function conjunction<A, B, C, D, E, F, G, H, I, J, K, L, M>(
  ...x: [A, B, C, D, E, F, G, H, I, J, K, L, M]
): A & B & C & D & E & F & G & H & I & J & K & L & M
export function conjunction<R extends unknown[]>(...x: R): any[] {
  return Object.assign({}, ...x)
}

export const merge = conjunction

export const collect = <K extends string, A, B>(
  d: R.Record<K, A>,
  f: (k: K, a: A) => B
): Array<B> => R.collect(f)(d)

export const memo: <F extends () => any>(get: F) => typeof get = <F extends () => any>(
  get: F
): typeof get => {
  type A = ReturnType<F>
  let cache: A | undefined = undefined
  return ((): A => {
    if (cache === undefined) {
      cache = get()
    }
    return cache as A
  }) as any
}

export type IsNever<X, Y, N> = "X" | X extends "X" ? Y : N

export type Includes<A, B, Y, N> = IsNever<B, Y, A extends B ? Y : N>
