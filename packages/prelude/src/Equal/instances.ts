import * as H from "@effect-ts/hkt"

import type * as AY from "../Any"
import type * as AB from "../AssociativeBoth"
import type * as AE from "../AssociativeEither"
import type * as CV from "../Contravariant"
import type * as IB from "../IdentityBoth"
import type * as IE from "../IdentityEither"
import type * as NN from "../None"
import type { EqualURI } from "./definition"
import { anyEqual, both, contramap, nothingEqual, orElseEither } from "./operations"

/**
 * The `AssociativeBoth` instance for `Equal`.
 */
export const AssociativeBoth = H.instance<AB.AssociativeBoth<[EqualURI]>>({
  both
})

/**
 * The `AssociativeEither` instance for `Equal`.
 */
export const AssociativeEither = H.instance<AE.AssociativeEither<[EqualURI]>>({
  orElseEither
})

/**
 * The `Contravariant` instance for `Equal`.
 */
export const Contravariant = H.instance<CV.Contravariant<[EqualURI]>>({
  contramap
})

/**
 * The `Any` instance for `Equal`.
 */
export const Any = H.instance<AY.Any<[EqualURI]>>({
  any: () => anyEqual
})

/**
 * The `IdentityBoth` instance for `Equal`.
 */
export const IdentityBoth = H.instance<IB.IdentityBoth<[EqualURI]>>({
  ...Any,
  ...AssociativeBoth
})

/**
 * The `None` instance for `Equal`.
 */
export const None = H.instance<NN.None<[EqualURI]>>({
  never: () => nothingEqual
})

/**
 * The `IdentityEither` instance for `Equal`.
 */
export const IdentityEither = H.instance<IE.IdentityEither<[EqualURI]>>({
  ...None,
  ...AssociativeEither
})
