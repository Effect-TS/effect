import { pipe } from "../../Function"
import { typeDef, TypeOf, newtype } from "../Newtype"

const Ordering_ = typeDef<"lt" | "eq" | "gt">()("@newtype/Ordering")

export interface Ordering extends TypeOf<typeof Ordering_> {}

export const Ordering = newtype<Ordering>()(Ordering_)

export const toNumber = (o: Ordering) =>
  pipe(Ordering.unwrap(o), (o) => {
    switch (o) {
      case "eq": {
        return 0
      }
      case "gt": {
        return 1
      }
      case "lt": {
        return -1
      }
    }
  })
