/**
 * Inspired by https://github.com/gcanti/fp-ts/blob/master/src/HKT.ts
 */

import { identity } from "../../_system/Function"

export type HKT<URI, Out> = HKT2<URI, any, Out>

export type HKT2<URI, Err, Out> = HKT3<URI, any, Err, Out>

export type HKT3<URI, Env, Err, Out> = HKT4<URI, any, Env, Err, Out>

export type HKT4<URI, St, Env, Err, Out> = HKT5<URI, any, St, Env, Err, Out>

export type HKT5<URI, In, St, Env, Err, Out> = HKT6<URI, any, In, St, Env, Err, Out>

export type HKT6<URI, X, In, St, Env, Err, Out> = HKT7<
  URI,
  any,
  X,
  In,
  St,
  Env,
  Err,
  Out
>

export type HKT7<URI, SO, X, In, St, Env, Err, Out> = HKT8<
  URI,
  any,
  SO,
  X,
  In,
  St,
  Env,
  Err,
  Out
>

export type HKT8<URI, SI, SO, X, In, St, Env, Err, Out> = HKT9<
  URI,
  any,
  SI,
  SO,
  X,
  In,
  St,
  Env,
  Err,
  Out
>

export interface HKT9<URI, K extends string, SI, SO, X, In, St, Env, Err, Out> {
  readonly _URI: URI
  readonly _Out: () => Out
  readonly _Err: () => Err
  readonly _Env: (_: Env) => void
  readonly _St: St
  readonly _In: (_: In) => void
  readonly _X: () => X
  readonly _O: () => SO
  readonly _I: (_: SI) => void
  readonly _K: () => K
}

/**
 * Typelevel Map: URI => Type
 */
export interface URItoKind<
  // Encode nominal (string based) keys
  K extends string,
  // Encode state input
  SI,
  // Encode state output
  SO,
  // Encode generic contravariant (used to encode async/sync)
  X,
  // Encode contravariant input
  I,
  // Encode invariant state
  S,
  // Encode contravariant input
  Env,
  // Encode covariant error
  Err,
  // Encode covariant output
  Out
> {}

/**
 * URI of the Typelevel Map
 */
export type URIS = keyof URItoKind<any, any, any, any, any, any, any, any, any>

/**
 * Kind<F, A> = URItoKind[F][A]
 */
export type Kind<
  URI extends URIS,
  K extends string,
  SI,
  SO,
  X,
  In,
  St,
  Env,
  Err,
  Out
> = URI extends URIS ? URItoKind<K, SI, SO, X, In, St, Env, Err, Out>[URI] : any

/**
 * Used to require URI in typeclasses
 */
export interface HasURI<F> {
  readonly URI: F
}

export interface HasConstrainedE<F, X> extends HasURI<F> {
  readonly E: X
}

export function castErr<T>(): {
  <F extends URIS>(_?: F): <K extends string, SI, SO, X, In, St, Env, Err, Out>(
    self: Kind<F, K, SI, SO, X, In, St, Env, Err, Out>
  ) => Kind<F, K, SI, SO, X, In, St, Env, T, Out>
  <F>(_?: F): <K extends string, SI, SO, X, In, St, Env, Err, Out>(
    self: HKT9<F, K, SI, SO, X, In, St, Env, Err, Out>
  ) => HKT9<F, K, SI, SO, X, In, St, Env, T, Out>
}
export function castErr() {
  return () => identity as any
}

export function castEnv<T>(): {
  <F extends URIS>(_?: F): <K extends string, SI, SO, X, In, St, Env, Err, Out>(
    self: Kind<F, K, SI, SO, X, In, St, Env, Err, Out>
  ) => Kind<F, K, SI, SO, X, In, St, T, Err, Out>
  <F>(_?: F): <K extends string, SI, SO, X, In, St, Env, Err, Out>(
    self: HKT9<F, K, SI, SO, X, In, St, Env, Err, Out>
  ) => HKT9<F, K, SI, SO, X, In, St, T, Err, Out>
}
export function castEnv() {
  return () => identity as any
}

