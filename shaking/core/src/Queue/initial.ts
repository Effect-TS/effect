import { right } from "../Either"
import { empty } from "../Support/Dequeue"

import type { State } from "./State"

export const initial = <A>(): State<A> => right(empty())
