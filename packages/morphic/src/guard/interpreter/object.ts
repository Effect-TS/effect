import { memo, projectFieldWithEnv } from "../../utils"
import { guardApplyConfig } from "../config"
import { GuardType, GuardURI, Guard } from "../hkt"

import { isUnknownRecord } from "./common"

import { introduce } from "@matechs/core/Function"
import type { AnyEnv } from "@matechs/morphic-alg/config"
import type { MatechsAlgebraObject1, PropsKind1 } from "@matechs/morphic-alg/object"

const hasOwnProperty = Object.prototype.hasOwnProperty

type AOfProps<P> = P extends PropsKind1<any, infer A, any> ? A : never

export const guardObjectInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraObject1<GuardURI, Env> => ({
    _F: GuardURI,
    interface: (props, config) => (env) =>
      introduce(projectFieldWithEnv(props, env)("guard"))((guard) => {
        const keys = Object.keys(guard)
        const len = keys.length
        return new GuardType(
          guardApplyConfig(config?.conf)(interfaceGuard(props, len, keys, guard), env, {
            guard: guard as any
          })
        )
      }),
    partial: (props, config) => (env) =>
      introduce(projectFieldWithEnv(props, env)("guard"))((guard) => {
        const keys = Object.keys(guard)
        const len = keys.length

        return new GuardType(
          guardApplyConfig(config?.conf)(partialGuard(props, len, keys, guard), env, {
            guard: guard as any
          })
        )
      }),
    both: (props, partial, config) => (env) =>
      introduce(projectFieldWithEnv(props, env)("guard"))((guard) =>
        introduce(projectFieldWithEnv(partial, env)("guard"))((guardPartial) => {
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
