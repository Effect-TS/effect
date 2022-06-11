import { _A, TArraySym } from "@effect/core/stm/TArray/definition"

export class InternalTArray<A> implements TArray<A> {
  readonly [TArraySym]: TArraySym = TArraySym
  readonly [_A]!: () => A

  constructor(readonly chunk: Chunk<TRef<A>>) {}
}

/**
 * @tsplus macro remove
 */
export function concreteTArray<A>(_: TArray<A>): asserts _ is InternalTArray<A> {
  //
}