export function castSt<T>(): {
  <F extends URIS>(_?: F): <K extends string, SI, SO, X, In, St, Env, Err, Out>(
    self: Kind<F, K, SI, SO, X, In, St, Env, Err, Out>
  ) => Kind<F, K, SI, SO, X, In, T, Env, Err, Out>
  <F>(_?: F): <K extends string, SI, SO, X, In, St, Env, Err, Out>(
    self: HKT9<F, K, SI, SO, X, In, St, Env, Err, Out>
  ) => HKT9<F, K, SI, SO, X, In, T, Env, Err, Out>
}
export function castSt() {
  return () => identity as any
}

export function castIn<T>(): {
  <F extends URIS>(_?: F): <K extends string, SI, SO, X, In, St, Env, Err, Out>(
    self: Kind<F, K, SI, SO, X, In, St, Env, Err, Out>
  ) => Kind<F, K, SI, SO, X, T, St, Env, Err, Out>
  <F>(_?: F): <K extends string, SI, SO, X, In, St, Env, Err, Out>(
    self: HKT9<F, K, SI, SO, X, In, St, Env, Err, Out>
  ) => HKT9<F, K, SI, SO, X, T, St, Env, Err, Out>
}
export function castIn() {
  return () => identity as any
}

export function castX<T>(): {
  <F extends URIS>(_?: F): <K extends string, SI, SO, X, In, St, Env, Err, Out>(
    self: Kind<F, K, SI, SO, X, In, St, Env, Err, Out>
  ) => Kind<F, K, SI, SO, T, In, St, Env, Err, Out>
  <F>(_?: F): <K extends string, SI, SO, X, In, St, Env, Err, Out>(
    self: HKT9<F, K, SI, SO, X, In, St, Env, Err, Out>
  ) => HKT9<F, K, SI, SO, T, In, St, Env, Err, Out>
}
export function castX() {
  return () => identity as any
}

export function castSO<T>(): {
  <F extends URIS>(_?: F): <K extends string, SI, SO, X, In, St, Env, Err, Out>(
    self: Kind<F, K, SI, SO, X, In, St, Env, Err, Out>
  ) => Kind<F, K, SI, T, X, In, St, Env, Err, Out>
  <F>(_?: F): <K extends string, SI, SO, X, In, St, Env, Err, Out>(
    self: HKT9<F, K, SI, SO, X, In, St, Env, Err, Out>
  ) => HKT9<F, K, SI, T, X, In, St, Env, Err, Out>
}
export function castSO() {
  return () => identity as any
}

export function castSI<T>(): {
  <F extends URIS>(_?: F): <K extends string, SI, SO, X, In, St, Env, Err, Out>(
    self: Kind<F, K, SI, SO, X, In, St, Env, Err, Out>
  ) => Kind<F, K, T, SO, X, In, St, Env, Err, Out>
  <F>(_?: F): <K extends string, SI, SO, X, In, St, Env, Err, Out>(
    self: HKT9<F, K, SI, SO, X, In, St, Env, Err, Out>
  ) => HKT9<F, K, T, SO, X, In, St, Env, Err, Out>
}
export function castSI() {
  return () => identity as any
}

export function castK<T extends string>(): {
  <F extends URIS>(_?: F): <K extends string, SI, SO, X, In, St, Env, Err, Out>(
    self: Kind<F, K, SI, SO, X, In, St, Env, Err, Out>
  ) => Kind<F, T, SI, SO, X, In, St, Env, Err, Out>
  <F>(_?: F): <K extends string, SI, SO, X, In, St, Env, Err, Out>(
    self: HKT9<F, K, SI, SO, X, In, St, Env, Err, Out>
  ) => HKT9<F, T, SI, SO, X, In, St, Env, Err, Out>
}
export function castK() {
  return () => identity as any
}

export interface URItoKeys<K extends string, SI, SO, X, I, S, Env, Err, Out> {}

export type KeyFor<
  F,
  K extends string,
  SI,
  SO,
  X,
  I,
  S,
  Env,
  Err,
  Out
> = F extends keyof URItoKeys<any, any, any, any, any, any, any, any, any>
  ? URItoKeys<K, SI, SO, X, I, S, Env, Err, Out>[F]
  : never
