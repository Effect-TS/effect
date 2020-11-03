import * as T from "@effect-ts/core/Sync"

import type { UnknownURI } from "../../Algebra/Unknown"
import { isUnknownRecord } from "../../Guard/interpreter/common"
import { interpreter } from "../../HKT"
import { decoderApplyConfig, DecoderType, DecoderURI } from "../base"
import { fail } from "../common"

export const decoderUnknownInterpreter = interpreter<DecoderURI, UnknownURI>()(() => ({
  _F: DecoderURI,
  unknown: (cfg) => (env) =>
    new DecoderType(
      decoderApplyConfig(cfg?.conf)(
        {
          validate: (u, c) =>
            isUnknownRecord(u)
              ? T.succeed(u)
              : fail([
                  {
                    id: cfg?.id,
                    name: cfg?.name,
                    message: `${typeof u} is not a record`,
                    context: {
                      ...c,
                      actual: u,
                      types: cfg?.name ? [...c.types, cfg.name] : c.types
                    }
                  }
                ])
        },
        env,
        {}
      )
    )
}))
