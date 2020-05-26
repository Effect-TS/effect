/* Adapted from https://github.com/gcanti/newtype-ts/blob/master/src/index.ts */

import { Eq } from "../Eq"
import { identity, Predicate, unsafeCoerce } from "../Function"
import * as I from "../Monocle/Iso"
import * as P from "../Monocle/Prism"
import { Monoid } from "../Monoid"
import { none, some } from "../Option"
import { Ord } from "../Ord"
import { Semigroup } from "../Semigroup"

export interface Newtype<URI, A> {
  readonly _URI: URI
  readonly _A: A
}

export type AnyNewtype = Newtype<any, any>

export type URIOf<N extends AnyNewtype> = N["_URI"]

export type CarrierOf<N extends AnyNewtype> = N["_A"]

export const getEq = <S extends AnyNewtype>(S: Eq<CarrierOf<S>>): Eq<S> => S

export const getOrd = <S extends AnyNewtype>(O: Ord<CarrierOf<S>>): Ord<S> => O

export const getSemigroup = <S extends AnyNewtype>(
  S: Semigroup<CarrierOf<S>>
): Semigroup<S> => S

export const getMonoid = <S extends AnyNewtype>(M: Monoid<CarrierOf<S>>): Monoid<S> => M

const anyIso =
  /*#__PURE__*/
  (() => I.create<any, any>(unsafeCoerce, unsafeCoerce))()

export function iso<S extends AnyNewtype>(): I.Iso<S, CarrierOf<S>> {
  return anyIso
}

export interface Concat<
  N1 extends Newtype<object, any>,
  N2 extends Newtype<object, CarrierOf<N1>>
> extends Newtype<URIOf<N1> & URIOf<N2>, CarrierOf<N1>> {}

export interface Extends<N extends AnyNewtype, Tags extends object>
  extends Newtype<Tags & URIOf<N>, CarrierOf<N>> {}

export function prism<S extends AnyNewtype>(
  predicate: Predicate<CarrierOf<S>>
): P.Prism<CarrierOf<S>, S> {
  return P.create((s) => (predicate(s) ? some(s) : none), identity)
}
