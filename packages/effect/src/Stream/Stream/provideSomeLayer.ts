import * as T from "../../Effect"
import * as L from "../../Layer"
import * as M from "../../Managed"
import { chain_ } from "./chain"
import type { Stream } from "./definitions"
import { managed } from "./managed"
import { repeatEffectChunkOption } from "./repeatEffectChunkOption"

/**
 * Provides a layer to the given effect
 */
export function provideSomeLayer<R, E, A>(layer: L.Layer<R, E, A>) {
  return <R1, E1, A1>(self: Stream<R1 & A, E1, A1>): Stream<R & R1, E | E1, A1> =>
    provideLayer_(self, layer["+++"](L.identity()))
}

/**
 * Provides a layer to the given effect
 */
export function provideSomeLayer_<R, E, A, R1, E1, A1>(
  eff: Stream<R1 & A, E1, A1>,
  layer: L.Layer<R, E, A>
): Stream<R & R1, E | E1, A1> {
  return provideSomeLayer(layer)(eff)
}

/**
 * Provides a layer to the given effect
 */
export function provideLayer_<R, E, A, E1, A1>(
  self: Stream<A, E1, A1>,
  layer: L.Layer<R, E, A>
): Stream<R, E | E1, A1> {
  return chain_(
    managed(
      M.gen(function* (_) {
        const r = yield* _(L.build(layer))
        const as = yield* _(M.provideAll_(self.proc, r))

        return T.provideAll_(as, r)
      })
    ),
    repeatEffectChunkOption
  )
}

/**
 * Provides a layer to the given effect
 */
export function provideLayer<R, E, A, E1, A1>(layer: L.Layer<R, E, A>) {
  return (self: Stream<A, E1, A1>) => provideLayer_(self, layer)
}
