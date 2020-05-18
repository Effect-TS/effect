import type { FunctionN } from "../Function"
import { IPure, Instructions, IPureTag, IChain } from "../Support/Common"
import type { Effect } from "../Support/Common/effect"

/**
 * Produce an new IO that will use the value produced by inner to produce the next IO to evaluate
 * @param inner
 * @param bind
 */
export function chain_<S, R, E, A, S2, R2, E2, B>(
  inner: Effect<S, R, E, A>,
  bind: FunctionN<[A], Effect<S2, R2, E2, B>>
): Effect<S | S2, R & R2, E | E2, B> {
  return (((inner as any) as Instructions).tag() === IPureTag
    ? bind(((inner as any) as IPure<A>).a)
    : new IChain(inner, bind)) as any
}

export const chain: <S1, R, E, A, B>(
  f: (a: A) => Effect<S1, R, E, B>
) => <S2, R2, E2>(ma: Effect<S2, R2, E2, A>) => Effect<S1 | S2, R & R2, E | E2, B> = (
  f
) => (ma) => chain_(ma, f)

export const flatten: <S1, S2, R, E, R2, E2, A>(
  mma: Effect<S1, R, E, Effect<S2, R2, E2, A>>
) => Effect<S1 | S2, R & R2, E | E2, A> = (mma) => chain_(mma, (x) => x)
