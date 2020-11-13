import * as O from "@effect-ts/core/Classic/Option"
import * as R from "@effect-ts/core/Classic/Record"
import { pipe } from "@effect-ts/core/Function"
import * as T from "@effect-ts/core/Sync"

import type { ObjectURI, PropsKind } from "../../Algebra/Object"
import type { AnyEnv } from "../../HKT"
import { interpreter } from "../../HKT"
import { projectFieldWithEnv } from "../../Utils"
import type { Strict } from "../base"
import { strictApplyConfig, StrictType, StrictURI } from "../base"

export const strictObjectInterpreter = interpreter<StrictURI, ObjectURI>()(() => ({
  _F: StrictURI,
  interface: (props, config) => (env) =>
    pipe(projectFieldWithEnv(props, env)("strict"), (strict) => {
      return new StrictType(
        strictApplyConfig(config?.conf)(interfaceStrict(strict) as any, env, {
          strict: strict as any
        })
      )
    }),
  partial: (props, config) => (env) =>
    pipe(projectFieldWithEnv(props, env)("strict"), (strict) => {
      return new StrictType(
        strictApplyConfig(config?.conf)(partialStrict(strict) as any, env, {
          strict: strict as any
        })
      )
    }),
  both: (props, partial, config) => (env) =>
    pipe(projectFieldWithEnv(props, env)("strict"), (strict) =>
      pipe(projectFieldWithEnv(partial, env)("strict"), (strictPartial) => {
        return new StrictType(
          strictApplyConfig(config?.conf)(
            {
              shrink: (u) => {
                return T.map_(
                  T.zip_(
                    interfaceStrict(strict).shrink(u as any),
                    partialStrict(strictPartial).shrink(u as any)
                  ),
                  ([r, o]) => ({ ...r, ...o })
                ) as any
              }
            },
            env,
            {
              strict: strict as any,
              strictPartial: strictPartial as any
            }
          )
        ) as any
      })
    )
}))

function partialStrict<PropsA, PropsE, Env extends AnyEnv>(
  strict: {
    [q in keyof PropsKind<StrictURI, PropsA, PropsE, Env>]: ReturnType<
      PropsKind<StrictURI, PropsA, PropsE, Env>[q]
    >["strict"]
  }
): Strict<Partial<Readonly<PropsA>>> {
  return {
    shrink: (u) =>
      pipe(
        strict as Record<string, any>,
        R.foreachWithIndexF(T.Applicative)((k) =>
          u[k]
            ? typeof u[k] !== "undefined"
              ? T.map_((strict[k] as Strict<any>).shrink(u[k]), O.some)
              : T.succeed(O.some(u[k]))
            : T.succeed(O.none)
        ),
        T.map(R.compact),
        T.map((x) => x as any)
      )
  }
}

function interfaceStrict<PropsA, PropsE, Env extends AnyEnv>(
  strict: {
    [q in keyof PropsKind<StrictURI, PropsA, PropsE, Env>]: ReturnType<
      PropsKind<StrictURI, PropsA, PropsE, Env>[q]
    >["strict"]
  }
): Strict<Readonly<PropsA>> {
  return {
    shrink: (u) =>
      pipe(
        strict as Record<string, any>,
        R.foreachWithIndexF(T.Applicative)((k) =>
          (strict[k] as Strict<any>).shrink(u[k])
        ),
        T.map((x) => x as any)
      )
  }
}
