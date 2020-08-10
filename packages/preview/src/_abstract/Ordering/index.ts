import { typeDef, TypeOf, newtype } from "../Newtype"

const Ordering_ = typeDef<"lt" | "eq" | "gt">()("@newtype/Ordering")

export interface Ordering extends TypeOf<typeof Ordering_> {}

export const Ordering = newtype<Ordering>()(Ordering_)
