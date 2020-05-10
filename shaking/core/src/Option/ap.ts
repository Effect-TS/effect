import type { Option } from "fp-ts/lib/Option"

import { ap_ } from "./ap_"

export const ap: <A>(fa: Option<A>) => <B>(fab: Option<(a: A) => B>) => Option<B> = (
  fa
) => (fab) => ap_(fab, fa)
