import * as Cause from "effect/Cause"
import { dual } from "effect/Function"
import * as HashMap from "effect/HashMap"
import * as core from "effect/internal/core"
import * as _fiberId from "effect/internal/fiberId"
import * as fiberRefs from "effect/internal/fiberRefs"
import * as List from "effect/List"
import type * as Logger from "effect/Logger"

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
