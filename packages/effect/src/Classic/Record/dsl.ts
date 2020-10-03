import { sequenceF } from "../../Prelude"
import { Traversable } from "./instances"

/**
 * Like traverse(identity)
 */
export const sequence = sequenceF(Traversable)
