import { pipe } from "../../Function"
import * as Option from "../../Option"
import { makeManagedRef } from "../../Ref"
import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import * as Pull from "../Pull"
import type { Transducer } from "../Transducer"
import { Stream } from "./definitions"

/**
 * Applies an aggregator to the stream, which converts one or more elements
 * of type `A` into elements of type `B`.
 */
export function aggregate_<R, R1, E, E1, O, P>(
  self: Stream<R, E, O>,
  transducer: Transducer<R1, E1, O, P>
): Stream<R & R1, E | E1, P> {
  return new Stream<R & R1, E | E1, P>(
    pipe(
      M.do,
      M.bind("pull", () => self.proc),
      M.bind("push", () => transducer.push),
      M.bind("done", () => makeManagedRef(false)),
      M.let("run", ({ done, pull, push }) =>
        pipe(
          done.get,
          T.chain((b) =>
            b
              ? Pull.end
              : pipe(
                  pull,
                  T.foldM(
                    Option.fold(
                      () =>
                        pipe(
                          done.set(true),
                          T.chain(() => pipe(push(Option.none), T.asSomeError))
                        ),
                      (e) => Pull.fail<E | E1>(e)
                    ),
                    (os) => pipe(push(Option.some(os)), T.asSomeError)
                  )
                )
          )
        )
      ),
      M.map(({ run }) => run)
    )
  )
}

/**
 * Applies an aggregator to the stream, which converts one or more elements
 * of type `A` into elements of type `B`.
 */
export function aggregate<R1, E1, O, P>(transducer: Transducer<R1, E1, O, P>) {
  return <R, E>(self: Stream<R, E, O>) => aggregate_(self, transducer)
}
