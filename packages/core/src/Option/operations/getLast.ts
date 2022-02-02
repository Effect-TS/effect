// ets_tracing: off

import type * as O from "@effect-ts/system/Option"

import { fold } from "../../Identity"
import type { AOfOptions } from "../definitions"
import { getLastIdentity } from "./getLastIdentity"

export function getLast<Ts extends O.Option<any>[]>(
  ...items: Ts
): O.Option<AOfOptions<Ts>> {
  return fold(getLastIdentity<AOfOptions<Ts>>())(items)
}
