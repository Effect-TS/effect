import { Any } from "../Any"
import { AssociativeBoth } from "../AssociativeBoth"
import { URIS, Auto } from "../HKT"
import { None } from "../None"
import { AssociativeEither, AssociativeFlatten, Covariant } from "../Prelude"

export type IdentityBoth<
  F extends URIS,
  FK = Auto,
  FX = Auto,
  FI = Auto,
  FS = Auto,
  FR = Auto,
  FE = Auto
> = AssociativeBoth<F, FK, FX, FI, FS, FR, FE> & Any<F, FK, FX, FI, FS, FR, FE>

export type IdentityEither<
  F extends URIS,
  FK = Auto,
  FX = Auto,
  FI = Auto,
  FS = Auto,
  FR = Auto,
  FE = Auto
> = AssociativeEither<F, FK, FX, FI, FS, FR, FE> & None<F, FK, FX, FI, FS, FR, FE>

export type IdentityFlatten<
  F extends URIS,
  FK = Auto,
  FX = Auto,
  FI = Auto,
  FS = Auto,
  FR = Auto,
  FE = Auto
> = AssociativeFlatten<F, FK, FX, FI, FS, FR, FE> & Any<F, FK, FX, FI, FS, FR, FE>

export type Monad<
  F extends URIS,
  FK = Auto,
  FX = Auto,
  FI = Auto,
  FS = Auto,
  FR = Auto,
  FE = Auto
> = IdentityFlatten<F, FK, FX, FI, FS, FR, FE> & Covariant<F, FK, FX, FI, FS, FR, FE>

export type Applicative<
  F extends URIS,
  FK = Auto,
  FX = Auto,
  FI = Auto,
  FS = Auto,
  FR = Auto,
  FE = Auto
> = IdentityBoth<F, FK, FX, FI, FS, FR, FE> & Covariant<F, FK, FX, FI, FS, FR, FE>
