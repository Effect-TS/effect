import type { UnionToIntersection } from "../Base/Apply"

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
