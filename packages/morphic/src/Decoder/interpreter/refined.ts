import { pipe } from "@effect-ts/core/Function"
import * as T from "@effect-ts/core/Sync"

import type { RefinedURI } from "../../Algebra/Refined"
import { interpreter } from "../../HKT"
import { decoderApplyConfig, DecoderType, DecoderURI } from "../base"
import { fail, makeDecoder } from "../common"

export const decoderRefinedInterpreter = interpreter<DecoderURI, RefinedURI>()(() => ({
  _F: DecoderURI,
  refined: (getDecoder, ref, cfg) => (env) =>
    pipe(
      getDecoder(env).decoder,
      (decoder) =>
        new DecoderType(
          decoderApplyConfig(cfg?.conf)(
            makeDecoder(
              (u, c) =>
                T.chain_(decoder.validate(u, c), (a) =>
                  ref(a) ? T.succeed(a) : fail(a, c, `${typeof u} cannot be refined`)
                ),
              "refined",
              cfg?.name || "Refined"
            ),
            env,
            { decoder }
          )
        )
    ),
  constrained: (getDecoder, ref, cfg) => (env) =>
    pipe(
      getDecoder(env).decoder,
      (decoder) =>
        new DecoderType(
          decoderApplyConfig(cfg?.conf)(
            makeDecoder(
              (u, c) =>
                T.chain_(decoder.validate(u, c), (a) =>
                  ref(a)
                    ? T.succeed(a)
                    : fail(u, c, `${typeof u} cannot be constrained`)
                ),
              "constrained",
              cfg?.name || "Constrained"
            ),
            env,
            { decoder }
          )
        )
    )
}))
