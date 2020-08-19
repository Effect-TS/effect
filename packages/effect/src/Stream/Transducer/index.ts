import * as A from "../../Array"
import { pipe } from "../../Function"
import * as O from "../../Option"
import * as T from "../_internal/effect"
import * as M from "../_internal/managed"

// Contract notes for transducers:
// - When a None is received, the transducer must flush all of its internal state
//   and remain empty until subsequent Some(Chunk) values.
//
//   Stated differently, after a first push(None), all subsequent push(None) must
//   result in empty [].
export class Transducer<S, R, E, I, O> {
  constructor(
    readonly push: M.Managed<
      S,
      R,
      never,
      (c: O.Option<A.Array<I>>) => T.Effect<S, R, E, A.Array<O>>
    >
  ) {}
}

/**
 * Contract notes for transducers:
 * - When a None is received, the transducer must flush all of its internal state
 *   and remain empty until subsequent Some(Chunk) values.
 *
 *   Stated differently, after a first push(None), all subsequent push(None) must
 *   result in empty [].
 */
export const transducer = <S, R, E, I, O, S1, R1>(
  push: M.Managed<
    S,
    R,
    never,
    (c: O.Option<A.Array<I>>) => T.Effect<S1, R1, E, A.Array<O>>
  >
) => new Transducer<S | S1, R & R1, E, I, O>(push)

/**
 * Compose this transducer with another transducer, resulting in a composite transducer.
 */
export const then = <S1, R1, E1, O, O1>(that: Transducer<S1, R1, E1, O, O1>) => <
  S,
  R,
  E,
  I
>(
  self: Transducer<S, R, E, I, O>
): Transducer<S1 | S, R & R1, E1 | E, I, O1> =>
  transducer(
    pipe(
      self.push,
      M.zipWith(that.push, (pushLeft, pushRight) =>
        O.fold(
          () =>
            pipe(
              pushLeft(O.none),
              T.chain((cl) =>
                cl.length === 0
                  ? pushRight(O.none)
                  : pipe(
                      pushRight(O.some(cl)),
                      T.zipWith(pushRight(O.none), (a, b) => [...a, ...b])
                    )
              )
            ),
          (inputs) =>
            pipe(
              pushLeft(O.some(inputs)),
              T.chain((cl) => pushRight(O.some(cl)))
            )
        )
      )
    )
  )
