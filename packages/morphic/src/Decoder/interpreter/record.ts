import { pipe } from "@effect-ts/core/Function"

import type { AnyEnv } from "../../Algebra/config"
import type { AlgebraRecord1 } from "../../Algebra/record"
import { isUnknownRecord } from "../../Guard/interpreter/common"
import { memo } from "../../Internal/Utils"
import { fail } from "../common"
import { decoderApplyConfig } from "../config"
import { DecoderType, DecoderURI } from "../hkt"
import { foreachRecordWithIndex } from "./common"

export const decoderRecordInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraRecord1<DecoderURI, Env> => ({
    _F: DecoderURI,
    record: (getCodomain, cfg) => (env) =>
      pipe(
        getCodomain(env).decoder,
        (decoder) =>
          new DecoderType(
            decoderApplyConfig(cfg?.conf)(
              {
                validate: (u, c) =>
                  isUnknownRecord(u)
                    ? foreachRecordWithIndex((k, a) =>
                        decoder.validate(a, {
                          key: `${c.key}.${k}`,
                          actual: u,
                          types: cfg?.name ? [...c.types, cfg.name] : c.types
                        })
                      )(u)
                    : fail([
                        {
                          id: cfg?.id,
                          name: cfg?.name,
                          message: `${typeof u} is not a record`,
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
  })
)
