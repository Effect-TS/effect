/**
 * @since 1.0.0
 */
import * as P from "../../Prelude"

import { IterableURI } from "./definitions"
import * as It from "./operations"

/**
 * @since 1.0.0
 */
export const Any = P.instance<P.Any<IterableURI>>({
  any: () => It.of(undefined)
})

/**
 * @since 1.0.0
 */
export const None = P.instance<P.None<IterableURI>>({
  never: () => It.never
})

/**
 * @since 1.0.0
 */
export const Covariant = P.instance<P.Covariant<IterableURI>>({
  map: It.map
})

/**
 * @since 1.0.0
 */
export const AssociativeBoth = P.instance<P.AssociativeBoth<IterableURI>>({
  both: It.zip
})

/**
 * @since 1.0.0
 */
export const AssociativeFlatten = P.instance<P.AssociativeFlatten<IterableURI>>({
  flatten: It.flatten
})

/**
 * @since 1.0.0
 */
export const Applicative = P.instance<P.Applicative<IterableURI>>({
  ...Any,
  ...Covariant,
  ...AssociativeBoth
})

/**
 * @since 1.0.0
 */
export const Monad = P.instance<P.Monad<IterableURI>>({
  ...Any,
  ...Covariant,
  ...AssociativeFlatten
})

/**
 * @since 1.0.0
 */
export const Traversable = P.instance<P.Traversable<IterableURI>>({
  ...Covariant,
  foreachF: It.foreachF
})
