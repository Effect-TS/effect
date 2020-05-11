import { none } from "../Option"

import type { Interrupt } from "./Exit"

export const interruptWithError = (...errors: Array<Error>): Interrupt =>
  errors.length > 0
    ? {
        _tag: "Interrupt",
        errors,
        remaining: none
      }
    : {
        _tag: "Interrupt",
        remaining: none
      }
