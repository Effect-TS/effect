import { pipe } from "@effect-ts/core/Function"

import type { ObjectURI, PropsKind } from "../../Algebra/Object"
import type { AnyEnv } from "../../HKT"
import { interpreter } from "../../HKT"
import { projectFieldWithEnv } from "../../Utils"
import type { Guard } from "../base"
import { guardApplyConfig, GuardType, GuardURI } from "../base"
import { isUnknownRecord } from "./common"

const hasOwnProperty = Object.prototype.hasOwnProperty

export const guardObjectInterpreter = interpreter<GuardURI, ObjectURI>()(() => ({
  _F: GuardURI,
  interface: (props, config) => (env) =>
    pipe(projectFieldWithEnv(props, env)("guard"), (guard) => {
      const keys = Object.keys(guard)
      const len = keys.length
      return new GuardType(
        guardApplyConfig(config?.conf)(interfaceGuard(len, keys, guard) as any, env, {
          guard: guard as any
        })
      )
    }),
  partial: (props, config) => (env) =>
    pipe(projectFieldWithEnv(props, env)("guard"), (guard) => {
      const keys = Object.keys(guard)
      const len = keys.length

      return new GuardType(
        guardApplyConfig(config?.conf)(partialGuard(len, keys, guard) as any, env, {
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
              is: (u): u is any =>
                interfaceGuard(len, keys, guard).is(u) &&
                partialGuard(lenPartial, keysPartial, guardPartial).is(u)
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
}))

function partialGuard<PropsA, PropsE, Env extends AnyEnv>(
  len: number,
  keys: string[],
  guard: {
    [q in keyof PropsKind<GuardURI, PropsA, PropsE, Env>]: ReturnType<
      PropsKind<GuardURI, PropsA, PropsE, Env>[q]
    >["guard"]
  }
): Guard<Partial<Readonly<PropsA>>> {
  return {
    is: (u): u is any => {
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

function interfaceGuard<PropsA, PropsE, Env extends AnyEnv>(
  len: number,
  keys: string[],
  guard: {
    [q in keyof PropsKind<GuardURI, PropsA, PropsE, Env>]: ReturnType<
      PropsKind<GuardURI, PropsA, PropsE, Env>[q]
    >["guard"]
  }
): Guard<Readonly<PropsA>> {
  return {
    is: (u): u is any => {
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
