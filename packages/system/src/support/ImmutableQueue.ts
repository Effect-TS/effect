import { List } from "../collection/immutable/List"
import { Tuple } from "../collection/immutable/Tuple"
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

  find(f: (a: A) => boolean) {
    return this.backing.find(f)
  }

  filter(f: (a: A) => boolean) {
    return new ImmutableQueue(this.backing.filter(f))
  }

  static single<A>(a: A) {
    return new ImmutableQueue(List.single(a))
  }

  [Symbol.iterator]() {
    return this.backing.toArray().values()
  }
}
