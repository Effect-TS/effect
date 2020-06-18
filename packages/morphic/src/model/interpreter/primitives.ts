import { memo } from "../../utils"
import * as M from "../codec"
import { modelApplyConfig } from "../config"
import { ModelType, ModelURI } from "../hkt"

import { map_ } from "@matechs/core/Array"
import { introduce } from "@matechs/core/Function"
import type { AnyEnv, ConfigsForType } from "@matechs/morphic-alg/config"
import type {
  Literal,
  LiteralT,
  MatechsAlgebraPrimitive2,
  OneOfLiteralsConfig
} from "@matechs/morphic-alg/primitives"

export const modelPrimitiveInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraPrimitive2<ModelURI, Env> => ({
    _F: ModelURI,
    date: (config) => (env) =>
      new ModelType(
        modelApplyConfig(config?.conf)(
          M.withName(config?.name)(M.DateFromISOString),
          env,
          {}
        )
      ),
    boolean: (config) => (env) =>
      new ModelType(
        modelApplyConfig(config?.conf)(M.withName(config?.name)(M.boolean), env, {})
      ),
    string: (config) => (env) =>
      new ModelType(
        modelApplyConfig(config?.conf)(M.withName(config?.name)(M.string), env, {})
      ),
    number: (config) => (env) =>
      new ModelType(
        modelApplyConfig(config?.conf)(M.withName(config?.name)(M.number), env, {})
      ),
    bigint: (config) => (env) =>
      new ModelType(
        modelApplyConfig(config?.conf)(
          M.withName(config?.name)(M.BigIntString),
          env,
          {}
        )
      ),
    stringLiteral: (l, config) => (env) =>
      new ModelType(
        modelApplyConfig(config?.conf)(
          M.literal(l as Literal<typeof l>, config?.name || l),
          env,
          {}
        )
      ),
    numberLiteral: (l, config) => (env) =>
      new ModelType(
        modelApplyConfig(config?.conf)(
          M.literal(l as Literal<typeof l>, config?.name || `${l}`),
          env,
          {}
        )
      ),
    oneOfLiterals: <T extends readonly [LiteralT, ...LiteralT[]]>(
      ls: { [k in keyof T]: (env: Env) => ModelType<LiteralT, Literal<T[k]>> },
      config?: {
        name?: string
        conf?: ConfigsForType<
          Env,
          LiteralT,
          Literal<T[number]>,
          OneOfLiteralsConfig<Literal<T[number]>>
        >
      }
    ) => (env) => {
      type Created = M.Codec<Literal<T[number]>, LiteralT>
      return new ModelType(
        introduce<Created>(
          ls.length === 1
            ? (ls[0](env).codec as Created)
            : M.union(map_(ls, (l) => l(env).codec) as [Created, Created, ...Created[]])
        )((model) => modelApplyConfig(config?.conf)(model, env, {}))
      )
    },
    keysOf: (k, config) => (env) =>
      new ModelType(
        modelApplyConfig(config?.conf)(
          M.keyof(k, config?.name) as M.Codec<keyof typeof k & string, string>,
          env,
          {}
        )
      ),
    nullable: (T, config) => (env) =>
      introduce(T(env).codec)(
        (model) =>
          new ModelType(
            modelApplyConfig(config?.conf)(
              M.optionFromNullable(model, config?.name),
              env,
              { model }
            )
          )
      ),
    mutable: (T, config) => (env) =>
      introduce(T(env).codec)(
        (model) =>
          new ModelType(
            modelApplyConfig(config?.conf)(M.withName(config?.name)(model), env, {
              model
            })
          )
      ),
    optional: (T, config) => (env) =>
      introduce(T(env).codec)(
        (model) =>
          new ModelType(
            modelApplyConfig(config?.conf)(M.nonRequired(model, config?.name), env, {
              model
            })
          )
      ),
    array: (T, config) => (env) =>
      introduce(T(env).codec)(
        (model) =>
          new ModelType(
            modelApplyConfig(config?.conf)(M.array(model, config?.name), env, { model })
          )
      ),
    nonEmptyArray: (T, config) => (env) =>
      introduce(T(env).codec)(
        (model) =>
          new ModelType(
            modelApplyConfig(config?.conf)(M.nonEmptyArray(model, config?.name), env, {
              model
            })
          )
      ),
    uuid: (config) => (env) =>
      new ModelType(
        modelApplyConfig(config?.conf)(M.withName(config?.name)(M.uuid), env, {})
      ),
    either: (e, a, config) => (env) =>
      introduce(e(env).codec)((left) =>
        introduce(a(env).codec)(
          (right) =>
            new ModelType(
              modelApplyConfig(config?.conf)(M.either(left, right, config?.name), env, {
                left,
                right
              })
            )
        )
      ),
    option: (a, config) => (env) =>
      introduce(a(env).codec)(
        (model) =>
          new ModelType(
            modelApplyConfig(config?.conf)(M.option(model, config?.name), env, {
              model
            })
          )
      )
  })
)
