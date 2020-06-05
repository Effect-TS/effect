/* eslint-disable @typescript-eslint/no-empty-interface */
import { memo } from "../../utils"
import { showApplyConfig } from "../config"
import { ShowType, ShowURI } from "../hkt"

import { getShow as AgetShow, Array } from "@matechs/core/Array"
import { getShow as EgetShow, Either } from "@matechs/core/Either"
import { introduce } from "@matechs/core/Function"
import { UUID } from "@matechs/core/Model"
import { NonEmptyArray } from "@matechs/core/NonEmptyArray"
import { getShow as OgetShow, Option } from "@matechs/core/Option"
import type { Show } from "@matechs/core/Show"
import { showNumber, showString, showBoolean } from "@matechs/core/Show"
import type { AnyEnv, ConfigsForType } from "@matechs/morphic-alg/config"
import type {
  MatechsAlgebraPrimitive1,
  Keys,
  KeysOfConfig,
  StringLiteralConfig
} from "@matechs/morphic-alg/primitives"

declare module "@matechs/morphic-alg/primitives" {
  interface NonEmptyArrayConfig<L, A> {
    [ShowURI]: {
      show: Show<A>
      showNea: Show<NonEmptyArray<A>>
    }
  }
  interface ArrayConfig<L, A> {
    [ShowURI]: {
      show: Show<A>
      showArray: Show<Array<A>>
    }
  }
  interface NullableConfig<L, A> {
    [ShowURI]: {
      show: Show<A>
      showOption: Show<Option<A>>
    }
  }
  interface StringLiteralConfig<T> {
    [ShowURI]: {
      show: Show<T>
    }
  }
  interface KeysOfConfig<K extends Keys> {
    [ShowURI]: {
      show: Show<keyof K & string>
    }
  }
  interface EitherConfig<LL, LA, RL, RA> {
    [ShowURI]: {
      left: Show<RL>
      right: Show<RA>
      either: Show<Either<RL, RA>>
    }
  }
  interface OptionConfig<L, A> {
    [ShowURI]: {
      show: Show<A>
      showOption: Show<Option<A>>
    }
  }
  interface BooleanConfig {
    [ShowURI]: {
      show: Show<boolean>
    }
  }
  interface NumberConfig {
    [ShowURI]: {
      show: Show<number>
    }
  }
  interface BigIntConfig {
    [ShowURI]: {
      show: Show<bigint>
    }
  }
  interface StringConfig {
    [ShowURI]: {
      show: Show<string>
    }
  }
  interface DateConfig {
    [ShowURI]: {
      show: Show<Date>
    }
  }
  interface UUIDConfig {
    [ShowURI]: {
      show: Show<UUID>
    }
  }
}

export const showPrimitiveInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraPrimitive1<ShowURI, Env> => ({
    _F: ShowURI,
    date: (config) => (env) =>
      new ShowType(
        introduce({ show: (date: Date) => date.toISOString() })((show) =>
          showApplyConfig(config)(show, env, {
            show
          })
        )
      ),
    boolean: (config) => (env) =>
      new ShowType(
        showApplyConfig(config)(showBoolean, env, {
          show: showBoolean
        })
      ),
    string: (config) => (env) =>
      new ShowType(
        showApplyConfig(config)(showString, env, {
          show: showString
        })
      ),
    number: (config) => (env) =>
      new ShowType(
        showApplyConfig(config)(showNumber, env, {
          show: showNumber
        })
      ),
    bigint: (config) => (env) =>
      new ShowType(
        introduce<Show<bigint>>({ show: (a) => JSON.stringify(a) })((show) =>
          showApplyConfig(config)(show, env, {
            show
          })
        )
      ),
    stringLiteral: <T extends string>(
      _: T,
      config?: ConfigsForType<Env, string, T, StringLiteralConfig<T>>
    ) => (env) =>
      new ShowType(
        introduce<Show<T>>({
          show: (t) => showString.show(t)
        })((show) =>
          showApplyConfig(config)(show, env, {
            show
          })
        )
      ),
    keysOf: <K extends Keys>(
      _keys: K,
      config?: ConfigsForType<Env, string, keyof K & string, KeysOfConfig<K>>
    ) => (env) =>
      new ShowType(
        introduce({ show: (t: keyof K & string) => showString.show(t) })((show) =>
          showApplyConfig(config)(show, env, {
            show
          })
        )
      ),
    nullable: (getShow, config) => (env) =>
      new ShowType(
        introduce(getShow(env).show)((show) =>
          introduce(OgetShow(show))((showOption) =>
            showApplyConfig(config)(showOption, env, {
              show,
              showOption
            })
          )
        )
      ),
    array: (getShow, config) => (env) =>
      new ShowType(
        introduce(getShow(env).show)((show) =>
          introduce(AgetShow(show))((showArray) =>
            showApplyConfig(config)(showArray, env, {
              show,
              showArray
            })
          )
        )
      ),
    nonEmptyArray: (getShow, config) => (env) =>
      new ShowType(
        introduce(getShow(env).show)((show) =>
          introduce(AgetShow(getShow(env).show))((showNea) =>
            showApplyConfig(config)(showNea, env, {
              show,
              showNea
            })
          )
        )
      ),
    uuid: (config) => (env) =>
      introduce<Show<UUID>>(showString)(
        (show) =>
          new ShowType(
            showApplyConfig(config)(show, env, {
              show
            })
          )
      ),
    either: (e, a, config) => (env) =>
      new ShowType(
        introduce(e(env).show)((left) =>
          introduce(a(env).show)((right) =>
            introduce(EgetShow(left, right))((either) =>
              showApplyConfig(config)(either, env, {
                left,
                right,
                either
              })
            )
          )
        )
      ),
    option: (a, config) => (env) =>
      new ShowType(
        introduce(a(env).show)((show) =>
          introduce(OgetShow(show))((showOption) =>
            showApplyConfig(config)(showOption, env, {
              show,
              showOption
            })
          )
        )
      )
  })
)
