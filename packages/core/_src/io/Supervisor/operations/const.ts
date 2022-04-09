export class ConstSupervisor<A> extends Supervisor<A> {
  constructor(value: UIO<A>) {
    super(value, () => undefined, () => undefined);
  }
}
