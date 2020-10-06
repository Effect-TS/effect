import * as T from "@effect-ts/core/Classic/Sync"

import type { AnyEnv } from "../../Algebra/config"
import type { AlgebraUnknown1 } from "../../Algebra/unknown"
import { isUnknownRecord } from "../../Guard/interpreter/common"
import { memo } from "../../Internal/Utils"
import { decoderApplyConfig } from "../config"
import { DecoderType, DecoderURI, fail } from "../hkt"

export const decoderUnknownInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraUnknown1<DecoderURI, Env> => ({
    _F: DecoderURI,
    unknown: (cfg) => (env) =>
      new DecoderType(
        decoderApplyConfig(cfg?.conf)(
          {
            decode: (u) =>
              isUnknownRecord(u)
                ? T.succeed(u)
                : fail([
                    {
                      actual: u,
                      message: `${typeof u} is not a record`
                    }
                  ])
          },
          env,
          {}
        )
      )
  })
)
