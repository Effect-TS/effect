import * as P from "../../Prelude"
import type { IterableURI } from "./definitions"
import * as It from "./operations"

export const Any = P.instance<P.Any<IterableURI>>({
  any: () => It.of(undefined)
})

export const None = P.instance<P.None<IterableURI>>({
  never: () => It.never
})

export const Covariant = P.instance<P.Covariant<IterableURI>>({
  map: It.map
})

export const AssociativeBoth = P.instance<P.AssociativeBoth<IterableURI>>({
  both: It.zip
})

export const AssociativeFlatten = P.instance<P.AssociativeFlatten<IterableURI>>({
  flatten: It.flatten
})

export const Applicative = P.instance<P.Applicative<IterableURI>>({
  ...Any,
  ...Covariant,
  ...AssociativeBoth
})

export const Monad = P.instance<P.Monad<IterableURI>>({
  ...Any,
  ...Covariant,
  ...AssociativeFlatten
})

export const Traversable = P.instance<P.Traversable<IterableURI>>({
  ...Covariant,
  foreachF: It.foreachF
})
