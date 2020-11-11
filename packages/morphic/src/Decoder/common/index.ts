import * as T from "@effect-ts/core/Sync"

import type { CoreAlgebra } from "../../Batteries/program"

export type CodecTypes = keyof CoreAlgebra<any, any>

export interface Decoder<A> {
  readonly codecType: CodecTypes

  readonly name?: string
  readonly validate: Validate<A>
  readonly decode: Decode<A>

  readonly with: (validate: Validate<A>) => Decoder<A>
}

class DecoderImpl<A> {
  constructor(
    readonly validate: Validate<A>,
    readonly codecType: CodecTypes,
    readonly name?: string
  ) {
    this.decode = this.decode.bind(this)
    this.with = this.with.bind(this)
  }

  decode(i: unknown): Validation<A> {
    return this.validate(i, [{ key: "", actual: i, type: this }])
  }

  with(validate: Validate<A>): Decoder<A> {
    return new DecoderImpl(validate, this.codecType, this.name)
  }
}

export function makeDecoder<A>(
  validate: Validate<A>,
  codecType: CodecTypes,
  name?: string
): Decoder<A> {
  return new DecoderImpl(validate, codecType, name)
}

export interface ContextEntry {
  readonly key: string
  readonly type: Decoder<any>
  readonly actual?: unknown
}

export interface Context extends ReadonlyArray<ContextEntry> {}

export interface ValidationError {
  readonly value: unknown
  readonly context: Context
  readonly message?: string
}

export interface Errors extends ReadonlyArray<ValidationError> {}

export type Validation<A> = T.IO<Errors, A>

export type Validate<A> = (i: unknown, context: Context) => Validation<A>

export type Decode<A> = (i: unknown) => Validation<A>

export const failures: (errors: Errors) => Validation<never> = T.fail

export const fail = (
  value: unknown,
  context: Context,
  message?: string
): Validation<never> => failures([{ value, context, message }])

export const appendContext = (
  c: Context,
  key: string,
  decoder: Decoder<any>,
  actual?: unknown
): Context => {
  const len = c.length
  const r = Array(len + 1)
  for (let i = 0; i < len; i++) {
    r[i] = c[i]
  }
  r[len] = { key, type: decoder, actual }
  return r
}

export interface Reporter<A> {
  report: (validation: Validation<any>) => A
}
