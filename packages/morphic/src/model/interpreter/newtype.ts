import { memo } from "../../utils"
import * as M from "../codec"
import { modelApplyConfig } from "../config"
import { ModelType, ModelURI } from "../hkt"

import { introduce } from "@matechs/core/Function"
import type { AnyEnv } from "@matechs/morphic-alg/config"
import type { MatechsAlgebraNewtype2 } from "@matechs/morphic-alg/newtype"

declare module "@matechs/morphic-alg/newtype" {
  interface NewtypeConfig<L, A, N> {
    [ModelURI]: {
      model: M.Codec<A, L>
    }
  }
  interface CoerceConfig<L, A, N> {
    [ModelURI]: {
      model: M.Codec<A, L>
    }
  }
  interface IsoConfig<L, A, N> {
    [ModelURI]: {
      model: M.Codec<A, L>
    }
  }
  interface PrismConfig<L, A, N> {
    [ModelURI]: {
      model: M.Codec<A, L>
    }
  }
}

export const modelNewtypeInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraNewtype2<ModelURI, Env> => ({
    _F: ModelURI,
    newtype: () => (a, config) => (env) =>
      introduce(a(env).codec)(
        (model) =>
          new ModelType(
            modelApplyConfig(config)(model as any, env, {
              model
            })
          )
      ),
    coerce: () => (a, config) => (env) =>
      introduce(a(env).codec)(
        (model) =>
          new ModelType(
            modelApplyConfig(config)(model as any, env, {
              model
            })
          )
      ),
    iso: (a, iso, name, config) => (env) =>
      introduce(a(env).codec)(
        (model) =>
          new ModelType(
            modelApplyConfig(config)(M.iso(model, iso, name), env, {
              model
            })
          )
      ),
    prism: (a, prism, name, config) => (env) =>
      introduce(a(env).codec)(
        (model) =>
          new ModelType(
            modelApplyConfig(config)(M.prism(model, prism, name), env, {
              model
            })
          )
      )
  })
)
