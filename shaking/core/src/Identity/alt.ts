import { alt_ } from "./alt_"

export const alt: <A>(that: () => A) => (fa: A) => A = (that) => (fa) => alt_(fa, that)
