import { Summoner, summonFor } from "./batteries/summoner"
import type { Materialized } from "./batteries/usage/materializer"
import type {
  SummonerEnv,
  SummonerInterpURI,
  SummonerProgURI
} from "./batteries/usage/summoner"
import { EqURI, modelEqInterpreter } from "./eq"
import { FastCheckURI, modelFcInterpreter } from "./fc"
import { ShowURI, modelShowInterpreter } from "./show"

export {
  AsOpaque as opaque,
  AsUOpaque as opaque_,
  M,
  Summoner,
  summonFor as makeFor,
  M_
} from "./batteries/summoner"
export { AType, EType, RType } from "./batteries/usage/utils"
export { EqURI } from "./eq/hkt"
export { ModelURI } from "./model/hkt"
export { FastCheckURI } from "./fc/hkt"
export { ShowURI } from "./show/hkt"

export const eqFor = <S extends Summoner<any>>(S: S) => (
  _: { [k in EqURI & keyof SummonerEnv<S>]: SummonerEnv<S>[k] }
) => <L, A>(
  F: Materialized<SummonerEnv<S>, L, A, SummonerProgURI<S>, SummonerInterpURI<S>>
) => F.derive(modelEqInterpreter<SummonerEnv<S>>())(_).eq

export const arbFor = <S extends Summoner<any>>(S: S) => (
  _: { [k in FastCheckURI & keyof SummonerEnv<S>]: SummonerEnv<S>[k] }
) => <L, A>(
  F: Materialized<SummonerEnv<S>, L, A, SummonerProgURI<S>, SummonerInterpURI<S>>
) => F.derive(modelFcInterpreter<SummonerEnv<S>>())(_).arb

export const showFor = <S extends Summoner<any>>(S: S) => (
  _: { [k in ShowURI & keyof SummonerEnv<S>]: SummonerEnv<S>[k] }
) => <L, A>(
  F: Materialized<SummonerEnv<S>, L, A, SummonerProgURI<S>, SummonerInterpURI<S>>
) => F.derive(modelShowInterpreter<SummonerEnv<S>>())(_).show

export { ValidationErrors, validationErrors } from "./batteries/interpreter"

export { withFirstMessage, withMessage, withValidate, Errors } from "./model"

export {} from "./model/interpreter/intersection"
export {} from "./model/interpreter/newtype"
export {} from "./model/interpreter/object"
export {} from "./model/interpreter/primitives"
export {} from "./model/interpreter/recursive"
export {} from "./model/interpreter/refined"
export {} from "./model/interpreter/set"
export {} from "./model/interpreter/str-map"
export {} from "./model/interpreter/tagged-unions"
export {} from "./model/interpreter/unknown"

export {} from "./show/interpreter/intersection"
export {} from "./show/interpreter/newtype"
export {} from "./show/interpreter/object"
export {} from "./show/interpreter/primitives"
export {} from "./show/interpreter/recursive"
export {} from "./show/interpreter/refined"
export {} from "./show/interpreter/set"
export {} from "./show/interpreter/str-map"
export {} from "./show/interpreter/tagged-union"
export {} from "./show/interpreter/unknown"

export {} from "./eq/interpreter/intersection"
export {} from "./eq/interpreter/newtype"
export {} from "./eq/interpreter/object"
export {} from "./eq/interpreter/primitives"
export {} from "./eq/interpreter/recursive"
export {} from "./eq/interpreter/refined"
export {} from "./eq/interpreter/set"
export {} from "./eq/interpreter/str-map"
export {} from "./eq/interpreter/tagged-union"
export {} from "./eq/interpreter/unknown"

export {} from "./fc/interpreter/intersection"
export {} from "./fc/interpreter/newtype"
export {} from "./fc/interpreter/object"
export {} from "./fc/interpreter/primitives"
export {} from "./fc/interpreter/recursive"
export {} from "./fc/interpreter/refined"
export {} from "./fc/interpreter/set"
export {} from "./fc/interpreter/str-map"
export {} from "./fc/interpreter/tagged-union"
export {} from "./fc/interpreter/unknown"

//
// Defaults
//
export const { make, makeADT, makeProgram } =
  /*#__PURE__*/
  (() => summonFor({}))()

export const deriveEq =
  /*#__PURE__*/
  (() => eqFor(make)({}))()

export const deriveShow =
  /*#__PURE__*/
  (() => showFor(make)({}))()

export const deriveArb =
  /*#__PURE__*/
  (() => arbFor(make)({}))()
