import type { AnyEnv } from "../../Algebra/config"
import type { AlgebraTaggedUnion1 } from "../../Algebra/tagged-union"
import { isUnknownRecord } from "../../Guard/interpreter/common"
import { mapRecord, memo } from "../../Internal/Utils"
import type { Validate } from "../common"
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
            validate: (u, c) => {
              if (isUnknownRecord(u)) {
                if (tag in u) {
                  const dec = decoders[u[tag] as any]

                  if (dec) {
                    return (dec as Validate<any>).validate(u, {
                      ...c,
                      actual: u,
                      types: cfg?.name ? [...c.types, cfg.name] : c.types
                    })
                  } else {
                    return fail([
                      {
                        id: cfg?.id,
                        name: cfg?.name,
                        message: `${u[tag]} is not known in (${Object.keys(
                          decoders
                        ).join(", ")})`,
                        context: {
                          ...c,
                          actual: u,
                          types: cfg?.name ? [...c.types, cfg.name] : c.types
                        }
                      }
                    ])
                  }
                }
                return fail([
                  {
                    id: cfg?.id,
                    name: cfg?.name,
                    message: `${tag} field not found`,
                    context: {
                      ...c,
                      actual: u,
                      types: cfg?.name ? [...c.types, cfg.name] : c.types
                    }
                  }
                ])
              }
              return fail([
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
