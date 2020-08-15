import { commonDSL } from "./dsl"
import { PrimitivesKF, PrimitivesURI } from "./primitives"
import {
  AnyStackF,
  AnyStackK,
  BaseStackF,
  makeInterpreter,
  MoHKT,
  MoKind
} from "./utils"

import * as A from "@matechs/preview/Array"
import { constant, pipe } from "@matechs/preview/Function"
import { succeedF } from "@matechs/preview/_abstract/DSL/core"
import { URIS } from "@matechs/preview/_abstract/HKT"

export const DecoderURI = "DecoderURI"
export type DecoderURI = typeof DecoderURI

export interface Decoder<F extends URIS, R, O> {
  (i: unknown): MoKind<F, R, string[], O>
}

export interface DecoderF<F, R, O> {
  (i: unknown): MoHKT<F, R, string[], O>
}

declare module "./registry" {
  export interface URItoInterpreter<F extends URIS, R, O, E> {
    [DecoderURI]: Decoder<F, R, O>
  }

  export interface URItoInterpreterF<F, R, O, E> {
    [DecoderURI]: DecoderF<F, R, O>
  }
}

export function primitivesDecoder<F extends URIS>(
  F: AnyStackK<F>
): PrimitivesKF<DecoderURI, F, unknown>
export function primitivesDecoder<F>(
  F: AnyStackF<F>
): PrimitivesKF<DecoderURI, F, unknown>
export function primitivesDecoder<F>(
  F: BaseStackF<F>
): PrimitivesKF<DecoderURI, F, unknown> {
  return makeInterpreter<PrimitivesURI, DecoderURI, F>()({
    array: (D, c) => {
      if (c) {
        const md = c[DecoderURI]

        if (md) {
          return md({
            child: D,
            current: arrayDecoder(F, D),
            ...commonDSL({ K: F })
          })
        }
      }
      return arrayDecoder(F, D)
    },
    string: (c) => {
      if (c) {
        const md = c[DecoderURI]

        if (md) {
          return md({
            current: stringDecoder<F>(F),
            ...commonDSL({ K: F })
          })
        }
      }
      return stringDecoder<F>(F)
    }
  })
}

function arrayDecoder<F, R, O>(
  F: BaseStackF<F>,
  D: DecoderF<F, R, O>
): DecoderF<F, R, readonly O[]> {
  return (i) => {
    if (typeof i === "object" && Array.isArray(i)) {
      return pipe(
        i,
        A.foreachF(F)((v) => F.run(D(v))),
        F.map((ae) => {
          const errors = [] as string[]
          const decoded = [] as any[]

          for (let k = 0; k < ae.length; k++) {
            const d = ae[k]

            if (d._tag === "Left") {
              errors.push(...d.left)
            } else {
              decoded.push(d.right)
            }
          }

          if (errors.length > 0) {
            return F.fail(errors)
          } else {
            return succeedF(F)(constant(decoded))
          }
        }),
        F.flatten
      )
    } else {
      return F.fail(["not an array"])
    }
  }
}

function stringDecoder<F>(F: BaseStackF<F>): DecoderF<F, unknown, string> {
  return (i) =>
    typeof i === "string" ? succeedF(F)(constant(i)) : F.fail(["not a string"])
}
