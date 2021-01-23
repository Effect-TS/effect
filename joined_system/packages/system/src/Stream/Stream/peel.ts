import { pipe } from "../../Function"
import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import * as SK from "../Sink"
import { concat_ } from "./concat"
import type { Stream } from "./definitions"
import { fromChunk } from "./fromChunk"
import { repeatEffectChunkOption } from "./repeatEffectChunkOption"
import { run } from "./run"

/**
 * Peels off enough material from the stream to construct a `Z` using the
 * provided `Sink` and then returns both the `Z` and the rest of the
 * `Stream` in a managed resource. Like all `Managed` values, the provided
 * stream is valid only within the scope of `Managed`.
 */
export function peel_<R, R1, E, E1, O, Z>(
  self: Stream<R, E, O>,
  sink: SK.Sink<R1, E1, O, O, Z>
): M.Managed<R & R1, E | E1, readonly [Z, Stream<R, E, O>]> {
  return M.chain_(self.proc, (pull) => {
    const stream = repeatEffectChunkOption(pull)
    const s = SK.exposeLeftover(sink)

    return pipe(
      stream,
      run(s),
      T.toManaged(),
      M.map((e) => [e[0], concat_(fromChunk(e[1]), stream)] as const)
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
