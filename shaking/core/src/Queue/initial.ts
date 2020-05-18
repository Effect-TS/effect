import { right } from "../Either"
import { empty } from "../Support/Dequeue"

import { State } from "./State"

export const initial = <A>(): State<A> => right(empty())
