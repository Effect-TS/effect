import * as A from "@effect-ts/system/Array"
import { flow, pipe } from "@effect-ts/system/Function"

import type { ArrayURI } from "../../Modules"
import * as P from "../../Prelude"
import * as DSL from "../../Prelude/DSL"

export { ArrayURI } from "../../Modules"

export const Any = P.instance<P.Any<[ArrayURI]>>({
  any: () => [{}]
})

export const AssociativeBoth = P.instance<P.AssociativeBoth<[ArrayURI]>>({
  both: A.zip
})

export const AssociativeFlatten = P.instance<P.AssociativeFlatten<[ArrayURI]>>({
  flatten: A.flatten
})

export const Covariant = P.instance<P.Covariant<[ArrayURI]>>({
  map: A.map
})

export const Applicative = P.instance<P.Applicative<[ArrayURI]>>({
  ...Any,
  ...Covariant,
  ...AssociativeBoth
})

export const Monad = P.instance<P.Monad<[ArrayURI]>>({
  ...Any,
  ...Covariant,
  ...AssociativeFlatten
})

export const foreachF = P.implementForeachF<[ArrayURI]>()((_) => (G) => (f) =>
  foreachWithIndexF(G)((_, a) => f(a))
)

export const Traversable = P.instance<P.Traversable<[ArrayURI]>>({
  map: A.map,
  foreachF
})

export const foreachWithIndexF = P.implementForeachWithIndexF<[ArrayURI]>()(
  (_) => (G) => (f) =>
    A.reduceWithIndex(DSL.succeedF(G)([] as typeof _.B[]), (k, b, a) =>
      pipe(
        b,
        G.both(f(k, a)),
        G.map(([x, y]) => {
          x.push(y)
          return x
        })
      )
    )
)

export const TraversableWithIndex = P.instance<P.TraversableWithIndex<[ArrayURI]>>({
  map: A.map,
  foreachWithIndexF
})

export const separateF = P.implementSeparateF<[ArrayURI]>()((_) => (G) => (f) =>
  flow(foreachF(G)(f), G.map(A.separate))
)

export const Wiltable = P.instance<P.Wiltable<[ArrayURI]>>({
  separateF
})

export const compactF = P.implementCompactF<[ArrayURI]>()((_) => (G) => (f) =>
  flow(foreachF(G)(f), G.map(A.compact))
)

export const Witherable = P.instance<P.Witherable<[ArrayURI]>>({
  compactF
})

export const compactWithIndexF = P.implementCompactWithIndexF<
  [ArrayURI]
>()((_) => (G) => (f) => flow(foreachWithIndexF(G)(f), G.map(A.compact)))

export const WitherableWithIndex = P.instance<P.WitherableWithIndex<[ArrayURI]>>({
  compactWithIndexF
})

export const Compact = P.instance<P.Compact<[ArrayURI]>>({
  compact: A.compact
})

export const Separate = P.instance<P.Separate<[ArrayURI]>>({
  separate: A.separate
})

export const Extend = P.instance<P.Extend<[ArrayURI]>>({
  extend: A.extend
})

export * from "@effect-ts/system/Array"
