import * as A from "@effect-ts/core/Array"
import * as E from "@effect-ts/core/Either"
import { flow, pipe } from "@effect-ts/core/Function"
import * as L from "@effect-ts/core/List"
import * as NA from "@effect-ts/core/NonEmptyArray"
import * as O from "@effect-ts/core/Option"
import * as T from "@effect-ts/core/Sync"

import type { PrimitivesURI, UUID } from "../../Algebra/Primitives"
import { interpreter } from "../../HKT"
import { reorderApplyConfig, ReorderType, ReorderURI } from "../base"

export const regexUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const reorderPrimitiveInterpreter = interpreter<ReorderURI, PrimitivesURI>()(
  () => ({
    _F: ReorderURI,
    function: (_, __, config) => (env) =>
      new ReorderType(
        reorderApplyConfig(config?.conf)(
          {
            reorder: T.succeed
          },
          env,
          {}
        )
      ),
    unknownE: (k, config) => (env) =>
      new ReorderType(reorderApplyConfig(config?.conf)(k(env).reorder, env, {})),
    date: (config) => (env) =>
      new ReorderType(
        reorderApplyConfig(config?.conf)(
          {
            reorder: T.succeed
          },
          env,
          {}
        )
      ),
    boolean: (config) => (env) =>
      new ReorderType(
        reorderApplyConfig(config?.conf)(
          {
            reorder: T.succeed
          },
          env,
          {}
        )
      ),
    string: (config) => (env) =>
      new ReorderType(
        reorderApplyConfig(config?.conf)(
          {
            reorder: T.succeed
          },
          env,
          {}
        )
      ),
    number: (config) => (env) =>
      new ReorderType(
        reorderApplyConfig(config?.conf)(
          {
            reorder: T.succeed
          },
          env,
          {}
        )
      ),
    bigint: (config) => (env) =>
      new ReorderType<bigint>(
        reorderApplyConfig(config?.conf)(
          {
            reorder: T.succeed
          },
          env,
          {}
        )
      ),
    stringLiteral: (k, config) => (env) =>
      new ReorderType<typeof k>(
        reorderApplyConfig(config?.conf)(
          {
            reorder: T.succeed
          },
          env,
          {}
        )
      ),
    numberLiteral: (k, config) => (env) =>
      new ReorderType<typeof k>(
        reorderApplyConfig(config?.conf)(
          {
            reorder: T.succeed
          },
          env,
          {}
        )
      ),
    oneOfLiterals: (_ls, config) => (env) =>
      new ReorderType(
        reorderApplyConfig(config?.conf)(
          {
            reorder: T.succeed
          },
          env,
          {}
        )
      ),
    keysOf: (keys, config) => (env) =>
      new ReorderType<keyof typeof keys & string>(
        reorderApplyConfig(config?.conf)(
          {
            reorder: T.succeed
          },
          env,
          {}
        )
      ),
    nullable: (getType, config) => (env) =>
      pipe(
        getType(env).reorder,
        (reorder) =>
          new ReorderType(
            reorderApplyConfig(config?.conf)(
              {
                reorder: (u) =>
                  u._tag === "None"
                    ? T.succeed(O.none)
                    : T.map_(reorder.reorder((u as O.Some<any>).value), O.some)
              },
              env,
              { reorder }
            )
          )
      ),
    mutable: (getType, config) => (env) =>
      pipe(
        getType(env).reorder,
        (reorder) =>
          new ReorderType(reorderApplyConfig(config?.conf)(reorder, env, { reorder }))
      ),
    optional: (getType, config) => (env) =>
      pipe(
        getType(env).reorder,
        (reorder) =>
          new ReorderType(
            reorderApplyConfig(config?.conf)(
              {
                reorder: (u) => (u == null ? T.succeed(undefined) : reorder.reorder(u))
              },
              env,
              { reorder }
            )
          )
      ),
    array: (getType, config) => (env) =>
      pipe(
        getType(env).reorder,
        (reorder) =>
          new ReorderType(
            reorderApplyConfig(config?.conf)(
              {
                reorder: A.foreachF(T.Applicative)(reorder.reorder)
              },
              env,
              { reorder }
            )
          )
      ),
    list: (getType, config) => (env) =>
      pipe(
        getType(env).reorder,
        (reorder) =>
          new ReorderType(
            reorderApplyConfig(config?.conf)(
              {
                reorder: L.foreachF(T.Applicative)(reorder.reorder)
              },
              env,
              { reorder }
            )
          )
      ),
    nonEmptyArray: (getType, config) => (env) =>
      pipe(
        getType(env).reorder,
        (reorder) =>
          new ReorderType(
            reorderApplyConfig(config?.conf)(
              {
                reorder: NA.foreachF(T.Applicative)(reorder.reorder)
              },
              env,
              { reorder }
            )
          )
      ),
    uuid: (config) => (env) =>
      new ReorderType<UUID>(
        reorderApplyConfig(config?.conf)(
          {
            reorder: T.succeed
          },
          env,
          {}
        )
      ),
    either: (e, a, config) => (env) =>
      pipe(e(env).reorder, (left) =>
        pipe(
          a(env).reorder,
          (right) =>
            new ReorderType(
              reorderApplyConfig(config?.conf)(
                {
                  reorder: E.fold(
                    flow(left.reorder, T.map(E.left)),
                    flow(right.reorder, T.map(E.right))
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
        a(env).reorder,
        (reorder) =>
          new ReorderType(
            reorderApplyConfig(config?.conf)(
              {
                reorder: O.fold(
                  () => T.succeed(O.none),
                  flow(reorder.reorder, T.map(O.some))
                )
              },
              env,
              {
                reorder
              }
            )
          )
      )
  })
)
