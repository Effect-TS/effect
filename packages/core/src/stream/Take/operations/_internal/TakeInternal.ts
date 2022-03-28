import type { Chunk } from "../../../../collection/immutable/Chunk"
import type { Option } from "../../../../data/Option"
import type { Exit } from "../../../../io/Exit"
import { _A, _E } from "../../../../support/Symbols"
import type { Take } from "../../definition"
import { TakeSym } from "../../definition"

export class TakeInternal<E, A> implements Take<E, A> {
  readonly [TakeSym]: TakeSym = TakeSym;
  readonly [_E]!: () => E;
  readonly [_A]!: () => A

  constructor(readonly _exit: Exit<Option<E>, Chunk<A>>) {}
}

/**
 * @tsplus macro remove
 */
export function concreteTake<E, A>(_: Take<E, A>): asserts _ is TakeInternal<E, A> {
  //
}
