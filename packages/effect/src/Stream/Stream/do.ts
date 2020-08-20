import * as T from "../_internal/effect"
import { pipe } from "../../Function"
import * as S from "./index"

const bind = <S, R, E, A, K, N extends string>(
  tag: Exclude<N, keyof K>,
  f: (_: K) => S.Stream<S, R, E, A>
) => <S2, R2, E2>(
  mk: S.Stream<S2, R2, E2, K>
): S.Stream<S | S2, R & R2, E | E2, K & { [k in N]: A }> =>
  pipe(
    mk,
    S.chain((k) =>
      pipe(
        f(k),
        S.map((a): K & { [k in N]: A } => ({ ...k, [tag]: a } as any))
      )
    )
  )

const merge = <S, R, E, A, K>(
  f: (_: K) => S.Stream<S, R, E, A & { [k in keyof K & keyof A]?: never }>
) => <S2, R2, E2>(
  mk: S.Stream<S2, R2, E2, K>
): S.Stream<S | S2, R & R2, E | E2, K & A> =>
  pipe(
    mk,
    S.chain((k) =>
      pipe(
        f(k),
        S.map((a): K & A => ({ ...k, ...a } as any))
      )
    )
  )

const let_ = <A, K, N extends string>(tag: Exclude<N, keyof K>, f: (_: K) => A) => <
  S2,
  R2,
  E2
>(
  mk: S.Stream<S2, R2, E2, K>
): S.Stream<S2, R2, E2, K & { [k in N]: A }> =>
  pipe(
    mk,
    S.map((k): K & { [k in N]: A } => ({ ...k, [tag]: f(k) } as any))
  )

const of = S.fromEffect(T.succeedNow({}))

export { let_ as let, bind, of, merge }
