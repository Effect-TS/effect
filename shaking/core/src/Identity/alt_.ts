import { identity as id } from "../Function"

export const alt_: <A>(fx: A, fy: () => A) => A = id
