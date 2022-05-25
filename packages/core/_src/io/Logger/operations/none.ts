/**
 * A logger that does nothing in response to logging events.
 *
 * @tsplus static ets/Logger/Ops none
 */
export const none: Logger<unknown, void> = {
  apply: () => undefined
}
