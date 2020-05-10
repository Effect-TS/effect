import type { FunctionN } from "../Function"
import { IPure, Instructions, IPureTag, IMap } from "../Support/Common"
import { Effect } from "../Support/Common/effect"

/**
 * Map the value produced by an IO
 * @param io
 * @param f
 */
export function map_<S, R, E, A, B>(
  base: Effect<S, R, E, A>,
  f: FunctionN<[A], B>
): Effect<S, R, E, B> {
  return (((base as any) as Instructions).tag() === IPureTag
    ? new IPure(f(((base as any) as IPure<A>).a))
    : new IMap(base, f)) as any
}

export const map: <A, B>(
  f: (a: A) => B
) => <S, R, E>(fa: Effect<S, R, E, A>) => Effect<S, R, E, B> = (f) => (fa) =>
  map_(fa, f)
