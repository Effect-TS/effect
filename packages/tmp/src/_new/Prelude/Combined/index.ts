import type { Any } from "../Any"
import type { AssociativeBoth } from "../AssociativeBoth"
import type { AssociativeEither } from "../AssociativeEither"
import type { AssociativeFlatten } from "../AssociativeFlatten"
import type { Covariant } from "../Covariant"
import type { Auto, URIS } from "../HKT"
import type { None } from "../None"

export type IdentityBoth<F extends URIS, C = Auto> = AssociativeBoth<F, C> & Any<F, C>

export type IdentityEither<F extends URIS, C = Auto> = AssociativeEither<F, C> &
  None<F, C>

export type IdentityFlatten<F extends URIS, C = Auto> = AssociativeFlatten<F, C> &
  Any<F, C>

export type Monad<F extends URIS, C = Auto> = IdentityFlatten<F, C> & Covariant<F, C>

export type Applicative<F extends URIS, C = Auto> = IdentityBoth<F, C> & Covariant<F, C>
