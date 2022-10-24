import { _A, TArraySym } from "@effect/core/stm/TArray/definition"
import type { Chunk } from "@fp-ts/data/Chunk"

/** @internal */
export class InternalTArray<A> implements TArray<A> {
  readonly [TArraySym]: TArraySym = TArraySym
  readonly [_A]!: () => A

  constructor(readonly chunk: Chunk<TRef<A>>) {}
}

/**
 * @tsplus macro remove
 * @internal
 */
export function concreteTArray<A>(_: TArray<A>): asserts _ is InternalTArray<A> {
  //
}
