import { pipe } from "../../Function"
import * as Option from "../../Option"
import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import * as BPull from "../BufferedPull"
import { Stream } from "./definitions"

/**
 * Maps over elements of the stream with the specified effectful function.
 */
export const mapM_ = <O, R, R1, E, E1, O1>(
  self: Stream<R, E, O>,
  f: (o: O) => T.Effect<R1, E1, O1>
): Stream<R & R1, E | E1, O1> =>
  new Stream<R & R1, E | E1, O1>(
    pipe(
      self.proc,
      M.mapM(BPull.make),
      M.map((pull) =>
        pipe(
          pull,
          BPull.pullElement,
          T.chain((o) =>
            pipe(
              f(o),
              T.bimap(Option.some, (o1) => [o1] as [O1])
            )
          )
        )
      )
    )
  )

/**
 * Maps over elements of the stream with the specified effectful function.
 */
export const mapM = <O, R1, E1, O1>(f: (o: O) => T.Effect<R1, E1, O1>) => <R, E>(
  self: Stream<R, E, O>
): Stream<R & R1, E | E1, O1> => mapM_(self, f)
