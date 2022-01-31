import { Either } from "../../../data/Either"
import { identity } from "../../../data/Function"
import { Option } from "../../../data/Option"
import { Cause } from "../../../io/Cause/definition"
import { List } from "../List"
import { Tuple } from "../Tuple"
import type { ParSeq } from "./primitives"
import * as P from "./primitives"

/**
 * Returns the first event in this collection of events. If multiple events
 * occur in parallel and before any other events then any of these events
 * may be returned.
 */
export function first<A>(self: ParSeq<A>): Option<A> {
  // eslint-disable-next-line no-constant-condition
  while (1) {
    switch (self._tag) {
      case "Single": {
        return Option.some(self.a)
      }
      case "Empty": {
        return Option.none
      }
      case "Both": {
        self = self.left
        break
      }
      case "Then": {
        self = self.left
        break
      }
    }
  }
  throw new Error("Bug")
}

function foldLoop<A, B>(
  emptyCase: B,
  singleCase: (a: A) => B,
  thenCase: (l: B, r: B) => B,
  bothCase: (l: B, r: B) => B,
  inp: List<ParSeq<A>>,
  out: List<Either<boolean, B>>
): List<B> {
  // eslint-disable-next-line no-constant-condition
  while (1) {
    if (inp.isEmpty()) {
      return out.reduce(List.empty<B>(), (acc, val) => {
        if (val._tag === "Right") {
          return acc.prepend(val.right)
        } else {
          if (val.left) {
            let parSeqs: List<B> = acc
            const left = parSeqs.unsafeFirst()
            parSeqs = parSeqs.tail()
            const right = parSeqs.unsafeFirst()
            parSeqs = parSeqs.tail()
            return parSeqs.prepend(bothCase(left!, right!))
          } else {
            let parSeqs: List<B> = acc
            const left = parSeqs.unsafeFirst()
            parSeqs = parSeqs.tail()
            const right = parSeqs.unsafeFirst()
            parSeqs = parSeqs.tail()
            return parSeqs.prepend(thenCase(left!, right!))
          }
        }
      })
    } else {
      const head = inp.unsafeFirst()!
      const parSeqs = inp.tail()

      switch (head._tag) {
        case "Empty": {
          inp = parSeqs
          out = out.prepend(Either.right(emptyCase))
          break
        }
        case "Single": {
          inp = parSeqs
          out = out.prepend(Either.right(singleCase(head.a)))
          break
        }
        case "Then": {
          inp = parSeqs.prepend(head.right).prepend(head.left)
          out = out.prepend(Either.left(false))
          break
        }
        case "Both": {
          inp = parSeqs.prepend(head.right).prepend(head.left)
          out = out.prepend(Either.left(true))
          break
        }
      }
    }
  }
  throw new Error("Bug")
}

/**
 * Folds over the events in this collection of events using the specified
 * functions.
 */
export function fold_<A, B>(
  self: ParSeq<A>,
  emptyCase: B,
  singleCase: (a: A) => B,
  thenCase: (l: B, r: B) => B,
  bothCase: (l: B, r: B) => B
): B {
  return foldLoop(
    emptyCase,
    singleCase,
    thenCase,
    bothCase,
    List.single(self),
    List.empty()
  ).unsafeFirst()!
}

/**
 * Folds over the events in this collection of events using the specified
 * functions.
 *
 * @ets_data_first fold_
 */
export function fold<A, B>(
  emptyCase: B,
  singleCase: (a: A) => B,
  thenCase: (l: B, r: B) => B,
  bothCase: (l: B, r: B) => B
): (self: ParSeq<A>) => B {
  return (self) => fold_(self, emptyCase, singleCase, thenCase, bothCase)
}

/**
 * Constructs a new collection of events for each event in this collection of
 * events, collecting them back into a single collection of events.
 */
export function chain_<A, B>(self: ParSeq<A>, f: (a: A) => ParSeq<B>): ParSeq<B> {
  return fold_(self, P.empty as ParSeq<B>, f, P.then_, P.both_)
}

