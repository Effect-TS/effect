import type { List } from "./common"

export const nil: List<never> = { _tag: "nil" }
