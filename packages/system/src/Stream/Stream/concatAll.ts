import type * as A from "../../Array"
import * as C from "../../Cause"
import { pipe } from "../../Function"
import * as O from "../../Option"
import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import * as Ref from "../_internal/ref"
import * as Pull from "../Pull"
import { Stream } from "./definitions"

function go<R, E, O>(
  streams: A.Array<Stream<R, E, O>>,
  chunkSize: number,
  currIndex: Ref.Ref<number>,
  currStream: Ref.Ref<T.Effect<R, O.Option<E>, A.Array<O>>>,
  switchStream: (
    x: M.Managed<R, never, T.Effect<R, O.Option<E>, A.Array<O>>>
  ) => T.Effect<R, never, T.Effect<R, O.Option<E>, A.Array<O>>>
): T.Effect<R, O.Option<E>, A.Array<O>> {
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
                    switchStream(streams[i].proc),
                    T.chain(currStream.set),
                    T.andThen(
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
export function concatAll<R, E, O>(streams: A.Array<Stream<R, E, O>>): Stream<R, E, O> {
  const chunkSize = streams.length
  return new Stream(
    pipe(
      M.do,
      M.bind("currIndex", () => Ref.makeManagedRef(0)),
      M.bind("currStream", () =>
        Ref.makeManagedRef<T.Effect<R, O.Option<E>, A.Array<O>>>(Pull.end)
      ),
      M.bind("switchStream", () =>
        M.switchable<R, never, T.Effect<R, O.Option<E>, A.Array<O>>>()
      ),
      M.map(({ currIndex, currStream, switchStream }) =>
        go(streams, chunkSize, currIndex, currStream, switchStream)
      )
    )
  )
}
