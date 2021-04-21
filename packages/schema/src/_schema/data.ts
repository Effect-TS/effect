// tracing: off

import { Case } from "@effect-ts/system/Case"

export class Data<T> extends Case<T, "_tag"> {}
