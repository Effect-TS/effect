import type { Either } from "@matechs/core/Either"
import type { Branded, Errors } from "@matechs/core/Model"

export interface Validatedbrand {
  readonly validated: unique symbol
}

export type Validated<A> = Branded<A, Validatedbrand>

export interface Create<A> {
  (a: A): Either<Errors, Validated<A>>
}
