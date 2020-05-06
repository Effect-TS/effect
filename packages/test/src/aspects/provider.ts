import { effect as T } from "@matechs/effect"
import { pipe } from "fp-ts/lib/pipeable"

import { patch, AspectR12 } from "../def"

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
