// ets_tracing: off

import type { Logger } from "../definition"
import { map_ } from "./map"
import { zip_ } from "./zip"

export function zipRight_<Message, Output, Output1>(
  self: Logger<Message, Output>,
  that: Logger<Message, Output1>
): Logger<Message, Output1> {
  return map_(zip_(self, that), (tuple) => tuple.get(1))
}

/**
 * @ets_data_first zipRight_
 */
export function zipRight<Message, Output1>(that: Logger<Message, Output1>) {
  return <Output>(self: Logger<Message, Output>): Logger<Message, Output1> =>
    zipRight_(self, that)
}
