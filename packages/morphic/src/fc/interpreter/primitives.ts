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
import { introduce } from "@matechs/core/Function"
import type { UUID } from "@matechs/core/Model"
import { fromNullable, none, some } from "@matechs/core/Option"
import type { AnyEnv } from "@matechs/morphic-alg/config"
import type { MatechsAlgebraPrimitive1 } from "@matechs/morphic-alg/primitives"

declare module "@matechs/morphic-alg/primitives" {
  interface NonEmptyArrayConfig<L, A> {
    [FastCheckURI]: {
      arb: Arbitrary<A>
    }
  }
  interface ArrayConfig<L, A> {
    [FastCheckURI]: {
      arb: Arbitrary<A>
    }
  }
  interface NullableConfig<L, A> {
    [FastCheckURI]: {
      arb: Arbitrary<A>
    }
  }
  interface EitherConfig<EE, EA, AE, AA> {
    [FastCheckURI]: {
      left: Arbitrary<EA>
      right: Arbitrary<AA>
    }
  }
  interface OptionConfig<L, A> {
    [FastCheckURI]: {
      arb: Arbitrary<A>
    }
  }
}

export const fcPrimitiveInterpreter = memo(
  <Env extends AnyEnv>(): MatechsAlgebraPrimitive1<FastCheckURI, Env> => ({
    _F: FastCheckURI,
    date: (configs) => (env) =>
      introduce(integer())(
        (arb) =>
          new FastCheckType(
            fcApplyConfig(configs)(
              arb.map((n) => new Date(n)),
              env,
              {}
            )
          )
      ),
    boolean: (configs) => (env) =>
      new FastCheckType(fcApplyConfig(configs)(boolean(), env, {})),
    string: (configs) => (env) =>
      new FastCheckType(fcApplyConfig(configs)(string(), env, {})),
    number: (configs) => (env) =>
      new FastCheckType(fcApplyConfig(configs)(float(), env, {})),
    bigint: (configs) => (env) =>
      new FastCheckType(fcApplyConfig(configs)(bigInt(), env, {})),
    stringLiteral: (l, config) => (env) =>
      new FastCheckType(fcApplyConfig(config)(constant(l), env, {})),
    keysOf: (k, config) => (env) =>
      new FastCheckType(
        fcApplyConfig(config)(
          oneof(...(Object.keys(k) as (keyof typeof k & string)[]).map(constant)),
          env,
          {}
        )
      ),
    nullable: (T, config) => (env) =>
      introduce(T(env).arb)(
        (arb) =>
          new FastCheckType(
            fcApplyConfig(config)(option(arb).map(fromNullable), env, { arb })
          )
      ),
    array: (T, config) => (env) =>
      introduce(T(env).arb)(
        (arb) => new FastCheckType(fcApplyConfig(config)(array(arb), env, { arb }))
      ),
    nonEmptyArray: (T, config) => (env) =>
      introduce(T(env).arb)(
        (arb) =>
          new FastCheckType(
            fcApplyConfig(config)(array(arb).filter(isNonEmpty) as any, env, { arb })
          )
      ),
    uuid: (config) => (env) =>
      new FastCheckType(fcApplyConfig(config)(uuid() as Arbitrary<UUID>, env, {})),
    either: (e, a, config) => (env) =>
      introduce(e(env).arb)((l) =>
        introduce(a(env).arb)(
          (r) =>
            new FastCheckType(
              fcApplyConfig(config)(oneof(l.map(left), r.map(right)) as any, env, {
                left: l,
                right: r
              })
            )
        )
      ),
    option: (a, config) => (env) =>
      introduce(a(env).arb)(
        (arb) =>
          new FastCheckType(
            fcApplyConfig(config)(oneof(arb.map(some), constant(none)), env, { arb })
          )
      )
  })
)
