import * as A from "@effect-ts/core/Array"
import { pipe } from "@effect-ts/core/Function"
import * as T from "@effect-ts/core/Sync"

import type { IntersectionURI } from "../../Algebra/Intersection"
import { mergePrefer } from "../../Decoder/interpreter/common"
import { interpreter } from "../../HKT"
import { encoderApplyConfig, EncoderType, EncoderURI } from "../base"

export const encoderIntersectionInterpreter = interpreter<
  EncoderURI,
  IntersectionURI
>()(() => ({
  _F: EncoderURI,
  intersection: (...types) => (config) => (env) => {
    const encoders = types.map((getEncoder) => getEncoder(env))
    return new EncoderType(
      encoderApplyConfig(config?.conf)(
        {
          encode: (u) =>
            pipe(
              encoders,
              A.foreachF(T.Applicative)((d) => d.encoder.encode(u)),
              T.map(A.reduce(({} as unknown) as any, (b, a) => mergePrefer(u, b, a)))
            )
        },
        env,
        {
          encoders: A.map_(encoders, (d) => d.encoder) as any
        }
      )
    ).setChilds(A.reduce_(encoders, {}, (b, d) => ({ ...b, ...d.getChilds() })))
  }
}))
