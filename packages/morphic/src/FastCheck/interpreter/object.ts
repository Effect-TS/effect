import { pipe } from "@effect-ts/core/Function"

import type { ObjectURI } from "../../Algebra/Object"
import { interpreter } from "../../HKT"
import { projectFieldWithEnv } from "../../Utils"
import { accessFC, FastCheckType, FastCheckURI, fcApplyConfig } from "../base"

export const fcObjectInterpreter = interpreter<FastCheckURI, ObjectURI>()(() => ({
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
          fcApplyConfig(config?.conf)(accessFC(env).record(arbs) as any, env, {
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
                ) as any,
              env,
              {
                arbs: arbs as any,
                arbsPartial: arbsPartial as any
              }
            )
          )
      )
    )
}))
