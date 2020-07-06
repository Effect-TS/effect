import { pipe } from "../../Function"

import { chain } from "./chain"
import { Effect } from "./effect"
import { map } from "./map"
import { succeedNow } from "./succeedNow"

const bind = <S, R, E, A, K, N extends string>(
  tag: Exclude<N, keyof K>,
  f: (_: K) => Effect<S, R, E, A>
) => <S2, R2, E2>(
  mk: Effect<S2, R2, E2, K>
): Effect<S | S2, R & R2, E | E2, K & { [k in N]: A }> =>
  pipe(
    mk,
    chain((k) =>
      pipe(
        k,
        f,
        map((a): K & { [k in N]: A } => ({ ...k, [tag]: a } as any))
      )
    )
  )

const merge = <S, R, E, A, K>(
  f: (_: K) => Effect<S, R, E, A & { [k in keyof K & keyof A]?: never }>
) => <S2, R2, E2>(mk: Effect<S2, R2, E2, K>): Effect<S | S2, R & R2, E | E2, K & A> =>
  pipe(
    mk,
    chain((k) =>
      pipe(
        k,
        f,
        map((a): K & A => ({ ...k, ...a } as any))
      )
    )
  )

const let_ = <S, R, E, A, K, N extends string>(
  tag: Exclude<N, keyof K>,
  f: (_: K) => A
) => <S2, R2, E2>(
  mk: Effect<S2, R2, E2, K>
): Effect<S | S2, R & R2, E | E2, K & { [k in N]: A }> =>
  pipe(
    mk,
    map((k): K & { [k in N]: A } => ({ ...k, [tag]: f(k) } as any))
  )

const of =
  /*#__PURE__*/
  succeedNow({})

export { let_ as let, bind, of, merge }
