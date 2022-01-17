import { contramap_, number } from "../../Ord"
import type { LogLevel } from "../definition"

export const ordLogLevel = contramap_(number, (level: LogLevel) => level.ordinal)
