export class ConstSupervisor<A> extends Supervisor<A> {
  constructor(value: Effect.UIO<A>) {
    super(value, () => undefined, () => undefined)
  }
}
