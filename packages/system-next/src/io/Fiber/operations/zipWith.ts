import * as O from "../../../data/Option"
import * as Cause from "../../Cause"
import * as Exit from "../../Exit"
import * as FiberId from "../../FiberId"
import type { Fiber } from "../definition"
import * as T from "./_internal/effect"
import { makeSynthetic } from "./makeSynthetic"

/**
 * Zips this fiber with the specified fiber, combining their results using the
 * specified combiner function. Both joins and interruptions are performed in
 * sequential order from left to right.
 */
export function zipWith_<E, E1, A, B, C>(
  self: Fiber<E, A>,
  that: Fiber<E1, B>,
  f: (a: A, b: B) => C
): Fiber<E | E1, C> {
  return makeSynthetic({
    id: FiberId.getOrElse_(self.id, () => that.id),
    await: T.exit(
      T.zipWithPar_(T.chain_(self.await, T.done), T.chain_(that.await, T.done), f)
    ),
    children: self.children,
    getRef: (ref) => T.zipWith_(self.getRef(ref), that.getRef(ref), ref.join),
    inheritRefs: T.chain_(that.inheritRefs, () => self.inheritRefs),
    interruptAs: (id) =>
      T.zipWith_(self.interruptAs(id), that.interruptAs(id), (ea, eb) =>
        Exit.zipWith_(ea, eb, f, Cause.both)
      ),
    poll: T.zipWith_(self.poll, that.poll, (oa, ob) =>
      O.chain_(oa, (ea) => O.map_(ob, (eb) => Exit.zipWith_(ea, eb, f, Cause.both)))
    )
  })
}

/**
 * Zips this fiber with the specified fiber, combining their results using the
 * specified combiner function. Both joins and interruptions are performed in
 * sequential order from left to right.
 *
 * @ets_data_first zipWith_
 */
export function zipWith<E1, A, B, C>(that: Fiber<E1, B>, f: (a: A, b: B) => C) {
  return <E>(self: Fiber<E, A>): Fiber<E | E1, C> => zipWith_(self, that, f)
}

//    final def poll(implicit trace: ZTraceElement): UIO[Option[Exit[E1, C]]] =
//      self.poll.zipWith(that.poll) {
//        case (Some(ra), Some(rb)) => Some(ra.zipWith(rb)(f, _ && _))
//        case _                    => None
//      }
//  }
