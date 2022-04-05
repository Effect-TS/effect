import { List } from "../../../src/collection/immutable/List"
import { Tuple } from "../../../src/collection/immutable/Tuple"
import { tag } from "../../../src/data/Has"
import { Option } from "../../../src/data/Option"
import type { Ref } from "../../../src/io/Ref"
import { Channel } from "../../../src/stream/Channel"

export interface NumberService {
  readonly n: number
}

export const NumberService = tag<NumberService>()

export function mapper<A, B>(
  f: (a: A) => B
): Channel<unknown, unknown, A, unknown, never, B, void> {
  return Channel.readWith(
    (a: A) => Channel.write(f(a)) > mapper(f),
    () => Channel.unit,
    () => Channel.unit
  )
}

export function refWriter<A>(
  ref: Ref<List<A>>
): Channel<unknown, unknown, A, unknown, never, never, void> {
  return Channel.readWith(
    (a: A) =>
      Channel.fromEffect(ref.update((list) => list.prepend(a)).asUnit()) >
      refWriter(ref),
    () => Channel.unit,
    () => Channel.unit
  )
}

export function refReader<A>(
  ref: Ref<List<A>>
): Channel<unknown, unknown, unknown, unknown, never, A, void> {
  return Channel.fromEffect(
    ref.modify((list) =>
      list.foldLeft(
        () => Tuple(Option.none, List.empty<A>()),
        (head, tail) => Tuple(Option.some(head), tail)
      )
    )
  ).flatMap((option) =>
    option.fold(Channel.unit, (i) => Channel.write(i) > refReader(ref))
  )
}
