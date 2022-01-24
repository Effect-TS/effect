import * as E from "../../../data/Either"
import { pipe } from "../../../data/Function"
import type { XRef } from "../definition"
import { XRefInternal } from "../definition"
import type { Atomic } from "./Atomic"
import { DerivedAll } from "./DerivedAll"
import * as T from "./operations/_internal/effect"

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
        getEither: (s: S) => E.Either<EB, B>,
        setEither: (a: A) => E.Either<EA, S>
      ) => X
    ) => X
  ) {
    super()
  }

  get get(): T.Effect<unknown, EB, B> {
    return this.use((value, getEither) =>
      pipe(
        value.get,
        T.chain((s) => E.fold_(getEither(s), T.failNow, T.succeedNow))
      )
    )
  }

  set(a: A): T.Effect<unknown, EA, void> {
    return this.use((value, _, setEither) =>
      E.fold_(setEither(a), T.failNow, value.set)
    )
  }

  fold<EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ca: (_: C) => E.Either<EC, A>,
    bd: (_: B) => E.Either<ED, D>
  ): XRef<unknown, unknown, EC, ED, C, D> {
    return this.use(
      (value, getEither, setEither) =>
        new Derived((f) =>
          f(
            value,
            (s) => E.fold_(getEither(s), (e) => E.left(eb(e)), bd),
            (c) =>
              E.chain_(ca(c), (a) =>
                E.fold_(setEither(a), (e) => E.left(ea(e)), E.right)
              )
          )
        )
    )
  }

  foldAll<EC, ED, C, D>(
    ea: (_: EA) => EC,
    eb: (_: EB) => ED,
    ec: (_: EB) => EC,
    ca: (_: C) => (_: B) => E.Either<EC, A>,
    _bd: (_: B) => E.Either<ED, D>
  ): XRef<unknown, unknown, EC, ED, C, D> {
    return this.use(
      (value, getEither, setEither) =>
        new DerivedAll<EC, ED, C, D>((f) =>
          f(
            value,
            (s) =>
              E.fold_(getEither(s), (e) => E.left(eb(e)), E.right) as E.Either<ED, D>,
            (c) => (s) =>
              pipe(
                getEither(s),
                E.fold((e) => E.widenA<A>()(E.left(ec(e))), ca(c)),
                E.chain((a) =>
                  pipe(
                    setEither(a),
                    E.fold((e) => E.left(ea(e)), E.right)
                  )
                )
              )
          )
        )
    )
  }
}
