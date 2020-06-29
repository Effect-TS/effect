import { memo } from "../../utils"
import { guardApplyConfig } from "../config"
import { GuardType, GuardURI } from "../hkt"

import { isString, isNumber, AOfGuard } from "./common"

import type { Array } from "@matechs/core/Array"
import type { Either } from "@matechs/core/Either"
import { introduce } from "@matechs/core/Function"
import type { NonEmptyArray } from "@matechs/core/NonEmptyArray"
import type { Option } from "@matechs/core/Option"
import type { AnyEnv } from "@matechs/morphic-alg/config"
import type { MatechsAlgebraPrimitive1, UUID } from "@matechs/morphic-alg/primitives"

export const regexUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const guardPrimitiveInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraPrimitive1<GuardURI, Env> => ({
    _F: GuardURI,
    unknownE: (k, config) => (env) =>
      new GuardType(guardApplyConfig(config?.conf)(k(env).guard, env, {})),
    date: (config) => (env) =>
      new GuardType(
        guardApplyConfig(config?.conf)(
          {
            is: (u): u is Date => u instanceof Date
          },
          env,
          {}
        )
      ),
    boolean: (config) => (env) =>
      new GuardType(
        guardApplyConfig(config?.conf)(
          {
            is: (u): u is boolean => typeof u === "boolean"
          },
          env,
          {}
        )
      ),
    string: (config) => (env) =>
      new GuardType(
        guardApplyConfig(config?.conf)(
          {
            is: isString
          },
          env,
          {}
        )
      ),
    number: (config) => (env) =>
      new GuardType(
        guardApplyConfig(config?.conf)(
          {
            is: (u): u is number => typeof u === "number"
          },
          env,
          {}
        )
      ),
    bigint: (config) => (env) =>
      new GuardType<bigint>(
        guardApplyConfig(config?.conf)(
          {
            is: (u): u is bigint => typeof u === "bigint"
          },
          env,
          {}
        )
      ),
    stringLiteral: (k, config) => (env) =>
      new GuardType<typeof k>(
        guardApplyConfig(config?.conf)(
          {
            is: (u): u is typeof k => isString(u) && u === k
          },
          env,
          {}
        )
      ),
    numberLiteral: (k, config) => (env) =>
      new GuardType<typeof k>(
        guardApplyConfig(config?.conf)(
          { is: (u): u is typeof k => isNumber(u) && u === k },
          env,
          {}
        )
      ),
    oneOfLiterals: (ls, config) => (env) =>
      new GuardType(
        guardApplyConfig(config?.conf)(
          {
            is: (u: unknown): u is typeof ls[number] =>
              (typeof u === "string" || typeof u === "number") && ls.includes(u)
          },
          env,
          {}
        )
      ),
    keysOf: (keys, config) => (env) =>
      new GuardType<keyof typeof keys & string>(
        guardApplyConfig(config?.conf)(
          {
            is: (u): u is keyof typeof keys & string =>
              isString(u) && Object.keys(keys).indexOf(u) !== -1
          },
          env,
          {}
        )
      ),
    nullable: (getType, config) => (env) =>
      introduce(getType(env).guard)(
        (guard) =>
          new GuardType(
            guardApplyConfig(config?.conf)(
              {
                is: (u): u is Option<AOfGuard<typeof guard>> =>
                  typeof u === "object" &&
                  u !== null &&
                  ["None", "Some"].indexOf(u["_tag"]) !== -1 &&
                  ((u["_tag"] === "Some" && guard.is(u["value"])) ||
                    u["_tag"] === "None")
              },
              env,
              { guard }
            )
          )
      ),
    mutable: (getType, config) => (env) =>
      introduce(getType(env).guard)(
        (guard) => new GuardType(guardApplyConfig(config?.conf)(guard, env, { guard }))
      ),
    optional: (getType, config) => (env) =>
      introduce(getType(env).guard)(
        (guard) =>
          new GuardType(
            guardApplyConfig(config?.conf)(
              {
                is: (u): u is AOfGuard<typeof guard> | undefined =>
                  typeof u === "undefined" || guard.is(u)
              },
              env,
              { guard }
            )
          )
      ),
    array: (getType, config) => (env) =>
      introduce(getType(env).guard)(
        (guard) =>
          new GuardType(
            guardApplyConfig(config?.conf)(
              {
                is: (u): u is Array<AOfGuard<typeof guard>> =>
                  Array.isArray(u) && u.every(guard.is)
              },
              env,
              { guard }
            )
          )
      ),
    nonEmptyArray: (getType, config) => (env) =>
      introduce(getType(env).guard)(
        (guard) =>
          new GuardType(
            guardApplyConfig(config?.conf)(
              {
                is: (u): u is NonEmptyArray<AOfGuard<typeof guard>> =>
                  Array.isArray(u) && u.every(guard.is) && u.length > 0
              },
              env,
              { guard }
            )
          )
      ),
    uuid: (config) => (env) =>
      new GuardType<UUID>(
        guardApplyConfig(config?.conf)(
          {
            is: (u): u is UUID => isString(u) && regexUUID.test(u)
          },
          env,
          {}
        )
      ),
    either: (e, a, config) => (env) =>
      introduce(e(env).guard)((left) =>
        introduce(a(env).guard)(
          (right) =>
            new GuardType(
              guardApplyConfig(config?.conf)(
                {
                  is: (u): u is Either<AOfGuard<typeof left>, AOfGuard<typeof right>> =>
                    typeof u === "object" &&
                    u !== null &&
                    ["Left", "Right"].indexOf(u["_tag"]) !== -1 &&
                    ((u["_tag"] === "Right" && right.is(u["right"])) ||
                      (u["_tag"] === "Left" && left.is(u["left"])))
                },
                env,
                {
                  left,
                  right
                }
              )
            )
        )
      ),
    option: (a, config) => (env) =>
      introduce(a(env).guard)(
        (guard) =>
          new GuardType(
            guardApplyConfig(config?.conf)(
              {
                is: (u): u is Option<AOfGuard<typeof guard>> =>
                  typeof u === "object" &&
                  u !== null &&
                  ["None", "Some"].indexOf(u["_tag"]) !== -1 &&
                  ((u["_tag"] === "Some" && guard.is(u["value"])) ||
                    u["_tag"] === "None")
              },
              env,
              {
                guard
              }
            )
          )
      )
  })
)
