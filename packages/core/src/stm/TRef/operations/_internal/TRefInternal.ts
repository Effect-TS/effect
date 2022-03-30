import type { HashMap } from "../../../../collection/immutable/HashMap"
import type { AtomicReference } from "../../../../support/AtomicReference"
import { _A } from "../../../../support/Symbols"
import type { Todo } from "../../../STM/Journal"
import type { TxnId } from "../../../STM/TxnId"
import type { Versioned } from "../../../STM/Versioned"
import type { TRef } from "../../definition"
import { TRefSym } from "../../definition"

export class TRefInternal<A> implements TRef<A> {
  readonly [TRefSym]: TRefSym = TRefSym;
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
