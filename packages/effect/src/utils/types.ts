import { Effect } from "../effect";

export type Env<T> = T extends Effect<infer R, infer E, infer A> ? R : never;
export type Err<T> = T extends Effect<infer R, infer E, infer A> ? E : never;
export type Ret<T> = T extends Effect<infer R, infer E, infer A> ? A : never;

export type PartialEnv<T, Q> = T extends Effect<infer R & Q, infer E, infer A> ? R : never;
