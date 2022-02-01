// ets_tracing: off

import type * as O from "@effect-ts/system/Option"

import { fold } from "../../Identity/index.js"
import type { AOfOptions } from "../definitions.js"
import { getFirstIdentity } from "./getFirstIdentity.js"

export function getFirst<Ts extends O.Option<any>[]>(
  ...items: Ts
): O.Option<AOfOptions<Ts>> {
  return fold(getFirstIdentity<AOfOptions<Ts>>())(items)
}
