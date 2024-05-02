import * as Cause from "../Cause.js"
import { dual } from "../Function.js"
import * as HashMap from "../HashMap.js"
import * as List from "../List.js"
import type * as Logger from "../Logger.js"
import * as _fiberId from "./fiberId.js"
import * as fiberRefs from "./fiberRefs.js"
import * as logLevel from "./logLevel.js"

/** @internal */
export const test = dual<
  <Message>(input: Message) => <Output>(self: Logger.Logger<Message, Output>) => Output,
  <Message, Output>(self: Logger.Logger<Message, Output>, input: Message) => Output
>(2, (self, input) =>
  self.log({
    fiberId: _fiberId.none,
    logLevel: logLevel.info,
    message: input,
    cause: Cause.empty,
    context: fiberRefs.empty(),
    spans: List.empty(),
    annotations: HashMap.empty(),
    date: new Date()
  }))
