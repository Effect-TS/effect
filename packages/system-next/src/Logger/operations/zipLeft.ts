import type { Logger } from "../definition"
import { map_ } from "./map"
import { zip_ } from "./zip"

export function zipLeft_<Message, Output, Output1>(
  self: Logger<Message, Output>,
  that: Logger<Message, Output1>
): Logger<Message, Output> {
  return map_(zip_(self, that), (tuple) => tuple.get(0))
}

/**
 * @ets_data_first zipLeft_
 */
export function zipLeft<Message, Output1>(that: Logger<Message, Output1>) {
  return <Output>(self: Logger<Message, Output>): Logger<Message, Output> =>
    zipLeft_(self, that)
}
