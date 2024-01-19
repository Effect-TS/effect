import { Tag } from "effect/Context"
import type * as Terminal from "../Terminal.js"

/** @internal */
export const tag = Tag("Platform/Terminal")<Terminal.Terminal>()
