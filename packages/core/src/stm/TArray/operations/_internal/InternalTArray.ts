import type { Chunk } from "../../../../collection/immutable/Chunk"
import { _A } from "../../../../support/Symbols"
import type { TRef } from "../../../TRef"
import type { TArray } from "../../definition"
import { TArraySym } from "../../definition"

export class InternalTArray<A> implements TArray<A> {
  readonly [TArraySym]: TArraySym = TArraySym;
  readonly [_A]!: () => A
  constructor(readonly chunk: Chunk<TRef<A>>) {}
}

/**
 * @tsplus macro remove
 */
export function concrete<A>(_: TArray<A>): asserts _ is InternalTArray<A> {
  //
}
