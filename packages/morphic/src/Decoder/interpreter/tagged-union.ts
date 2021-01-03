import type { TaggedUnionURI } from "../../Algebra/TaggedUnion"
import { isUnknownRecord } from "../../Guard/interpreter/common"
import { interpreter } from "../../HKT"
import { mapRecord } from "../../Utils"
import { decoderApplyConfig, DecoderType, DecoderURI } from "../base"
import type { Decoder } from "../common"
import { appendContext, fail, makeDecoder } from "../common"

export const decoderTaggedUnionInterpreter = interpreter<DecoderURI, TaggedUnionURI>()(
  () => ({
    _F: DecoderURI,
    taggedUnion: (tag, types, cfg) => (env) => {
      const decoders = mapRecord(types, (a) => a(env).decoder)

      return new DecoderType(
        decoderApplyConfig(cfg?.conf)(
          makeDecoder(
            (u, c) => {
              if (isUnknownRecord(u)) {
                if (tag in u) {
                  const dec = decoders[u[tag] as any]

                  if (dec) {
                    return (dec as Decoder<any>).validate(
                      u,
                      appendContext(c, "", dec, u)
                    )
                  } else {
                    return fail(
                      u,
                      c,
                      `${u[tag]} is not known in (${Object.keys(decoders).join(", ")})`
                    )
                  }
                }
                return fail(u, c, `${tag} field not found`)
              }
              return fail(u, c, `${typeof u} is not a record`)
            },
            "taggedUnion",
            cfg?.name || "TaggedUnion"
          ),
          env,
          {
            decoders: decoders as any
          }
        )
      )
    }
  })
)
