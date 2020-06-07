import { memo } from "../../utils"
import * as M from "../codec"
import { modelApplyConfig } from "../config"
import { ModelType, ModelURI } from "../hkt"

import { introduce } from "@matechs/core/Function"
import type { AnyEnv } from "@matechs/morphic-alg/config"
import type { MatechsAlgebraPrimitive2, UUID } from "@matechs/morphic-alg/primitives"

declare module "@matechs/morphic-alg/primitives" {
  interface NonEmptyArrayConfig<L, A> {
    [ModelURI]: {
      model: M.Codec<A, L>
    }
  }
  interface ArrayConfig<L, A> {
    [ModelURI]: {
      model: M.Codec<A, L>
    }
  }
  interface NullableConfig<L, A> {
    [ModelURI]: {
      model: M.Codec<A, L>
    }
  }
  interface EitherConfig<EE, EA, AE, AA> {
    [ModelURI]: {
      left: M.Codec<EA, EE>
      right: M.Codec<AA, AE>
    }
  }
  interface OptionConfig<L, A> {
    [ModelURI]: {
      model: M.Codec<A, L>
    }
  }
}

const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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
    uuid: (config) => (env) =>
      new ModelType(
        modelApplyConfig(config)(
          M.brand(M.string, (s): s is UUID => regex.test(s), "UUID"),
          env,
          {}
        )
      ),
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
