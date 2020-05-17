import { sequence } from "../Tree"

import { managed } from "./managed"

export const parSequenceTree = sequence(managed)
