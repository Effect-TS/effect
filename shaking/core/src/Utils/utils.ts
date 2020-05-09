export interface GE<S, R, E, A> {
  _E: () => E
  _A: () => A
  _S: () => S
  _R: (_: R) => void
}

export type Env<T, Q = unknown> = T extends GE<
  infer _S,
  infer _R & Q,
  infer _E,
  infer _A
>
  ? _R
  : never

export type Err<T> = T extends GE<infer _S, infer _R, infer _E, infer _A> ? _E : never

export type Ret<T> = T extends GE<infer _S, infer _R, infer _E, infer _A> ? _A : never

export type Op<T> = T extends GE<infer _S, infer _R, infer _E, infer _A> ? _S : never
