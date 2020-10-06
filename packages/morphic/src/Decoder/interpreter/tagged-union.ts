import type { AnyEnv } from "../../Algebra/config"
import type { AlgebraTaggedUnion1 } from "../../Algebra/tagged-union"
import { isUnknownRecord } from "../../Guard/interpreter/common"
import { mapRecord, memo } from "../../Internal/Utils"
import { decoderApplyConfig } from "../config"
import type { Decoder } from "../hkt"
import { DecoderType, DecoderURI, fail } from "../hkt"

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
                    return fail([
                      {
                        actual: u,
                        message: `${u[tag]} is not known (${Object.keys(decoders)})`
                      }
                    ])
                  }
                }
                return fail([
                  {
                    actual: u,
                    message: `${tag} field not found`
                  }
                ])
              }
              return fail([
                {
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
