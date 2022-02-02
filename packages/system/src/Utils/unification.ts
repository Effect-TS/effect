// ets_tracing: off

import type { Unify } from "./union.js"

export interface HasUnify {
  /**
   * @ets_rewrite_method _ from "smart:identity"
   */
  unify<Self>(this: Self): Unify<Self>
}

declare global {
  interface Object extends HasUnify {}
  interface Function extends HasUnify {
    /**
     * @ets_rewrite_method _ from "smart:identity"
     */
    unify<Self extends any[], Ret>(
      this: (...args: Self) => Ret
    ): (...args: Self) => Unify<Ret>
  }
}

let patched = false

export function patch() {
  if (patched || Object.prototype["|>"]) {
    return
  }

  Object.defineProperty(Object.prototype, "unify", {
    value<Self>(this: Self): Self {
      return this
    },
    enumerable: false,
    writable: true
  })

  patched = true
}

patch()

export {}
