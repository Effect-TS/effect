import { getEqual as AgetEq } from "@effect-ts/core/Classic/Array"
import { getEqual as EgetEq } from "@effect-ts/core/Classic/Either"
import {
  contramap,
  eqBoolean,
  eqNumber,
  eqStrict,
  eqString
} from "@effect-ts/core/Classic/Equal"
import { getEqual as OgetEq } from "@effect-ts/core/Classic/Option"
import { pipe } from "@effect-ts/core/Function"
import { getEqual as LgetEq } from "@effect-ts/core/Persistent/List"

import type { PrimitivesURI, UUID } from "../../Algebra/Primitives"
import { interpreter } from "../../HKT"
import { eqApplyConfig, EqType, EqURI } from "../base"

export const eqPrimitiveInterpreter = interpreter<EqURI, PrimitivesURI>()(() => ({
  _F: EqURI,
  function: (_, __, config) => (env) =>
    new EqType(
      eqApplyConfig(config?.conf)(
        {
          equals: (y) => (x) => x === y
        },
        env,
        {}
      )
    ),
  unknownE: (k, config) => (env) =>
    new EqType(eqApplyConfig(config?.conf)(k(env).eq, env, {})),
  date: (config) => (env) =>
    pipe(
      eqNumber,
      contramap((date: Date) => date.getTime()),
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
  oneOfLiterals: (ls, config) => (env) =>
    pipe(eqStrict, (eq) => new EqType(eqApplyConfig(config?.conf)(eq, env, { eq }))),
  keysOf: (keys, config) => (env) =>
    new EqType<keyof typeof keys & string>(
      eqApplyConfig(config?.conf)(eqStrict, env, {})
    ),
  nullable: (getType, config) => (env) =>
    pipe(
      getType(env).eq,
      (eq) => new EqType(eqApplyConfig(config?.conf)(OgetEq(eq), env, { eq }))
    ),
  mutable: (getType, config) => (env) =>
    pipe(
      getType(env).eq,
      (eq) => new EqType(eqApplyConfig(config?.conf)(eq, env, { eq }))
    ),
  optional: (getType, config) => (env) =>
    pipe(
      getType(env).eq,
      (eq) =>
        new EqType(
          eqApplyConfig(config?.conf)(
            {
              equals: (y) => (x) =>
                typeof x === "undefined" && typeof y === "undefined"
                  ? true
                  : typeof x === "undefined"
                  ? false
                  : typeof y === "undefined"
                  ? false
                  : eq.equals(y)(x)
            },
            env,
            { eq }
          )
        )
    ),
  array: (getType, config) => (env) =>
    pipe(
      getType(env).eq,
      (eq) => new EqType(eqApplyConfig(config?.conf)(AgetEq(eq), env, { eq }))
    ),
  list: (getType, config) => (env) =>
    pipe(
      getType(env).eq,
      (eq) => new EqType(eqApplyConfig(config?.conf)(LgetEq(eq), env, { eq }))
    ),
  nonEmptyArray: (getType, config) => (env) =>
    pipe(
      getType(env).eq,
      (eq) => new EqType(eqApplyConfig(config?.conf)(AgetEq(eq), env, { eq }))
    ),
  uuid: (config) => (env) =>
    new EqType<UUID>(eqApplyConfig(config?.conf)(eqString, env, {})),
  either: (e, a, config) => (env) =>
    pipe(e(env).eq, (left) =>
      pipe(
        a(env).eq,
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
    pipe(
      a(env).eq,
      (eq) =>
        new EqType(
          eqApplyConfig(config?.conf)(OgetEq(eq), env, {
            eq
          })
        )
    )
}))
