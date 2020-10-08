import type * as A from "@effect-ts/core/Classic/Array"
import * as T from "@effect-ts/core/Classic/Sync"

export const DecoderURI = "DecoderURI" as const

export type DecoderURI = typeof DecoderURI

export interface DecodingError {
  readonly id?: string
  readonly name?: string
  readonly actual?: unknown
  readonly message?: string
}

export type ValidationError = A.Array<DecodingError>

export const fail = (e: ValidationError) => T.fail(new DecodeError(e))

export class DecodeError {
  readonly _tag = "DecodeError"
  constructor(readonly errors: ValidationError) {}
}

export interface Decoder<A> {
  decode: (u: unknown) => T.Sync<unknown, DecodeError, A>
}

declare module "../../Algebra/config" {
  export interface ConfigType<E, A> {
    [DecoderURI]: Decoder<A>
  }
}

export class DecoderType<A> {
  _A!: A
  _URI!: DecoderURI
  constructor(public decoder: Decoder<A>) {}
}

declare module "../../Algebra/utils/hkt" {
  interface URItoKind<R, A> {
    [DecoderURI]: (env: R) => DecoderType<A>
  }
}

declare module "../../Internal/HKT" {
  interface URItoKind<A> {
    [DecoderURI]: Decoder<A>
  }
}
