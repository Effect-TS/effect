import type { AnyEnv } from "@morphic-ts/common/lib/config"
import { record } from "fast-check"

import { memo, projectFieldWithEnv } from "../../utils"
import { fcApplyConfig } from "../config"
import { FastCheckType, FastCheckURI } from "../hkt"

import type { MatechsAlgebraObject1 } from "@matechs/morphic-alg/object"

export const fcObjectInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraObject1<FastCheckURI, Env> => ({
    _F: FastCheckURI,
    partial: (props, _name, config) => (env) =>
      new FastCheckType(
        fcApplyConfig(config)(
          record(projectFieldWithEnv(props, env)("arb"), {
            withDeletedKeys: true
          }) as any,
          env
        )
      ),
    interface: (props, _name, config) => (env) =>
      new FastCheckType(
        fcApplyConfig(config)(record(projectFieldWithEnv(props, env)("arb")), env)
      )
  })
)
