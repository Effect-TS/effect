import { getApplyConfig } from "../../HKT"

export interface Hash {
  hash: string
}

export const HashURI = "HashURI" as const
export type HashURI = typeof HashURI

export const hashApplyConfig = getApplyConfig(HashURI)

declare module "../../HKT" {
  interface ConfigType<E, A> {
    [HashURI]: Hash
  }
  interface URItoKind<R, E, A> {
    [HashURI]: (env: R) => HashType<A>
  }
}

export class HashType<A> {
  _A!: A
  _URI!: HashURI
  constructor(public hash: Hash) {}
}
