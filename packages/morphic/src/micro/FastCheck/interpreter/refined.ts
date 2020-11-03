import { pipe } from "@effect-ts/core/Function"

import type { RefinedURI } from "../../Algebra/Refined"
import { interpreter } from "../../HKT"
import { FastCheckType, FastCheckURI, fcApplyConfig } from "../base"

export const fcRefinedInterpreter = interpreter<FastCheckURI, RefinedURI>()(() => ({
  _F: FastCheckURI,
  refined: (getArb, ref, config) => (env) =>
    pipe(
      getArb(env).arb,
      (arb) =>
        new FastCheckType(fcApplyConfig(config?.conf)(arb.filter(ref), env, { arb }))
    ),
  constrained: (getArb, ref, config) => (env) =>
    pipe(
      getArb(env).arb,
      (arb) =>
        new FastCheckType(fcApplyConfig(config?.conf)(arb.filter(ref), env, { arb }))
    )
}))
