// ets_tracing: off

import * as L from "../../Layer/index.js"
import * as T from "../_internal/effect.js"
import * as M from "../_internal/managed.js"
import { chain_ } from "./chain.js"
import type { Stream } from "./definitions.js"
import { managed } from "./managed.js"
import { repeatEffectChunkOption } from "./repeatEffectChunkOption.js"

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
export function provideLayer<R, E, A>(layer: L.Layer<R, E, A>) {
  return <E1, A1>(self: Stream<A, E1, A1>) => provideLayer_(self, layer)
}
