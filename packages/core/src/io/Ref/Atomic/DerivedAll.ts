import { Tuple } from "../../../collection/immutable/Tuple"
import { Either } from "../../../data/Either"
import { Effect } from "../../Effect"
import type { XRef } from "../definition"
import { XRefInternal } from "../definition"
import type { Atomic } from "./Atomic"
import { modify_ } from "./operations/modify"

export class DerivedAll<EA, EB, A, B> extends XRefInternal<
  unknown,
  unknown,
  EA,
  EB,
  A,
  B
> {
  readonly _tag = "DerivedAll"

  constructor(
    readonly use: <X>(
      f: <S>(
        value: Atomic<S>,
        getEither: (s: S) => Either<EB, B>,
        setEither: (a: A) => (s: S) => Either<EA, S>
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

  _set(a: A): Effect<unknown, EA, void> {
    return this.use((value, _, setEither) =>
      modify_(value, (s) =>
        setEither(a)(s).fold(
          (e) => Tuple(Either.leftW<EA, void>(e), s),
          (s) => Tuple(Either.right(undefined), s)
        )
      ).absolve()
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
        new DerivedAll((f) =>
          f(
            value,
            (s) => getEither(s).fold((e) => Either.left(eb(e)), bd),
            (c) => (s) =>
              ca(c).flatMap((a) =>
                setEither(a)(s).fold((e) => Either.left(ea(e)), Either.right)
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
    bd: (_: B) => Either<ED, D>
  ): XRef<unknown, unknown, EC, ED, C, D> {
    return this.use(
      (value, getEither, setEither) =>
        new DerivedAll((f) =>
          f(
            value,
            (s) => getEither(s).fold((e) => Either.left(eb(e)), bd),
            (c) => (s) =>
              getEither(s)
                .fold((e) => Either.leftW(ec(e)), ca(c))
                .flatMap((a) =>
                  setEither(a)(s).fold((e) => Either.left(ea(e)), Either.right)
                )
          )
        )
    )
  }
}
