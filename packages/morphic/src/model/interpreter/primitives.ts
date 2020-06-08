import { memo } from "../../utils"
import * as M from "../codec"
import { modelApplyConfig } from "../config"
import { ModelType, ModelURI } from "../hkt"

import { introduce } from "@matechs/core/Function"
import type { AnyEnv } from "@matechs/morphic-alg/config"
import type { MatechsAlgebraPrimitive2 } from "@matechs/morphic-alg/primitives"

export const modelPrimitiveInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraPrimitive2<ModelURI, Env> => ({
    _F: ModelURI,
    date: (config) => (env) =>
      new ModelType(modelApplyConfig(config)(M.DateFromISOString, env, {})),
    boolean: (config) => (env) =>
      new ModelType(modelApplyConfig(config)(M.boolean, env, {})),
    string: (config) => (env) =>
      new ModelType(modelApplyConfig(config)(M.string, env, {})),
    number: (config) => (env) =>
      new ModelType(modelApplyConfig(config)(M.number, env, {})),
    bigint: (config) => (env) =>
      new ModelType(modelApplyConfig(config)(M.BigIntString, env, {})),
    stringLiteral: (l, config) => (env) =>
      new ModelType(modelApplyConfig(config)(M.literal(l, l), env, {})),
    keysOf: (k, config) => (env) =>
      new ModelType(
        modelApplyConfig(config)(
          M.keyof(k) as M.Codec<keyof typeof k & string, string>,
          env,
          {}
        )
      ),
    nullable: (T, config) => (env) =>
      introduce(T(env).codec)(
        (model) =>
          new ModelType(
            modelApplyConfig(config)(M.optionFromNullable(model), env, { model })
          )
      ),
    mutable: (T, config) => (env) =>
      introduce(T(env).codec)(
        (model) => new ModelType(modelApplyConfig(config)(model, env, { model }))
      ),
    optional: (T, config) => (env) =>
      introduce(T(env).codec)(
        (model) =>
          new ModelType(
            modelApplyConfig(config)(M.nonRequired(model), env, {
              model
            })
          )
      ),
    array: (T, config) => (env) =>
      introduce(T(env).codec)(
        (model) =>
          new ModelType(modelApplyConfig(config)(M.array(model), env, { model }))
      ),
    nonEmptyArray: (T, config) => (env) =>
      introduce(T(env).codec)(
        (model) =>
          new ModelType(
            modelApplyConfig(config)(M.nonEmptyArray(model), env, { model })
          )
      ),
    uuid: (config) => (env) => new ModelType(modelApplyConfig(config)(M.uuid, env, {})),
    either: (e, a, config) => (env) =>
      introduce(e(env).codec)((left) =>
        introduce(a(env).codec)(
          (right) =>
            new ModelType(
              modelApplyConfig(config)(M.either(left, right), env, { left, right })
            )
        )
      ),
    option: (a, config) => (env) =>
      introduce(a(env).codec)(
        (model) =>
          new ModelType(modelApplyConfig(config)(M.option(model), env, { model }))
      )
  })
)
