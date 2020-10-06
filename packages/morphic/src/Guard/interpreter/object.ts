import { pipe } from "@effect-ts/core/Function"

import type { AnyEnv } from "../../Algebra/config"
import type { AlgebraObject1, PropsKind1 } from "../../Algebra/object"
import { memo, projectFieldWithEnv } from "../../Internal/Utils"
import { guardApplyConfig } from "../config"
import type { Guard } from "../hkt"
import { GuardType, GuardURI } from "../hkt"
import { isUnknownRecord } from "./common"

const hasOwnProperty = Object.prototype.hasOwnProperty

type AOfProps<P> = P extends PropsKind1<any, infer A, any> ? A : never

export const guardObjectInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraObject1<GuardURI, Env> => ({
    _F: GuardURI,
    interface: (props, config) => (env) =>
      pipe(projectFieldWithEnv(props, env)("guard"), (guard) => {
        const keys = Object.keys(guard)
        const len = keys.length
        return new GuardType(
          guardApplyConfig(config?.conf)(interfaceGuard(props, len, keys, guard), env, {
            guard: guard as any
          })
        )
      }),
    partial: (props, config) => (env) =>
      pipe(projectFieldWithEnv(props, env)("guard"), (guard) => {
        const keys = Object.keys(guard)
        const len = keys.length

        return new GuardType(
          guardApplyConfig(config?.conf)(partialGuard(props, len, keys, guard), env, {
            guard: guard as any
          })
        )
      }),
    both: (props, partial, config) => (env) =>
      pipe(projectFieldWithEnv(props, env)("guard"), (guard) =>
        pipe(projectFieldWithEnv(partial, env)("guard"), (guardPartial) => {
          const keys = Object.keys(guard)
          const len = keys.length

          const keysPartial = Object.keys(guardPartial)
          const lenPartial = keysPartial.length

          return new GuardType(
            guardApplyConfig(config?.conf)(
              {
                is: (u): u is AOfProps<typeof props> & AOfProps<typeof partial> =>
                  interfaceGuard(props, len, keys, guard).is(u) &&
                  partialGuard(partial, lenPartial, keysPartial, guardPartial).is(u)
              },
              env,
              {
                guard: guard as any,
                guardPartial: guardPartial as any
              }
            )
          )
        })
      )
  })
)

function partialGuard<Props, Env extends AnyEnv>(
  props: PropsKind1<GuardURI, Props, Env>,
  len: number,
  keys: string[],
  guard: {
    [q in keyof PropsKind1<GuardURI, Props, Env>]: ReturnType<
      PropsKind1<GuardURI, Props, Env>[q]
    >["guard"]
  }
): Guard<Partial<Readonly<Props>>> {
  return {
    is: (u): u is AOfProps<typeof props> => {
      if (isUnknownRecord(u)) {
        for (let i = 0; i < len; i++) {
          const k = keys[i]
          const uk = u[k]
          if (uk !== undefined && !guard[k].is(uk)) {
            return false
          }
        }
        return true
      }
      return false
    }
  }
}

function interfaceGuard<Props, Env extends AnyEnv>(
  props: PropsKind1<GuardURI, Props, Env>,
  len: number,
  keys: string[],
  guard: {
    [q in keyof PropsKind1<GuardURI, Props, Env>]: ReturnType<
      PropsKind1<GuardURI, Props, Env>[q]
    >["guard"]
  }
): Guard<Readonly<Props>> {
  return {
    is: (u): u is AOfProps<typeof props> => {
      if (isUnknownRecord(u)) {
        for (let i = 0; i < len; i++) {
          const k = keys[i]
          const uk = u[k]
          if ((uk === undefined && !hasOwnProperty.call(u, k)) || !guard[k].is(uk)) {
            return false
          }
        }
        return true
      }
      return false
    }
  }
}
