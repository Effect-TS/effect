/* adapted from https://github.com/gcanti/fp-ts-contrib */

import { sequenceS } from "../Apply"
import {
  CApplicative,
  CApplicative4MA,
  CApplicative4MAP,
  CApplicative4MAC,
  CApplicative4MAPC,
  CApplicative3,
  CApplicative2,
  CApplicative2C,
  CApplicative1
} from "../Base"
import type { SOf, ATypeOf, EnvOf, ETypeOf } from "../Base/Apply"
import type {
  HKT,
  URIS3,
  Kind3,
  URIS2,
  Kind2,
  URIS,
  Kind,
  MaURIS,
  Kind4
} from "../Base/HKT"
import type {
  CMonad,
  CMonad3,
  CMonad2,
  CMonad2C,
  CMonad1,
  CMonad4MA,
  CMonad4MAC
} from "../Base/Monad"

export class Pipe<A, A2> {
  constructor(private readonly _: A, private readonly _2: A2) {
    this.do = this.do.bind(this)
    this.access = this.access.bind(this)
    this.pipe = this.pipe.bind(this)
    this.done = this.done.bind(this)
  }
  do<B>(f: (_: A2) => B) {
    return new Pipe(f(this._2), this._2)
  }
  access<B>(f: (_: A2) => (_: A) => B) {
    return new Pipe(f(this._2)(this._), this._2)
  }
  pipe<B>(f: (_: A) => B) {
    return new Pipe(f(this._), this._2)
  }
  done(): A {
    return this._
  }
}

class DoClass<M> {
  constructor(readonly M: CMonad<M> & CApplicative<M>, private result: HKT<M, any>) {}
  do(action: HKT<M, any>): DoClass<M> {
    return new DoClass(
      this.M,
      this.M.chain((s) => this.M.map(() => s)(action))(this.result)
    )
  }
  doL(f: (s: any) => HKT<M, any>): DoClass<M> {
    return new DoClass(
      this.M,
      this.M.chain((s) => this.M.map(() => s)(f(s)))(this.result)
    )
  }
  bind(name: string, action: HKT<M, any>): DoClass<M> {
    return new DoClass(
      this.M,
      this.M.chain((s) =>
        this.M.map((b) => Object.assign({}, s, { [name]: b }))(action)
      )(this.result)
    )
  }
  bindL(name: string, f: (s: any) => HKT<M, any>): DoClass<M> {
    return new DoClass(
      this.M,
      this.M.chain((s) => this.M.map((b) => Object.assign({}, s, { [name]: b }))(f(s)))(
        this.result
      )
    )
  }
  let(name: string, a: any): DoClass<M> {
    return new DoClass(
      this.M,
      this.M.map((s) => Object.assign({}, s, { [name]: a }))(this.result)
    )
  }
  letL(name: string, f: (s: any) => any): DoClass<M> {
    return new DoClass(
      this.M,
      this.M.map((s) => Object.assign({}, s, { [name]: f(s) }))(this.result)
    )
  }
  sequenceS(r: Record<string, HKT<M, any>>): DoClass<M> {
    return new DoClass(
      this.M,
      this.M.chain((s) =>
        this.M.map((r) => Object.assign({}, s, r))(sequenceS(this.M)(r))
      )(this.result)
    )
  }
  sequenceSL(f: (s: any) => Record<string, HKT<M, any>>): DoClass<M> {
    return new DoClass(
      this.M,
      this.M.chain((s) =>
        this.M.map((r) => Object.assign({}, s, r))(sequenceS(this.M)(f(s)))
      )(this.result)
    )
  }
  pipe(f: (s: HKT<M, any>) => HKT<M, any>) {
    return new DoClass(this.M, f(this.result))
  }
  return<B>(f: (s: any) => B): HKT<M, B> {
    return this.M.map(f)(this.result)
  }
  done(): HKT<M, any> {
    return this.result
  }
}

type EnforceNonEmptyRecord<R> = keyof R extends never ? never : R

