import * as S from "@effect-ts/core/Classic/Set"
import { pipe } from "@effect-ts/core/Function"
import * as T from "@effect-ts/core/Sync"

import type { SetURI } from "../../Algebra/Set"
import { interpreter } from "../../HKT"
import { decoderApplyConfig, DecoderType, DecoderURI } from "../base"
import { fail } from "../common"
import { foreachArray } from "./common"

export const decoderSetInterpreter = interpreter<DecoderURI, SetURI>()(() => ({
  _F: DecoderURI,
  set: (a, _, cfg) => (env) =>
    pipe(
      a(env).decoder,
      (decoder) =>
        new DecoderType(
          decoderApplyConfig(cfg?.conf)(
            {
              validate: (u, c) =>
                Array.isArray(u)
                  ? pipe(
                      u,
                      foreachArray((k, a) =>
                        decoder.validate(u, {
                          key: `${c.key}[${k}]`,
                          actual: u,
                          types: cfg?.name ? [...c.types, cfg.name] : c.types
                        })
                      ),
                      T.map(S.fromArray(_))
                    )
                  : fail([
                      {
                        id: cfg?.id,
                        name: cfg?.name,
                        message: `${typeof u} is not a Set`,
                        context: {
                          ...c,
                          actual: u,
                          types: cfg?.name ? [...c.types, cfg.name] : c.types
                        }
                      }
                    ])
            },
            env,
            { decoder }
          )
        )
    )
}))
