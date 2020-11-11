import type { UnionURI } from "../../Algebra/Union"
import { interpreter } from "../../HKT"
import { strictApplyConfig, StrictType, StrictURI } from "../base"

export const strictUnionInterpreter = interpreter<StrictURI, UnionURI>()(() => ({
  _F: StrictURI,
  union: (...types) => (guards, config) => (env) => {
    const stricts = types.map((a) => a(env).strict)

    return new StrictType(
      strictApplyConfig(config?.conf)(
        {
          shrink: (u) => {
            for (const i in guards) {
              if (guards[i](u)._tag === "Some") {
                return stricts[i].shrink(u)
              }
            }
            throw new Error("BUG: guard not found")
          }
        },
        env,
        {
          stricts: stricts as any
        }
      )
    )
  }
}))
