import { pipe } from "@effect-ts/core/Function"

import type { AnyEnv } from "../../Algebra/config"
import type { AlgebraObject1 } from "../../Algebra/object"
import { memo, projectFieldWithEnv } from "../../Internal/Utils"
import { accessFC, fcApplyConfig } from "../config"
import { FastCheckType, FastCheckURI } from "../hkt"

export const fcObjectInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraObject1<FastCheckURI, Env> => ({
    _F: FastCheckURI,
    partial: (props, config) => (env) =>
      pipe(
        projectFieldWithEnv(props, env)("arb"),
        (arbs) =>
          new FastCheckType(
            fcApplyConfig(config?.conf)(
              accessFC(env).record(arbs, {
                withDeletedKeys: true
              }) as any,
              env,
              {
                arbs: arbs as any
              }
            )
          )
      ),
    interface: (props, config) => (env) =>
      pipe(
        projectFieldWithEnv(props, env)("arb"),
        (arbs) =>
          new FastCheckType(
            fcApplyConfig(config?.conf)(accessFC(env).record(arbs), env, {
              arbs: arbs as any
            })
          )
      ),
    both: (props, partial, config) => (env) =>
      pipe(projectFieldWithEnv(props, env)("arb"), (arbs) =>
        pipe(
          projectFieldWithEnv(partial, env)("arb"),
          (arbsPartial) =>
            new FastCheckType(
              fcApplyConfig(config?.conf)(
                accessFC(env)
                  .record(arbs)
                  .chain((r) =>
                    accessFC(env)
                      .record(arbsPartial, {
                        withDeletedKeys: true
                      })
                      .map((p) => ({ ...r, ...p }))
                  ),
                env,
                {
                  arbs: arbs as any,
                  arbsPartial: arbsPartial as any
                }
              )
            )
        )
      )
  })
)
