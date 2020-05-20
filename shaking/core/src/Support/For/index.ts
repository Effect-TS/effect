import type { Kind4 } from "fp-ts/lib/HKT"

import { sequenceS } from "../../Apply"
import { CMonad4MA, CMonad4MAC, CMonad4MAP, CMonad4MAPC, MaURIS } from "../../Base"
import {
  ATypeOf,
  ETypeOf,
  RTypeOf,
  STypeOf,
  UnionToIntersection
} from "../../Base/Apply"
import { constVoid } from "../../Function"

declare type EnforceNonEmptyRecord<R> = keyof R extends never ? never : R

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

export class ForImpl<U extends MaURIS, S, R, E, A> {
  constructor(
    private readonly M: CMonad4MA<U>,
    private readonly res: Kind4<U, any, any, any, any>
  ) {}
  do<S2, R2, E2, A2>(f: (_: A) => Kind4<U, S2, R2, E2, A2>) {
    return new ForImpl<U, S | S2, R & R2, E | E2, A>(
      this.M,
      this.M.chain((k: A) => this.M.map((_) => k)(f(k)))(this.res)
    )
  }
  with<N extends string, S2, R2, E2, A2>(
    n: Exclude<N, keyof A>,
    f: (_: A) => Kind4<U, S2, R2, E2, A2>
  ) {
    return new ForImpl<U, S | S2, R & R2, E | E2, A & { [k in N]: A2 }>(
      this.M,
      this.M.chain((k: A) => this.M.map((_) => Object.assign(k, { [n]: _ }))(f(k)))(
        this.res
      )
    )
  }
  withPipe<N extends string, S2, R2, E2, A2>(
    n: Exclude<N, keyof A>,
    f: (_: Pipe<A, A>) => Kind4<U, S2, R2, E2, A2>
  ) {
    return new ForImpl<U, S | S2, R & R2, E | E2, A & { [k in N]: A2 }>(
      this.M,
      this.M.chain((k: A) =>
        this.M.map((_) => Object.assign(k, { [n]: _ }))(f(new Pipe(k, k)))
      )(this.res)
    )
  }
  let<N extends string, A2>(n: Exclude<N, keyof A>, f: (_: A) => A2) {
    return new ForImpl<U, S, R, E, A & { [k in N]: A2 }>(
      this.M,
      this.M.map((k: A) => Object.assign(k, { [n]: f(k) }))(this.res)
    )
  }
  all<NER extends Record<string, Kind4<U, any, any, any, any>>>(
    f: (_: A) => EnforceNonEmptyRecord<NER> & { [K in keyof A]?: never }
  ): ForImpl<
    U,
    S | { [k in keyof NER]: STypeOf<NER[k]> }[keyof NER],
    R & UnionToIntersection<{ [k in keyof NER]: RTypeOf<NER[k]> }[keyof NER]>,
    E | { [k in keyof NER]: ETypeOf<NER[k]> }[keyof NER],
    A & { [k in keyof NER]: ATypeOf<NER[k]> }
  > {
    return new ForImpl(
      this.M,
      this.M.chain((k: A) =>
        this.M.map((_) => Object.assign(k, _))(sequenceS(this.M)(f(k) as any))
      )(this.res)
    )
  }
  pipe<S2, R2, E2, A2>(f: (_: Kind4<U, S, R, E, A>) => Kind4<U, S2, R2, E2, A2>) {
    return new ForImpl<U, S2, R2, E2, A2>(this.M, f(this.res))
  }
  return<A2>(f: (_: A) => A2): Kind4<U, S, R, E, A2> {
    return this.M.map(f)(this.res)
  }
  unit(): Kind4<U, S, R, E, void> {
    return this.M.map(constVoid)(this.res)
  }
  done(): Kind4<U, S, R, E, A> {
    return this.res
  }
}

