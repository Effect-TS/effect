import { RuntimeError } from "../../Cause/errors"
import type { Managed } from "../definition"
import { die } from "./die"

/**
 * Returns an effect that dies with a `RuntimeError` having the specified text
 * message. This method can be used for terminating a fiber because a defect
 * has been detected in the code.
 */
export function dieMessage(
  message: string,
  __trace?: string
): Managed<unknown, never, never> {
  return die(new RuntimeError(message), __trace)
}
