// ets_tracing: off

import "../../Operator/index.js"

import * as L from "../../Collections/Immutable/List/index.js"
import * as Tp from "../../Collections/Immutable/Tuple/index.js"
import * as O from "../../Option/index.js"

export class ImmutableQueue<A> {
  constructor(private readonly backing: L.List<A>) {}

  push(a: A) {
    return new ImmutableQueue(L.append_(this.backing, a))
  }

  prepend(a: A) {
    return new ImmutableQueue(L.prepend_(this.backing, a))
  }

  get size() {
    return this.backing.length
  }

  dequeue(): O.Option<Tp.Tuple<[NonNullable<A>, ImmutableQueue<A>]>> {
    if (!L.isEmpty(this.backing)) {
      return O.some(
        Tp.tuple(
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          L.unsafeFirst(this.backing)!,
          new ImmutableQueue(L.tail(this.backing))
        )
      )
    } else {
      return O.none
    }
  }

  find(f: (a: A) => boolean) {
    return L.find_(this.backing, f)
  }

  filter(f: (a: A) => boolean) {
    return new ImmutableQueue(L.filter_(this.backing, f))
  }

  static single<A>(a: A) {
    return new ImmutableQueue(L.of(a))
  }

  [Symbol.iterator]() {
    return L.toArray(this.backing).values()
  }
}
