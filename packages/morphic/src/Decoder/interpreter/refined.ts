import * as T from "@effect-ts/core/Classic/Sync"
import { pipe } from "@effect-ts/core/Function"

import type { AnyEnv } from "../../Algebra/config"
import type { AlgebraRefined1 } from "../../Algebra/refined"
import { memo } from "../../Internal/Utils"
import { decoderApplyConfig } from "../config"
import { DecoderType, DecoderURI, fail } from "../hkt"

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
                decode: (u) =>
                  T.chain_(decoder.decode(u), (a) =>
                    ref(a)
                      ? T.succeed(a)
                      : fail([
                          {
                            id: cfg?.id,
                            name: cfg?.name,
                            actual: u,
                            message: `${typeof u} cannot be refined`
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
                decode: (u) =>
                  T.chain_(decoder.decode(u), (a) =>
                    ref(a)
                      ? T.succeed(a)
                      : fail([
                          {
                            actual: u,
                            message: `${typeof u} cannot be constrained`
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
