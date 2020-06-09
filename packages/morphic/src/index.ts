import { opaque, opaque_, summonFor } from "./batteries/summoner"
import type { M, M_ } from "./batteries/summoner"

//
// Model Tooling
//

export { ValidationErrors, validationErrors } from "./batteries/interpreter"
export {
  Errors,
  withFirstMessage,
  withMessage,
  withValidate,
  reportFailure
} from "./model"

//
// Summoner
//

export { Summoner, summonFor as makeFor } from "./batteries/summoner"

//
// URIS
//

export { FastCheckURI } from "./fc/hkt"
export { ModelURI } from "./model/hkt"
export { ShowURI } from "./show/hkt"
export { EqURI } from "./eq/hkt"

//
// Threading configs
//

export {} from "./eq/interpreter/configs"
export {} from "./fc/interpreter/configs"
export {} from "./model/interpreter/configs"
export {} from "./show/interpreter/configs"

//
// Generics
//

export type { M, M_ }

//
// Opaque
//
export type { AType, EType, RType } from "./batteries/usage/utils"

export { opaque, opaque_ }

//
// Defaults
//
export const { make, makeADT, makeProgram } =
  /*#__PURE__*/
  (() => summonFor({}))()
