import type { AnyEnv } from "@morphic-ts/common/lib/config"

import { projectFieldWithEnv, memo } from "../../utils"
import { eqApplyConfig } from "../config"
import { EqType, EqURI } from "../hkt"

import { getStructEq } from "@matechs/core/Eq"
import type { MatechsAlgebraObject1 } from "@matechs/morphic-alg/object"

const asPartial = <T>(x: EqType<T>): EqType<Partial<T>> => x as any

export const eqObjectInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraObject1<EqURI, Env> => ({
    _F: EqURI,
    interface: (props, _name, config) => (env) =>
      new EqType(
        eqApplyConfig(config)(getStructEq(projectFieldWithEnv(props, env)("eq")), env)
      ),
    partial: (props, _name, config) => (env) =>
      asPartial(
        new EqType(
          eqApplyConfig(config)(getStructEq(projectFieldWithEnv(props, env)("eq")), env)
        )
      )
  })
)
