import * as T from "@effect-ts/core/Sync"

import type { AnyEnv } from "../../Algebra/config"
import type { AlgebraUnknown1 } from "../../Algebra/unknown"
import { isUnknownRecord } from "../../Guard/interpreter/common"
import { memo } from "../../Internal/Utils"
import { fail } from "../common"
import { decoderApplyConfig } from "../config"
import { DecoderType, DecoderURI } from "../hkt"

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
                      id: cfg?.id,
                      name: cfg?.name,
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
