import * as T from "@effect-ts/core/Sync"

import type { UnknownURI } from "../../Algebra/Unknown"
import { isUnknownRecord } from "../../Guard/interpreter/common"
import { interpreter } from "../../HKT"
import { decoderApplyConfig, DecoderType, DecoderURI } from "../base"
import { fail, makeDecoder } from "../common"

export const decoderUnknownInterpreter = interpreter<DecoderURI, UnknownURI>()(() => ({
  _F: DecoderURI,
  unknown: (cfg) => (env) =>
    new DecoderType(
      decoderApplyConfig(cfg?.conf)(
        makeDecoder(
          (u, c) =>
            isUnknownRecord(u)
              ? T.succeed(u)
              : fail(u, c, `${typeof u} is not a record`),
          "unknown",
          cfg?.name || "unknown"
        ),
        env,
        {}
      )
    )
}))