export interface For<U extends MaURIS, S, R, E, A> {
  do<S2, R2, E2, A2>(
    f: (_: A) => Kind4<U, S2, R2, E2, A2>
  ): For<U, S | S2, R & R2, E | E2, A>
  with<N extends string, S2, R2, E2, A2>(
    n: Exclude<N, keyof A>,
    f: (_: A) => Kind4<U, S2, R2, E2, A2>
  ): For<U, S | S2, R & R2, E | E2, A & { [k in N]: A2 }>
  withPipe<N extends string, S2, R2, E2, A2>(
    n: Exclude<N, keyof A>,
    f: (_: Pipe<A, A>) => Kind4<U, S2, R2, E2, A2>
  ): For<U, S | S2, R & R2, E | E2, A & { [k in N]: A2 }>
  let<N extends string, A2>(
    n: Exclude<N, keyof A>,
    f: (_: A) => A2
  ): For<U, S, R, E, A & { [k in N]: A2 }>
  all<NER extends Record<string, Kind4<U, any, any, any, any>>>(
    f: (_: A) => EnforceNonEmptyRecord<NER> & { [K in keyof A]?: never }
  ): For<
    U,
    S | { [k in keyof NER]: STypeOf<NER[k]> }[keyof NER],
    R & UnionToIntersection<{ [k in keyof NER]: RTypeOf<NER[k]> }[keyof NER]>,
    E | { [k in keyof NER]: ETypeOf<NER[k]> }[keyof NER],
    A & { [k in keyof NER]: ATypeOf<NER[k]> }
  >
  pipe<S2, R2, E2, A2>(
    f: (_: Kind4<U, S, R, E, A>) => Kind4<U, S2, R2, E2, A2>
  ): For<U, S2, R2, E2, A2>
  return<A2>(f: (_: A) => A2): Kind4<U, S, R, E, A2>
  unit(): Kind4<U, S, R, E, void>
  done(): Kind4<U, S, R, E, A>
}

export interface ForC<U extends MaURIS, S, R, E, A> {
  do<S2, R2, A2>(f: (_: A) => Kind4<U, S2, R2, E, A2>): For<U, S | S2, R & R2, E, A>
  with<N extends string, S2, R2, A2>(
    n: Exclude<N, keyof A>,
    f: (_: A) => Kind4<U, S2, R2, E, A2>
  ): For<U, S | S2, R & R2, E, A & { [k in N]: A2 }>
  withPipe<N extends string, S2, R2, A2>(
    n: Exclude<N, keyof A>,
    f: (_: Pipe<A, A>) => Kind4<U, S2, R2, E, A2>
  ): For<U, S | S2, R & R2, E, A & { [k in N]: A2 }>
  let<N extends string, A2>(
    n: Exclude<N, keyof A>,
    f: (_: A) => A2
  ): For<U, S, R, E, A & { [k in N]: A2 }>
  all<NER extends Record<string, Kind4<U, any, any, E, any>>>(
    f: (_: A) => EnforceNonEmptyRecord<NER> & { [K in keyof A]?: never }
  ): For<
    U,
    S | { [k in keyof NER]: STypeOf<NER[k]> }[keyof NER],
    R & UnionToIntersection<{ [k in keyof NER]: RTypeOf<NER[k]> }[keyof NER]>,
    E,
    A & { [k in keyof NER]: ATypeOf<NER[k]> }
  >
  pipe<S2, R2, A2>(
    f: (_: Kind4<U, S, R, E, A>) => Kind4<U, S2, R2, E, A2>
  ): For<U, S2, R2, E, A2>
  return<A2>(f: (_: A) => A2): Kind4<U, S, R, E, A2>
  unit(): Kind4<U, S, R, E, void>
  done(): Kind4<U, S, R, E, A>
}

export function ForM<U extends MaURIS>(
  _: CMonad4MAP<U>
): For<U, unknown, unknown, never, {}>
export function ForM<U extends MaURIS, E>(
  _: CMonad4MAPC<U, E>
): For<U, unknown, unknown, E, {}>
export function ForM<U extends MaURIS>(
  _: CMonad4MA<U>
): For<U, never, unknown, never, {}>
export function ForM<U extends MaURIS, E>(
  _: CMonad4MAC<U, E>
): For<U, never, unknown, E, {}>
export function ForM<U extends MaURIS>(_: unknown): unknown {
  return new ForImpl<U, never, unknown, never, {}>(_ as any, (_ as any).of({}) as any)
}
