import { single } from "../../Array"
import { map as mapT, toManaged } from "../../Effect"
import { flow, pipe } from "../../Function"
import { map as mapM } from "../../Managed"
import { getAndUpdate, makeRef } from "../../Ref"
import type { Sync } from "./definitions"
import { Stream } from "./definitions"

export const iterate = <A>(a: A, f: (a: A) => A): Sync<A> =>
  new Stream(pipe(makeRef(a), toManaged(), mapM(flow(getAndUpdate(f), mapT(single)))))
