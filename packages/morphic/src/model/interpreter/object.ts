import type { ConfigsForType, AnyEnv } from "@morphic-ts/common/lib/config"

import { projectFieldWithEnv, memo } from "../../utils"
import { modelApplyConfig } from "../config"
import { ModelType, ModelURI } from "../hkt"

import * as M from "@matechs/core/Model"
import type { MatechsAlgebraObject2, PropsKind2 } from "@matechs/morphic-alg/object"

export const modelNonStrictObjectInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraObject2<ModelURI, Env> => ({
    _F: ModelURI,
    interface: <PropsE, PropsA>(
      props: PropsKind2<ModelURI, PropsE, PropsA, Env>,
      name: string,
      config?: ConfigsForType<Env, PropsE, PropsA>
    ) => (env: Env) =>
      new ModelType<PropsE, PropsA>(
        modelApplyConfig(config)(
          M.type(projectFieldWithEnv(props, env)("type"), name) as any,
          env
        )
      ),
    partial: <PropsE, PropsA>(
      props: PropsKind2<ModelURI, PropsE, PropsA, Env>,
      name: string,
      config?: ConfigsForType<Env, PropsE, PropsA>
    ) => (env: Env) =>
      new ModelType<Partial<PropsE>, Partial<PropsA>>(
        modelApplyConfig(config)(
          M.partial(projectFieldWithEnv(props, env)("type"), name) as any,
          env
        ) as any
      )
  })
)

export const modelStrictObjectInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraObject2<ModelURI, Env> => ({
    _F: ModelURI,
    interface: <PropsE, PropsA>(
      props: PropsKind2<ModelURI, PropsE, PropsA, Env>,
      name: string,
      config?: ConfigsForType<Env, PropsE, PropsA>
    ) => (env: Env) =>
      new ModelType<PropsE, PropsA>(
        modelApplyConfig(config)(
          M.strict(projectFieldWithEnv(props, env)("type"), name) as any,
          env
        )
      ),
    partial: <PropsE, PropsA>(
      props: PropsKind2<ModelURI, PropsE, PropsA, Env>,
      name: string,
      config?: ConfigsForType<Env, PropsE, PropsA>
    ) => (env: Env) =>
      new ModelType<Partial<PropsE>, Partial<PropsA>>(
        modelApplyConfig(config)(
          M.exact(M.partial(projectFieldWithEnv(props, env)("type"), name)) as any,
          env
        ) as any
      )
  })
)
