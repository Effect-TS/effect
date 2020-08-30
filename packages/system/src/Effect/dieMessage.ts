import { RuntimeError } from "../Cause"
import { die } from "./die"
import type { Sync } from "./effect"

export const dieMessage = (message: string): Sync<never> =>
  die(new RuntimeError(message))
