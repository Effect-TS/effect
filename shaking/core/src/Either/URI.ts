import type { Either } from "fp-ts/lib/Either"

export const URI = "EitherMerge"
export type URI = typeof URI

declare module "fp-ts/lib/HKT" {
  interface URItoKind2<E, A> {
    [URI]: Either<E, A>
  }
}
