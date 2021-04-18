// tracing: off

import type { Compute } from "../Utils"

export type ConstructorArgs<T, K extends PropertyKey> = Compute<
  {} extends Omit<T, "copy" | "toJSON" | "toString" | symbol | K>
    ? void
    : Omit<T, "copy" | "toJSON" | "toString" | symbol | K>,
  "flat"
>

export const CaseBrand = Symbol()

export interface CaseBrand {
  [CaseBrand](): void
}

export class Case<T, K extends PropertyKey = never> implements CaseBrand {
  #args: ConstructorArgs<T, K>

  constructor(args: ConstructorArgs<T, K>) {
    this.#args = args

    Object.assign(this, args)
  }

  copy(args: Partial<ConstructorArgs<T, K>>): this {
    // @ts-expect-error
    return new this.constructor({ ...this.#args, ...args })
  }

  [CaseBrand]() {
    //
  }
}
