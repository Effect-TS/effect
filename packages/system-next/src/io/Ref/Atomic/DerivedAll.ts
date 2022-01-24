import * as Tp from "../../../collection/immutable/Tuple"
import * as E from "../../../data/Either"
import { pipe } from "../../../data/Function"
import type { XRef } from "../definition"
import { XRefInternal } from "../definition"
import type { Atomic } from "./Atomic"
import * as T from "./operations/_internal/effect"
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
        getEither: (s: S) => E.Either<EB, B>,
        setEither: (a: A) => (s: S) => E.Either<EA, S>
      ) => X
    ) => X
  ) {
    super()
  }

  get get(): T.Effect<unknown, EB, B> {
    return this.use((value, getEither) =>
      T.chain_(value.get, (s) => E.fold_(getEither(s), T.failNow, T.succeedNow))
    )
  }

  set(a: A): T.Effect<unknown, EA, void> {
    return this.use((value, _, setEither) =>
      T.absolveNow(
        modify_(value, (s) =>
          E.fold_(
            setEither(a)(s),
            (e) => Tp.tuple(E.leftW<EA, void>(e), s),
            (s) => Tp.tuple(E.right(undefined), s)
          )
        )
      )
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
        new DerivedAll((f) =>
          f(
            value,
            (s) => E.fold_(getEither(s), (e) => E.left(eb(e)), bd),
            (c) => (s) =>
              E.chain_(ca(c), (a) =>
                E.fold_(setEither(a)(s), (e) => E.left(ea(e)), E.right)
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
    bd: (_: B) => E.Either<ED, D>
  ): XRef<unknown, unknown, EC, ED, C, D> {
    return this.use(
      (value, getEither, setEither) =>
        new DerivedAll((f) =>
          f(
            value,
            (s) => E.fold_(getEither(s), (e) => E.left(eb(e)), bd),
            (c) => (s) =>
              pipe(
                getEither(s),
                E.fold((e) => E.widenA<A>()(E.left(ec(e))), ca(c)),
                E.chain((a) => E.fold_(setEither(a)(s), (e) => E.left(ea(e)), E.right))
              )
          )
        )
    )
  }
}
