import { pipe } from "@effect-ts/core/Function"
import * as T from "@effect-ts/core/Sync"

import type { ObjectURI } from "../../Algebra/Object"
import { interpreter } from "../../HKT"
import { projectFieldWithEnv } from "../../Utils"
import { reorderApplyConfig, ReorderType, ReorderURI } from "../base"

export const reorderObjectInterpreter = interpreter<ReorderURI, ObjectURI>()(() => ({
  _F: ReorderURI,
  interface: (props, config) => (env) =>
    pipe(projectFieldWithEnv(props, env)("reorder"), (reorder) => {
      return new ReorderType(
        reorderApplyConfig(config?.conf)(
          {
            reorder: (u) =>
              T.sync(() => {
                const r: any = {}
                for (const k of Object.keys(reorder)) {
                  r[k] = u[k]
                }
                return r
              })
          },
          env,
          {
            reorder: reorder as any
          }
        )
      )
    }),
  partial: (props, config) => (env) =>
    pipe(projectFieldWithEnv(props, env)("reorder"), (reorder) => {
      return new ReorderType(
        reorderApplyConfig(config?.conf)(
          {
            reorder: (u) =>
              T.sync(() => {
                const s = new Set(Object.keys(u))
                const r: any = {}
                for (const k of Object.keys(reorder)) {
                  if (s.has(k)) {
                    r[k] = u[k]
                  }
                }
                return r
              })
          },
          env,
          {
            reorder: reorder as any
          }
        )
      )
    }),
  both: (props, partial, config) => (env) =>
    pipe(projectFieldWithEnv(props, env)("reorder"), (reorder) =>
      pipe(projectFieldWithEnv(partial, env)("reorder"), (reorderPartial) => {
        return new ReorderType(
          reorderApplyConfig(config?.conf)(
            {
              reorder: (u) =>
                T.sync(() => {
                  const s = new Set(Object.keys(u))
                  const r: any = {}
                  for (const k of Object.keys(reorder)) {
                    r[k] = u[k]
                  }
                  for (const k of Object.keys(reorderPartial)) {
                    if (s.has(k)) {
                      r[k] = u[k]
                    }
                  }
                  return r
                })
            },
            env,
            {
              reorder: reorder as any,
              reorderPartial: reorderPartial as any
            }
          )
        ) as any
      })
    )
}))
