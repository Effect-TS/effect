import type { AnyEnv } from "@morphic-ts/common/lib/config"

import { memo } from "../../utils"
import { showApplyConfig } from "../config"
import { ShowType, ShowURI } from "../hkt"

import { getShow as AgetShow } from "@matechs/core/Array"
import { getShow as EgetShow } from "@matechs/core/Either"
import { getShow as OgetShow } from "@matechs/core/Option"
import type { Show } from "@matechs/core/Show"
import { showNumber, showString, showBoolean } from "@matechs/core/Show"
import type { MatechsAlgebraPrimitive1 } from "@matechs/morphic-alg/primitives"

export const showPrimitiveInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraPrimitive1<ShowURI, Env> => ({
    _F: ShowURI,
    date: (config) => (env) =>
      new ShowType(
        showApplyConfig(config)({ show: (date: Date) => date.toISOString() }, env)
      ),
    boolean: (config) => (env) =>
      new ShowType(showApplyConfig(config)(showBoolean, env)),
    string: (config) => (env) => new ShowType(showApplyConfig(config)(showString, env)),
    number: (config) => (env) => new ShowType(showApplyConfig(config)(showNumber, env)),
    bigint: (config) => (env) =>
      new ShowType(showApplyConfig(config)({ show: (a) => JSON.stringify(a) }, env)),
    stringLiteral: (_, config) => (env) =>
      new ShowType(showApplyConfig(config)(showString, env)),
    keysOf: (_keys, config) => (env) =>
      new ShowType(showApplyConfig(config)(showString as Show<any>, env)),
    nullable: (getShow, config) => (env) =>
      new ShowType(showApplyConfig(config)(OgetShow(getShow(env).show), env)),
    array: (getShow, config) => (env) =>
      new ShowType(showApplyConfig(config)(AgetShow(getShow(env).show), env)),
    nonEmptyArray: (getShow, config) => (env) =>
      new ShowType(showApplyConfig(config)(AgetShow(getShow(env).show), env)),
    uuid: (config) => (env) => new ShowType(showApplyConfig(config)(showString, env)),
    either: (e, a, config) => (env) =>
      new ShowType(showApplyConfig(config)(EgetShow(e(env).show, a(env).show), env)),
    option: (a, config) => (env) =>
      new ShowType(showApplyConfig(config)(OgetShow(a(env).show), env))
  })
)
