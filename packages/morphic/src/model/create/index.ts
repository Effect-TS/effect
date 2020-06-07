import type { Branded } from "@matechs/core/Branded"

export interface Validatedbrand {
  readonly validated: unique symbol
}

export type Validated<A> = Branded<A, Validatedbrand>
