/* eslint-disable @typescript-eslint/no-empty-interface */
import { memo } from "../../utils"
import { showApplyConfig } from "../config"
import { ShowType, ShowURI } from "../hkt"

import { getShow as AgetShow } from "@matechs/core/Array"
import { getShow as EgetShow } from "@matechs/core/Either"
import { absurd, introduce } from "@matechs/core/Function"
import { getShow as OgetShow } from "@matechs/core/Option"
import { showBoolean, showNumber, showString } from "@matechs/core/Show"
import type { Show } from "@matechs/core/Show"
import type { AnyEnv, ConfigsForType } from "@matechs/morphic-alg/config"
import type {
  Keys,
  KeysOfConfig,
  Literal,
  LiteralT,
  MatechsAlgebraPrimitive1,
  NumberLiteralConfig,
  StringLiteralConfig,
  UUID
} from "@matechs/morphic-alg/primitives"

export const named = (name?: string | undefined) => <A>(s: Show<A>): Show<A> => ({
  show: (a) => (name ? `<${name}>(${s.show(a)})` : s.show(a))
})

export const showPrimitiveInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraPrimitive1<ShowURI, Env> => ({
    _F: ShowURI,
    date: (config) => (env) =>
      new ShowType(
        introduce({ show: (date: Date) => date.toISOString() })((show) =>
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
        introduce<Show<bigint>>({ show: (a) => JSON.stringify(a) })((show) =>
          showApplyConfig(config?.conf)(named(config?.name)(show), env, {})
        )
      ),
    stringLiteral: <T extends string>(
      _: T,
      config?: {
        name?: string
        conf?: ConfigsForType<Env, string, Literal<T>, StringLiteralConfig<Literal<T>>>
      }
    ) => (env) =>
      new ShowType(
        introduce<Show<Literal<T>>>({
          show: (t) => showString.show(t)
        })((show) => showApplyConfig(config?.conf)(named(config?.name)(show), env, {}))
      ),
    numberLiteral: <T extends number>(
      _: T,
      config?: {
        name?: string
        conf?: ConfigsForType<Env, number, Literal<T>, NumberLiteralConfig<Literal<T>>>
      }
    ) => (env) =>
      new ShowType(
        introduce<Show<Literal<T>>>({
          show: (t) => showNumber.show(t)
        })((show) => showApplyConfig(config?.conf)(named(config?.name)(show), env, {}))
      ),
    oneOfLiterals: (_, config) => (env) =>
      new ShowType(
        introduce<Show<LiteralT>>({
          show: (t: LiteralT) =>
            typeof t === "string"
              ? showString.show(t)
              : typeof t === "number"
              ? showNumber.show(t)
              : absurd(t)
        })((show) => showApplyConfig(config?.conf)(named(config?.name)(show), env, {}))
      ),
    keysOf: <K extends Keys>(
      _keys: K,
      config?: {
        name?: string
        conf?: ConfigsForType<Env, string, keyof K & string, KeysOfConfig<K>>
      }
    ) => (env) =>
      new ShowType(
        introduce({ show: (t: keyof K & string) => showString.show(t) })((show) =>
          showApplyConfig(config?.conf)(named(config?.name)(show), env, {})
        )
      ),
    nullable: (getShow, config) => (env) =>
      new ShowType(
        introduce(getShow(env).show)((show) =>
          introduce(OgetShow(show))((showOption) =>
            showApplyConfig(config?.conf)(named(config?.name)(showOption), env, {
              show
            })
          )
        )
      ),
    mutable: (getShow, config) => (env) =>
      new ShowType(
        introduce(getShow(env).show)((show) =>
          showApplyConfig(config?.conf)(named(config?.name)(show), env, {
            show
          })
        )
      ),
    optional: (getShow, config) => (env) =>
      new ShowType(
        introduce(getShow(env).show)((show) =>
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
        introduce(getShow(env).show)((show) =>
          introduce(AgetShow(show))((showArray) =>
            showApplyConfig(config?.conf)(named(config?.name)(showArray), env, {
              show
            })
          )
        )
      ),
    nonEmptyArray: (getShow, config) => (env) =>
      new ShowType(
        introduce(getShow(env).show)((show) =>
          introduce(AgetShow(getShow(env).show))((showNea) =>
            showApplyConfig(config?.conf)(named(config?.name)(showNea), env, {
              show
            })
          )
        )
      ),
    uuid: (config) => (env) =>
      introduce<Show<UUID>>(showString)(
        (show) =>
          new ShowType(
            showApplyConfig(config?.conf)(named(config?.name)(show), env, {})
          )
      ),
    either: (e, a, config) => (env) =>
      new ShowType(
        introduce(e(env).show)((left) =>
          introduce(a(env).show)((right) =>
            introduce(EgetShow(left, right))((either) =>
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
        introduce(a(env).show)((show) =>
          introduce(OgetShow(show))((showOption) =>
            showApplyConfig(config?.conf)(named(config?.name)(showOption), env, {
              show
            })
          )
        )
      )
  })
)
