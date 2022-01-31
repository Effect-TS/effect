// ets_tracing: off

import * as T from "../../Effect/index.js"
import { flow } from "../../Function/index.js"
import * as BA from "../BoolAlgebra/index.js"

export class BoolAlgebraM<R, E, A> {
  readonly [T._R]: (_: R) => void;
  readonly [T._E]: () => E;
  readonly [T._A]: () => A

  constructor(readonly run: T.Effect<R, E, BA.BoolAlgebra<A>>) {}
}

export function and_<R, R1, E, E1, A>(
  self: BoolAlgebraM<R, E, A>,
  that: BoolAlgebraM<R1, E1, A>
): BoolAlgebraM<R & R1, E | E1, A> {
  return new BoolAlgebraM(T.zipWith_(self.run, that.run, BA.and_))
}

export function and<R1, E1, A>(that: BoolAlgebraM<R1, E1, A>) {
  return <R, E>(self: BoolAlgebraM<R, E, A>) => and_(self, that)
}

export function or_<R, R1, E, E1, A>(
  self: BoolAlgebraM<R, E, A>,
  that: BoolAlgebraM<R1, E1, A>
): BoolAlgebraM<R & R1, E | E1, A> {
  return new BoolAlgebraM(T.zipWith_(self.run, that.run, BA.or_))
}

export function or<R1, E1, A>(that: BoolAlgebraM<R1, E1, A>) {
  return <R, E>(self: BoolAlgebraM<R, E, A>) => or_(self, that)
}

export function implies_<R, R1, E, E1, A>(
  self: BoolAlgebraM<R, E, A>,
  that: BoolAlgebraM<R1, E1, A>
): BoolAlgebraM<R & R1, E | E1, A> {
  return new BoolAlgebraM(T.zipWith_(self.run, that.run, BA.implies_))
}

export function implies<R1, E1, A>(that: BoolAlgebraM<R1, E1, A>) {
  return <R, E>(self: BoolAlgebraM<R, E, A>) => implies_(self, that)
}

export function iff_<R, R1, E, E1, A>(
  self: BoolAlgebraM<R, E, A>,
  that: BoolAlgebraM<R1, E1, A>
): BoolAlgebraM<R & R1, E | E1, A> {
  return new BoolAlgebraM(T.zipWith_(self.run, that.run, BA.iff_))
}

export function iff<R1, E1, A>(that: BoolAlgebraM<R1, E1, A>) {
  return <R, E>(self: BoolAlgebraM<R, E, A>) => iff_(self, that)
}

export function not<R, E, A>(self: BoolAlgebraM<R, E, A>): BoolAlgebraM<R, E, A> {
  return new BoolAlgebraM(T.map_(self.run, BA.not))
}

export function as_<R, E, A, B>(
  self: BoolAlgebraM<R, E, A>,
  b: B
): BoolAlgebraM<R, E, B> {
  return map_(self, (_) => b)
}

export function as<B>(b: B) {
  return <R, E, A>(self: BoolAlgebraM<R, E, A>) => as_(self, b)
}

export function chain_<R, R1, E, E1, A, B>(
  self: BoolAlgebraM<R, E, A>,
  f: (a: A) => BoolAlgebraM<R1, E1, B>
): BoolAlgebraM<R & R1, E | E1, B> {
  return new BoolAlgebraM(
    T.chain_(
      self.run,
      BA.chainM((_) => f(_).run)
    )
  )
}

export function chain<R1, E1, A, B>(f: (a: A) => BoolAlgebraM<R1, E1, B>) {
  return <R, E>(self: BoolAlgebraM<R, E, A>) => chain_(self, f)
}

export function isSuccess<R, E, A>(
  self: BoolAlgebraM<R, E, A>
): T.Effect<R, E, boolean> {
  return T.map_(self.run, BA.isSuccess)
}

export function map_<R, E, A, B>(
  self: BoolAlgebraM<R, E, A>,
  f: (a: A) => B
): BoolAlgebraM<R, E, B> {
  return chain_(self, flow(f, success))
}

export function failure<A>(a: A): BoolAlgebraM<unknown, never, A> {
  return new BoolAlgebraM(T.succeed(BA.failure(a)))
}

export function fromEffect<R, E, A>(effect: T.Effect<R, E, A>): BoolAlgebraM<R, E, A> {
  return new BoolAlgebraM(T.map_(effect, BA.success))
}

export function success<A>(a: A): BoolAlgebraM<unknown, never, A> {
  return new BoolAlgebraM(T.succeed(BA.success(a)))
}
