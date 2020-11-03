import * as A from "@effect-ts/core/Classic/Array"
import * as E from "@effect-ts/core/Classic/Either"
import * as NA from "@effect-ts/core/Classic/NonEmptyArray"
import * as O from "@effect-ts/core/Classic/Option"
import { flow, pipe } from "@effect-ts/core/Function"
import * as T from "@effect-ts/core/Sync"

import type { PrimitivesURI, UUID } from "../../Algebra/Primitives"
import { interpreter } from "../../HKT"
import { strictApplyConfig, StrictType, StrictURI } from "../base"

export const regexUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const strictPrimitiveInterpreter = interpreter<StrictURI, PrimitivesURI>()(
  () => ({
    _F: StrictURI,
    function: (_, __, config) => (env) =>
      new StrictType(
        strictApplyConfig(config?.conf)(
          {
            shrink: T.succeed
          },
          env,
          {}
        )
      ),
    unknownE: (k, config) => (env) =>
      new StrictType(strictApplyConfig(config?.conf)(k(env).strict, env, {})),
    date: (config) => (env) =>
      new StrictType(
        strictApplyConfig(config?.conf)(
          {
            shrink: T.succeed
          },
          env,
          {}
        )
      ),
    boolean: (config) => (env) =>
      new StrictType(
        strictApplyConfig(config?.conf)(
          {
            shrink: T.succeed
          },
          env,
          {}
        )
      ),
    string: (config) => (env) =>
      new StrictType(
        strictApplyConfig(config?.conf)(
          {
            shrink: T.succeed
          },
          env,
          {}
        )
      ),
    number: (config) => (env) =>
      new StrictType(
        strictApplyConfig(config?.conf)(
          {
            shrink: T.succeed
          },
          env,
          {}
        )
      ),
    bigint: (config) => (env) =>
      new StrictType<bigint>(
        strictApplyConfig(config?.conf)(
          {
            shrink: T.succeed
          },
          env,
          {}
        )
      ),
    stringLiteral: (k, config) => (env) =>
      new StrictType<typeof k>(
        strictApplyConfig(config?.conf)(
          {
            shrink: T.succeed
          },
          env,
          {}
        )
      ),
    numberLiteral: (k, config) => (env) =>
      new StrictType<typeof k>(
        strictApplyConfig(config?.conf)(
          {
            shrink: T.succeed
          },
          env,
          {}
        )
      ),
    oneOfLiterals: (_ls, config) => (env) =>
      new StrictType(
        strictApplyConfig(config?.conf)(
          {
            shrink: T.succeed
          },
          env,
          {}
        )
      ),
    keysOf: (keys, config) => (env) =>
      new StrictType<keyof typeof keys & string>(
        strictApplyConfig(config?.conf)(
          {
            shrink: T.succeed
          },
          env,
          {}
        )
      ),
    nullable: (getType, config) => (env) =>
      pipe(
        getType(env).strict,
        (strict) =>
          new StrictType(
            strictApplyConfig(config?.conf)(
              {
                shrink: (u) =>
                  u._tag === "None"
                    ? T.succeed(O.none)
                    : T.map_(strict.shrink((u as O.Some<any>).value), O.some)
              },
              env,
              { strict }
            )
          )
      ),
    mutable: (getType, config) => (env) =>
      pipe(
        getType(env).strict,
        (strict) =>
          new StrictType(strictApplyConfig(config?.conf)(strict, env, { strict }))
      ),
    optional: (getType, config) => (env) =>
      pipe(
        getType(env).strict,
        (strict) =>
          new StrictType(
            strictApplyConfig(config?.conf)(
              {
                shrink: (u) =>
                  u == null ? T.succeed(undefined) : strict.shrink<any>(u)
              },
              env,
              { strict }
            )
          )
      ),
    array: (getType, config) => (env) =>
      pipe(
        getType(env).strict,
        (strict) =>
          new StrictType(
            strictApplyConfig(config?.conf)(
              {
                shrink: A.foreachF(T.Applicative)(strict.shrink)
              },
              env,
              { strict }
            )
          )
      ),
    nonEmptyArray: (getType, config) => (env) =>
      pipe(
        getType(env).strict,
        (strict) =>
          new StrictType(
            strictApplyConfig(config?.conf)(
              {
                shrink: NA.foreachF(T.Applicative)(strict.shrink)
              },
              env,
              { strict }
            )
          )
      ),
    uuid: (config) => (env) =>
      new StrictType<UUID>(
        strictApplyConfig(config?.conf)(
          {
            shrink: T.succeed
          },
          env,
          {}
        )
      ),
    either: (e, a, config) => (env) =>
      pipe(e(env).strict, (left) =>
        pipe(
          a(env).strict,
          (right) =>
            new StrictType(
              strictApplyConfig(config?.conf)(
                {
                  shrink: E.fold(
                    flow(left.shrink, T.map(E.left)),
                    flow(right.shrink, T.map(E.right))
                  )
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
        a(env).strict,
        (strict) =>
          new StrictType(
            strictApplyConfig(config?.conf)(
              {
                shrink: O.fold(
                  () => T.succeed(O.none),
                  flow(strict.shrink, T.map(O.some))
                )
              },
              env,
              {
                strict
              }
            )
          )
      )
  })
)
