import * as Cause from "../Cause"
import { dual } from "../Function"
import * as HashMap from "../HashMap"
import * as core from "../internal/core"
import * as _fiberId from "../internal/fiberId"
import * as fiberRefs from "../internal/fiberRefs"
import * as List from "../List"
import type * as Logger from "../Logger"

/** @internal */
export const test = dual<
  <Message>(input: Message) => <Output>(self: Logger.Logger<Message, Output>) => Output,
  <Message, Output>(self: Logger.Logger<Message, Output>, input: Message) => Output
>(2, (self, input) =>
  self.log({
    fiberId: _fiberId.none,
    logLevel: core.logLevelInfo,
    message: input,
    cause: Cause.empty,
    context: fiberRefs.empty(),
    spans: List.empty(),
    annotations: HashMap.empty(),
    date: new Date()
  }))
