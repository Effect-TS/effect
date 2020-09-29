import { chain_, map_, succeedNow } from "./core"
import type { Managed } from "./managed"

const bind = <R, E, A, K, N extends string>(
  tag: Exclude<N, keyof K>,
  f: (_: K) => Managed<R, E, A>
) => <R2, E2>(mk: Managed<R2, E2, K>): Managed<R & R2, E | E2, K & { [k in N]: A }> =>
  chain_(mk, (k) => map_(f(k), (a): K & { [k in N]: A } => ({ ...k, [tag]: a } as any)))

const merge = <R, E, A, K>(
  f: (_: K) => Managed<R, E, A & { [k in keyof K & keyof A]?: never }>
) => <R2, E2>(mk: Managed<R2, E2, K>): Managed<R & R2, E | E2, K & A> =>
  chain_(mk, (k) => map_(f(k), (a): K & A => ({ ...k, ...a } as any)))

const let_ = <A, K, N extends string>(tag: Exclude<N, keyof K>, f: (_: K) => A) => <
  R2,
  E2
>(
  mk: Managed<R2, E2, K>
): Managed<R2, E2, K & { [k in N]: A }> =>
  map_(mk, (k): K & { [k in N]: A } => ({ ...k, [tag]: f(k) } as any))

const do_ = succeedNow({})

export { let_ as let, bind, do_ as do, merge }
