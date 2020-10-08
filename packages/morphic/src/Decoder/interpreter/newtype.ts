import * as O from "@effect-ts/core/Classic/Option"
import * as T from "@effect-ts/core/Classic/Sync"
import { flow, pipe } from "@effect-ts/core/Function"

import type { AnyEnv } from "../../Algebra/config"
import type { AlgebraNewtype1 } from "../../Algebra/newtype"
import { memo } from "../../Internal/Utils"
import { fail } from "../common"
import { decoderApplyConfig } from "../config"
import { DecoderType, DecoderURI } from "../hkt"

export const decoderNewtypeInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraNewtype1<DecoderURI, Env> => ({
    _F: DecoderURI,
    newtypeIso: (iso, getDecoder, cfg) => (env) =>
      pipe(
        getDecoder(env).decoder,
        (decoder) =>
          new DecoderType(
            decoderApplyConfig(cfg?.conf)(
              {
                decode: flow(decoder.decode, T.map(iso.get))
              },
              env,
              { decoder }
            )
          )
      ),
    newtypePrism: (prism, getDecoder, cfg) => (env) =>
      pipe(
        getDecoder(env).decoder,
        (decoder) =>
          new DecoderType(
            decoderApplyConfig(cfg?.conf)(
              {
                decode: (u) =>
                  pipe(
                    u,
                    decoder.decode,
                    T.map(prism.getOption),
                    T.chain(
                      O.fold(
                        () =>
                          fail([
                            {
                              id: cfg?.id,
                              name: cfg?.name,
                              actual: u,
                              message: `newtype doesn't satisfy prism conditions`
                            }
                          ]),
                        T.succeed
                      )
                    )
                  )
              },
              env,
              { decoder }
            )
          )
      )
  })
)
