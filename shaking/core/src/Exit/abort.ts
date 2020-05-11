import { none } from "../Option"

import type { Abort } from "./Exit"

export function abort(a: unknown): Abort {
  return {
    _tag: "Abort",
    abortedWith: a,
    remaining: none
  }
}
