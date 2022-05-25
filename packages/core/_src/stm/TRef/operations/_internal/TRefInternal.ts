import type { Todo } from "@effect/core/stm/STM/Journal"
import type { TxnId } from "@effect/core/stm/STM/TxnId"
import type { Versioned } from "@effect/core/stm/STM/Versioned"
import { _A, TRefSym } from "@effect/core/stm/TRef/definition"

export class TRefInternal<A> implements TRef<A> {
  readonly [TRefSym]: TRefSym = TRefSym
  readonly [_A]!: () => A
  constructor(
    public versioned: Versioned<A>,
    readonly todo: AtomicReference<HashMap<TxnId, Todo>>
  ) {}
}

/**
 * @tsplus macro remove
 */
export function concreteTRef<A>(_: TRef<A>): asserts _ is TRefInternal<A> {
  //
}
