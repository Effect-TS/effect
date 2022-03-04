import type { Chunk } from "../../../../collection/immutable/Chunk"
import type { TRef } from "../../../TRef"
import type { TArray } from "../../definition"
import { TArraySym } from "../../definition"

export class InternalTArray<A> implements TArray<A> {
  readonly [TArraySym]: TArraySym = TArraySym
  constructor(readonly chunk: Chunk<TRef<A>>) {}
}

export function concrete<A>(_: TArray<A>): asserts _ is InternalTArray<A> {
  //
}
