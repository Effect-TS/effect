/* eslint-disable @typescript-eslint/no-empty-interface */
import { pipe } from "@effect-ts/core/Function"

import type { PrimitivesURI } from "../../Algebra/Primitives"
import { interpreter } from "../../HKT"
import type { Hash } from "../base"
import { hashApplyConfig, HashType, HashURI } from "../base"

export const named = (name?: string | undefined) => (s: Hash): Hash => ({
  hash: name ? `<${name}>(${s.hash})` : s.hash
})

export const hashPrimitiveInterpreter = interpreter<HashURI, PrimitivesURI>()(() => ({
  _F: HashURI,
  function: (_, __, config) => (env) =>
    new HashType(
      hashApplyConfig(config?.conf)(
        {
          hash: config?.name ? `function(${config?.name})` : `function`
        },
        env,
        {}
      )
    ),
  unknownE: (k, config) => (env) =>
    new HashType(hashApplyConfig(config?.conf)(k(env).hash, env, {})),
  date: (config) => (env) =>
    new HashType(
      pipe({ hash: "Date" }, (hash) =>
        hashApplyConfig(config?.conf)(named(config?.name)(hash), env, {})
      )
    ),
  boolean: (config) => (env) =>
    new HashType(
      hashApplyConfig(config?.conf)(
        named(config?.name)({
          hash: "boolean"
        }),
        env,
        {}
      )
    ),
  string: (config) => (env) =>
    new HashType(
      hashApplyConfig(config?.conf)(
        named(config?.name)({
          hash: "string"
        }),
        env,
        {}
      )
    ),
  number: (config) => (env) =>
    new HashType(
      hashApplyConfig(config?.conf)(
        named(config?.name)({
          hash: "number"
        }),
        env,
        {}
      )
    ),
  bigint: (config) => (env) =>
    new HashType(
      hashApplyConfig(config?.conf)(named(config?.name)({ hash: "bigint" }), env, {})
    ),
  stringLiteral: (_, config) => (env) =>
    new HashType(
      hashApplyConfig(config?.conf)(
        named(config?.name)({
          hash: _
        }),
        env,
        {}
      )
    ),
  numberLiteral: (_, config) => (env) =>
    new HashType(
      hashApplyConfig(config?.conf)(
        named(config?.name)({
          hash: `${_}`
        }),
        env,
        {}
      )
    ),
  oneOfLiterals: (_, config) => (env) =>
    new HashType(
      hashApplyConfig(config?.conf)(
        named(config?.name)({
          hash: `${_}`
        }),
        env,
        {}
      )
    ),
  keysOf: (_keys, config) => (env) =>
    new HashType(
      hashApplyConfig(config?.conf)(
        named(config?.name)({
          hash: Object.keys(_keys).join(" | ")
        }),
        env,
        {}
      )
    ),
  nullable: (getHash, config) => (env) =>
    new HashType(
      pipe(getHash(env).hash, (hash) =>
        hashApplyConfig(config?.conf)(
          named(config?.name)({
            hash: `Nullable<${hash.hash}>`
          }),
          env,
          {
            hash
          }
        )
      )
    ),
  mutable: (getHash, config) => (env) =>
    new HashType(
      pipe(getHash(env).hash, (hash) =>
        hashApplyConfig(config?.conf)(named(config?.name)(hash), env, {
          hash
        })
      )
    ),
  optional: (getHash, config) => (env) =>
    new HashType(
      pipe(getHash(env).hash, (hash) =>
        hashApplyConfig(config?.conf)(
          named(config?.name)({
            hash: `${hash.hash} | undefined`
          }),
          env,
          {
            hash
          }
        )
      )
    ),
  array: (getHash, config) => (env) =>
    new HashType(
      pipe(getHash(env).hash, (hash) =>
        hashApplyConfig(config?.conf)(
          named(config?.name)({
            hash: `Array<${hash.hash}>`
          }),
          env,
          {
            hash
          }
        )
      )
    ),
  list: (getHash, config) => (env) =>
    new HashType(
      pipe(getHash(env).hash, (hash) =>
        hashApplyConfig(config?.conf)(
          named(config?.name)({
            hash: `List<${hash.hash}>`
          }),
          env,
          {
            hash
          }
        )
      )
    ),
  nonEmptyArray: (getHash, config) => (env) =>
    new HashType(
      pipe(getHash(env).hash, (hash) =>
        hashApplyConfig(config?.conf)(
          named(config?.name)({
            hash: `NonEmptyArray<${hash.hash}>`
          }),
          env,
          {
            hash
          }
        )
      )
    ),
  uuid: (config) => (env) =>
    new HashType(
      hashApplyConfig(config?.conf)(
        named(config?.name)({
          hash: "UUID"
        }),
        env,
        {}
      )
    ),
  either: (e, a, config) => (env) =>
    new HashType(
      pipe(e(env).hash, (left) =>
        pipe(a(env).hash, (right) =>
          hashApplyConfig(config?.conf)(
            named(config?.name)({
              hash: `Either<${left.hash}, ${right.hash}>`
            }),
            env,
            {
              left,
              right
            }
          )
        )
      )
    ),
  option: (a, config) => (env) =>
    new HashType(
      pipe(a(env).hash, (hash) =>
        hashApplyConfig(config?.conf)(
          named(config?.name)({
            hash: `Option<${hash.hash}>`
          }),
          env,
          {
            hash
          }
        )
      )
    )
}))
