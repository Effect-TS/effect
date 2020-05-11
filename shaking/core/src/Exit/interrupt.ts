import { none } from "../Option"

import type { Interrupt } from "./Exit"

export const interrupt: Interrupt = {
  _tag: "Interrupt",
  remaining: none
}
