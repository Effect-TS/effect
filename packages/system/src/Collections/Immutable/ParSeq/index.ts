import { _A, _E } from "../../../Effect/commons"
import * as E from "../../../Either"
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
