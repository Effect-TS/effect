import type { M, M_ } from "./Batteries/summoner"
import { opaque, opaque_, summonFor } from "./Batteries/summoner"

//
// Summoner
//

export { Summoner, summonFor as makeFor } from "./Batteries/summoner"

//
// Opaque
//
export type { AType, EType, RType } from "./Batteries/usage/utils"

//
// URIS
//
export { FastCheckURI } from "./FastCheck/base"
export { GuardURI } from "./Guard/base"
export { DecoderURI } from "./Decoder/base"
export { EncoderURI } from "./Encoder/base"
export { EqURI } from "./Equal/base"
export { ShowURI } from "./Show/base"
export { StrictURI } from "./Strict/base"
export { HashURI } from "./Hash/base"
export { ReorderURI } from "./Reorder/base"

//
// Threading configs
//
export {} from "./FastCheck/interpreter/configs"
export {} from "./Guard/interpreter/configs"
export {} from "./Decoder/interpreter/configs"
export {} from "./Encoder/interpreter/configs"
export {} from "./Equal/interpreter/configs"
export {} from "./Show/interpreter/configs"
export {} from "./Strict/interpreter/configs"
export {} from "./Hash/interpreter/configs"
export {} from "./Reorder/interpreter/configs"

//
// Generics
//
export type { M, M_ }
export { opaque, opaque_ }

//
// Defaults
//
export const { make, makeADT, makeProgram } =
  /*#__PURE__*/
  (() => summonFor({}))()
