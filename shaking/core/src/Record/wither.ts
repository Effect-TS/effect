import type { Wither1 } from "fp-ts/lib/Witherable"

import { wither as wither_1 } from "../Readonly/Record/wither"

import { URI } from "./URI"

export const wither: Wither1<URI> = wither_1 as any
