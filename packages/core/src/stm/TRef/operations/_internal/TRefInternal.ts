import type { Todo } from "@effect/core/stm/STM/definition/primitives"
import type { TxnId } from "@effect/core/stm/STM/TxnId"
import type { Versioned } from "@effect/core/stm/STM/Versioned"
import { _A, TRefSym } from "@effect/core/stm/TRef/definition"
import type { HashMap } from "@fp-ts/data/HashMap"
import type { MutableRef } from "@fp-ts/data/mutable/MutableRef"

/** @internal */
export class TRefInternal<A> implements TRef<A> {
  readonly [TRefSym]: TRefSym = TRefSym
  readonly [_A]!: () => A
  constructor(
    public versioned: Versioned<A>,
    readonly todo: MutableRef<HashMap<TxnId, Todo>>
  ) {}
}

/**
 * @tsplus macro remove
 * @internal
 */
export function concreteTRef<A>(_: TRef<A>): asserts _ is TRefInternal<A> {
  //
}
