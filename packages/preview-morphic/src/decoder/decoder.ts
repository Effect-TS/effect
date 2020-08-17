import * as FA from "../FreeAssociative"
import { commonDSL } from "../dsl"
import { PrimitivesKF, PrimitivesURI } from "../primitives"
import {
  AnyStackF,
  AnyStackK,
  BaseStackF,
  makeInterpreter,
  MoHKT,
  MoKind
} from "../utils"

import * as DE from "./Error"

import * as A from "@matechs/preview/Array"
import * as E from "@matechs/preview/Either"
import { constant, pipe, tuple } from "@matechs/preview/Function"
import * as R from "@matechs/preview/Record"
import { succeedF } from "@matechs/preview/_abstract/DSL/core"
import { URIS } from "@matechs/preview/_abstract/HKT"

export const DecoderURI = "DecoderURI"
export type DecoderURI = typeof DecoderURI

export interface Decoder<F extends URIS, R, O, I, E> {
  (i: I): MoKind<F, R, E, O>
}

export interface DecoderF<F, R, O, I, E> {
  (i: I): MoHKT<F, R, E, O>
}

declare module "../registry" {
  export interface URItoInterpreter<F extends URIS, RDec, REnc, O, E> {
    [DecoderURI]: Decoder<F, RDec, O, unknown, DE.DecodeError>
  }

  export interface URItoInterpreterF<F, RDec, REnc, O, E> {
    [DecoderURI]: DecoderF<F, RDec, O, unknown, DE.DecodeError>
  }
}

export function applyConfig<
  C extends { [k in keyof C]: (a: any) => any },
  K extends keyof C
>(
  config: C | undefined,
  interpreter: K,
  configInput: Parameters<C[K]>[0],
  x: ReturnType<C[K]>
): ReturnType<C[K]> {
  if (config != null && config[interpreter]) {
    return config[interpreter](configInput)
  } else {
    return x
  }
}

export function primitivesInterpreter<F extends URIS>(
  F: AnyStackK<F>
): PrimitivesKF<DecoderURI, F, unknown, unknown>
export function primitivesInterpreter<F>(
  F: AnyStackF<F>
): PrimitivesKF<DecoderURI, F, unknown, unknown>
export function primitivesInterpreter<F>(
  F: BaseStackF<F>
): PrimitivesKF<DecoderURI, F, unknown, unknown> {
  return makeInterpreter<PrimitivesURI, DecoderURI, F>()({
    array: (D, c) =>
      applyConfig(
        c,
        DecoderURI,
        {
          child: D,
          current: arrayDecoder(F, D),
          ...commonDSL({ K: F })
        },
        arrayDecoder(F, D)
      ),
    string: (c) =>
      applyConfig(
        c,
        DecoderURI,
        {
          current: stringDecoder(F),
          ...commonDSL({ K: F })
        },
        stringDecoder(F)
      ),
    required: (D) => (i) => {
      if (typeof i !== "object" || i == null) {
        return F.fail(F.wrapErr(DE.error(i, "not an object")))
      }

      return pipe(
        D as R.Record<string, DecoderF<F, any, any, unknown, DE.DecodeError>>,
        R.foreachWithKeysF(F)((v, k) => {
          return pipe(
            v((i as any)[k]),
            F.run,
            F.map(E.mapLeft((e) => FA.of(DE.key(k, DE.required, F.unwrapErr(e)))))
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

function arrayDecoder<F, R, O, I>(
  F: BaseStackF<F>,
  D: DecoderF<F, R, O, I, DE.DecodeError>
): DecoderF<F, R, readonly O[], I, DE.DecodeError> {
  return (i) => {
    if (typeof i === "object" && Array.isArray(i)) {
      return pipe(
        i,
        A.foreachF(F)((v) => F.run(D(v))),
        packEither<F, R, O>(F),
        F.flatten
      )
    } else {
      return F.fail(F.wrapErr(DE.error(i, "not an array")))
    }
  }
}

function packEither<F, R, O>(
  F: BaseStackF<F>
): (
  b: MoHKT<F, R, never, A.Array<E.Either<DE.DecodeError, O>>>
) => MoHKT<F, R, never, MoHKT<F, unknown, DE.DecodeError, O[]>> {
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
      return F.fail(F.wrapErr(error))
    } else {
      return succeedF(F)(constant(decoded))
    }
  })
}

function stringDecoder<F>(
  F: BaseStackF<F>
): DecoderF<F, unknown, string, unknown, DE.DecodeError> {
  return (i) =>
    typeof i === "string"
      ? succeedF(F)(constant(i))
      : F.fail(F.wrapErr(DE.error(i, "string")))
}

export function contramapF<F extends URIS>(F: AnyStackK<F>) {
  return <I2, I>(f: (_: I2) => I) => <R, O, E>(
    d: Decoder<F, R, O, I, E>
  ): Decoder<F, R, O, I2, E> => (i2) => d(f(i2))
}

export function mapF<F extends URIS>(F: AnyStackK<F>) {
  return <O, O2>(f: (_: O) => O2) => <R, I, E>(
    d: Decoder<F, R, O, I, E>
  ): Decoder<F, R, O2, I, E> => (i) => pipe(d(i), F.map(f))
}
