/* eslint-disable @typescript-eslint/no-empty-interface */
import { getShow as AgetShow } from "@effect-ts/core/Classic/Array"
import { getShow as EgetShow } from "@effect-ts/core/Classic/Either"
import { getShow as OgetShow } from "@effect-ts/core/Classic/Option"
import type { Show } from "@effect-ts/core/Classic/Show"
import {
  boolean as showBoolean,
  number as showNumber,
  string as showString
} from "@effect-ts/core/Classic/Show"
import { absurd, pipe } from "@effect-ts/core/Function"

import type { AnyEnv, ConfigsForType } from "../../Algebra/config"
import type {
  AlgebraPrimitive1,
  Keys,
  KeysOfConfig,
  LiteralT,
  NumberLiteralConfig,
  StringLiteralConfig,
  UUID
} from "../../Algebra/primitives"
import { memo } from "../../Internal/Utils"
import { showApplyConfig } from "../config"
import { ShowType, ShowURI } from "../hkt"

export const named = (name?: string | undefined) => <A>(s: Show<A>): Show<A> => ({
  show: (a) => (name ? `<${name}>(${s.show(a)})` : s.show(a))
})

export const showPrimitiveInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraPrimitive1<ShowURI, Env> => ({
    _F: ShowURI,
    function: (_, __, config) => (env) =>
      new ShowType(
        showApplyConfig(config?.conf)(
          {
            show: (_) => (config?.name ? `function(${config?.name})` : `function`)
          },
          env,
          {}
        )
      ),
    unknownE: (k, config) => (env) =>
      new ShowType(showApplyConfig(config?.conf)(k(env).show, env, {})),
    date: (config) => (env) =>
      new ShowType(
        pipe({ show: (date: Date) => date.toISOString() }, (show) =>
          showApplyConfig(config?.conf)(named(config?.name)(show), env, {})
        )
      ),
    boolean: (config) => (env) =>
      new ShowType(
        showApplyConfig(config?.conf)(named(config?.name)(showBoolean), env, {})
      ),
    string: (config) => (env) =>
      new ShowType(
        showApplyConfig(config?.conf)(named(config?.name)(showString), env, {})
      ),
    number: (config) => (env) =>
      new ShowType(
        showApplyConfig(config?.conf)(named(config?.name)(showNumber), env, {})
      ),
    bigint: (config) => (env) =>
      new ShowType(
        showApplyConfig(config?.conf)(
          named(config?.name)(<Show<bigint>>{ show: (a) => JSON.stringify(a) }),
          env,
          {}
        )
      ),
    stringLiteral: <T extends string>(
      _: T,
      config?: {
        name?: string
        conf?: ConfigsForType<Env, string, T, StringLiteralConfig<T>>
      }
    ) => (env) =>
      new ShowType(
        showApplyConfig(config?.conf)(
          named(config?.name)(<Show<T>>{
            show: (t) => showString.show(t)
          }),
          env,
          {}
        )
      ),
    numberLiteral: <T extends number>(
      _: T,
      config?: {
        name?: string
        conf?: ConfigsForType<Env, number, T, NumberLiteralConfig<T>>
      }
    ) => (env) =>
      new ShowType(
        showApplyConfig(config?.conf)(
          named(config?.name)(<Show<T>>{
            show: (t) => showNumber.show(t)
          }),
          env,
          {}
        )
      ),
    oneOfLiterals: (_, config) => (env) =>
      new ShowType(
        showApplyConfig(config?.conf)(
          named(config?.name)(<Show<LiteralT>>{
            show: (t) =>
              typeof t === "string"
                ? showString.show(t)
                : typeof t === "number"
                ? showNumber.show(t)
                : absurd(t)
          }),
          env,
          {}
        )
      ),
    keysOf: <K extends Keys>(
      _keys: K,
      config?: {
        name?: string
        conf?: ConfigsForType<Env, string, keyof K & string, KeysOfConfig<K>>
      }
    ) => (env) =>
      new ShowType(
        showApplyConfig(config?.conf)(
          named(config?.name)({ show: (t: keyof K & string) => showString.show(t) }),
          env,
          {}
        )
      ),
    nullable: (getShow, config) => (env) =>
      new ShowType(
        pipe(getShow(env).show, (show) =>
          pipe(OgetShow(show), (showOption) =>
            showApplyConfig(config?.conf)(named(config?.name)(showOption), env, {
              show
            })
          )
        )
      ),
    mutable: (getShow, config) => (env) =>
      new ShowType(
        pipe(getShow(env).show, (show) =>
          showApplyConfig(config?.conf)(named(config?.name)(show), env, {
            show
          })
        )
      ),
    optional: (getShow, config) => (env) =>
      new ShowType(
        pipe(getShow(env).show, (show) =>
          showApplyConfig(config?.conf)(
            named(config?.name)({
              show: (x) => (typeof x === "undefined" ? `undefined` : show.show(x))
            }),
            env,
            {
              show
            }
          )
        )
      ),
    array: (getShow, config) => (env) =>
      new ShowType(
        pipe(getShow(env).show, (show) =>
          pipe(AgetShow(show), (showArray) =>
            showApplyConfig(config?.conf)(named(config?.name)(showArray), env, {
              show
            })
          )
        )
      ),
    nonEmptyArray: (getShow, config) => (env) =>
      new ShowType(
        pipe(getShow(env).show, (show) =>
          pipe(AgetShow(getShow(env).show), (showNea) =>
            showApplyConfig(config?.conf)(named(config?.name)(showNea), env, {
              show
            })
          )
        )
      ),
    uuid: (config) => (env) =>
      new ShowType(
        showApplyConfig(config?.conf)(
          named(config?.name)(<Show<UUID>>showString),
          env,
          {}
        )
      ),
    either: (e, a, config) => (env) =>
      new ShowType(
        pipe(e(env).show, (left) =>
          pipe(a(env).show, (right) =>
            pipe(EgetShow(left, right), (either) =>
              showApplyConfig(config?.conf)(named(config?.name)(either), env, {
                left,
                right
              })
            )
          )
        )
      ),
    option: (a, config) => (env) =>
      new ShowType(
        pipe(a(env).show, (show) =>
          pipe(OgetShow(show), (showOption) =>
            showApplyConfig(config?.conf)(named(config?.name)(showOption), env, {
              show
            })
          )
        )
      )
  })
)
