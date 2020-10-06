import * as R from "@effect-ts/core/Classic/Record"
import * as T from "@effect-ts/core/Classic/Sync"
import { pipe } from "@effect-ts/core/Function"

import type { AnyEnv } from "../../Algebra/config"
import type { AlgebraObject1, PropsKind1 } from "../../Algebra/object"
import { isUnknownRecord } from "../../Guard/interpreter/common"
import { memo, projectFieldWithEnv } from "../../Internal/Utils"
import { decoderApplyConfig } from "../config"
import type { Decoder } from "../hkt"
import { DecoderType, DecoderURI, fail } from "../hkt"

export const decoderObjectInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraObject1<DecoderURI, Env> => ({
    _F: DecoderURI,
    interface: (props, config) => (env) =>
      pipe(projectFieldWithEnv(props, env)("decoder"), (decoder) => {
        const keys = Object.keys(decoder)
        return new DecoderType(
          decoderApplyConfig(config?.conf)(interfaceDecoder(keys, decoder), env, {
            decoder: decoder as any
          })
        )
      }),
    partial: (props, config) => (env) =>
      pipe(projectFieldWithEnv(props, env)("decoder"), (decoder) => {
        return new DecoderType(
          decoderApplyConfig(config?.conf)(partialDecoder(decoder), env, {
            decoder: decoder as any
          })
        )
      }),
    both: (props, partial, config) => (env) =>
      pipe(projectFieldWithEnv(props, env)("decoder"), (decoder) =>
        pipe(projectFieldWithEnv(partial, env)("decoder"), (decoderPartial) => {
          const keys = Object.keys(decoder)

          return new DecoderType(
            decoderApplyConfig(config?.conf)(
              {
                decode: (u) =>
                  T.map_(
                    T.zip_(
                      interfaceDecoder(keys, decoder).decode(u),
                      partialDecoder(decoderPartial).decode(u)
                    ),
                    ([r, o]) => ({ ...r, ...o })
                  )
              },
              env,
              {
                decoder: decoder as any,
                decoderPartial: decoderPartial as any
              }
            )
          )
        })
      )
  })
)

function partialDecoder<Props, Env extends AnyEnv>(
  decoder: {
    [q in keyof PropsKind1<DecoderURI, Props, Env>]: ReturnType<
      PropsKind1<DecoderURI, Props, Env>[q]
    >["decoder"]
  }
): Decoder<Partial<Readonly<Props>>> {
  return {
    decode: (u) => {
      if (isUnknownRecord(u)) {
        return pipe(
          u,
          R.foreachWithIndexF(T.Applicative)((k, a) =>
            decoder[k] ? decoder[k].decode(a) : T.succeed(a)
          )
        ) as any
      }
      return fail([
        {
          actual: u,
          message: `${typeof u} is not a record`
        }
      ])
    }
  }
}

function interfaceDecoder<Props, Env extends AnyEnv>(
  keys: string[],
  decoder: {
    [q in keyof PropsKind1<DecoderURI, Props, Env>]: ReturnType<
      PropsKind1<DecoderURI, Props, Env>[q]
    >["decoder"]
  }
): Decoder<Readonly<Props>> {
  return {
    decode: (u) => {
      if (isUnknownRecord(u)) {
        const uk = Object.keys(u)
        if (keys.length <= uk.length && keys.every((v) => uk.includes(v))) {
          return pipe(
            u,
            R.foreachWithIndexF(T.Applicative)((k, a) =>
              decoder[k] ? decoder[k].decode(a) : T.succeed(a)
            )
          ) as any
        }
        return fail([
          {
            actual: u,
            message: `not all the required fields are present`
          }
        ])
      }
      return fail([
        {
          actual: u,
          message: `${typeof u} is not a record`
        }
      ])
    }
  }
}
