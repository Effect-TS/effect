import { pipe } from "@effect-ts/core/Function"
import * as T from "@effect-ts/core/Sync"

import type { RefinedURI } from "../../Algebra/Refined"
import { interpreter } from "../../HKT"
import { decoderApplyConfig, DecoderType, DecoderURI } from "../base"
import { fail } from "../common"

export const decoderRefinedInterpreter = interpreter<DecoderURI, RefinedURI>()(() => ({
  _F: DecoderURI,
  refined: (getDecoder, ref, cfg) => (env) =>
    pipe(
      getDecoder(env).decoder,
      (decoder) =>
        new DecoderType(
          decoderApplyConfig(cfg?.conf)(
            {
              validate: (u, c) =>
                T.chain_(decoder.validate(u, c), (a) =>
                  ref(a)
                    ? T.succeed(a)
                    : fail([
                        {
                          id: cfg?.id,
                          name: cfg?.name,
                          message: `${typeof u} cannot be refined`,
                          context: {
                            ...c,
                            actual: u,
                            types: cfg?.name ? [...c.types, cfg.name] : c.types
                          }
                        }
                      ])
                )
            },
            env,
            { decoder }
          )
        )
    ),
  constrained: (getDecoder, ref, config) => (env) =>
    pipe(
      getDecoder(env).decoder,
      (decoder) =>
        new DecoderType(
          decoderApplyConfig(config?.conf)(
            {
              validate: (u, c) =>
                T.chain_(decoder.validate(u, c), (a) =>
                  ref(a)
                    ? T.succeed(a)
                    : fail([
                        {
                          message: `${typeof u} cannot be constrained`,
                          context: {
                            ...c,
                            actual: u,
                            types: config?.name ? [...c.types, config.name] : c.types
                          }
                        }
                      ])
                )
            },
            env,
            { decoder }
          )
        )
    )
}))
