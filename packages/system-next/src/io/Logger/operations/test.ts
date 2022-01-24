import * as Chunk from "../../../collection/immutable/Chunk/core"
import * as TraceElement from "../../../io/TraceElement"
import * as FiberId from "../../FiberId"
import * as LogLevel from "../../LogLevel"
import type { Logger } from "../definition"

export function test_<Message, Output>(
  self: Logger<Message, Output>,
  input: Message
): Output {
  return self(
    TraceElement.NoLocation,
    FiberId.none,
    LogLevel.Info,
    () => input,
    new Map(),
    Chunk.empty(),
    TraceElement.NoLocation
  )
}

/**
 * @ets_data_first test_
 */
export function test<Message>(input: Message) {
  return <Output>(self: Logger<Message, Output>): Output => test_(self, input)
}
