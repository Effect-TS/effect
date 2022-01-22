import * as Tp from "../Collections/Immutable/Tuple"
import * as V from "../Collections/Immutable/Vector"
import * as O from "../Option"

export class ImmutableQueue<A> {
  constructor(private readonly backing: V.Vector<A>) {}

  push(a: A) {
    return new ImmutableQueue(V.append_(this.backing, a))
  }

  prepend(a: A) {
    return new ImmutableQueue(V.prepend_(this.backing, a))
  }

  get size() {
    return this.backing.length
  }

  dequeue(): O.Option<Tp.Tuple<[NonNullable<A>, ImmutableQueue<A>]>> {
    if (!V.isEmpty(this.backing)) {
      return O.some(
        Tp.tuple(
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          V.unsafeFirst(this.backing)!,
          new ImmutableQueue(V.tail(this.backing))
        )
      )
    } else {
      return O.none
    }
  }

  find(f: (a: A) => boolean) {
    return V.find_(this.backing, f)
  }

  filter(f: (a: A) => boolean) {
    return new ImmutableQueue(V.filter_(this.backing, f))
  }

  static single<A>(a: A) {
    return new ImmutableQueue(V.of(a))
  }

  [Symbol.iterator]() {
    return V.toArray(this.backing).values()
  }
}
