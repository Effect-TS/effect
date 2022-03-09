import { List } from "../collection/immutable/List"
import { Tuple } from "../collection/immutable/Tuple"
import type { Predicate } from "../data/Function"
import { Option } from "../data/Option"

export class ImmutableQueue<A> {
  constructor(private readonly backing: List<A>) {}

  push(a: A) {
    return new ImmutableQueue(this.backing.append(a))
  }

  prepend(a: A) {
    return new ImmutableQueue(this.backing.append(a))
  }

  get size() {
    return this.backing.length
  }

  dequeue(): Option<Tuple<[NonNullable<A>, ImmutableQueue<A>]>> {
    if (!this.backing.isEmpty()) {
      return Option.some(
        Tuple(
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          this.backing.unsafeFirst()!,
          new ImmutableQueue(this.backing.tail())
        )
      )
    } else {
      return Option.none
    }
  }

  map<B>(f: (a: A) => B): ImmutableQueue<B> {
    return new ImmutableQueue(this.backing.map(f))
  }

  count(f: Predicate<A>): number {
    return this.backing.reduce(0, (n, a) => (f(a) ? n + 1 : n))
  }

  exists(f: Predicate<A>): boolean {
    return this.backing.some(f)
  }

  find(f: Predicate<A>): Option<A> {
    return this.backing.find(f)
  }

  filter(f: Predicate<A>): ImmutableQueue<A> {
    return new ImmutableQueue(this.backing.filter(f))
  }

  reduce<Z>(z: Z, f: (z: Z, a: A) => Z): Z {
    return this.backing.reduce(z, f)
  }

  static single<A>(a: A) {
    return new ImmutableQueue(List.single(a))
  }

  [Symbol.iterator]() {
    return this.backing.toArray().values()
  }
}
