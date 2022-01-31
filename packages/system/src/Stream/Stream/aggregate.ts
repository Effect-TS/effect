// ets_tracing: off

import { pipe } from "../../Function/index.js"
import * as Option from "../../Option/index.js"
import * as T from "../_internal/effect.js"
import * as M from "../_internal/managed.js"
import * as Ref from "../_internal/ref.js"
import * as Pull from "../Pull/index.js"
import type * as TR from "../Transducer/index.js"
import { Stream } from "./definitions.js"

/**
 * Applies an aggregator to the stream, which converts one or more elements
 * of type `A` into elements of type `B`.
 */
export function aggregate_<R, R1, E, E1, O, P>(
  self: Stream<R, E, O>,
  transducer: TR.Transducer<R1, E1, O, P>
): Stream<R & R1, E | E1, P> {
  return new Stream(
    pipe(
      M.do,
      M.bind("pull", () => self.proc),
      M.bind("push", () => transducer.push),
      M.bind("done", () => Ref.makeManagedRef(false)),
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
export function aggregate<R1, E1, O, P>(transducer: TR.Transducer<R1, E1, O, P>) {
  return <R, E>(self: Stream<R, E, O>) => aggregate_(self, transducer)
}
