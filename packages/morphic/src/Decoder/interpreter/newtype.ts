import * as O from "@effect-ts/core/Classic/Option"
import { pipe } from "@effect-ts/core/Function"
import * as T from "@effect-ts/core/Sync"

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
                validate: (u, c) =>
                  pipe(
                    decoder.validate(u, {
                      ...c,
                      actual: u,
                      types: cfg?.name ? [...c.types, cfg.name] : c.types
                    }),
                    T.map(iso.get)
                  )
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
                validate: (u, c) =>
                  pipe(
                    decoder.validate(u, {
                      ...c,
                      actual: u,
                      types: cfg?.name ? [...c.types, cfg.name] : c.types
                    }),
                    T.map(prism.getOption),
                    T.chain(
                      O.fold(
                        () =>
                          fail([
                            {
                              id: cfg?.id,
                              name: cfg?.name,
                              message: `newtype doesn't satisfy prism conditions`,
                              context: {
                                ...c,
                                actual: u,
                                types: cfg?.name ? [...c.types, cfg.name] : c.types
                              }
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
