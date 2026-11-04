/**
 * Every operation of the Node terminal in one layer: a `Layer<Terminal>` by
 * annotation, because the record's identity is the union of its members' keys.
 */
import * as Layer from "effect/Layer"
import type * as Terminal from "../../Terminal.ts"
import { columns } from "./columns.ts"
import { display } from "./display.ts"
import { readInput } from "./readInput.ts"
import { readLine } from "./readLine.ts"
import { rows } from "./rows.ts"
import { size } from "./size.ts"

export const layer: Layer.Layer<Terminal.Terminal> = Layer.mergeAll(columns, display, readInput, readLine, rows, size)
