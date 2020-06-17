import { memo } from "../../utils"
import { eqApplyConfig } from "../config"
import { EqType, EqURI } from "../hkt"

import { getEq as AgetEq } from "@matechs/core/Array"
import { getEq as EgetEq } from "@matechs/core/Either"
import { contramap_, eqBoolean, eqNumber, eqStrict, eqString } from "@matechs/core/Eq"
import { introduce } from "@matechs/core/Function"
import { getEq as OgetEq } from "@matechs/core/Option"
import type { AnyEnv } from "@matechs/morphic-alg/config"
import type { MatechsAlgebraPrimitive1, UUID } from "@matechs/morphic-alg/primitives"

export const eqPrimitiveInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraPrimitive1<EqURI, Env> => ({
    _F: EqURI,
    date: (config) => (env) =>
      introduce(contramap_(eqNumber, (date: Date) => date.getTime()))(
        (eq) => new EqType(eqApplyConfig(config?.conf)(eq, env, {}))
      ),
    boolean: (config) => (env) =>
      new EqType(eqApplyConfig(config?.conf)(eqBoolean, env, {})),
    string: (config) => (env) =>
      new EqType(eqApplyConfig(config?.conf)(eqString, env, {})),
    number: (config) => (env) =>
      new EqType(eqApplyConfig(config?.conf)(eqNumber, env, {})),
    bigint: (config) => (env) =>
      new EqType<bigint>(eqApplyConfig(config?.conf)(eqStrict, env, {})),
    stringLiteral: (k, config) => (env) =>
      new EqType<typeof k>(eqApplyConfig(config?.conf)(eqString, env, {})),
    numberLiteral: (k, config) => (env) =>
      new EqType<typeof k>(eqApplyConfig(config?.conf)(eqNumber, env, {})),
    keysOf: (keys, config) => (env) =>
      new EqType<keyof typeof keys & string>(
        eqApplyConfig(config?.conf)(eqStrict, env, {})
      ),
    nullable: (getType, config) => (env) =>
      introduce(getType(env).eq)(
        (eq) => new EqType(eqApplyConfig(config?.conf)(OgetEq(eq), env, { eq }))
      ),
    mutable: (getType, config) => (env) =>
      introduce(getType(env).eq)(
        (eq) => new EqType(eqApplyConfig(config?.conf)(eq, env, { eq }))
      ),
    optional: (getType, config) => (env) =>
      introduce(getType(env).eq)(
        (eq) =>
          new EqType(
            eqApplyConfig(config?.conf)(
              {
                equals: (x, y) =>
                  typeof x === "undefined" && typeof y === "undefined"
                    ? true
                    : typeof x === "undefined"
                    ? false
                    : typeof y === "undefined"
                    ? false
                    : eq.equals(x, y)
              },
              env,
              { eq }
            )
          )
      ),
    array: (getType, config) => (env) =>
      introduce(getType(env).eq)(
        (eq) => new EqType(eqApplyConfig(config?.conf)(AgetEq(eq), env, { eq }))
      ),
    nonEmptyArray: (getType, config) => (env) =>
      introduce(getType(env).eq)(
        (eq) => new EqType(eqApplyConfig(config?.conf)(AgetEq(eq), env, { eq }))
      ),
    uuid: (config) => (env) =>
      new EqType<UUID>(eqApplyConfig(config?.conf)(eqString, env, {})),
    either: (e, a, config) => (env) =>
      introduce(e(env).eq)((left) =>
        introduce(a(env).eq)(
          (right) =>
            new EqType(
              eqApplyConfig(config?.conf)(EgetEq(left, right), env, {
                left,
                right
              })
            )
        )
      ),
    option: (a, config) => (env) =>
      introduce(a(env).eq)(
        (eq) =>
          new EqType(
            eqApplyConfig(config?.conf)(OgetEq(eq), env, {
              eq
            })
          )
      )
  })
)
