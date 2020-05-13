import { zip as zip_1 } from "../Readonly/NonEmptyArray/zip"

import type { NonEmptyArray } from "./NonEmptyArray"

/**
 * @since 2.5.1
 */
export const zip: <A, B>(
  fa: NonEmptyArray<A>,
  fb: NonEmptyArray<B>
) => NonEmptyArray<[A, B]> = zip_1 as any
