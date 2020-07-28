import * as A from "../../../Array"
import * as O from "../../../Option"
import * as T from "../_internal/effect"
import * as M from "../_internal/managed"

// Contract notes for transducers:
// - When a None is received, the transducer must flush all of its internal state
//   and remain empty until subsequent Some(Chunk) values.
//
//   Stated differently, after a first push(None), all subsequent push(None) must
//   result in empty [].
export interface Transducer<S, R, E, I, O>
  extends M.Managed<
    S,
    R,
    never,
    (c: O.Option<A.Array<I>>) => T.Effect<S, R, E, A.Array<O>>
  > {}

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
): Transducer<S | S1, R & R1, E, I, O> => push
