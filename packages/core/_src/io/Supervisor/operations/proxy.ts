export class ProxySupervisor<A> extends Supervisor<A> {
  constructor(value: Effect.UIO<A>, underlying: Supervisor<any>) {
    super(
      value,
      underlying.unsafeOnStart,
      underlying.unsafeOnEnd,
      underlying.unsafeOnEffect,
      underlying.unsafeOnSuspend,
      underlying.unsafeOnResume
    )
  }
}
