import { Effect } from "../effect";

export type Env<T, Q = unknown> = T extends Effect<infer _S, infer _R & Q, infer _E, infer _A>
  ? _R
  : never;

export type Err<T> = T extends Effect<infer _S, infer _R, infer _E, infer _A> ? _E : never;

export type Ret<T> = T extends Effect<infer _S, infer _R, infer _E, infer _A> ? _A : never;

export type Op<T> = T extends Effect<infer _S, infer _R, infer _E, infer _A> ? _S : never;
