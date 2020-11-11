import type { UnionURI } from "../../Algebra/Union"
import { interpreter } from "../../HKT"
import { showApplyConfig, ShowType, ShowURI } from "../base"

export const showUnionInterpreter = interpreter<ShowURI, UnionURI>()(() => ({
  _F: ShowURI,
  union: (...types) => (guards, config) => (env) => {
    const shows = types.map((a) => a(env).show)

    return new ShowType(
      showApplyConfig(config?.conf)(
        {
          show: (a): string => {
            for (const i in guards) {
              if (guards[i](a)._tag === "Some") {
                return shows[i].show(a)
              }
            }
            throw new Error("BUG: guard not found")
          }
        },
        env,
        {
          shows: shows as any
        }
      )
    )
  }
}))
