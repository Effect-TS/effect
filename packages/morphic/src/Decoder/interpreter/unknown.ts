import * as T from "@effect-ts/core/Sync"

import type { UnknownURI } from "../../Algebra/Unknown"
import { interpreter } from "../../HKT"
import { decoderApplyConfig, DecoderType, DecoderURI } from "../base"
import { makeDecoder } from "../common"

export const decoderUnknownInterpreter = interpreter<DecoderURI, UnknownURI>()(() => ({
  _F: DecoderURI,
  unknown: (cfg) => (env) =>
    new DecoderType(
      decoderApplyConfig(cfg?.conf)(
        makeDecoder(T.succeed, "unknown", cfg?.name || "unknown"),
        env,
        {}
      )
    )
}))
