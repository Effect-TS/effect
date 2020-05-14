import { map_ } from "./map_"

export const map: <A, B>(f: (a: A) => B) => (fa: A) => B = (f) => (fa) => map_(fa, f)
