export const NumberServiceId = Symbol.for("@effect-ts/core/test/stream/Channel/NumberService");
export type NumberServiceId = typeof NumberService;

export interface NumberService {
  readonly n: number;
}

export const NumberService = Service<NumberService>(NumberServiceId);

export function mapper<A, B>(
  f: (a: A) => B
): Channel<unknown, unknown, A, unknown, never, B, void> {
  return Channel.readWith(
    (a: A) => Channel.write(f(a)) > mapper(f),
    () => Channel.unit,
    () => Channel.unit
  );
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
  );
}

export function refReader<A>(
  ref: Ref<List<A>>
): Channel<unknown, unknown, unknown, unknown, never, A, void> {
  return Channel.fromEffect(
    ref.modify((list) => {
      if (list.isNil()) {
        return Tuple(Option.none, List.empty<A>());
      }
      return Tuple(Option.some(list.head), list.tail);
    })
  ).flatMap((option) => option.fold(Channel.unit, (i) => Channel.write(i) > refReader(ref)));
}
