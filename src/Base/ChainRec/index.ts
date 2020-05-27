/* adapted from https://github.com/gcanti/fp-ts */

import type { Either } from "../../Either"
import type { CChain, CChain1, CChain2, CChain2C, CChain3 } from "../Chain"
import type { HKT, URIS, Kind, URIS2, Kind2, URIS3, Kind3 } from "../HKT"

export interface CChainRec<F> extends CChain<F> {
  readonly chainRec: <A, B>(a: A, f: (a: A) => HKT<F, Either<A, B>>) => HKT<F, B>
}

export interface CChainRec1<F extends URIS> extends CChain1<F> {
  readonly chainRec: <A, B>(a: A, f: (a: A) => Kind<F, Either<A, B>>) => Kind<F, B>
}

export interface CChainRec2<F extends URIS2> extends CChain2<F> {
  readonly chainRec: <E, A, B>(
    a: A,
    f: (a: A) => Kind2<F, E, Either<A, B>>
  ) => Kind2<F, E, B>
}

export interface CChainRec2C<F extends URIS2, E> extends CChain2C<F, E> {
  readonly chainRec: <A, B>(
    a: A,
    f: (a: A) => Kind2<F, E, Either<A, B>>
  ) => Kind2<F, E, B>
}

export interface CChainRec3<F extends URIS3> extends CChain3<F> {
  readonly chainRec: <R, E, A, B>(
    a: A,
    f: (a: A) => Kind3<F, R, E, Either<A, B>>
  ) => Kind3<F, R, E, B>
}

export function tailRec<A, B>(a: A, f: (a: A) => Either<A, B>): B {
  let v = f(a)
  while (v._tag === "Left") {
    v = f(v.left)
  }
  return v.right
}
