import { AtomicReference } from "../AtomicReference"

export class AtomicBoolean extends AtomicReference<boolean> {
  constructor(b: boolean) {
    super(b)
  }
}
