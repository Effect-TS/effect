import type { TaggedUnionURI } from "../../Algebra/TaggedUnion"
import { interpreter } from "../../HKT"
import { mapRecord } from "../../Utils"
import type { Encoder } from "../base"
import { encoderApplyConfig, EncoderType, EncoderURI } from "../base"

export const encoderTaggedUnionInterpreter = interpreter<EncoderURI, TaggedUnionURI>()(
  () => ({
    _F: EncoderURI,
    taggedUnion: (tag, types, config) => (env) => {
      const encoders = mapRecord(types, (a) => a(env).encoder)

      return new EncoderType(
        encoderApplyConfig(config?.conf)(
          {
            encode: (u) =>
              (encoders[u[tag as any] as any] as Encoder<any, any>).encode(u)
          },
          env,
          {
            encoders: encoders as any
          }
        )
      )
    }
  })
)
