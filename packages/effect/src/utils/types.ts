import { Effect, AsyncContext } from "../effect";

export type Env<T, Q = AsyncContext> = T extends Effect<infer _R & Q, infer _E, infer _A> ? _R : never;
export type Err<T> = T extends Effect<infer _R, infer _E, infer _A> ? _E : never;
export type Ret<T> = T extends Effect<infer _R, infer _E, infer _A> ? _A : never;

export type PartialEnv<T, Q> = T extends Effect<infer R & Q, infer _E, infer _A> ? R : never;
