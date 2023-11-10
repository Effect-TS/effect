import { Cause } from "../Cause.js"
import { dual } from "../Function.js"
import { HashMap } from "../HashMap.js"
import { List } from "../List.js"
import type { Logger } from "../Logger.js"
import * as core from "./core.js"
import * as _fiberId from "./fiberId.js"
import * as fiberRefs from "./fiberRefs.js"

/** @internal */
export const test = dual<
  <Message>(input: Message) => <Output>(self: Logger<Message, Output>) => Output,
  <Message, Output>(self: Logger<Message, Output>, input: Message) => Output
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
