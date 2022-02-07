// ets_tracing: off

import * as Tp from "../../Collections/Immutable/Tuple/index.js"
import { pipe } from "../../Function/index.js"
import * as T from "../_internal/effect.js"
import * as M from "../_internal/managed.js"
import * as SK from "../Sink/index.js"
import { concat_ } from "./concat.js"
import type { Stream } from "./definitions.js"
import { fromChunk } from "./fromChunk.js"
import { repeatEffectChunkOption } from "./repeatEffectChunkOption.js"
import { run } from "./run.js"

/**
 * Peels off enough material from the stream to construct a `Z` using the
 * provided `Sink` and then returns both the `Z` and the rest of the
 * `Stream` in a managed resource. Like all `Managed` values, the provided
 * stream is valid only within the scope of `Managed`.
 */
export function peel_<R, R1, E, E1, O, Z>(
  self: Stream<R, E, O>,
  sink: SK.Sink<R1, E1, O, O, Z>
): M.Managed<R & R1, E | E1, Tp.Tuple<[Z, Stream<R, E, O>]>> {
  return M.chain_(self.proc, (pull) => {
    const stream = repeatEffectChunkOption(pull)
    const s = SK.exposeLeftover(sink)

    return pipe(
      stream,
      run(s),
      T.toManaged,
      M.map((e) => Tp.tuple(e.get(0), concat_(fromChunk(e.get(1)), stream)))
    )
  })
}

/**
 * Peels off enough material from the stream to construct a `Z` using the
 * provided `Sink` and then returns both the `Z` and the rest of the
 * `Stream` in a managed resource. Like all `Managed` values, the provided
 * stream is valid only within the scope of `Managed`.
 */
export function peel<R1, E1, O, Z>(sink: SK.Sink<R1, E1, O, O, Z>) {
  return <R, E>(self: Stream<R, E, O>) => peel_(self, sink)
}
