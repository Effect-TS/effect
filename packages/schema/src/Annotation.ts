/**
 * @since 1.0.0
 */
import { pipe } from "@fp-ts/data/Function"
import type { Option } from "@fp-ts/data/Option"
import * as RA from "@fp-ts/data/ReadonlyArray"

/**
 * @since 1.0.0
 */
export interface Annotations extends ReadonlyArray<unknown> {}

/**
 * @since 1.0.0
 */
export const find = <A>(
  annotations: Annotations,
  is: (annotation: unknown) => annotation is A
): Option<A> => pipe(annotations, RA.findFirst(is))
