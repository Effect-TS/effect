import type { AnyEnv } from "@morphic-ts/common/lib/config"

import { memo } from "../../utils"
import { eqApplyConfig } from "../config"
import { EqType, EqURI } from "../hkt"

import { getEq as AgetEq } from "@matechs/core/Array"
import { getEq as EgetEq } from "@matechs/core/Either"
import { contramap_, eqNumber, eqString, eqBoolean, eqStrict } from "@matechs/core/Eq"
import type { UUID } from "@matechs/core/Model"
import { getEq as OgetEq } from "@matechs/core/Option"
import type { MatechsAlgebraPrimitive1 } from "@matechs/morphic-alg/primitives"

export const eqPrimitiveInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraPrimitive1<EqURI, Env> => ({
    _F: EqURI,
    date: (config) => (env) =>
      new EqType(
        eqApplyConfig(config)(
          contramap_(eqNumber, (date: Date) => date.getTime()),
          env
        )
      ),
    boolean: (config) => (env) => new EqType(eqApplyConfig(config)(eqBoolean, env)),
    string: (config) => (env) => new EqType(eqApplyConfig(config)(eqString, env)),
    number: (config) => (env) => new EqType(eqApplyConfig(config)(eqNumber, env)),
    bigint: (config) => (env) =>
      new EqType<bigint>(eqApplyConfig(config)(eqStrict, env)),
    stringLiteral: (k, config) => (env) =>
      new EqType<typeof k>(eqApplyConfig(config)(eqString, env)),
    keysOf: (keys, config) => (env) =>
      new EqType<keyof typeof keys>(eqApplyConfig(config)(eqStrict, env)),
    nullable: (getType, config) => (env) =>
      new EqType(eqApplyConfig(config)(OgetEq(getType(env).eq), env)),
    array: (getType, config) => (env) =>
      new EqType(eqApplyConfig(config)(AgetEq(getType(env).eq), env)),
    nonEmptyArray: (getType, config) => (env) =>
      new EqType(eqApplyConfig(config)(AgetEq(getType(env).eq), env)),
    uuid: (config) => (env) => new EqType<UUID>(eqApplyConfig(config)(eqString, env)),
    either: (e, a, config) => (env) =>
      new EqType(eqApplyConfig(config)(EgetEq(e(env).eq, a(env).eq), env)),
    option: (a, config) => (env) =>
      new EqType(eqApplyConfig(config)(OgetEq(a(env).eq), env))
  })
)
