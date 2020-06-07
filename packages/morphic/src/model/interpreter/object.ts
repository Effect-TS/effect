import type { InterfaceLA } from "../../config"
import { projectFieldWithEnv, memo } from "../../utils"
import * as M from "../codec"
import { modelApplyConfig } from "../config"
import { ModelType, ModelURI } from "../hkt"

import { introduce } from "@matechs/core/Function"
import type { ConfigsForType, AnyEnv } from "@matechs/morphic-alg/config"
import type {
  MatechsAlgebraObject2,
  PropsKind2,
  InterfaceConfig,
  PartialConfig
} from "@matechs/morphic-alg/object"

declare module "@matechs/morphic-alg/object" {
  interface InterfaceConfig<Props> {
    [ModelURI]: {
      model: InterfaceLA<Props, ModelURI>
    }
  }
  interface PartialConfig<Props> {
    [ModelURI]: {
      model: InterfaceLA<Props, ModelURI>
    }
  }
}

export const modelNonStrictObjectInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraObject2<ModelURI, Env> => ({
    _F: ModelURI,
    interface: <PropsE, PropsA>(
      props: PropsKind2<ModelURI, PropsE, PropsA, Env>,
      name: string,
      config?: ConfigsForType<
        Env,
        PropsE,
        PropsA,
        InterfaceConfig<PropsKind2<ModelURI, PropsE, PropsA, Env>>
      >
    ) => (env: Env) =>
      introduce(projectFieldWithEnv(props, env)("codec"))(
        (model) =>
          new ModelType<PropsE, PropsA>(
            modelApplyConfig(config)(M.type(model, name) as any, env, {
              model: model as any
            })
          )
      ),
    partial: <PropsE, PropsA>(
      props: PropsKind2<ModelURI, PropsE, PropsA, Env>,
      name: string,
      config?: ConfigsForType<
        Env,
        PropsE,
        PropsA,
        PartialConfig<PropsKind2<ModelURI, PropsE, PropsA, Env>>
      >
    ) => (env: Env) =>
      introduce(projectFieldWithEnv(props, env)("codec"))(
        (model) =>
          new ModelType<Partial<PropsE>, Partial<PropsA>>(
            modelApplyConfig(config)(M.partial(model, name) as any, env, {
              model: model as any
            }) as any
          )
      )
  })
)

export const modelStrictObjectInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraObject2<ModelURI, Env> => ({
    _F: ModelURI,
    interface: <PropsE, PropsA>(
      props: PropsKind2<ModelURI, PropsE, PropsA, Env>,
      name: string,
      config?: ConfigsForType<
        Env,
        PropsE,
        PropsA,
        InterfaceConfig<PropsKind2<ModelURI, PropsE, PropsA, Env>>
      >
    ) => (env: Env) =>
      introduce(projectFieldWithEnv(props, env)("codec"))(
        (model) =>
          new ModelType<PropsE, PropsA>(
            modelApplyConfig(config)(M.strict(model, name) as any, env, {
              model: model as any
            })
          )
      ),
    partial: <PropsE, PropsA>(
      props: PropsKind2<ModelURI, PropsE, PropsA, Env>,
      name: string,
      config?: ConfigsForType<
        Env,
        PropsE,
        PropsA,
        InterfaceConfig<PropsKind2<ModelURI, PropsE, PropsA, Env>>
      >
    ) => (env: Env) =>
      introduce(projectFieldWithEnv(props, env)("codec"))(
        (model) =>
          new ModelType<Partial<PropsE>, Partial<PropsA>>(
            modelApplyConfig(config)(M.exact(M.partial(model, name)) as any, env, {
              model: model as any
            }) as any
          )
      )
  })
)
