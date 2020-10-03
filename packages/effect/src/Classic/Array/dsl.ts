import { sequenceF } from "../../Prelude"
import { Traversable } from "./instances"

export const sequence = sequenceF(Traversable)
