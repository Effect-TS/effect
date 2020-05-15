import type { Traverse1 } from "fp-ts/lib/Traversable"

import { traverse_ as traverse_1 } from "../Readonly/Record/traverse_"

import { URI } from "./URI"

export const traverse_: Traverse1<URI> = traverse_1 as any
