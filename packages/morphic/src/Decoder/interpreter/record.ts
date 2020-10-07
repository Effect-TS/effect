import * as R from "@effect-ts/core/Classic/Record"
import { pipe } from "@effect-ts/core/Function"

import type { AnyEnv } from "../../Algebra/config"
import type { AlgebraRecord1 } from "../../Algebra/record"
import { isUnknownRecord } from "../../Guard/interpreter/common"
import { memo } from "../../Internal/Utils"
import { decoderApplyConfig } from "../config"
import type { DecodingError } from "../hkt"
import { DecoderType, DecoderURI, fail } from "../hkt"
import { Validation } from "./common"

export const decoderRecordInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraRecord1<DecoderURI, Env> => ({
    _F: DecoderURI,
    record: (getCodomain, config) => (env) =>
      pipe(
        getCodomain(env).decoder,
        (decoder) =>
          new DecoderType(
            decoderApplyConfig(config?.conf)(
              {
                decode: (u) =>
                  isUnknownRecord(u)
                    ? R.foreachF(Validation)(decoder.decode)(u)
                    : fail([
                        <DecodingError>{
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
