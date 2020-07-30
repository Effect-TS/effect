import { pipe } from "../../Function"

import { Cause, Fail } from "./cause"
import { chain, map } from "./core"

const bind = <A, K, N extends string>(
  tag: Exclude<N, keyof K>,
  f: (_: K) => Cause<A>
) => (mk: Cause<K>): Cause<K & { [k in N]: A }> =>
  pipe(
    mk,
    chain((k) =>
      pipe(
        f(k),
        map((a): K & { [k in N]: A } => ({ ...k, [tag]: a } as any))
      )
    )
  )

const merge = <A, K>(f: (_: K) => Cause<A & { [k in keyof K & keyof A]?: never }>) => (
  mk: Cause<K>
): Cause<K & A> =>
  pipe(
    mk,
    chain((k) =>
      pipe(
        f(k),
        map((a): K & A => ({ ...k, ...a } as any))
      )
    )
  )

const let_ = <A, K, N extends string>(tag: Exclude<N, keyof K>, f: (_: K) => A) => (
  mk: Cause<K>
): Cause<K & { [k in N]: A }> =>
  pipe(
    mk,
    map((k): K & { [k in N]: A } => ({ ...k, [tag]: f(k) } as any))
  )

const of = Fail({})

export { let_ as let, bind, of, merge }
