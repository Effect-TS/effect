import type { Either } from "fp-ts/lib/Either"

export const URI = "@matechs/core/Either"
export type URI = typeof URI

declare module "../Base/HKT" {
  interface URItoKind2<E, A> {
    [URI]: Either<E, A>
  }
}
