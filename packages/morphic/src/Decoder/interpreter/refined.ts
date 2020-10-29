import { pipe } from "@effect-ts/core/Function"
import * as T from "@effect-ts/core/Sync"

import type { AnyEnv } from "../../Algebra/config"
import type { AlgebraRefined1 } from "../../Algebra/refined"
import { memo } from "../../Internal/Utils"
import { fail } from "../common"
import { decoderApplyConfig } from "../config"
import { DecoderType, DecoderURI } from "../hkt"

export const decoderRefinedInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraRefined1<DecoderURI, Env> => ({
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
  })
)
