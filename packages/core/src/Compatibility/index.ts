import type { Alt3, Alt4, Alt3C, Alt2C, Alt2, Alt1, Alt } from "fp-ts/lib/Alt"
import type {
  Apply,
  Apply1,
  Apply2,
  Apply3,
  Apply4,
  Apply2C,
  Apply3C
} from "fp-ts/lib/Apply"
import type {
  Monad,
  Monad1,
  Monad2,
  Monad3,
  Monad4,
  Monad2C,
  Monad3C
} from "fp-ts/lib/Monad"

import type {
  CMonad,
  CApply,
  CMonad1,
  CApply1,
  URIS,
  URIS2,
  CMonad2,
  CApply2,
  CApply3,
  CMonad3,
  URIS3,
  URIS4,
  CMonad4,
  CApply4,
  MaURIS,
  CMonad4MA,
  CApply4MA,
  Monad4MA,
  CApply4MAP,
  Monad4MAP,
  CMonad4MAC,
  CApply4MAPC,
  Monad4MAPC,
  CApply4MAC,
  Monad4MAC,
  Apply4MA,
  Apply4MAP,
  Apply4MAPC,
  Apply4MAC,
  CApply2C,
  CMonad2C,
  CMonad3C,
  CApply3C,
  CApplicative4MAPC,
  Applicative4MAPC,
  CApplicative4MAC,
  Applicative4MAC,
  CApplicative4MAP,
  Applicative4MAP,
  CApplicative4MA,
  Applicative4MA,
  CApplicative4,
  Applicative4,
  CApplicative3C,
  Applicative3C,
  CApplicative3,
  Applicative3,
  Applicative2C,
  CApplicative2C,
  Applicative2,
  CApplicative2,
  CApplicative1,
  Applicative1,
  CApplicative,
  Applicative,
  CAlt4MAC,
  CAlt4MA,
  CAlt4,
  CAlt3,
  CAlt3C,
  CAlt2C,
  CAlt2,
  CAlt1,
  CAlt,
  Alt4MAC,
  Alt4MA
} from "../Base"

export function monad<URI extends MaURIS, E>(
  F: CMonad4MAC<URI, E> & CApply4MAC<URI, E>
): Monad4MAC<URI, E>
export function monad<URI extends MaURIS, E>(
  F: CMonad4MAC<URI, E> & CApply4MAPC<URI, E>
): Monad4MAPC<URI, E>
export function monad<URI extends MaURIS>(
  F: CMonad4MA<URI> & CApply4MAP<URI>
): Monad4MAP<URI>
export function monad<URI extends MaURIS>(
  F: CMonad4MA<URI> & CApply4MA<URI>
): Monad4MA<URI>
export function monad<URI extends URIS4>(F: CMonad4<URI> & CApply4<URI>): Monad4<URI>
export function monad<URI extends URIS3>(F: CMonad3<URI> & CApply3<URI>): Monad3<URI>
export function monad<URI extends URIS3, E>(
  F: CMonad3C<URI, E> & CApply3C<URI, E>
): Monad3C<URI, E>
export function monad<URI extends URIS2, E>(
  F: CMonad2C<URI, E> & CApply2C<URI, E>
): Monad2C<URI, E>
export function monad<URI extends URIS2>(F: CMonad2<URI> & CApply2<URI>): Monad2<URI>
export function monad<URI extends URIS>(F: CMonad1<URI> & CApply1<URI>): Monad1<URI>
export function monad<URI>(F: CMonad<URI> & CApply<URI>): Monad<URI> {
  return {
    URI: F.URI,
    ap: (fab, fa) => F.ap(fa)(fab),
    chain: (fa, f) => F.chain(f)(fa),
    map: (fa, f) => F.map(f)(fa),
    of: F.of
  }
}

