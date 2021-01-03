import * as S from "@effect-ts/core/Sync"

import type { UnionURI } from "../../Algebra/Union"
import { interpreter } from "../../HKT"
import { decoderApplyConfig, DecoderType, DecoderURI } from "../base"
import type { Decoder, ValidationError } from "../common"
import { appendContext, failures, makeDecoder } from "../common"

export const decoderUnionInterpreter = interpreter<DecoderURI, UnionURI>()(() => ({
  _F: DecoderURI,
  union: (...types) => (_, cfg) => (env) => {
    const decoders = types.map((a) => a(env))

    return new DecoderType(
      decoderApplyConfig(cfg?.conf)(
        makeDecoder(
          (u, c) =>
            S.gen(function* (_) {
              const errors = [] as ValidationError[]
              for (const d in decoders) {
                const res = yield* _(
                  S.either(
                    (decoders[d].decoder as Decoder<any>).validate(
                      u,
                      appendContext(c, "", decoders[d].decoder, u)
                    )
                  )
                )
                if (res._tag === "Right") {
                  return res.right
                } else {
                  errors.push(...res.left)
                }
              }

              return yield* _(failures(errors))
            }),
          "union",
          cfg?.name || "Union"
        ),
        env,
        {
          decoders: decoders as any
        }
      )
    )
  }
}))
