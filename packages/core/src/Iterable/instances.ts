import type { IterableURI } from "../Modules"
import type { URI } from "../Prelude"
import * as P from "../Prelude"
import * as It from "./operations"

export const Any = P.instance<P.Any<[URI<IterableURI>]>>({
  any: () => It.of(undefined)
})

export const None = P.instance<P.None<[URI<IterableURI>]>>({
  never: () => It.never
})

export const Covariant = P.instance<P.Covariant<[URI<IterableURI>]>>({
  map: It.map
})

export const AssociativeBoth = P.instance<P.AssociativeBoth<[URI<IterableURI>]>>({
  both: It.zip
})

export const AssociativeFlatten = P.instance<P.AssociativeFlatten<[URI<IterableURI>]>>({
  flatten: It.flatten
})

export const Applicative = P.instance<P.Applicative<[URI<IterableURI>]>>({
  ...Any,
  ...Covariant,
  ...AssociativeBoth
})

export const Monad = P.instance<P.Monad<[URI<IterableURI>]>>({
  ...Any,
  ...Covariant,
  ...AssociativeFlatten
})

export const ForEach = P.instance<P.ForEach<[URI<IterableURI>]>>({
  ...Covariant,
  forEachF: It.forEachF
})
