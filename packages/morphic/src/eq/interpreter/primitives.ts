import type { Eq } from "fp-ts/lib/Eq"

import { memo } from "../../utils"
import { eqApplyConfig } from "../config"
import { EqType, EqURI } from "../hkt"

import { getEq as AgetEq } from "@matechs/core/Array"
import { getEq as EgetEq } from "@matechs/core/Either"
import { contramap_, eqNumber, eqString, eqBoolean, eqStrict } from "@matechs/core/Eq"
import { introduce } from "@matechs/core/Function"
import { getEq as OgetEq } from "@matechs/core/Option"
import type { AnyEnv } from "@matechs/morphic-alg/config"
import type { MatechsAlgebraPrimitive1, UUID } from "@matechs/morphic-alg/primitives"

declare module "@matechs/morphic-alg/primitives" {
  interface NonEmptyArrayConfig<L, A> {
    [EqURI]: {
      eq: Eq<A>
    }
  }
  interface ArrayConfig<L, A> {
    [EqURI]: {
      eq: Eq<A>
    }
  }
  interface NullableConfig<L, A> {
    [EqURI]: {
      eq: Eq<A>
    }
  }
  interface EitherConfig<EE, EA, AE, AA> {
    [EqURI]: {
      left: Eq<EA>
      right: Eq<AA>
    }
  }
  interface OptionConfig<L, A> {
    [EqURI]: {
      eq: Eq<A>
    }
  }
}

export const eqPrimitiveInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraPrimitive1<EqURI, Env> => ({
    _F: EqURI,
    date: (config) => (env) =>
      introduce(contramap_(eqNumber, (date: Date) => date.getTime()))(
        (eq) => new EqType(eqApplyConfig(config)(eq, env, {}))
      ),
    boolean: (config) => (env) => new EqType(eqApplyConfig(config)(eqBoolean, env, {})),
    string: (config) => (env) => new EqType(eqApplyConfig(config)(eqString, env, {})),
    number: (config) => (env) => new EqType(eqApplyConfig(config)(eqNumber, env, {})),
    bigint: (config) => (env) =>
      new EqType<bigint>(eqApplyConfig(config)(eqStrict, env, {})),
    stringLiteral: (k, config) => (env) =>
      new EqType<typeof k>(eqApplyConfig(config)(eqString, env, {})),
    keysOf: (keys, config) => (env) =>
      new EqType<keyof typeof keys & string>(eqApplyConfig(config)(eqStrict, env, {})),
    nullable: (getType, config) => (env) =>
      introduce(getType(env).eq)(
        (eq) => new EqType(eqApplyConfig(config)(OgetEq(eq), env, { eq }))
      ),
    array: (getType, config) => (env) =>
      introduce(getType(env).eq)(
        (eq) => new EqType(eqApplyConfig(config)(AgetEq(eq), env, { eq }))
      ),
    nonEmptyArray: (getType, config) => (env) =>
      introduce(getType(env).eq)(
        (eq) => new EqType(eqApplyConfig(config)(AgetEq(eq), env, { eq }))
      ),
    uuid: (config) => (env) =>
      new EqType<UUID>(eqApplyConfig(config)(eqString, env, {})),
    either: (e, a, config) => (env) =>
      introduce(e(env).eq)((left) =>
        introduce(a(env).eq)(
          (right) =>
            new EqType(
              eqApplyConfig(config)(EgetEq(left, right), env, {
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
            eqApplyConfig(config)(OgetEq(eq), env, {
              eq
            })
          )
      )
  })
)
