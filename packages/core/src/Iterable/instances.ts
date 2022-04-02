// ets_tracing: off

import * as P from "../Prelude/index.js"
import * as It from "./operations.js"

export interface IterableF extends P.HKT {
  readonly type: Iterable<this["A"]>
}
export const Any = P.instance<P.Any<IterableF>>({
  any: () => It.of(undefined)
})

export const None = P.instance<P.None<IterableF>>({
  never: () => It.never
})

export const Covariant = P.instance<P.Covariant<IterableF>>({
  map: It.map
})

export const AssociativeBoth = P.instance<P.AssociativeBoth<IterableF>>({
  both: It.zip
})

export const AssociativeFlatten = P.instance<P.AssociativeFlatten<IterableF>>({
  flatten: It.flatten
})

export const Applicative = P.instance<P.Applicative<IterableF>>({
  ...Any,
  ...Covariant,
  ...AssociativeBoth
})

export const Monad = P.instance<P.Monad<IterableF>>({
  ...Any,
  ...Covariant,
  ...AssociativeFlatten
})

export const ForEach = P.instance<P.ForEach<IterableF>>({
  ...Covariant,
  forEachF: It.forEachF
})
