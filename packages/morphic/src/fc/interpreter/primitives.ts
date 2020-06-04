import type { AnyEnv } from "@morphic-ts/common/lib/config"
import {
  constant,
  integer,
  boolean,
  string,
  float,
  oneof,
  array,
  option,
  bigInt,
  uuid,
  Arbitrary
} from "fast-check"

import { memo } from "../../utils"
import { fcApplyConfig } from "../config"
import { FastCheckType, FastCheckURI } from "../hkt"

import { isNonEmpty } from "@matechs/core/Array"
import { left, right } from "@matechs/core/Either"
import type { UUID } from "@matechs/core/Model"
import { fromNullable, none, some } from "@matechs/core/Option"
import type { MatechsAlgebraPrimitive1 } from "@matechs/morphic-alg/primitives"

export const fcPrimitiveInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraPrimitive1<FastCheckURI, Env> => ({
    _F: FastCheckURI,
    date: (configs) => (env) =>
      new FastCheckType(
        fcApplyConfig(configs)(
          integer().map((n) => new Date(n)),
          env
        )
      ),
    boolean: (configs) => (env) =>
      new FastCheckType(fcApplyConfig(configs)(boolean(), env)),
    string: (configs) => (env) =>
      new FastCheckType(fcApplyConfig(configs)(string(), env)),
    number: (configs) => (env) =>
      new FastCheckType(fcApplyConfig(configs)(float(), env)),
    bigint: (configs) => (env) =>
      new FastCheckType(fcApplyConfig(configs)(bigInt(), env)),
    stringLiteral: (l, config) => (env) =>
      new FastCheckType(fcApplyConfig(config)(constant(l), env)),
    keysOf: (k, config) => (env) =>
      new FastCheckType(
        fcApplyConfig(config)(
          oneof(...(Object.keys(k) as (keyof typeof k)[]).map(constant)),
          env
        )
      ),
    nullable: (T, config) => (env) =>
      new FastCheckType(
        fcApplyConfig(config)(option(T(env).arb).map(fromNullable), env)
      ),
    array: (T, config) => (env) =>
      new FastCheckType(fcApplyConfig(config)(array(T(env).arb), env)),
    nonEmptyArray: (T, config) => (env) =>
      new FastCheckType(
        fcApplyConfig(config)(array(T(env).arb).filter(isNonEmpty) as any, env)
      ),
    uuid: (config) => (env) =>
      new FastCheckType(fcApplyConfig(config)(uuid() as Arbitrary<UUID>, env)),
    either: (e, a, config) => (env) =>
      new FastCheckType(
        fcApplyConfig(config)(
          oneof(e(env).arb.map(left), a(env).arb.map(right)) as any,
          env
        )
      ),
    option: (a, config) => (env) =>
      new FastCheckType(
        fcApplyConfig(config)(oneof(a(env).arb.map(some), constant(none)), env)
      )
  })
)
