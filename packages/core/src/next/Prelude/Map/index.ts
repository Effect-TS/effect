import * as A from "../../../Array"
import { pipe, tuple } from "../../../Function"
import * as M from "../../../Map"
import * as pA from "../Array"
import { intersect } from "../Utils"
import { makeAny } from "../abstract/Any"
import { makeAssociativeFlatten } from "../abstract/AssociativeFlatten"
import { makeCovariant } from "../abstract/Covariant"
import { makeMonad } from "../abstract/Monad"
import { implementForeachF, makeTraversable } from "../abstract/Traversable"

export const MapValueURI = "MapValue"
export type MapValueURI = typeof MapValueURI

declare module "../abstract/HKT" {
  interface URItoKind<X, In, St, Env, Err, Out> {
    [MapValueURI]: M.Map<Err, Out>
  }
}

/**
 * Transform Map[K, Map[K1, V]] => Mak[K | K1, V]
 */
export const flatten: <E, E1, A>(fb: M.Map<E, M.Map<E1, A>>) => M.Map<E1, A> = (fb) =>
  A.reduce_(Array.from(fb), M.make([]), (b, [_, a]) =>
    M.make([...Array.from(b), ...Array.from(a)])
  )

/**
 * The `AssociativeFlatten` instance for `Map`.
 */
export const AssociativeFlatten = makeAssociativeFlatten(MapValueURI)({
  flatten
})

/**
 * The `Any` instance for `Map`.
 */
export const Any = makeAny(MapValueURI)({
  any: () => new Map<never, any>()
})

/**
 * Maps over Map[K, _]
 */
export const map: <A, B>(f: (a: A) => B) => <E>(fa: M.Map<E, A>) => M.Map<E, B> = (
  f
) => (fa) => M.map_(fa, f)

/**
 * The `Covariant` instance for `Map`.
 */
export const Covariant = makeCovariant(MapValueURI)({
  map
})

/**
 * The `Monad` instance for `Map`.
 */
export const Monad = makeMonad(MapValueURI)(
  intersect(Any, Covariant, AssociativeFlatten)
)

/**
 * Traversable's `foreachF` for `Map`.
 */
export const foreachF = implementForeachF(MapValueURI)(() => (G) => (f) => (fa) =>
  pipe(
    Array.from(fa),
    pA.Traversable.foreachF(G)(([k, a]) =>
      pipe(
        f(a),
        G.map((b) => tuple(k, b))
      )
    ),
    G.map((as) => new Map(as))
  )
)

/**
 * The `Traversable` instance for `Map`.
 */
export const Traversable = makeTraversable(Covariant)({
  foreachF
})
