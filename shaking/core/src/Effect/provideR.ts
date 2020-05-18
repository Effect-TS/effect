import { IProvideEnv } from "../Support/Common"
import { Effect } from "../Support/Common/effect"

import { accessM } from "./accessM"

export const provideR = <R2, R>(f: (r2: R2) => R) => <S, E, A>(
  ma: Effect<S, R, E, A>
): Effect<S, R2, E, A> => accessM((r2: R2) => new IProvideEnv(ma, f(r2)) as any)
