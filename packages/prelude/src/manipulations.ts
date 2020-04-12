import { eff as EFF } from "@matechs/effect";
import { Kind4 } from "fp-ts/lib/HKT";
import {
  A,
  AnyAIO,
  AnyIO,
  AnySIO,
  Async,
  AsyncE,
  AsyncRE,
  E,
  R,
  Sync,
  SyncE,
  SyncRE
} from "./definitions";

export declare type EnforceNonEmptyRecord<R> = keyof R extends never ? never : R;

export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;

export interface GenEffect<S, R, E, A> {
  _TAG: () => "Eff";
  _E: () => E;
  _A: () => A;
  _S: () => S;
  _R: (_: R) => void;
}

export type STypeOf<X> = X extends GenEffect<infer _S, infer _R, infer _E, infer _A> ? _S : never;

export type ATypeOf<X> = X extends GenEffect<infer _S, infer _R, infer _E, infer _A> ? _A : never;

export type ETypeOf<X> = X extends GenEffect<infer _S, infer _R, infer _E, infer _A> ? _E : never;

export type RTypeOf<X> = X extends GenEffect<infer _S, infer _R, infer _E, infer _A> ? _R : never;

export type EnvOf<R extends Record<string, GenEffect<any, any, any, any>>> = UnionToIntersection<
  {
    [K in keyof R]: unknown extends RTypeOf<R[K]> ? never : RTypeOf<R[K]>;
  }[keyof R]
>;

export type SOf<R extends Record<string, GenEffect<any, any, any, any>>> = {
  [K in keyof R]: STypeOf<R[K]>;
}[keyof R];

export type RTA<K extends AnyAIO> = unknown extends R<K>
  ? E<K> extends never
    ? Async<A<K>>
    : AsyncE<E<K>, A<K>>
  : AsyncRE<R<K>, E<K>, A<K>>;

export type RTS<K extends AnySIO> = unknown extends R<K>
  ? E<K> extends never
    ? Sync<A<K>>
    : SyncE<E<K>, A<K>>
  : SyncRE<R<K>, E<K>, A<K>>;

export type RT<K extends AnyIO> = unknown extends ReturnType<K["_S"]>
  ? RTA<K>
  : K extends AnySIO
  ? RTS<K>
  : K;

export interface Do4CE<M extends EFF.URI, Q, S extends object, U, L> {
  do: <Q1, E, R>(ma: Kind4<M, Q1, R, E, unknown>) => Do4CE<M, Q | Q1, S, U & R, L | E>;
  doL: <Q1, E, R>(f: (s: S) => Kind4<M, Q1, R, E, unknown>) => Do4CE<M, Q | Q1, S, U & R, L | E>;
  bind: <N extends string, Q1, E, R, A>(
    name: Exclude<N, keyof S>,
    ma: Kind4<M, Q1, R, E, A>
  ) => Do4CE<M, Q | Q1, S & { [K in N]: A }, U & R, L | E>;
  bindL: <N extends string, Q1, E, R, A>(
    name: Exclude<N, keyof S>,
    f: (s: S) => Kind4<M, Q1, R, E, A>
  ) => Do4CE<M, Q | Q1, S & { [K in N]: A }, U & R, L | E>;
  let: <N extends string, E, R, A>(
    name: Exclude<N, keyof S>,
    a: A
  ) => Do4CE<M, Q, S & { [K in N]: A }, U & R, L | E>;
  letL: <N extends string, E, R, A>(
    name: Exclude<N, keyof S>,
    f: (s: S) => A
  ) => Do4CE<M, Q, S & { [K in N]: A }, U & R, L | E>;
  sequenceS: <R extends Record<string, GenEffect<any, any, any, any>>>(
    r: EnforceNonEmptyRecord<R> & { [K in keyof S]?: never }
  ) => Do4CE<
    M,
    SOf<R>,
    S & { [K in keyof R]: ATypeOf<R[K]> },
    U & EnvOf<R>,
    L | ETypeOf<R[keyof R]>
  >;
  sequenceSL: <R extends Record<string, GenEffect<any, any, any, any>>>(
    f: (s: S) => EnforceNonEmptyRecord<R> & { [K in keyof S]?: never }
  ) => Do4CE<
    M,
    SOf<R>,
    S & { [K in keyof R]: ATypeOf<R[K]> },
    U & EnvOf<R>,
    L | ETypeOf<R[keyof R]>
  >;
  return: <A>(f: (s: S) => A) => RT<EFF.RT<Q, U, L, A>>;
  done: () => RT<EFF.RT<Q, U, L, S>>;
}
