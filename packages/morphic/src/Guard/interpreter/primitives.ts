import type { Array } from "@effect-ts/core/Classic/Array"
import type { Either } from "@effect-ts/core/Classic/Either"
import type { NonEmptyArray } from "@effect-ts/core/Classic/NonEmptyArray"
import type { Option } from "@effect-ts/core/Classic/Option"
import { pipe } from "@effect-ts/core/Function"

import type { PrimitivesURI, UUID } from "../../Algebra/Primitives"
import { interpreter } from "../../HKT"
import { guardApplyConfig, GuardType, GuardURI } from "../base"
import type { AOfGuard } from "./common"
import { isNumber, isString } from "./common"

export const regexUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const guardPrimitiveInterpreter = interpreter<GuardURI, PrimitivesURI>()(() => ({
  _F: GuardURI,
  function: (_, __, config) => (env) =>
    new GuardType(
      guardApplyConfig(config?.conf)(
        {
          is: (u): u is any => false
        },
        env,
        {}
      )
    ),
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
    pipe(
      getType(env).guard,
      (guard) =>
        new GuardType(
          guardApplyConfig(config?.conf)(
            {
              is: (u): u is Option<AOfGuard<typeof guard>> =>
                typeof u === "object" &&
                u !== null &&
                ["None", "Some"].indexOf(u["_tag"]) !== -1 &&
                ((u["_tag"] === "Some" && guard.is(u["value"])) || u["_tag"] === "None")
            },
            env,
            { guard }
          )
        )
    ),
  mutable: (getType, config) => (env) =>
    pipe(
      getType(env).guard,
      (guard) => new GuardType(guardApplyConfig(config?.conf)(guard, env, { guard }))
    ),
  optional: (getType, config) => (env) =>
    pipe(
      getType(env).guard,
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
    pipe(
      getType(env).guard,
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
    pipe(
      getType(env).guard,
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
    pipe(e(env).guard, (left) =>
      pipe(
        a(env).guard,
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
    pipe(
      a(env).guard,
      (guard) =>
        new GuardType(
          guardApplyConfig(config?.conf)(
            {
              is: (u): u is Option<AOfGuard<typeof guard>> =>
                typeof u === "object" &&
                u !== null &&
                ["None", "Some"].indexOf(u["_tag"]) !== -1 &&
                ((u["_tag"] === "Some" && guard.is(u["value"])) || u["_tag"] === "None")
            },
            env,
            {
              guard
            }
          )
        )
    )
}))
