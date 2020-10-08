import { pipe } from "@effect-ts/core/Function"

import type { AnyEnv } from "../../Algebra/config"
import type { AlgebraRecord1 } from "../../Algebra/record"
import { isUnknownRecord } from "../../Guard/interpreter/common"
import { memo } from "../../Internal/Utils"
import { decoderApplyConfig } from "../config"
import type { DecodingError, fail } from "../DecodingError"
import { DecoderType, DecoderURI } from "../hkt"
import { foreachRecord } from "./common"

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
                decode: (u) =>
                  isUnknownRecord(u)
                    ? foreachRecord(decoder.decode)(u)
                    : fail([
                        <DecodingError>{
                          id: cfg?.id,
                          name: cfg?.name,
                          actual: u,
                          message: `${typeof u} is not a record`
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
