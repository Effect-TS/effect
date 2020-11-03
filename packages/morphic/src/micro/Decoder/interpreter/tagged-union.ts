import type { TaggedUnionURI } from "../../Algebra/TaggedUnion"
import { isUnknownRecord } from "../../Guard/interpreter/common"
import { interpreter } from "../../HKT"
import { mapRecord } from "../../Utils"
import { decoderApplyConfig, DecoderType, DecoderURI } from "../base"
import type { Validate } from "../common"
import { fail } from "../common"

export const decoderTaggedUnionInterpreter = interpreter<DecoderURI, TaggedUnionURI>()(
  () => ({
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
