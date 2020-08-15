import { MoKind, MoHKT } from "./utils"

import { URIS } from "@matechs/preview/_abstract/HKT"

export const EncoderURI = "EncoderURI"
export type EncoderURI = typeof EncoderURI

export interface Encoder<F extends URIS, REnc, O, E> {
  (i: O): MoKind<F, REnc, never, E>
}

export interface EncoderF<F, REnc, O, E> {
  (i: O): MoHKT<F, REnc, never, E>
}

declare module "./registry" {
  export interface URItoInterpreter<F extends URIS, RDec, REnc, O, E> {
    [EncoderURI]: Encoder<F, REnc, O, E>
  }

  export interface URItoInterpreterF<F, RDec, REnc, O, E> {
    [EncoderURI]: EncoderF<F, REnc, O, E>
  }
}
