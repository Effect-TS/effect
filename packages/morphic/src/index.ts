import type { AlgebraNoUnion } from "./batteries/program"
import { opaque, opaque_, summonFor } from "./batteries/summoner"
import type { M, M_ } from "./batteries/summoner"
import { Codec } from "./model"
import { ModelURI } from "./model/hkt"

import type { ThreadURI } from "@matechs/morphic-alg/config"
import type { HKT2 } from "@matechs/morphic-alg/utils/hkt"

//
// Model Tooling
//

export {
  ValidationErrors,
  validationErrors,
  Validated,
  ValidatedBrand
} from "./batteries/interpreter"
export {
  Errors,
  withFirstMessage,
  withMessage,
  withValidate,
  reportFailure,
  withMessage_,
  withValidate_,
  withName
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
export { GuardURI } from "./guard/hkt"

//
// Threading configs
//

export {} from "./eq/interpreter/configs"
export {} from "./fc/interpreter/configs"
export {} from "./model/interpreter/configs"
export {} from "./show/interpreter/configs"
export {} from "./guard/interpreter/configs"

//
// Generics
//

export type { M, M_ }

//
// Opaque
//
export type { AType, EType, RType } from "./batteries/usage/utils"
export type {
  AOfMorhpADT as ATypeADT,
  EOfMorhpADT as ETypeADT
} from "./batteries/usage/tagged-union"

export { opaque, opaque_ }

//
// Defaults
//
export const { make, makeADT, makeProgram } =
  /*#__PURE__*/
  (() => summonFor({}))()

export function customCodec<G, Env, E, A>(T: HKT2<G, Env, E, A>) {
  return <E2>(
    f: (
      codec: Codec<A, E>,
      env: ThreadURI<Env, "@matechs/morphic/ModelURI">,
      config: {
        model: Codec<A, E>
      }
    ) => Codec<A, E2>
  ) => (F: AlgebraNoUnion<G, Env>) =>
    F.unknownE(T, {
      conf: {
        [ModelURI]: (a, b, c) => f(a as Codec<A, E>, b as any, c)
      }
    }) as HKT2<G, Env, E2, A>
}
