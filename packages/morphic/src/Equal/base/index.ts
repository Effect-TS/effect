import type { Equal } from "@effect-ts/core/Equal"

import { getApplyConfig } from "../../HKT"

export const EqURI = "Eq" as const
export type EqURI = typeof EqURI

export const eqApplyConfig = getApplyConfig(EqURI)

declare module "../../HKT" {
  interface URItoKind<R, E, A> {
    [EqURI]: (env: R) => EqType<A>
  }
  interface ConfigType<E, A> {
    [EqURI]: Equal<A>
  }
}

export class EqType<A> {
  _A!: A
  _URI!: EqURI
  childs: any = {}
  constructor(public eq: Equal<A>) {}
  setChilds(childs: any) {
    this.childs = childs
    return this
  }
  getChilds() {
    return this.childs
  }
  at<K extends keyof A>(k: K): EqType<A[K]> | undefined {
    return this.childs[k]
  }
}
