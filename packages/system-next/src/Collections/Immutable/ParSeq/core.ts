import * as Cause from "../../../Cause/definition"
import * as E from "../../../Either"
import { identity } from "../../../Function"
import * as O from "../../../Option"
import * as Tp from "../Tuple"
import * as V from "../Vector/core"
import type { ParSeq } from "./primitives"
import * as P from "./primitives"

/**
 * Returns the first event in this collection of events. If multiple events
 * occur in parallel and before any other events then any of these events
 * may be returned.
 */
export function first<A>(self: ParSeq<A>): O.Option<A> {
  // eslint-disable-next-line no-constant-condition
  while (1) {
    switch (self._tag) {
      case "Single": {
        return O.some(self.a)
      }
      case "Empty": {
        return O.none
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
  inp: V.Vector<ParSeq<A>>,
  out: V.Vector<E.Either<boolean, B>>
): V.Vector<B> {
  // eslint-disable-next-line no-constant-condition
  while (1) {
    if (V.isEmpty(inp)) {
      return V.reduce_(out, V.empty<B>(), (acc, val) => {
        if (val._tag === "Right") {
          return V.prepend_(acc, val.right)
        } else {
          if (val.left) {
            let parSeqs = acc
            const left = V.unsafeFirst(parSeqs)
            parSeqs = V.tail(parSeqs)
            const right = V.unsafeFirst(parSeqs)
            parSeqs = V.tail(parSeqs)
            return V.prepend_(parSeqs, bothCase(left!, right!))
          } else {
            let parSeqs = acc
            const left = V.unsafeFirst(parSeqs)
            parSeqs = V.tail(parSeqs)
            const right = V.unsafeFirst(parSeqs)
            parSeqs = V.tail(parSeqs)
            return V.prepend_(parSeqs, thenCase(left!, right!))
          }
        }
      })
    } else {
      const head = V.unsafeFirst(inp)!
      const parSeqs = V.tail(inp)

      switch (head._tag) {
        case "Empty": {
          inp = parSeqs
          out = V.prepend_(out, E.right(emptyCase))
          break
        }
        case "Single": {
          inp = parSeqs
          out = V.prepend_(out, E.right(singleCase(head.a)))
          break
        }
        case "Then": {
          inp = V.prepend_(V.prepend_(parSeqs, head.right), head.left)
          out = V.prepend_(out, E.left(false))
          break
        }
        case "Both": {
          inp = V.prepend_(V.prepend_(parSeqs, head.right), head.left)
          out = V.prepend_(out, E.left(true))
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
  return V.unsafeFirst(
    foldLoop(emptyCase, singleCase, thenCase, bothCase, V.of(self), V.empty())
  )!
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
export function toCause<A>(self: ParSeq<A>): Cause.Cause<A> {
  return fold_(self, Cause.empty as Cause.Cause<A>, Cause.fail, Cause.then, Cause.both)
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
export function zip_<A, B>(self: ParSeq<A>, that: ParSeq<B>): ParSeq<Tp.Tuple<[A, B]>> {
  return zipWith_(self, that, Tp.tuple)
}

/**
 * Combines this collection of events with that collection of events to
 * return the Cartesian product of events, combining the elements into a
 * tuple.
 *
 * @ets_data_first zip_
 */
export function zip<B>(
  that: ParSeq<B>
): <A>(self: ParSeq<A>) => ParSeq<Tp.Tuple<[A, B]>> {
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
