import * as A from "@effect-ts/core/Classic/Array"
import { pipe } from "@effect-ts/core/Function"
import * as T from "@effect-ts/core/Sync"

import type { IntersectionURI } from "../../Algebra/Intersection"
import { interpreter } from "../../HKT"
import { decoderApplyConfig, DecoderType, DecoderURI } from "../base"
import { foreachArray, mergePrefer } from "./common"

export const decoderIntersectionInterpreter = interpreter<
  DecoderURI,
  IntersectionURI
>()(() => ({
  _F: DecoderURI,
  intersection: (...types) => (config) => (env) => {
    const decoders = types.map((getDecoder) => getDecoder(env).decoder)

    return new DecoderType(
      decoderApplyConfig(config?.conf)(
        {
          validate: (u, c) =>
            pipe(
              decoders,
              foreachArray((k, d) =>
                d.validate(u, {
                  actual: d,
                  key: c.key,
                  types: config?.name ? [...c.types, config.name] : c.types
                })
              ),
              T.map(A.reduce({} as any, (b, a) => mergePrefer(u, b, a)))
            )
        },
        env,
        {
          decoders: decoders as any
        }
      )
    )
  }
}))
