/* adapted from https://github.com/gcanti/fp-ts */

import type { CExtend, CExtend1, CExtend2, CExtend2C, CExtend3 } from "../Extend"
import type { HKT, URIS, Kind, URIS2, Kind2, URIS3, Kind3 } from "../HKT"

export interface CComonad<W> extends CExtend<W> {
  readonly extract: <A>(wa: HKT<W, A>) => A
}

export interface CComonad1<W extends URIS> extends CExtend1<W> {
  readonly extract: <A>(wa: Kind<W, A>) => A
}

export interface CComonad2<W extends URIS2> extends CExtend2<W> {
  readonly extract: <E, A>(wa: Kind2<W, E, A>) => A
}

export interface CComonad2C<W extends URIS2, E> extends CExtend2C<W, E> {
  readonly extract: <A>(wa: Kind2<W, E, A>) => A
}

export interface CComonad3<W extends URIS3> extends CExtend3<W> {
  readonly extract: <R, E, A>(wa: Kind3<W, R, E, A>) => A
}
