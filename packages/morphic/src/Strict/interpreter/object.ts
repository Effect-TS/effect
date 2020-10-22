import * as O from "@effect-ts/core/Classic/Option"
import * as R from "@effect-ts/core/Classic/Record"
import { pipe } from "@effect-ts/core/Function"
import * as T from "@effect-ts/core/Sync"

import type { AnyEnv } from "../../Algebra/config"
import type { AlgebraObject1, PropsKind1 } from "../../Algebra/object"
import { memo, projectFieldWithEnv } from "../../Internal/Utils"
import { strictApplyConfig } from "../config"
import type { Strict } from "../hkt"
import { StrictType, StrictURI } from "../hkt"

export const strictObjectInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraObject1<StrictURI, Env> => ({
    _F: StrictURI,
    interface: (props, config) => (env) =>
      pipe(projectFieldWithEnv(props, env)("strict"), (strict) => {
        return new StrictType(
          strictApplyConfig(config?.conf)(interfaceStrict(strict), env, {
            strict: strict as any
          })
        )
      }),
    partial: (props, config) => (env) =>
      pipe(projectFieldWithEnv(props, env)("strict"), (strict) => {
        return new StrictType(
          strictApplyConfig(config?.conf)(partialStrict(strict), env, {
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
                      interfaceStrict(strict).shrink(u),
                      partialStrict(strictPartial).shrink(u)
                    ),
                    ([r, o]) => ({ ...r, ...o })
                  )
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
  })
)

function partialStrict<Props, Env extends AnyEnv>(
  strict: {
    [q in keyof PropsKind1<StrictURI, Props, Env>]: ReturnType<
      PropsKind1<StrictURI, Props, Env>[q]
    >["strict"]
  }
): Strict<Partial<Readonly<Props>>> {
  return {
    shrink: (u) =>
      pipe(
        strict as Record<string, any>,
        R.foreachWithIndexF(T.Applicative)((k) =>
          u[k]
            ? T.map_((strict[k] as Strict<any>).shrink(u[k]), O.some)
            : T.succeed(O.none)
        ),
        T.map(R.compact),
        T.map((x) => x as any)
      )
  }
}

function interfaceStrict<Props, Env extends AnyEnv>(
  strict: {
    [q in keyof PropsKind1<StrictURI, Props, Env>]: ReturnType<
      PropsKind1<StrictURI, Props, Env>[q]
    >["strict"]
  }
): Strict<Readonly<Props>> {
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
