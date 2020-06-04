import { patch, AspectR12 } from "../../Def"

import * as T from "@matechs/core/Effect"
import { pipe } from "@matechs/core/Function"

export const withProvider = <U, P, E, Op>(
  f: T.Provider<U, P, E, Op>
): AspectR12<P, U> => (Spec) =>
  pipe(
    Spec,
    patch((_) => ({
      ..._,
      _R: undefined as any,
      eff: f(_.eff)
    }))
  )