/**
 * Constructs a new collection of events for each event in this collection of
 * events, collecting them back into a single collection of events.
 *
 * @ets_data_first chain_
 */
export function chain<A, B>(f: (a: A) => ParSeq<B>): (self: ParSeq<A>) => ParSeq<B> {
  return (self) => chain_(self, f)
}

/**
 * Flattens a collection of collections of events into a single collection
 * of events.
 */
export function flatten<A>(self: ParSeq<ParSeq<A>>) {
  return chain_(self, identity)
}

/**
 * Converts a ParSeq to a Cause
 */
export function toCause<A>(self: ParSeq<A>): Cause<A> {
  return fold_(self, Cause.empty as Cause<A>, Cause.fail, Cause.then, Cause.both)
}

/**
 * Transforms the type of events in this collection of events with the
 * specified function.
 */
export function map_<A, B>(self: ParSeq<A>, f: (a: A) => B): ParSeq<B> {
  return chain_(self, (a) => P.single(f(a)))
}

/**
 * Transforms the type of events in this collection of events with the
 * specified function.
 *
 * @ets_data_first map_
 */
export function map<A, B>(f: (a: A) => B): (self: ParSeq<A>) => ParSeq<B> {
  return (self) => map_(self, f)
}

/**
 * Combines this collection of events with that collection of events to
 * return the Cartesian product of events using the specified function.
 */
export function zipWith_<A, B, C>(
  self: ParSeq<A>,
  that: ParSeq<B>,
  f: (a: A, b: B) => C
): ParSeq<C> {
  return chain_(self, (a) => map_(that, (b) => f(a, b)))
}

/**
 * Combines this collection of events with that collection of events to
 * return the Cartesian product of events using the specified function.
 *
 * @ets_data_first zipWith_
 */
export function zipWith<A, B, C>(
  that: ParSeq<B>,
  f: (a: A, b: B) => C
): (self: ParSeq<A>) => ParSeq<C> {
  return (self) => zipWith_(self, that, f)
}

/**
 * Combines this collection of events with that collection of events to
 * return the Cartesian product of events, combining the elements into a
 * tuple.
 */
export function zip_<A, B>(self: ParSeq<A>, that: ParSeq<B>): ParSeq<Tuple<[A, B]>> {
  return zipWith_(self, that, (a, b) => Tuple(a, b))
}

/**
 * Combines this collection of events with that collection of events to
 * return the Cartesian product of events, combining the elements into a
 * tuple.
 *
 * @ets_data_first zip_
 */
export function zip<B>(that: ParSeq<B>): <A>(self: ParSeq<A>) => ParSeq<Tuple<[A, B]>> {
  return (self) => zip_(self, that)
}

/**
 * Combines this collection of events with that collection of events to
 * return the Cartesian product of events, keeping only the events from this
 * collection.
 */
export function zipLeft_<A, B>(self: ParSeq<A>, that: ParSeq<B>): ParSeq<A> {
  return zipWith_(self, that, (a, _b) => a)
}

/**
 * Combines this collection of events with that collection of events to
 * return the Cartesian product of events, keeping only the events from this
 * collection.
 *
 * @ets_data_first zipLeft_
 */
export function zipLeft<B>(that: ParSeq<B>): <A>(self: ParSeq<A>) => ParSeq<A> {
  return (self) => zipLeft_(self, that)
}

/**
 * Combines this collection of events with that collection of events to
 * return the Cartesian product of events, keeping only the events from that
 * collection.
 */
export function zipRight_<A, B>(self: ParSeq<A>, that: ParSeq<B>): ParSeq<B> {
  return zipWith_(self, that, (_a, b) => b)
}

/**
 * Combines this collection of events with that collection of events to
 * return the Cartesian product of events, keeping only the events from that
 * collection.
 *
 * @ets_data_first zipRight_
 */
export function zipRight<B>(that: ParSeq<B>): <A>(self: ParSeq<A>) => ParSeq<B> {
  return (self) => zipRight_(self, that)
}