export interface Do4CE<M extends MaURIS, Q, S extends object, U, L> {
  do: <Q1, E, R>(ma: Kind4<M, Q1, R, E, unknown>) => Do4CE<M, Q | Q1, S, U & R, L | E>
  doL: <Q1, E, R>(
    f: (s: S) => Kind4<M, Q1, R, E, unknown>
  ) => Do4CE<M, Q | Q1, S, U & R, L | E>
  bind: <N extends string, Q1, E, R, A>(
    name: Exclude<N, keyof S>,
    ma: Kind4<M, Q1, R, E, A>
  ) => Do4CE<M, Q | Q1, S & { [K in N]: A }, U & R, L | E>
  bindL: <N extends string, Q1, E, R, A>(
    name: Exclude<N, keyof S>,
    f: (s: S) => Kind4<M, Q1, R, E, A>
  ) => Do4CE<M, Q | Q1, S & { [K in N]: A }, U & R, L | E>
  let: <N extends string, A>(
    name: Exclude<N, keyof S>,
    a: A
  ) => Do4CE<M, Q, S & { [K in N]: A }, U, L>
  letL: <N extends string, A>(
    name: Exclude<N, keyof S>,
    f: (s: S) => A
  ) => Do4CE<M, Q, S & { [K in N]: A }, U, L>
  sequenceS: <R extends Record<string, Kind4<M, any, any, any, any>>>(
    r: EnforceNonEmptyRecord<R> & { [K in keyof S]?: never }
  ) => Do4CE<
    M,
    SOf<R> | Q,
    S & { [K in keyof R]: ATypeOf<R[K]> },
    U & EnvOf<R>,
    L | ETypeOf<R[keyof R]>
  >
  sequenceSL: <R extends Record<string, Kind4<M, any, any, any, any>>>(
    f: (s: S) => EnforceNonEmptyRecord<R> & { [K in keyof S]?: never }
  ) => Do4CE<
    M,
    SOf<R> | Q,
    S & { [K in keyof R]: ATypeOf<R[K]> },
    U & EnvOf<R>,
    L | ETypeOf<R[keyof R]>
  >
  pipe: <Q2, U2, L2>(
    f: (s: Kind4<M, Q, U, L, S>) => Kind4<M, Q2, U2, L2, S>
  ) => Do4CE<M, Q2, S, U2, L2>
  return: <A>(f: (s: S) => A) => Kind4<M, Q, U, L, A>
  done: () => Kind4<M, Q, U, L, S>
}

// eslint-disable-next-line @typescript-eslint/class-name-casing
export interface Do4CE_<M extends MaURIS, Q, S extends object, U, L> {
  do: <Q1, R>(ma: Kind4<M, Q1, R, L, unknown>) => Do4CE_<M, Q | Q1, S, U & R, L>
  doL: <Q1, R>(
    f: (s: S) => Kind4<M, Q1, R, L, unknown>
  ) => Do4CE_<M, Q | Q1, S, U & R, L>
  bind: <N extends string, Q1, R, A>(
    name: Exclude<N, keyof S>,
    ma: Kind4<M, Q1, R, L, A>
  ) => Do4CE_<M, Q | Q1, S & { [K in N]: A }, U & R, L>
  bindL: <N extends string, Q1, R, A>(
    name: Exclude<N, keyof S>,
    f: (s: S) => Kind4<M, Q1, R, L, A>
  ) => Do4CE_<M, Q | Q1, S & { [K in N]: A }, U & R, L>
  let: <N extends string, A>(
    name: Exclude<N, keyof S>,
    a: A
  ) => Do4CE<M, Q, S & { [K in N]: A }, U, L>
  letL: <N extends string, A>(
    name: Exclude<N, keyof S>,
    f: (s: S) => A
  ) => Do4CE<M, Q, S & { [K in N]: A }, U, L>
  sequenceS: <R extends Record<string, Kind4<M, any, any, L, any>>>(
    r: EnforceNonEmptyRecord<R> & { [K in keyof S]?: never }
  ) => Do4CE_<M, SOf<R> | Q, S & { [K in keyof R]: ATypeOf<R[K]> }, U & EnvOf<R>, L>
  sequenceSL: <R extends Record<string, Kind4<M, any, any, L, any>>>(
    f: (s: S) => EnforceNonEmptyRecord<R> & { [K in keyof S]?: never }
  ) => Do4CE_<M, SOf<R> | Q, S & { [K in keyof R]: ATypeOf<R[K]> }, U & EnvOf<R>, L>
  pipe: <Q2, U2>(
    f: (s: Kind4<M, Q, U, L, S>) => Kind4<M, Q2, U2, L, S>
  ) => Do4CE<M, Q2, S, U2, L>
  return: <A>(f: (s: S) => A) => Kind4<M, Q, U, L, A>
  done: () => Kind4<M, Q, U, L, S>
}

