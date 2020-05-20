import type { Either } from "../../Either"
import type { Option } from "../../Option"
import type { HKT, URIS, Kind, URIS2, Kind2, URIS3, Kind3, URIS4, Kind4 } from "../HKT"

export interface Separated<A, B> {
  readonly left: A
  readonly right: B
}

export interface CCompactable<F> {
  readonly URI: F
  readonly _F: "curried"
  readonly compact: <A>(fa: HKT<F, Option<A>>) => HKT<F, A>
  readonly separate: <A, B>(fa: HKT<F, Either<A, B>>) => Separated<HKT<F, A>, HKT<F, B>>
}

export interface CCompactable1<F extends URIS> {
  readonly URI: F
  readonly _F: "curried"
  readonly compact: <A>(fa: Kind<F, Option<A>>) => Kind<F, A>
  readonly separate: <A, B>(
    fa: Kind<F, Either<A, B>>
  ) => Separated<Kind<F, A>, Kind<F, B>>
}

export interface CCompactable2<F extends URIS2> {
  readonly URI: F
  readonly _F: "curried"
  readonly compact: <E, A>(fa: Kind2<F, E, Option<A>>) => Kind2<F, E, A>
  readonly separate: <E, A, B>(
    fa: Kind2<F, E, Either<A, B>>
  ) => Separated<Kind2<F, E, A>, Kind2<F, E, B>>
}

export interface CCompactable2C<F extends URIS2, E> {
  readonly URI: F
  readonly _E: E
  readonly _F: "curried"
  readonly compact: <A>(fa: Kind2<F, E, Option<A>>) => Kind2<F, E, A>
  readonly separate: <A, B>(
    fa: Kind2<F, E, Either<A, B>>
  ) => Separated<Kind2<F, E, A>, Kind2<F, E, B>>
}

export interface CCompactable3<F extends URIS3> {
  readonly URI: F
  readonly _F: "curried"
  readonly compact: <R, E, A>(fa: Kind3<F, R, E, Option<A>>) => Kind3<F, R, E, A>
  readonly separate: <R, E, A, B>(
    fa: Kind3<F, R, E, Either<A, B>>
  ) => Separated<Kind3<F, R, E, A>, Kind3<F, R, E, B>>
}

export interface CCompactable3C<F extends URIS3, E> {
  readonly URI: F
  readonly _F: "curried"
  readonly compact: <R, A>(fa: Kind3<F, R, E, Option<A>>) => Kind3<F, R, E, A>
  readonly separate: <R, A, B>(
    fa: Kind3<F, R, E, Either<A, B>>
  ) => Separated<Kind3<F, R, E, A>, Kind3<F, R, E, B>>
}

export interface CCompactable4<F extends URIS4> {
  readonly URI: F
  readonly _F: "curried"
  readonly compact: <S, R, E, A>(
    fa: Kind4<F, S, R, E, Option<A>>
  ) => Kind4<F, S, R, E, A>
  readonly separate: <S, R, E, A, B>(
    fa: Kind4<F, S, R, E, Either<A, B>>
  ) => Separated<Kind4<F, S, R, E, A>, Kind4<F, S, R, E, B>>
}
