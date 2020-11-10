import * as A from "@effect-ts/core/Classic/Array"
import { pipe } from "@effect-ts/core/Function"
import * as T from "@effect-ts/core/Sync"

import type { IntersectionURI } from "../../Algebra/Intersection"
import { interpreter } from "../../HKT"
import { decoderApplyConfig, DecoderType, DecoderURI } from "../base"
import { makeDecoder } from "../common"
import { foreachArray, mergePrefer } from "./common"

export const decoderIntersectionInterpreter = interpreter<
  DecoderURI,
  IntersectionURI
>()(() => ({
  _F: DecoderURI,
  intersection: (...types) => (cfg) => (env) => {
    const decoders = types.map((getDecoder) => getDecoder(env).decoder)

    return new DecoderType(
      decoderApplyConfig(cfg?.conf)(
        makeDecoder(
          (u, c) =>
            pipe(
              decoders,
              foreachArray((_, d) => d.validate(u, c)),
              T.map(A.reduce({} as any, (b, a) => mergePrefer(u, b, a)))
            ),
          "intersection",
          cfg?.name || "Intersection"
        ),
        env,
        {
          decoders: decoders as any
        }
      )
    )
  }
}))