export interface Do3<M extends URIS3, S extends object> {
  do: <R, E>(ma: Kind3<M, R, E, any>) => Do3C<M, S, R, E>
  doL: <R, E>(f: (s: S) => Kind3<M, R, E, any>) => Do3C<M, S, R, E>
  bind: <N extends string, A, R, E>(
    name: Exclude<N, keyof S>,
    ma: Kind3<M, R, E, A>
  ) => Do3C<M, S & { [K in N]: A }, R, E>
  bindL: <N extends string, A, R, E>(
    name: Exclude<N, keyof S>,
    f: (s: S) => Kind3<M, R, E, A>
  ) => Do3C<M, S & { [K in N]: A }, R, E>
  let: <N extends string, A, R, E>(
    name: Exclude<N, keyof S>,
    a: A
  ) => Do3C<M, S & { [K in N]: A }, R, E>
  letL: <N extends string, A, R, E>(
    name: Exclude<N, keyof S>,
    f: (s: S) => A
  ) => Do3C<M, S & { [K in N]: A }, R, E>
  sequenceS: <R, E, I extends Record<string, Kind3<M, R, E, any>>>(
    r: EnforceNonEmptyRecord<I> &
      Record<string, Kind3<M, R, E, any>> &
      { [K in keyof S]?: never }
  ) => Do3C<
    M,
    S & { [K in keyof I]: [I[K]] extends [Kind3<M, any, any, infer A>] ? A : never },
    R,
    E
  >
  sequenceSL: <R, E, I extends Record<string, Kind3<M, R, E, any>>>(
    f: (
      s: S
    ) => EnforceNonEmptyRecord<I> &
      Record<string, Kind3<M, R, E, any>> &
      { [K in keyof S]?: never }
  ) => Do3C<
    M,
    S & { [K in keyof I]: [I[K]] extends [Kind3<M, any, any, infer A>] ? A : never },
    R,
    E
  >
  return: <R, E, A>(f: (s: S) => A) => Kind3<M, R, E, A>
  done: <R, E>() => Kind3<M, R, E, S>
}

export interface Do3C<M extends URIS3, S extends object, R, E> {
  do: (ma: Kind3<M, R, E, any>) => Do3C<M, S, R, E>
  doL: (f: (s: S) => Kind3<M, R, E, any>) => Do3C<M, S, R, E>
  bind: <N extends string, A>(
    name: Exclude<N, keyof S>,
    ma: Kind3<M, R, E, A>
  ) => Do3C<M, S & { [K in N]: A }, R, E>
  bindL: <N extends string, A>(
    name: Exclude<N, keyof S>,
    f: (s: S) => Kind3<M, R, E, A>
  ) => Do3C<M, S & { [K in N]: A }, R, E>
  let: <N extends string, A>(
    name: Exclude<N, keyof S>,
    a: A
  ) => Do3C<M, S & { [K in N]: A }, R, E>
  letL: <N extends string, A>(
    name: Exclude<N, keyof S>,
    f: (s: S) => A
  ) => Do3C<M, S & { [K in N]: A }, R, E>
  sequenceS: <I extends Record<string, Kind3<M, R, E, any>>>(
    r: EnforceNonEmptyRecord<I> & { [K in keyof S]?: never }
  ) => Do3C<
    M,
    S & { [K in keyof I]: [I[K]] extends [Kind3<M, any, any, infer A>] ? A : never },
    R,
    E
  >
  sequenceSL: <I extends Record<string, Kind3<M, R, E, any>>>(
    f: (s: S) => EnforceNonEmptyRecord<I> & { [K in keyof S]?: never }
  ) => Do3C<
    M,
    S & { [K in keyof I]: [I[K]] extends [Kind3<M, any, any, infer A>] ? A : never },
    R,
    E
  >
  return: <A>(f: (s: S) => A) => Kind3<M, R, E, A>
  done: () => Kind3<M, R, E, S>
}

