import * as Cause from "../../../Cause/core"
import { _A } from "../../../Effect/commons"
import * as E from "../../../Either"
import { identity } from "../../../Function"
import * as O from "../../../Option"
import * as L from "../List/core"

/**
 * `ParSeq` is a data type that represents some notion of "events" that can
 * take place in parallel or in sequence. For example, a `ParSeq`
 * parameterized on some error type could be used to model the potentially
 * multiple ways that an application can fail. On the other hand, a ParSeq`
 * parameterized on some request type could be used to model a collection of
 * requests to external data sources, some of which could be executed in
 * parallel and some of which must be executed sequentially.
 */
export abstract class ParSeq<A> {
  readonly [_A]: () => A
}

class Empty extends ParSeq<never> {
  readonly _tag = "Empty"
}

class Then<A, A1> extends ParSeq<A | A1> {
  readonly _tag = "Then"
  constructor(readonly left: ParSeq<A>, readonly right: ParSeq<A1>) {
    super()
  }
}

class Both<A, A1> extends ParSeq<A | A1> {
  readonly _tag = "Both"
  constructor(readonly left: ParSeq<A>, readonly right: ParSeq<A1>) {
    super()
  }
}

class Single<A> extends ParSeq<A> {
  readonly _tag = "Single"
  constructor(readonly a: A) {
    super()
  }
}

/**
 * @optimize remove
 */
function concrete<A>(
  _: ParSeq<A>
): asserts _ is Empty | Single<A> | Then<A, A> | Both<A, A> {
  //
}

/**
 * Combines this collection of events with that collection of events to
 * return a new collection of events that represents this collection of
 * events in parallel with that collection of events.
 */
export function both_<A, A1>(left: ParSeq<A>, right: ParSeq<A1>): ParSeq<A | A1> {
  return new Both(left, right)
}

/**
 * Combines this collection of events with that collection of events to
 * return a new collection of events that represents this collection of
 * events in parallel with that collection of events.
 *
 * @dataFirst both_
 */
export function both<A1>(right: ParSeq<A1>): <A>(left: ParSeq<A>) => ParSeq<A | A1> {
  return (left) => new Both(left, right)
}

/**
 * Combines this collection of events with that collection of events to
 * return a new collection of events that represents this collection of
 * events followed by that collection of events.
 */
export function then_<A, A1>(left: ParSeq<A>, right: ParSeq<A1>): ParSeq<A | A1> {
  return new Then(left, right)
}

/**
 * Combines this collection of events with that collection of events to
 * return a new collection of events that represents this collection of
 * events followed by that collection of events.
 *
 * @dataFirst then_
 */
export function then<A1>(right: ParSeq<A1>): <A>(left: ParSeq<A>) => ParSeq<A | A1> {
  return (left) => new Then(left, right)
}

/**
 * Constructs a new collection of events that contains the specified event.
 */
export function single<A>(a: A): ParSeq<A> {
  return new Single(a)
}

/**
 * Empty collection of events
 */
export const empty: ParSeq<never> = new Empty()

/**
 * Returns the first event in this collection of events. If multiple events
 * occur in parallel and before any other events then any of these events
 * may be returned.
 */
export function first<A>(self: ParSeq<A>): O.Option<A> {
  // eslint-disable-next-line no-constant-condition
  while (1) {
    concrete(self)
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
  inp: L.List<ParSeq<A>>,
  out: L.List<E.Either<boolean, B>>
): L.List<B> {
  // eslint-disable-next-line no-constant-condition
  while (1) {
    if (L.isEmpty(inp)) {
      return L.reduce_(out, L.empty<B>(), (acc, val) => {
        if (val._tag === "Right") {
          return L.prepend_(acc, val.right)
        } else {
          if (val.left) {
            let parSeqs = acc
            const left = L.unsafeFirst(parSeqs)
            parSeqs = L.tail(parSeqs)
            const right = L.unsafeFirst(parSeqs)
            parSeqs = L.tail(parSeqs)
            return L.prepend_(parSeqs, bothCase(left!, right!))
          } else {
            let parSeqs = acc
            const left = L.unsafeFirst(parSeqs)
            parSeqs = L.tail(parSeqs)
            const right = L.unsafeFirst(parSeqs)
            parSeqs = L.tail(parSeqs)
            return L.prepend_(parSeqs, thenCase(left!, right!))
          }
        }
      })
    } else {
      const head = L.unsafeFirst(inp)!
      concrete(head)
      const parSeqs = L.tail(inp)

      switch (head._tag) {
        case "Empty": {
          inp = parSeqs
          out = L.prepend_(out, E.right(emptyCase))
          break
        }
        case "Single": {
          inp = parSeqs
          out = L.prepend_(out, E.right(singleCase(head.a)))
          break
        }
        case "Then": {
          inp = L.prepend_(L.prepend_(parSeqs, head.right), head.left)
          out = L.prepend_(out, E.left(false))
          break
        }
        case "Both": {
          inp = L.prepend_(L.prepend_(parSeqs, head.right), head.left)
          out = L.prepend_(out, E.left(true))
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
  return L.unsafeFirst(
    foldLoop(emptyCase, singleCase, thenCase, bothCase, L.of(self), L.empty())
  )!
}

/**
 * Folds over the events in this collection of events using the specified
 * functions.
 *
 * @dataFirst fold_
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
  return fold_(self, empty as ParSeq<B>, f, then_, both_)
}

/**
 * Constructs a new collection of events for each event in this collection of
 * events, collecting them back into a single collection of events.
 *
 * @dataFirst chain_
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
  return chain_(self, (a) => single(f(a)))
}

/**
 * Transforms the type of events in this collection of events with the
 * specified function.
 *
 * @dataFirst map_
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
 * @dataFirst zipWith_
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
export function zip_<A, B>(self: ParSeq<A>, that: ParSeq<B>): ParSeq<readonly [A, B]> {
  return zipWith_(self, that, (a, b) => [a, b])
}

/**
 * Combines this collection of events with that collection of events to
 * return the Cartesian product of events, combining the elements into a
 * tuple.
 *
 * @dataFirst zip_
 */
export function zip<B>(
  that: ParSeq<B>
): <A>(self: ParSeq<A>) => ParSeq<readonly [A, B]> {
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
 * @dataFirst zipLeft_
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
 * @dataFirst zipRight_
 */
export function zipRight<B>(that: ParSeq<B>): <A>(self: ParSeq<A>) => ParSeq<B> {
  return (self) => zipRight_(self, that)
}

function isEmptyLoop<A>(self: L.List<ParSeq<A>>): boolean {
  while (!L.isEmpty(self)) {
    const head = L.unsafeFirst(self)!
    const tail = L.tail(self)
    concrete(head)
    switch (head._tag) {
      case "Empty": {
        self = tail
        break
      }
      case "Single": {
        return false
      }
      case "Both": {
        self = L.prepend_(L.prepend_(tail, head.right), head.left)
        break
      }
      case "Then": {
        self = L.prepend_(L.prepend_(tail, head.right), head.left)
        break
      }
    }
  }
  return true
}

/**
 * Checks if the ParSeq is empty
 */
export function isEmpty<A>(self: ParSeq<A>): boolean {
  return isEmptyLoop(L.of(self))
}
