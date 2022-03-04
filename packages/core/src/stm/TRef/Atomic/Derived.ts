import { Either } from "../../../data/Either"
import { STM } from "../../STM"
import type { XTRef, XTRefInternal } from "../definition"
import { _A, _B, _EA, _EB, TRefSym } from "../definition"
import type { Atomic } from "./Atomic"
import { DerivedAll } from "./DerivedAll"

export class Derived<S, EA, EB, A, B> implements XTRefInternal<EA, EB, A, B> {
  readonly _tag = "Derived";
  readonly [TRefSym]: TRefSym = TRefSym;
  readonly [_EA]: () => EA;
  readonly [_EB]: () => EB;
  readonly [_A]: (_: A) => void;
  readonly [_B]: () => B

  constructor(
    readonly getEither: (s: S) => Either<EB, B>,
    readonly setEither: (a: A) => Either<EA, S>,
    readonly value: Atomic<S>,
    readonly atomic: Atomic<unknown>
  ) {}

  get _get(): STM<unknown, EB, B> {
    return this.value._get.flatMap((s) =>
      this.getEither(s).fold(STM.failNow, STM.succeedNow)
    )
  }

  _set(a: A): STM<unknown, EA, void> {
    return this.setEither(a).fold(STM.failNow, STM.succeedNow)
  }

  _fold<EC, ED, C, D>(
    ea: (ea: EA) => EC,
    eb: (ea: EB) => ED,
    ca: (c: C) => Either<EC, A>,
    bd: (b: B) => Either<ED, D>
  ): XTRef<EC, ED, C, D> {
    return new Derived(
      (s) => this.getEither(s).fold((e) => Either.left(eb(e)), bd),
      (c) =>
        ca(c).flatMap((a) =>
          this.setEither(a).fold((e) => Either.left(ea(e)), Either.right)
        ),
      this.value,
      this.atomic
    )
  }

  _foldAll<EC, ED, C, D>(
    ea: (ea: EA) => EC,
    eb: (ea: EB) => ED,
    ec: (ea: EB) => EC,
    ca: (c: C) => (b: B) => Either<EC, A>,
    bd: (b: B) => Either<ED, D>
  ): XTRef<EC, ED, C, D> {
    return new DerivedAll(
      (s) => this.getEither(s).fold((e) => Either.left(eb(e)), bd),
      (c) => (s) =>
        this.getEither(s)
          .fold((e) => Either.left(ec(e)), ca(c))
          .flatMap((a) =>
            this.setEither(a).fold((e) => Either.left(ea(e)), Either.right)
          ),
      this.value,
      this.atomic
    )
  }
}