export interface Do2<M extends URIS2, S extends object> {
  do: <E>(ma: Kind2<M, E, any>) => Do2C<M, S, E>
  doL: <E>(f: (s: S) => Kind2<M, E, any>) => Do2C<M, S, E>
  bind: <N extends string, A, E>(
    name: Exclude<N, keyof S>,
    ma: Kind2<M, E, A>
  ) => Do2C<M, S & { [K in N]: A }, E>
  bindL: <N extends string, A, E>(
    name: Exclude<N, keyof S>,
    f: (s: S) => Kind2<M, E, A>
  ) => Do2C<M, S & { [K in N]: A }, E>
  let: <N extends string, A, E>(
    name: Exclude<N, keyof S>,
    a: A
  ) => Do2C<M, S & { [K in N]: A }, E>
  letL: <N extends string, A, E>(
    name: Exclude<N, keyof S>,
    f: (s: S) => A
  ) => Do2C<M, S & { [K in N]: A }, E>
  sequenceS: <E, I extends Record<string, Kind2<M, E, any>>>(
    r: EnforceNonEmptyRecord<I> &
      Record<string, Kind2<M, E, any>> &
      { [K in keyof S]?: never }
  ) => Do2C<
    M,
    S & { [K in keyof I]: [I[K]] extends [Kind2<M, any, infer A>] ? A : never },
    E
  >
  sequenceSL: <E, I extends Record<string, Kind2<M, E, any>>>(
    f: (
      s: S
    ) => EnforceNonEmptyRecord<I> &
      Record<string, Kind2<M, E, any>> &
      { [K in keyof S]?: never }
  ) => Do2C<
    M,
    S & { [K in keyof I]: [I[K]] extends [Kind2<M, any, infer A>] ? A : never },
    E
  >
  return: <E, A>(f: (s: S) => A) => Kind2<M, E, A>
  done: <E>() => Kind2<M, E, S>
}

export interface Do2C<M extends URIS2, S extends object, E> {
  do: (ma: Kind2<M, E, any>) => Do2C<M, S, E>
  doL: (f: (s: S) => Kind2<M, E, any>) => Do2C<M, S, E>
  bind: <N extends string, A>(
    name: Exclude<N, keyof S>,
    ma: Kind2<M, E, A>
  ) => Do2C<M, S & { [K in N]: A }, E>
  bindL: <N extends string, A>(
    name: Exclude<N, keyof S>,
    f: (s: S) => Kind2<M, E, A>
  ) => Do2C<M, S & { [K in N]: A }, E>
  let: <N extends string, A>(
    name: Exclude<N, keyof S>,
    a: A
  ) => Do2C<M, S & { [K in N]: A }, E>
  letL: <N extends string, A>(
    name: Exclude<N, keyof S>,
    f: (s: S) => A
  ) => Do2C<M, S & { [K in N]: A }, E>
  sequenceS: <I extends Record<string, Kind2<M, E, any>>>(
    r: EnforceNonEmptyRecord<I> & { [K in keyof S]?: never }
  ) => Do2C<
    M,
    S & { [K in keyof I]: [I[K]] extends [Kind2<M, any, infer A>] ? A : never },
    E
  >
  sequenceSL: <I extends Record<string, Kind2<M, E, any>>>(
    f: (s: S) => EnforceNonEmptyRecord<I> & { [K in keyof S]?: never }
  ) => Do2C<
    M,
    S & { [K in keyof I]: [I[K]] extends [Kind2<M, any, infer A>] ? A : never },
    E
  >
  return: <A>(f: (s: S) => A) => Kind2<M, E, A>
  done: () => Kind2<M, E, S>
}

