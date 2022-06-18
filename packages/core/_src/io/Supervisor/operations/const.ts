export class ConstSupervisor<A> extends Supervisor<A> {
  constructor(value: Effect<never, never, A>) {
    super(value, () => undefined, () => undefined)
  }
}
