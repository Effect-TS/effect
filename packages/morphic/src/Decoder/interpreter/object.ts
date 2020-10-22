import { pipe } from "@effect-ts/core/Function"
import * as T from "@effect-ts/core/Sync"

import type { AnyEnv } from "../../Algebra/config"
import type { AlgebraObject1, PropsKind1 } from "../../Algebra/object"
import { isUnknownRecord } from "../../Guard/interpreter/common"
import { memo, projectFieldWithEnv } from "../../Internal/Utils"
import type { Decoder } from "../common"
import { fail } from "../common"
import { decoderApplyConfig } from "../config"
import { DecoderType, DecoderURI } from "../hkt"
import { foreachRecordWithIndex, tuple } from "./common"

export const decoderObjectInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraObject1<DecoderURI, Env> => ({
    _F: DecoderURI,
    interface: (props, cfg) => (env) =>
      pipe(projectFieldWithEnv(props, env)("decoder"), (decoder) => {
        const keys = Object.keys(decoder)
        return new DecoderType(
          decoderApplyConfig(cfg?.conf)(
            interfaceDecoder(keys, decoder, cfg?.id, cfg?.name),
            env,
            {
              decoder: decoder as any
            }
          )
        )
      }),
    partial: (props, cfg) => (env) =>
      pipe(projectFieldWithEnv(props, env)("decoder"), (decoder) => {
        return new DecoderType(
          decoderApplyConfig(cfg?.conf)(
            partialDecoder(decoder, cfg?.id, cfg?.name),
            env,
            {
              decoder: decoder as any
            }
          )
        )
      }),
    both: (props, partial, cfg) => (env) =>
      pipe(projectFieldWithEnv(props, env)("decoder"), (decoder) =>
        pipe(projectFieldWithEnv(partial, env)("decoder"), (decoderPartial) => {
          const keys = Object.keys(decoder)

          return new DecoderType(
            decoderApplyConfig(cfg?.conf)(
              {
                decode: (u) =>
                  T.map_(
                    tuple(
                      interfaceDecoder(keys, decoder, cfg?.id, cfg?.name).decode(u),
                      partialDecoder(decoderPartial, cfg?.id, cfg?.name).decode(u)
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
  },
  id?: string,
  name?: string
): Decoder<Partial<Readonly<Props>>> {
  return {
    decode: (u) => {
      if (isUnknownRecord(u)) {
        return pipe(
          u,
          foreachRecordWithIndex((k, a) =>
            decoder[k] ? decoder[k].decode(a) : T.succeed(a)
          )
        ) as any
      }
      return fail([
        {
          id,
          name,
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
  },
  id?: string,
  name?: string
): Decoder<Readonly<Props>> {
  return {
    decode: (u) => {
      if (isUnknownRecord(u)) {
        const uk = Object.keys(u)
        if (keys.length <= uk.length && keys.every((v) => uk.includes(v))) {
          return pipe(
            u,
            foreachRecordWithIndex((k, a) =>
              decoder[k] ? decoder[k].decode(a) : T.succeed(a)
            )
          ) as any
        }
        return fail([
          {
            id,
            name,
            actual: u,
            message: `not all the required fields are present`
          }
        ])
      }
      return fail([{ id, name, actual: u, message: `${typeof u} is not a record` }])
    }
  }
}
