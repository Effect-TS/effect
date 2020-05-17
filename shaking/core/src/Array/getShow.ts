import * as RA from "../Readonly/Array/getShow"
import type { Show } from "../Show"

export const getShow: <A>(S: Show<A>) => Show<Array<A>> = RA.getShow
