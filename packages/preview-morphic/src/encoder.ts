import { MoKind, MoHKT } from "./utils"

import { URIS } from "@matechs/preview/_abstract/HKT"

export const EncoderURI = "EncoderURI"
export type EncoderURI = typeof EncoderURI

export interface Encoder<F extends URIS, R, O, E> {
  (i: O): MoKind<F, R, never, E>
}

export interface EncoderF<F, R, O, E> {
  (i: O): MoHKT<F, R, never, E>
}

declare module "./registry" {
  export interface URItoInterpreter<F extends URIS, R, O, E> {
    [EncoderURI]: Encoder<F, R, O, E>
  }

  export interface URItoInterpreterF<F, R, O, E> {
    [EncoderURI]: EncoderF<F, R, O, E>
  }
}
