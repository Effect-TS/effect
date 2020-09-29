import { single } from "../../Array"
import { map as mapT, toManaged } from "../../Effect"
import { flow, pipe } from "../../Function"
import { map as mapM } from "../../Managed"
import { getAndUpdate, makeRef } from "../../Ref"
import type { UIO } from "./definitions"
import { Stream } from "./definitions"

/**
 * The infinite stream of iterative function application: a, f(a), f(f(a)), f(f(f(a))), ...
 */
export const iterate = <A>(a: A, f: (a: A) => A): UIO<A> =>
  new Stream(pipe(makeRef(a), toManaged(), mapM(flow(getAndUpdate(f), mapT(single)))))
