import type { IntersectionURI } from "../../Algebra/Intersection"
import { interpreter } from "../../HKT"
import { showApplyConfig, ShowType, ShowURI } from "../base"

export const showIntersectionInterpreter = interpreter<ShowURI, IntersectionURI>()(
  () => ({
    _F: ShowURI,
    intersection: (...types) => (config) => (env) => {
      const shows = types.map((getShow) => getShow(env).show)
      return new ShowType(
        showApplyConfig(config?.conf)(
          {
            show: (a) => shows.map((s) => s.show(a)).join(" & ")
          },
          env,
          {
            shows: shows as any
          }
        )
      )
    }
  })
)
