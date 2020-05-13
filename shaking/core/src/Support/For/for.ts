import { sequenceS } from "fp-ts/lib/Apply"
import type { Kind4 } from "fp-ts/lib/HKT"

import { constVoid } from "../../Function"
import type {
  ATypeOf,
  ETypeOf,
  MaURIS,
  Monad4E,
  Monad4EP,
  RTypeOf,
  STypeOf,
  UnionToIntersection
} from "../Overloads"

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
    private readonly M: Monad4E<U>,
    private readonly res: Kind4<U, any, any, any, any>
  ) {}
  do<S2, R2, E2, A2>(f: (_: A) => Kind4<U, S2, R2, E2, A2>) {
    return new ForImpl<U, S | S2, R & R2, E | E2, A>(
      this.M,
      this.M.chain(this.res, (k) => this.M.map(f(k), (_) => k))
    )
  }
  with<N extends string, S2, R2, E2, A2>(
    n: Exclude<N, keyof A>,
    f: (_: A) => Kind4<U, S2, R2, E2, A2>
  ) {
    return new ForImpl<U, S | S2, R & R2, E | E2, A & { [k in N]: A2 }>(
      this.M,
      this.M.chain(this.res, (k) =>
        this.M.map(f(k), (_) => Object.assign(k, { [n]: _ }))
      )
    )
  }
  withPipe<N extends string, S2, R2, E2, A2>(
    n: Exclude<N, keyof A>,
    f: (_: Pipe<A, A>) => Kind4<U, S2, R2, E2, A2>
  ) {
    return new ForImpl<U, S | S2, R & R2, E | E2, A & { [k in N]: A2 }>(
      this.M,
      this.M.chain(this.res, (k) =>
        this.M.map(f(new Pipe(k, k)), (_) => Object.assign(k, { [n]: _ }))
      )
    )
  }
  let<N extends string, A2>(n: Exclude<N, keyof A>, f: (_: A) => A2) {
    return new ForImpl<U, S, R, E, A & { [k in N]: A2 }>(
      this.M,
      this.M.map(this.res, (k) => Object.assign(k, { [n]: f(k) }))
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
      this.M.chain(this.res, (k) =>
        this.M.map(sequenceS(this.M)(f(k) as any), (_) => Object.assign(k, _))
      )
    )
  }
  pipe<S2, R2, E2, A2>(f: (_: Kind4<U, S, R, E, A>) => Kind4<U, S2, R2, E2, A2>) {
    return new ForImpl<U, S2, R2, E2, A2>(this.M, f(this.res))
  }
  return<A2>(f: (_: A) => A2): Kind4<U, S, R, E, A2> {
    return this.M.map(this.res, f)
  }
  unit(): Kind4<U, S, R, E, void> {
    return this.M.map(this.res, constVoid)
  }
  done(): Kind4<U, S, R, E, A> {
    return this.res
  }
}

export function ForM<U extends MaURIS>(
  _: Monad4EP<U>
): ForImpl<U, unknown, unknown, never, {}>
export function ForM<U extends MaURIS>(
  _: Monad4E<U>
): ForImpl<U, never, unknown, never, {}>
export function ForM<U extends MaURIS>(_: unknown): unknown {
  return new ForImpl<U, never, unknown, never, {}>(_ as any, (_ as any).of({}) as any)
}
