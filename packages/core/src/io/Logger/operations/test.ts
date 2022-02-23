import { List } from "../../../collection/immutable/List"
import * as Map from "../../../collection/immutable/Map"
import { TraceElement } from "../../../io/TraceElement"
import { Cause } from "../../Cause"
import { FiberId } from "../../FiberId"
import { LogLevel } from "../../LogLevel"
import type { Logger } from "../definition"

/**
 * @tsplus fluent ets/Logger test
 */
export function test_<Message, Output>(
  self: Logger<Message, Output>,
  input: Message
): Output {
  return self.apply(
    TraceElement.empty,
    FiberId.none,
    LogLevel.Info,
    () => input,
    () => Cause.empty,
    Map.empty,
    List.empty(),
    Map.empty
  )
}

/**
 * @ets_data_first test_
 */
export function test<Message>(input: Message) {
  return <Output>(self: Logger<Message, Output>): Output => self.test(input)
}
