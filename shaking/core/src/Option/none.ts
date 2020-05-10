import type { Option } from "fp-ts/lib/Option"

export const none: Option<never> = { _tag: "None" }
