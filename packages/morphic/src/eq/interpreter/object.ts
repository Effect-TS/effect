import { InterfaceA } from "../../config"
import { projectFieldWithEnv, memo } from "../../utils"
import { eqApplyConfig } from "../config"
import { EqType, EqURI } from "../hkt"

import * as E from "@matechs/core/Eq"
import { introduce } from "@matechs/core/Function"
import type { AnyEnv } from "@matechs/morphic-alg/config"
import type { MatechsAlgebraObject1 } from "@matechs/morphic-alg/object"

const asPartial = <T>(x: EqType<T>): EqType<Partial<T>> => x as any

declare module "@matechs/morphic-alg/object" {
  interface InterfaceConfig<Props> {
    [EqURI]: {
      eq: InterfaceA<Props, E.URI>
    }
  }
  interface PartialConfig<Props> {
    [EqURI]: {
      eq: InterfaceA<Props, E.URI>
    }
  }
}

export const eqObjectInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraObject1<EqURI, Env> => ({
    _F: EqURI,
    interface: (props, _name, config) => (env) =>
      new EqType(
        introduce(projectFieldWithEnv(props, env)("eq"))((eq) =>
          eqApplyConfig(config)(E.getStructEq(eq), env, { eq: eq as any })
        )
      ),
    partial: (props, _name, config) => (env) =>
      asPartial(
        new EqType(
          introduce(projectFieldWithEnv(props, env)("eq"))((eq) =>
            eqApplyConfig(config)(E.getStructEq(eq), env, { eq: eq as any })
          )
        )
      )
  })
)
