// tracing: off

import type { Compute } from "../Utils"
import * as CaseEquals from "./_internal/Equals"
import * as CaseHash from "./_internal/Hash"
import type { HasEquals } from "./HasEquals"
import { equalsSym } from "./HasEquals"
import type { HasHash } from "./HasHash"
import { hashSym } from "./HasHash"

export type ConstructorArgs<T, K extends PropertyKey> = Compute<
  {} extends Omit<T, "#args" | "copy" | "toJSON" | "toString" | symbol | K>
    ? void
    : Omit<T, "#args" | "copy" | "toJSON" | "toString" | symbol | K>,
  "flat"
>

export class Case<T, K extends PropertyKey = never> implements HasEquals, HasHash {
  #args: ConstructorArgs<T, K>
  #hash: number | undefined

  constructor(args: ConstructorArgs<T, K>) {
    this.#args = args

    for (const key in args) {
      Object.assign(this, { [key]: args[key] })
    }
  }

  copy(args: Partial<ConstructorArgs<T, K>>): this {
    // @ts-expect-error
    return new this.constructor({ ...this.#args, ...args })
  }

  [equalsSym](other: unknown): boolean {
    return other instanceof Case ? CaseEquals.equals(this.#args, other.#args) : false
  }

  [hashSym](): number {
    if (!this.#hash) {
      this.#hash = CaseHash.hash(this.#args)
    }
    return this.#hash
  }

  // @ts-expect-error
  private toJSON() {
    return this.#args
  }
}

export function equals(x: HasEquals, y: unknown) {
  return x[equalsSym](y)
}

export function hash(x: HasHash) {
  return x[hashSym]()
}

export { equalsSym, hasEquals, HasEquals } from "./HasEquals"
export { HasHash, hasHash, hashSym } from "./HasHash"
