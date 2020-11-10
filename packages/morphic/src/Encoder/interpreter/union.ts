import type { UnionURI } from "../../Algebra/Union"
import { interpreter } from "../../HKT"
import { encoderApplyConfig, EncoderType, EncoderURI } from "../base"

export const encoderUnionInterpreter = interpreter<EncoderURI, UnionURI>()(() => ({
  _F: EncoderURI,
  union: (...types) => (guards, config) => (env) => {
    const encoders = types.map((a: any) => a(env).encoder)

    return new EncoderType(
      encoderApplyConfig(config?.conf)(
        {
          encode: (u) => {
            for (const i in guards) {
              if (guards[i](u)._tag === "Some") {
                return encoders[i].encode(u)
              }
            }
            throw new Error("BUG: guard not found")
          }
        },
        env,
        {
          encoders: encoders as any
        }
      )
    )
  }
}))
