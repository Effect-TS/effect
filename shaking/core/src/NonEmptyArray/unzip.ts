import { unzip as unzip_1 } from "../Readonly/NonEmptyArray/unzip"

import type { NonEmptyArray } from "./NonEmptyArray"

/**
 * @since 2.5.1
 */
export const unzip: <A, B>(
  as: NonEmptyArray<[A, B]>
) => [NonEmptyArray<A>, NonEmptyArray<B>] = unzip_1 as any
