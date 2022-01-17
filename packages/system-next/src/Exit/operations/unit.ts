import type { Exit } from "../definition"
import { succeed } from "./succeed"

export const unit: Exit<never, void> = succeed(undefined)
