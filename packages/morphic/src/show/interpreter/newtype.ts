import { memo } from "../../utils"
import { showApplyConfig } from "../config"
import { ShowURI, ShowType } from "../hkt"

import { introduce } from "@matechs/core/Function"
import type { Show } from "@matechs/core/Show"
import type { AnyEnv } from "@matechs/morphic-alg/config"
import type { MatechsAlgebraNewtype1 } from "@matechs/morphic-alg/newtype"

declare module "@matechs/morphic-alg/newtype" {
  interface NewtypeConfig<L, A, N> {
    [ShowURI]: {
      show: Show<A>
      showNewtype: Show<N>
    }
  }
  interface CoerceConfig<L, A, N> {
    [ShowURI]: {
      show: Show<A>
      showCoerce: Show<N>
    }
  }
  interface IsoConfig<L, A, N> {
    [ShowURI]: {
      show: Show<A>
    }
  }
  interface PrismConfig<L, A, N> {
    [ShowURI]: {
      show: Show<A>
    }
  }
}

export const showNewtypeInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraNewtype1<ShowURI, Env> => ({
    _F: ShowURI,
    newtype: (name) => (a, config) => (env) =>
      introduce(a(env).show)(
        (show) =>
          new ShowType(
            showApplyConfig(config)(
              { show: (x) => `<${name}>(${show.show(x as any)})` },
              env,
              {
                show,
                showNewtype: show as any
              }
            )
          )
      ),
    coerce: (name) => (a, config) => (env) =>
      introduce(a(env).show)(
        (show) =>
          new ShowType(
            showApplyConfig(config)(
              { show: (x) => `<${name}>(${show.show(x as any)})` },
              env,
              {
                show,
                showCoerce: show as any
              }
            )
          )
      ),
    iso: (a, iso, name, config) => (env) =>
      introduce(a(env).show)(
        (show) =>
          new ShowType(
            showApplyConfig(config)(
              { show: (x) => `<${name}>(${show.show(iso.reverseGet(x))})` },
              env,
              {
                show
              }
            )
          )
      ),
    prism: (a, prism, name, config) => (env) =>
      introduce(a(env).show)(
        (show) =>
          new ShowType(
            showApplyConfig(config)(
              { show: (x) => `<${name}>(${show.show(prism.reverseGet(x))})` },
              env,
              {
                show
              }
            )
          )
      )
  })
)
