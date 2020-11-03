import { pipe } from "@effect-ts/core/Function"

import { mapRecord, projectFieldWithEnv } from "../..//Utils"
import type { ObjectURI } from "../../Algebra/Object"
import { interpreter } from "../../HKT"
import { hashApplyConfig, HashType, HashURI } from "../base"

const asPartial = <T>(x: HashType<T>): HashType<Partial<T>> => x as any

export const hashObjectInterpreter = interpreter<HashURI, ObjectURI>()(() => ({
  _F: HashURI,
  interface: (props, config) => (env) =>
    new HashType(
      pipe(projectFieldWithEnv(props as any, env)("hash"), (hash) =>
        hashApplyConfig(config?.conf)(
          {
            hash: JSON.stringify(mapRecord(hash, (h) => h.hash))
          },
          env,
          {
            hash: hash as any
          }
        )
      )
    ),
  partial: (props, config) => (env) =>
    asPartial(
      new HashType(
        pipe(projectFieldWithEnv(props as any, env)("hash"), (hash) =>
          hashApplyConfig(config?.conf)(
            {
              hash: JSON.stringify(
                mapRecord(
                  mapRecord(hash, (h) => h.hash),
                  (h) => `${h} | undefined`
                )
              )
            },
            env,
            {
              hash: hash as any
            }
          )
        )
      )
    ),
  both: (props, partial, config) => (env) =>
    new HashType(
      pipe(projectFieldWithEnv(props, env)("hash"), (hash) =>
        pipe(projectFieldWithEnv(partial, env)("hash"), (hashPartial) =>
          hashApplyConfig(config?.conf)(
            {
              hash: JSON.stringify({
                ...mapRecord(hash, (h) => h.hash),
                ...mapRecord(
                  mapRecord(hashPartial, (h) => h.hash),
                  (h) => `${h} | undefined`
                )
              })
            },
            env,
            {
              hash: hash as any,
              hashPartial: hashPartial as any
            }
          )
        )
      )
    ) as any
}))
