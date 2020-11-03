import type * as fc from "fast-check"

import type { AnyEnv } from "../../HKT"
import { getApplyConfig } from "../../HKT"

export const FastCheckURI = "FastCheckURI" as const

export type FastCheckURI = typeof FastCheckURI

export const fcApplyConfig = getApplyConfig(FastCheckURI)

export interface BaseFC {
  [FastCheckURI]: {
    module: typeof fc
  }
}

export const accessFC = <Env extends AnyEnv>(e: Env) =>
  (e as BaseFC)[FastCheckURI].module

export class FastCheckType<A> {
  _A!: A
  _URI!: FastCheckURI
  constructor(public arb: fc.Arbitrary<A>) {}
}

declare module "../../HKT" {
  interface URItoKind<R, E, A> {
    [FastCheckURI]: (env: R) => FastCheckType<A>
  }
  interface ConfigType<E, A> {
    [FastCheckURI]: fc.Arbitrary<A>
  }
}
