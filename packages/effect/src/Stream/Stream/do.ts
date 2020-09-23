import * as T from "../_internal/effect"
import { pipe } from "../../Function"
import { chain } from "./chain"
import type { Stream } from "./definitions"
import { fromEffect } from "./fromEffect"
import { map } from "./map"

const bind = <S, R, E, A, K, N extends string>(
  tag: Exclude<N, keyof K>,
  f: (_: K) => Stream<S, R, E, A>
) => <S2, R2, E2>(
  mk: Stream<S2, R2, E2, K>
): Stream<S | S2, R & R2, E | E2, K & { [k in N]: A }> =>
  pipe(
    mk,
    chain((k) =>
      pipe(
        f(k),
        map((a): K & { [k in N]: A } => ({ ...k, [tag]: a } as any))
      )
    )
  )

const merge = <S, R, E, A, K>(
  f: (_: K) => Stream<S, R, E, A & { [k in keyof K & keyof A]?: never }>
) => <S2, R2, E2>(mk: Stream<S2, R2, E2, K>): Stream<S | S2, R & R2, E | E2, K & A> =>
  pipe(
    mk,
    chain((k) =>
      pipe(
        f(k),
        map((a): K & A => ({ ...k, ...a } as any))
      )
    )
  )

const let_ = <A, K, N extends string>(tag: Exclude<N, keyof K>, f: (_: K) => A) => <
  S2,
  R2,
  E2
>(
  mk: Stream<S2, R2, E2, K>
): Stream<S2, R2, E2, K & { [k in N]: A }> =>
  pipe(
    mk,
    map((k): K & { [k in N]: A } => ({ ...k, [tag]: f(k) } as any))
  )

const do_ = fromEffect(T.succeedNow({}))

export { let_ as let, bind, do_ as do, merge }
