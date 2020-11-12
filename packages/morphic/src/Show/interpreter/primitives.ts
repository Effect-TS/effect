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
import { getShow as LgetShow } from "@effect-ts/core/Persistent/List"

import type { LiteralT, PrimitivesURI, UUID } from "../../Algebra/Primitives"
import { interpreter } from "../../HKT"
import { showApplyConfig, ShowType, ShowURI } from "../base"

export const named = (name?: string | undefined) => <A>(s: Show<A>): Show<A> => ({
  show: (a) => (name ? `<${name}>(${s.show(a)})` : s.show(a))
})

export const showPrimitiveInterpreter = interpreter<ShowURI, PrimitivesURI>()(() => ({
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
  stringLiteral: (_, config) => (env) =>
    new ShowType(
      showApplyConfig(config?.conf)(
        named(config?.name)(<Show<typeof _>>{
          show: (t) => showString.show(t)
        }),
        env,
        {}
      )
    ),
  numberLiteral: (_, config) => (env) =>
    new ShowType(
      showApplyConfig(config?.conf)(
        named(config?.name)(<Show<typeof _>>{
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
  keysOf: (_keys, config) => (env) =>
    new ShowType(
      showApplyConfig(config?.conf)(
        named(config?.name)({
          show: (t: keyof typeof _keys & string) => showString.show(t)
        }),
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
  list: (getShow, config) => (env) =>
    new ShowType(
      pipe(getShow(env).show, (show) =>
        pipe(LgetShow(show), (showList) =>
          showApplyConfig(config?.conf)(named(config?.name)(showList), env, {
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
}))
