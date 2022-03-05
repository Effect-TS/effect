import type { HashMap } from "../../../collection/immutable/HashMap"
import type { Either } from "../../../data/Either"
import type { AtomicReference } from "../../../support/AtomicReference"
import type { STM } from "../../STM"
import { STMEffect } from "../../STM"
import type { Todo } from "../../STM/Journal"
import type { TxnId } from "../../STM/TxnId"
import type { Versioned } from "../../STM/Versioned"
import type { XTRef, XTRefInternal } from "../definition"
import { _A, _B, _EA, _EB, TRefSym } from "../definition"
import { Derived } from "./Derived"
import { DerivedAll } from "./DerivedAll"
import { getOrMakeEntry } from "./operations/getOrMakeEntry"

/**
 * @tsplus type ets/AtomicTRef
 */
export class Atomic<A> implements XTRefInternal<never, never, A, A> {
  readonly _tag = "Atomic";
  readonly [TRefSym]: TRefSym = TRefSym;
  readonly [_EA]: () => never;
  readonly [_EB]: () => never;
  readonly [_A]: (_: A) => void;
  readonly [_B]: () => A

  readonly atomic: Atomic<unknown> = this as Atomic<unknown>

  constructor(
    public versioned: Versioned<A>,
    readonly todo: AtomicReference<HashMap<TxnId, Todo>>
  ) {}

  get _get(): STM<unknown, never, A> {
    return new STMEffect((journal) =>
      getOrMakeEntry(this, journal).use((entry) => entry.unsafeGet())
    )
  }

  _set(a: A): STM<unknown, never, void> {
    return new STMEffect((journal) =>
      getOrMakeEntry(this, journal).use((entry) => entry.unsafeSet(a))
    )
  }

  _fold<EC, ED, C, D>(
    _ea: (ea: never) => EC,
    _eb: (ea: never) => ED,
    ca: (c: C) => Either<EC, A>,
    bd: (b: A) => Either<ED, D>
  ): XTRef<EC, ED, C, D> {
    return new Derived(bd, ca, this, this.atomic)
  }

  _foldAll<EC, ED, C, D>(
    _ea: (ea: never) => EC,
    _eb: (ea: never) => ED,
    _ec: (ea: never) => EC,
    ca: (c: C) => (b: A) => Either<EC, A>,
    bd: (b: A) => Either<ED, D>
  ): XTRef<EC, ED, C, D> {
    return new DerivedAll(bd, ca, this, this.atomic)
  }
}
