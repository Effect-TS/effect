import { memo, projectFieldWithEnv } from "../../utils"
import { fcApplyConfig, accessFC } from "../config"
import { FastCheckType, FastCheckURI } from "../hkt"

import { introduce } from "@matechs/core/Function"
import type { AnyEnv } from "@matechs/morphic-alg/config"
import type { MatechsAlgebraObject1 } from "@matechs/morphic-alg/object"

export const fcObjectInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraObject1<FastCheckURI, Env> => ({
    _F: FastCheckURI,
    partial: (props, config) => (env) =>
      introduce(projectFieldWithEnv(props, env)("arb"))(
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
      introduce(projectFieldWithEnv(props, env)("arb"))(
        (arbs) =>
          new FastCheckType(
            fcApplyConfig(config?.conf)(accessFC(env).record(arbs), env, {
              arbs: arbs as any
            })
          )
      ),
    both: (props, partial, config) => (env) =>
      introduce(projectFieldWithEnv(props, env)("arb"))((arbs) =>
        introduce(projectFieldWithEnv(partial, env)("arb"))(
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
