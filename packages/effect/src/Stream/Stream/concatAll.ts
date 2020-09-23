import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import type { Array } from "../../Array"
import * as Cause from "../../Cause"
import { pipe } from "../../Function"
import type { Option } from "../../Option"
import { fold_ } from "../../Option"
import type { Ref } from "../../Ref"
import { getAndUpdate, makeManagedRef } from "../../Ref"
import * as Pull from "../Pull"
import { Stream } from "./definitions"

function go<S, R, E, O>(
  streams: Array<Stream<S, R, E, O>>,
  chunkSize: number,
  currIndex: Ref<number>,
  currStream: Ref<T.Effect<S, R, Option<E>, Array<O>>>,
  switchStream: (
    x: M.Managed<S, R, never, T.Effect<S, R, Option<E>, Array<O>>>
  ) => T.Effect<S, R, never, T.Effect<S, R, Option<E>, Array<O>>>
): T.Effect<S, R, Option<E>, Array<O>> {
  return pipe(
    currStream.get,
    T.flatten,
    T.catchAllCause((x) =>
      fold_(
        Cause.sequenceCauseOption(x),
        () =>
          pipe(
            currIndex,
            getAndUpdate((x) => x + 1),
            T.chain((i) =>
              i >= chunkSize
                ? Pull.end
                : pipe(
                    switchStream(streams[i].proc),
                    T.chain(currStream.set),
                    T.zipSecond(
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
export function concatAll<S, R, E, O>(
  streams: Array<Stream<S, R, E, O>>
): Stream<S, R, E, O> {
  const chunkSize = streams.length
  return new Stream(
    pipe(
      M.do,
      M.bind("currIndex", () => makeManagedRef(0)),
      M.bind("currStream", () =>
        makeManagedRef<T.Effect<S, R, Option<E>, Array<O>>>(Pull.end)
      ),
      M.bind("switchStream", () =>
        M.switchable<S, R, never, T.Effect<S, R, Option<E>, Array<O>>>()
      ),
      M.map(({ currIndex, currStream, switchStream }) =>
        go(streams, chunkSize, currIndex, currStream, switchStream)
      )
    )
  )
}
