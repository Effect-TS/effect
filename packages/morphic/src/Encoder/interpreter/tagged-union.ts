import type { AnyEnv } from "../../Algebra/config"
import type { AlgebraTaggedUnion2 } from "../../Algebra/tagged-union"
import { mapRecord, memo } from "../../Internal/Utils"
import { encoderApplyConfig } from "../config"
import type { Encoder } from "../hkt"
import { EncoderType, EncoderURI } from "../hkt"

export const encoderTaggedUnionInterpreter = memo(
  <Env extends AnyEnv>(): AlgebraTaggedUnion2<EncoderURI, Env> => ({
    _F: EncoderURI,
    taggedUnion: (tag, types, config) => (env) => {
      const encoders = mapRecord(types, (a) => a(env).encoder)

      return new EncoderType(
        encoderApplyConfig(config?.conf)(
          {
            encode: (u) => (encoders[u[tag] as any] as Encoder<any, any>).encode(u)
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
