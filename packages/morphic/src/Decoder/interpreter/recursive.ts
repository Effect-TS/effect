import { pipe } from "@effect-ts/core/Function"

import type { RecursiveURI } from "../../Algebra/Recursive"
import { interpreter } from "../../HKT"
import { memo } from "../../Utils"
import { decoderApplyConfig, DecoderType, DecoderURI } from "../base"

export const decoderRecursiveInterpreter = interpreter<DecoderURI, RecursiveURI>()(
  () => ({
    _F: DecoderURI,
    recursive: (a, config) => {
      const get = memo(() => a(res))
      const res: ReturnType<typeof a> = (env) =>
        new DecoderType(
          pipe(
            () => get()(env).decoder,
            (getDecoder) =>
              decoderApplyConfig(config?.conf)(
                {
                  validate: (u, c) =>
                    getDecoder().validate(u, {
                      ...c,
                      types: config?.name ? [...c.types, config.name] : c.types
                    })
                },
                env,
                {}
              )
          )
        )
      return res
    }
  })
)
