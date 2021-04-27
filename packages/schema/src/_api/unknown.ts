// tracing: off

import type { Schema } from "../_schema"
import { identified, identity } from "../_schema"

export const unknownIdentifier = Symbol.for("@effect-ts/schema/ids/unknown")

export const unknown: Schema<
  unknown,
  never,
  unknown,
  unknown,
  never,
  unknown,
  unknown,
  {}
> = identity((_): _ is unknown => true)["|>"](identified(unknownIdentifier, {}))
