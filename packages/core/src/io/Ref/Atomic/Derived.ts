import { Either } from "../../../data/Either"
import { Effect } from "../../Effect"
import type { XRef } from "../definition"
import { XRefInternal } from "../definition"
import type { Atomic } from "./Atomic"
import { DerivedAll } from "./DerivedAll"

export class Derived<EA, EB, A, B> extends XRefInternal<
  unknown,
  unknown,
  EA,
  EB,
  A,
  B
> {
  readonly _tag = "Derived"

  constructor(
    readonly use: <X>(
      f: <S>(
        value: Atomic<S>,
        getEither: (s: S) => Either<EB, B>,
        setEither: (a: A) => Either<EA, S>
      ) => X
    ) => X
  ) {
    super()
  }

  get _get(): Effect<unknown, EB, B> {
    return this.use((value, getEither) =>
      value._get.flatMap((s) => getEither(s).fold(Effect.failNow, Effect.succeedNow))
    )
  }

  _set(a: A, __tsplusTrace?: string): Effect<unknown, EA, void> {
    return this.use((value, _, setEither) =>
      setEither(a).fold(Effect.failNow, value._set)
    )
  }

  _fold<EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ca: (_: C) => Either<EC, A>,
    bd: (_: B) => Either<ED, D>
  ): XRef<unknown, unknown, EC, ED, C, D> {
    return this.use(
      (value, getEither, setEither) =>
        new Derived((f) =>
          f(
            value,
            (s) => getEither(s).fold((e) => Either.left(eb(e)), bd),
            (c) =>
              ca(c).flatMap((a) =>
                setEither(a).fold((e) => Either.left(ea(e)), Either.right)
              )
          )
        )
    )
  }

  _foldAll<EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ec: (_: EB) => EC,
    ca: (_: C) => (_: B) => Either<EC, A>,
    _bd: (_: B) => Either<ED, D>
  ): XRef<unknown, unknown, EC, ED, C, D> {
    return this.use(
      (value, getEither, setEither) =>
        new DerivedAll<EC, ED, C, D>((f) =>
          f(
            value,
            (s) =>
              getEither(s).fold((e) => Either.left(eb(e)), Either.right) as Either<
                ED,
                D
              >,
            (c) => (s) =>
              getEither(s)
                .fold((e) => Either.leftW(ec(e)), ca(c))
                .flatMap((a) =>
                  setEither(a).fold((e) => Either.left(ea(e)), Either.right)
                )
          )
        )
    )
  }
}
