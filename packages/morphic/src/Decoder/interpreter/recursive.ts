import { pipe } from "@effect-ts/core/Function"

import type { RecursiveURI } from "../../Algebra/Recursive"
import { interpreter } from "../../HKT"
import { memo } from "../../Utils"
import { decoderApplyConfig, DecoderType, DecoderURI } from "../base"
import { makeDecoder } from "../common"

export const decoderRecursiveInterpreter = interpreter<DecoderURI, RecursiveURI>()(
  () => ({
    _F: DecoderURI,
    recursive: (a, cfg) => {
      const get = memo(() => a(res))
      const res: ReturnType<typeof a> = (env) =>
        new DecoderType(
          pipe(
            () => get()(env).decoder,
            (getDecoder) =>
              decoderApplyConfig(cfg?.conf)(
                makeDecoder(
                  (u, c) => getDecoder().validate(u, c),
                  "recursive",
                  cfg?.name || "Recursive"
                ),
                env,
                {}
              )
          )
        )
      return res
    }
  })
)
