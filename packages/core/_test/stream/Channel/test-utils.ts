export const NumberServiceId = Symbol.for("@effect/core/test/stream/Channel/NumberService")
export type NumberServiceId = typeof NumberServiceId

export interface NumberService {
  readonly n: number
}

export const NumberService = Tag<NumberService>()

export class NumberServiceImpl implements NumberService, Equals {
  readonly [NumberServiceId]: NumberServiceId = NumberServiceId

  constructor(readonly n: number) {}

  [Hash.sym](): number {
    return Hash.number(this.n)
  }

  [Equals.sym](u: unknown): boolean {
    return isNumberService(u) && u.n === this.n
  }
}

export function isNumberService(u: unknown): u is NumberService {
  return typeof u === "object" && u != null && NumberServiceId in u
}

export class First implements Equals {
  readonly _tag = "First"

  constructor(readonly n: number) {}

  [Hash.sym](): number {
    return Hash.combine(Hash.string(this._tag), Hash.number(this.n))
  }

  [Equals.sym](u: unknown): boolean {
    return u instanceof First && u._tag === this._tag && u.n === this.n
  }
}

export class Second implements Equals {
  readonly _tag = "Second"

  constructor(readonly first: First) {}

  [Hash.sym](): number {
    return Hash.combine(Hash.string(this._tag), Hash.unknown(this.first))
  }

  [Equals.sym](u: unknown): boolean {
    return u instanceof Second && u._tag === this._tag && u.first == this.first
  }
}

export function mapper<A, B>(
  f: (a: A) => B
): Channel<never, unknown, A, unknown, never, B, void> {
  return Channel.readWith(
    (a: A) => Channel.write(f(a)) > mapper(f),
    () => Channel.unit,
    () => Channel.unit
  )
}

export function refWriter<A>(
  ref: Ref<List<A>>
): Channel<never, unknown, A, unknown, never, never, void> {
  return Channel.readWith(
    (a: A) =>
      Channel.fromEffect(ref.update((list) => list.prepend(a)).unit) >
        refWriter(ref),
    () => Channel.unit,
    () => Channel.unit
  )
}

export function refReader<A>(
  ref: Ref<List<A>>
): Channel<never, unknown, unknown, unknown, never, A, void> {
  return Channel.fromEffect(
    ref.modify((list) => {
      if (list.isNil()) {
        return Tuple(Maybe.none, List.empty<A>())
      }
      return Tuple(Maybe.some(list.head), list.tail)
    })
  ).flatMap((option) =>
    option.fold(Channel.unit, (i) => Channel.write(i) > refReader(ref)) as Channel<
      never,
      unknown,
      unknown,
      unknown,
      never,
      A,
      void
    >
  )
}
