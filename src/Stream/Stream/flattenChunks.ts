import * as M from "../../Managed"
import * as BP from "../BufferedPull"
import { Stream } from "./definitions"

export function flattenChunks<R, E, O>(
  self: Stream<R, E, readonly O[]>
): Stream<R, E, O> {
  return new Stream(M.map_(M.mapM_(self.proc, BP.make), BP.pullElement))
}
