import type { UnionToIntersection } from "../Base/Apply"
import type { EffectOption } from "../EffectOption"
import type { Effect, Managed, Stream, StreamEither } from "../Support/Common/types"

export interface GE<S, R, E, A> {
  _E: () => E
  _A: () => A
  _S: () => S
  _R: (_: R) => void
}

export type Env<T, Q = unknown> = UnionToIntersection<
  T extends GE<infer _S, infer _R, infer _E, infer _A>
    ? unknown extends _R
      ? never
      : _R
    : never
> extends infer K & Q
  ? K
  : UnionToIntersection<
      T extends GE<infer _S, infer _R, infer _E, infer _A>
        ? unknown extends _R
          ? never
          : _R
        : never
    >

export type Err<T> = T extends GE<infer _S, infer _R, infer _E, infer _A> ? _E : never

export type Ret<T> = T extends GE<infer _S, infer _R, infer _E, infer _A> ? _A : never

export type Op<T> = T extends GE<infer _S, infer _R, infer _E, infer _A> ? _S : never

export type Erase<R, K> = R & K extends K & infer R1 ? R1 : R

export type Mutable<T> = {
  -readonly [P in keyof T]: T[P]
}

export function mutable<T>(_: T): Mutable<T> {
  return _
}

export type Compact<H> = [H] extends [Effect<infer S, infer R, infer E, infer A>]
  ? Effect<S, R, E, A>
  : [H] extends [Stream<infer S, infer R, infer E, infer A>]
  ? Stream<S, R, E, A>
  : [H] extends [StreamEither<infer S, infer R, infer E, infer A>]
  ? StreamEither<S, R, E, A>
  : [H] extends [Managed<infer S, infer R, infer E, infer A>]
  ? Managed<S, R, E, A>
  : [H] extends [EffectOption<infer S, infer R, infer E, infer A>]
  ? EffectOption<S, R, E, A>
  : H
