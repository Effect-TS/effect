// ets_tracing: off

import * as C from "../../Cause/index.js"
import * as A from "../../Collections/Immutable/Chunk/index.js"
import { pipe } from "../../Function/index.js"
import * as O from "../../Option/index.js"
import * as T from "../_internal/effect.js"
import * as M from "../_internal/managed.js"
import * as Ref from "../_internal/ref.js"
import * as Pull from "../Pull/index.js"
import { Stream } from "./definitions.js"

function go<R, E, O>(
  streams: A.Chunk<Stream<R, E, O>>,
  chunkSize: number,
  currIndex: Ref.Ref<number>,
  currStream: Ref.Ref<T.Effect<R, O.Option<E>, A.Chunk<O>>>,
  switchStream: (
    x: M.Managed<R, never, T.Effect<R, O.Option<E>, A.Chunk<O>>>
  ) => T.Effect<R, never, T.Effect<R, O.Option<E>, A.Chunk<O>>>
): T.Effect<R, O.Option<E>, A.Chunk<O>> {
  return pipe(
    currStream.get,
    T.flatten,
    T.catchAllCause((x) =>
      O.fold_(
        C.sequenceCauseOption(x),
        () =>
          pipe(
            currIndex,
            Ref.getAndUpdate((x) => x + 1),
            T.chain((i) =>
              i >= chunkSize
                ? Pull.end
                : pipe(
                    switchStream(A.unsafeGet_(streams, i).proc),
                    T.chain(currStream.set),
                    T.zipRight(
                      go(streams, chunkSize, currIndex, currStream, switchStream)
                    )
                  )
            )
          ),
        Pull.halt
      )
    )
  )
}

/**
 * Concatenates all of the streams in the chunk to one stream.
 */
export function concatAll<R, E, O>(streams: A.Chunk<Stream<R, E, O>>): Stream<R, E, O> {
  const chunkSize = A.size(streams)
  return new Stream(
    pipe(
      M.do,
      M.bind("currIndex", () => Ref.makeManagedRef(0)),
      M.bind("currStream", () =>
        Ref.makeManagedRef<T.Effect<R, O.Option<E>, A.Chunk<O>>>(Pull.end)
      ),
      M.bind("switchStream", () =>
        M.switchable<R, never, T.Effect<R, O.Option<E>, A.Chunk<O>>>()
      ),
      M.map(({ currIndex, currStream, switchStream }) =>
        go(streams, chunkSize, currIndex, currStream, switchStream)
      )
    )
  )
}
