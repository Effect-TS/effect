export type { Either, Left, Right } from "fp-ts/lib/Either"
import type { Either } from "fp-ts/lib/Either"

import type { URI } from "./URI"

declare module "fp-ts/lib/HKT" {
  interface URItoKind2<E, A> {
    [URI]: Either<E, A>
  }
}
