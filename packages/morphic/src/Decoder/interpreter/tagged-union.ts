import type { AnyEnv } from "../../Algebra/config"
import type { AlgebraTaggedUnion1 } from "../../Algebra/tagged-union"
import { isUnknownRecord } from "../../Guard/interpreter/common"
import { mapRecord, memo } from "../../Internal/Utils"
import type { Decoder } from "../common"
import { fail } from "../common"
import { decoderApplyConfig } from "../config"
import { DecoderType, DecoderURI } from "../hkt"

export const decoderTaggedUnionInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraTaggedUnion1<DecoderURI, Env> => ({
    _F: DecoderURI,
    taggedUnion: (tag, types, cfg) => (env) => {
      const decoders = mapRecord(types, (a) => a(env).decoder)

      return new DecoderType(
        decoderApplyConfig(cfg?.conf)(
          {
            decode: (u) => {
              if (isUnknownRecord(u)) {
                if (tag in u) {
                  const dec = decoders[u[tag] as any]

                  if (dec) {
                    return (dec as Decoder<any>).decode(u)
                  } else {
                    return fail([
                      {
                        id: cfg?.id,
                        name: cfg?.name,
                        actual: u,
                        message: `${u[tag]} is not known in (${Object.keys(
                          decoders
                        ).join(", ")})`
                      }
                    ])
                  }
                }
                return fail([
                  {
                    id: cfg?.id,
                    name: cfg?.name,
                    actual: u,
                    message: `${tag} field not found`
                  }
                ])
              }
              return fail([
                {
                  id: cfg?.id,
                  name: cfg?.name,
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
