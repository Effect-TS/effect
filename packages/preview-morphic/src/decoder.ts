import * as FA from "./FreeAssociative"
import * as DE from "./decodeError"
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
import * as E from "@matechs/preview/Either"
import { constant, pipe, tuple } from "@matechs/preview/Function"
import * as R from "@matechs/preview/Record"
import { succeedF } from "@matechs/preview/_abstract/DSL/core"
import { HKTTL, URIS } from "@matechs/preview/_abstract/HKT"

export const DecoderURI = "DecoderURI"
export type DecoderURI = typeof DecoderURI

export interface Decoder<F extends URIS, R, O> {
  (i: unknown): MoKind<F, R, DE.DecodeError, O>
}

export interface DecoderF<F, R, O> {
  (i: unknown): MoHKT<F, R, DE.DecodeError, O>
}

declare module "./registry" {
  export interface URItoInterpreter<F extends URIS, RDec, REnc, O, E> {
    [DecoderURI]: Decoder<F, RDec, O>
  }

  export interface URItoInterpreterF<F, RDec, REnc, O, E> {
    [DecoderURI]: DecoderF<F, RDec, O>
  }
}

export function error(actual: unknown, message: string) {
  return FA.of(DE.leaf(actual, message))
}

export function primitivesDecoder<F extends URIS>(
  F: AnyStackK<F>
): PrimitivesKF<DecoderURI, F, unknown, unknown>
export function primitivesDecoder<F>(
  F: AnyStackF<F>
): PrimitivesKF<DecoderURI, F, unknown, unknown>
export function primitivesDecoder<F>(
  F: BaseStackF<F>
): PrimitivesKF<DecoderURI, F, unknown, unknown> {
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
    },
    required: (D) => (i) => {
      if (typeof i !== "object" || i == null) {
        return F.fail(error(i, "not an object"))
      }

      return pipe(
        D as R.Record<string, DecoderF<F, any, any>>,
        R.foreachWithKeysF(F)((v, k) => {
          return pipe(
            v((i as any)[k]),
            F.run,
            F.map(E.mapLeft((e) => FA.of(DE.key(k, DE.required, e))))
          )
        }),
        F.map(R.collect((k, v) => E.map_(v, (a) => tuple(k, a)))),
        packEither(F),
        F.flatten,
        F.map(A.reduce({} as any, (b, a) => ({ ...b, [a[0]]: a[1] })))
      )
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
        packEither<F, R, O>(F),
        F.flatten
      )
    } else {
      return F.fail(error(i, "not an array"))
    }
  }
}

function packEither<F, R, O>(
  F: BaseStackF<F>
): (
  b: HKTTL<
    F,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    any,
    R,
    never,
    A.Array<E.Either<DE.DecodeError, O>>
  >
) => HKTTL<
  F,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  any,
  R,
  never,
  HKTTL<
    F,
    any,
    any,
    any,
    any,
    never,
    never,
    unknown,
    never,
    never,
    unknown,
    unknown,
    unknown,
    DE.DecodeError,
    any[]
  >
> {
  return F.map((ae) => {
    let error: DE.DecodeError | undefined = undefined
    const decoded = [] as any[]

    for (let k = 0; k < ae.length; k++) {
      const d = ae[k]

      if (d._tag === "Left") {
        error = error ? FA.combine(d.left)(error) : d.left
      } else {
        decoded.push(d.right)
      }
    }

    if (error) {
      return F.fail(error)
    } else {
      return succeedF(F)(constant(decoded))
    }
  })
}

function stringDecoder<F>(F: BaseStackF<F>): DecoderF<F, unknown, string> {
  return (i) =>
    typeof i === "string" ? succeedF(F)(constant(i)) : F.fail(error(i, "string"))
}

export const drawDecodeError = DE.draw
