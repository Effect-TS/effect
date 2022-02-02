import { Chunk } from "../../../../collection/immutable/Chunk"
import type { Tag } from "../../../../data/Has"
import type { Logger } from "../../definition"
import * as LoggerMap from "../../operations/map"
import * as LoggerSucceed from "../../operations/succeed"
import * as LoggerZip from "../../operations/zip"
import type { LoggerSet } from "../definition"
import { getAll_ } from "./getAll"

export function toLoggerWith_<C>(typeTag: Tag<C>) {
  return <A, B, B1>(
    self: LoggerSet<A, B>,
    def: B1,
    f: (acc: B1, b: B) => B1
  ): Logger<C, B1> => {
    return Chunk.from(getAll_(self, typeTag)).reduce(
      LoggerSucceed.succeed(def),
      (acc, a) => LoggerMap.map_(LoggerZip.zip_(acc, a), ({ tuple: [x, y] }) => f(x, y))
    )
  }
}

export function toLoggerWith<C>(typeTag: Tag<C>) {
  return <B, B1>(def: B1, f: (acc: B1, b: B) => B1) => {
    return <A>(self: LoggerSet<A, B>): Logger<C, B1> =>
      toLoggerWith_(typeTag)(self, def, f)
  }
}
