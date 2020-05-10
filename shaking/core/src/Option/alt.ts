import type { Option } from "fp-ts/lib/Option"

import { isNone } from "./isNone"

export const alt: <A>(that: () => Option<A>) => (fa: Option<A>) => Option<A> = (
  that
) => (fa) => (isNone(fa) ? that() : fa)
