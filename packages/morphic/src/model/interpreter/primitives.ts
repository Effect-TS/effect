import type { AnyEnv } from "@morphic-ts/common/lib/config"

import { memo } from "../../utils"
import { modelApplyConfig } from "../config"
import { ModelType, ModelURI } from "../hkt"

import { chain_ } from "@matechs/core/Either"
import * as M from "@matechs/core/Model"
import type { MatechsAlgebraPrimitive2 } from "@matechs/morphic-alg/primitives"

export interface BigIntStringC extends M.Type<bigint, string, unknown> {}

export const BigIntString: BigIntStringC = new M.Type<bigint, string, unknown>(
  "BigIntString",
  // tslint:disable-next-line: strict-type-predicates valid-typeof
  (u): u is bigint => u !== undefined && u !== null && typeof u === "bigint",
  (u, c) =>
    chain_(M.string.validate(u, c), (s) => {
      try {
        const d = BigInt(s)
        return M.success(d)
      } catch {
        return M.failure(u, c)
      }
    }),
  (a) => a.toString(10)
)

export const modelPrimitiveInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraPrimitive2<ModelURI, Env> => ({
    _F: ModelURI,
    date: (config) => (env) =>
      new ModelType(modelApplyConfig(config)(M.DateFromISOString, env)),
    boolean: (config) => (env) =>
      new ModelType(modelApplyConfig(config)(M.boolean, env)),
    string: (config) => (env) => new ModelType(modelApplyConfig(config)(M.string, env)),
    number: (config) => (env) => new ModelType(modelApplyConfig(config)(M.number, env)),
    bigint: (config) => (env) =>
      new ModelType(modelApplyConfig(config)(BigIntString, env)),
    stringLiteral: (l, config) => (env) =>
      new ModelType(modelApplyConfig(config)(M.literal(l, l), env)),
    keysOf: (k, config) => (env) =>
      new ModelType(
        modelApplyConfig(config)(
          M.keyof(k) as M.Type<keyof typeof k, string, unknown>,
          env
        )
      ),
    nullable: (T, config) => (env) =>
      new ModelType(modelApplyConfig(config)(M.optionFromNullable(T(env).type), env)),
    array: (T, config) => (env) =>
      new ModelType(modelApplyConfig(config)(M.array(T(env).type), env)),
    nonEmptyArray: (T, config) => (env) =>
      new ModelType(modelApplyConfig(config)(M.nonEmptyArray(T(env).type), env)),
    uuid: (config) => (env) => new ModelType(modelApplyConfig(config)(M.UUID, env)),
    either: (e, a, config) => (env) =>
      new ModelType(modelApplyConfig(config)(M.either(e(env).type, a(env).type), env)),
    option: (a, config) => (env) =>
      new ModelType(modelApplyConfig(config)(M.option(a(env).type), env))
  })
)