export function validation<URI extends MaURIS, E>(
  F: CMonad4MAC<URI, E> & CApply4MAC<URI, E> & CAlt4MAC<URI, E>
): Monad4MAC<URI, E> & Alt4MAC<URI, E>
export function validation<URI extends MaURIS, E>(
  F: CMonad4MAC<URI, E> & CApply4MAPC<URI, E> & CAlt4MAC<URI, E>
): Monad4MAPC<URI, E> & Alt4MAC<URI, E>
export function validation<URI extends MaURIS>(
  F: CMonad4MA<URI> & CApply4MAP<URI> & CAlt4MA<URI>
): Monad4MAP<URI> & Alt4MA<URI>
export function validation<URI extends MaURIS>(
  F: CMonad4MA<URI> & CApply4MA<URI> & CAlt4<URI>
): Monad4MA<URI> & Alt4MA<URI>
export function validation<URI extends URIS4>(
  F: CMonad4<URI> & CApply4<URI> & CAlt4<URI>
): Monad4<URI> & Alt4<URI>
export function validation<URI extends URIS3>(
  F: CMonad3<URI> & CApply3<URI> & CAlt3<URI>
): Monad3<URI> & Alt3<URI>
export function validation<URI extends URIS3, E>(
  F: CMonad3C<URI, E> & CApply3C<URI, E> & CAlt3C<URI, E>
): Monad3C<URI, E> & Alt3C<URI, E>
export function validation<URI extends URIS2, E>(
  F: CMonad2C<URI, E> & CApply2C<URI, E> & CAlt2C<URI, E>
): Monad2C<URI, E> & Alt2C<URI, E>
export function validation<URI extends URIS2>(
  F: CMonad2<URI> & CApply2<URI> & CAlt2<URI>
): Monad2<URI> & Alt2<URI>
export function validation<URI extends URIS>(
  F: CMonad1<URI> & CApply1<URI> & CAlt1<URI>
): Monad1<URI> & Alt1<URI>
export function validation<URI>(
  F: CMonad<URI> & CApply<URI> & CAlt<URI>
): Monad<URI> & Alt<URI> {
  return {
    URI: F.URI,
    ap: (fab, fa) => F.ap(fa)(fab),
    chain: (fa, f) => F.chain(f)(fa),
    map: (fa, f) => F.map(f)(fa),
    of: F.of,
    alt: (fx, fy) => F.alt(fy)(fx)
  }
}

export function apply<URI extends MaURIS, E>(F: CApply4MAC<URI, E>): Apply4MAC<URI, E>
export function apply<URI extends MaURIS, E>(F: CApply4MAPC<URI, E>): Apply4MAPC<URI, E>
export function apply<URI extends MaURIS>(F: CApply4MAP<URI>): Apply4MAP<URI>
export function apply<URI extends MaURIS>(F: CApply4MA<URI>): Apply4MA<URI>
export function apply<URI extends URIS4>(F: CApply4<URI>): Apply4<URI>
export function apply<URI extends URIS3, E>(F: CApply3C<URI, E>): Apply3C<URI, E>
export function apply<URI extends URIS3>(F: CApply3<URI>): Apply3<URI>
export function apply<URI extends URIS2, E>(F: CApply2C<URI, E>): Apply2C<URI, E>
export function apply<URI extends URIS2>(F: CApply2<URI>): Apply2<URI>
export function apply<URI extends URIS>(F: CApply1<URI>): Apply1<URI>
export function apply<URI>(F: CApply<URI>): Apply<URI> {
  return {
    URI: F.URI,
    map: (fa, f) => F.map(f)(fa),
    ap: (fab, fa) => F.ap(fa)(fab)
  }
}

export function applicative<URI extends MaURIS, E>(
  F: CApplicative4MAPC<URI, E>
): Applicative4MAPC<URI, E>
export function applicative<URI extends MaURIS, E>(
  F: CApplicative4MAC<URI, E>
): Applicative4MAC<URI, E>
export function applicative<URI extends MaURIS>(
  F: CApplicative4MAP<URI>
): Applicative4MAP<URI>
export function applicative<URI extends MaURIS>(
  F: CApplicative4MA<URI>
): Applicative4MA<URI>
export function applicative<URI extends URIS4>(F: CApplicative4<URI>): Applicative4<URI>
export function applicative<URI extends URIS3, E>(
  F: CApplicative3C<URI, E>
): Applicative3C<URI, E>
export function applicative<URI extends URIS3>(F: CApplicative3<URI>): Applicative3<URI>
export function applicative<URI extends URIS2, E>(
  F: CApplicative2C<URI, E>
): Applicative2C<URI, E>
export function applicative<URI extends URIS2>(F: CApplicative2<URI>): Applicative2<URI>
export function applicative<URI extends URIS>(F: CApplicative1<URI>): Applicative1<URI>
export function applicative<URI>(F: CApplicative<URI>): Applicative<URI> {
  return {
    URI: F.URI,
    map: (fa, f) => F.map(f)(fa),
    ap: (fab, fa) => F.ap(fa)(fab),
    of: F.of
  }
}
