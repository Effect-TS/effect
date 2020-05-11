import { none } from "../Option"

import type { Raise } from "./Exit"

export function raise<E>(e: E): Raise<E> {
  return {
    _tag: "Raise",
    error: e,
    remaining: none
  }
}
