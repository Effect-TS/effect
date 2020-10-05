import { Foldable as array } from "@effect-ts/core/Classic/Array"
import { first } from "@effect-ts/core/Classic/Associative"
import { fromFoldable } from "@effect-ts/core/Classic/Record"
import { pipe } from "@effect-ts/core/Function"

import type { AnyEnv } from "../../Algebra/config"
import type { AlgebraRecord1 } from "../../Algebra/record"
import { memo } from "../../Internal/Utils"
import { accessFC, fcApplyConfig } from "../config"
import { FastCheckType, FastCheckURI } from "../hkt"

const recordFromArray = <A>() => fromFoldable(first<A>(), array)

export const fcStrMapInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraRecord1<FastCheckURI, Env> => ({
    _F: FastCheckURI,
    record: (codomain, config) => (env) =>
      pipe(
        codomain(env).arb,
        (arb) =>
          new FastCheckType(
            fcApplyConfig(config?.conf)(
              accessFC(env)
                .array(accessFC(env).tuple(accessFC(env).string(), arb))
                .map(recordFromArray()),
              env,
              {
                arb
              }
            )
          )
      )
  })
)
