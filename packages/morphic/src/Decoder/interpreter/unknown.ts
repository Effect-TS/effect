import * as T from "@effect-ts/core/Classic/Sync"

import type { AnyEnv } from "../../Algebra/config"
import type { AlgebraUnknown1 } from "../../Algebra/unknown"
import { isUnknownRecord } from "../../Guard/interpreter/common"
import { memo } from "../../Internal/Utils"
import { decoderApplyConfig } from "../config"
import type { DecodingError } from "../hkt"
import { DecoderType, DecoderURI } from "../hkt"

export function decodeUnknown(
  u: unknown
): T.Sync<unknown, DecodingError[], { [key: string]: unknown }> {
  return isUnknownRecord(u)
    ? T.succeed(u)
    : T.fail([
        <DecodingError>{
          actual: u,
          message: `${typeof u} is not a record`
        }
      ])
}

export const decoderUnknownInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraUnknown1<DecoderURI, Env> => ({
    _F: DecoderURI,
    unknown: (cfg) => (env) =>
      new DecoderType(
        decoderApplyConfig(cfg?.conf)(
          {
            decode: decodeUnknown
          },
          env,
          {}
        )
      )
  })
)
