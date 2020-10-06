import * as T from "@effect-ts/core/Classic/Sync"

import type { AnyEnv } from "../../Algebra/config"
import type { AlgebraTaggedUnion1 } from "../../Algebra/tagged-union"
import { isUnknownRecord } from "../../Guard/interpreter/common"
import { mapRecord, memo } from "../../Internal/Utils"
import { decoderApplyConfig } from "../config"
import type { Decoder, DecodingError } from "../hkt"
import { DecoderType, DecoderURI } from "../hkt"

export const decoderTaggedUnionInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraTaggedUnion1<DecoderURI, Env> => ({
    _F: DecoderURI,
    taggedUnion: (tag, types, config) => (env) => {
      const decoders = mapRecord(types, (a) => a(env).decoder)

      return new DecoderType(
        decoderApplyConfig(config?.conf)(
          {
            decode: (u) => {
              if (isUnknownRecord(u)) {
                if (tag in u) {
                  const dec = decoders[tag as any]

                  if (dec) {
                    return (dec as Decoder<any>).decode(u)
                  } else {
                    return T.fail([
                      <DecodingError>{
                        actual: u,
                        message: `${u[tag]} is not known (${Object.keys(decoders)})`
                      }
                    ])
                  }
                }
                return T.fail([
                  <DecodingError>{
                    actual: u,
                    message: `${tag} field not found`
                  }
                ])
              }
              return T.fail([
                <DecodingError>{
                  actual: u,
                  message: `${typeof u} is not a record`
                }
              ])
            }
          },
          env,
          {
            decoders: decoders as any
          }
        )
      )
    }
  })
)
