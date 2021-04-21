// tracing: off

import type { Schema } from "../_schema"
import { identity } from "../_schema"

export const unknown: Schema<
  unknown,
  never,
  unknown,
  unknown,
  never,
  unknown,
  unknown,
  {}
> = identity((_): _ is unknown => true)
