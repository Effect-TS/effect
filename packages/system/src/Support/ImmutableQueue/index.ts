// tracing: off

import "../../Operator"

import * as L from "../../Collections/Immutable/List"
import * as O from "../../Option"

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

  dequeue(): O.Option<readonly [NonNullable<A>, ImmutableQueue<A>]> {
    if (!L.isEmpty(this.backing)) {
      return O.some([
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        L.unsafeFirst(this.backing)!,
        new ImmutableQueue(L.tail(this.backing))
      ] as const)
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
}
