// ets_tracing: off

import "../../Operator/index.js"

import { AtomicReference } from "../AtomicReference/index.js"

export class AtomicBoolean extends AtomicReference<boolean> {
  constructor(b: boolean) {
    super(b)
  }
}