export interface Do1<M extends URIS, S extends object> {
  do: (ma: Kind<M, any>) => Do1<M, S>
  doL: (f: (s: S) => Kind<M, any>) => Do1<M, S>
  bind: <N extends string, A>(
    name: Exclude<N, keyof S>,
    ma: Kind<M, A>
  ) => Do1<M, S & { [K in N]: A }>
  bindL: <N extends string, A>(
    name: Exclude<N, keyof S>,
    f: (s: S) => Kind<M, A>
  ) => Do1<M, S & { [K in N]: A }>
  let: <N extends string, A>(
    name: Exclude<N, keyof S>,
    a: A
  ) => Do1<M, S & { [K in N]: A }>
  letL: <N extends string, A>(
    name: Exclude<N, keyof S>,
    f: (s: S) => A
  ) => Do1<M, S & { [K in N]: A }>
  sequenceS: <R extends Record<string, Kind<M, any>>>(
    r: EnforceNonEmptyRecord<R> & { [K in keyof S]?: never }
  ) => Do1<M, S & { [K in keyof R]: [R[K]] extends [Kind<M, infer A>] ? A : never }>
  sequenceSL: <I extends Record<string, Kind<M, any>>>(
    f: (s: S) => EnforceNonEmptyRecord<I> & { [K in keyof S]?: never }
  ) => Do1<M, S & { [K in keyof I]: [I[K]] extends [Kind<M, infer A>] ? A : never }>
  return: <A>(f: (s: S) => A) => Kind<M, A>
  done: () => Kind<M, S>
}

export interface Do0<M, S extends object> {
  do: (ma: HKT<M, any>) => Do0<M, S>
  doL: (f: (s: S) => HKT<M, any>) => Do0<M, S>
  bind: <N extends string, A>(
    name: Exclude<N, keyof S>,
    ma: HKT<M, A>
  ) => Do0<M, S & { [K in N]: A }>
  bindL: <N extends string, A>(
    name: Exclude<N, keyof S>,
    f: (s: S) => HKT<M, A>
  ) => Do0<M, S & { [K in N]: A }>
  let: <N extends string, A>(
    name: Exclude<N, keyof S>,
    a: A
  ) => Do0<M, S & { [K in N]: A }>
  letL: <N extends string, A>(
    name: Exclude<N, keyof S>,
    f: (s: S) => A
  ) => Do0<M, S & { [K in N]: A }>
  sequenceS: <R extends Record<string, HKT<M, any>>>(
    r: EnforceNonEmptyRecord<R> & { [K in keyof S]?: never }
  ) => Do0<M, S & { [K in keyof R]: [R[K]] extends [HKT<M, infer A>] ? A : never }>
  sequenceSL: <R extends Record<string, HKT<M, any>>>(
    f: (s: S) => EnforceNonEmptyRecord<R> & { [K in keyof S]?: never }
  ) => Do0<M, S & { [K in keyof R]: [R[K]] extends [HKT<M, infer A>] ? A : never }>
  return: <A>(f: (s: S) => A) => HKT<M, A>
  done: () => HKT<M, S>
}

export function Do<M extends MaURIS>(
  M: CMonad4MA<M> & CApplicative4MA<M>
): Do4CE<M, never, {}, unknown, never>
export function Do<M extends MaURIS>(
  M: CMonad4MA<M> & CApplicative4MAP<M>
): Do4CE<M, unknown, {}, unknown, never>
export function Do<M extends MaURIS, E>(
  M: CMonad4MAC<M, E> & CApplicative4MAC<M, E>
): Do4CE_<M, never, {}, unknown, E>
export function Do<M extends MaURIS, E>(
  M: CMonad4MAC<M, E> & CApplicative4MAPC<M, E>
): Do4CE_<M, unknown, {}, unknown, E>
export function Do<M extends URIS3>(M: CMonad3<M> & CApplicative3<M>): Do3<M, {}>
export function Do<M extends URIS2>(M: CMonad2<M> & CApplicative2<M>): Do2<M, {}>
export function Do<M extends URIS2, L>(
  M: CMonad2C<M, L> & CApplicative2C<M, L>
): Do2C<M, {}, L>
export function Do<M extends URIS>(M: CMonad1<M> & CApplicative1<M>): Do1<M, {}>
export function Do<M>(M: CMonad<M> & CApplicative<M>): Do0<M, {}>
export function Do<M>(M: CMonad<M> & CApplicative<M>): any {
  return new DoClass(M, M.of({}))
}
