import type { Effect, UIO } from "../../Effect"
import type { Managed } from "../../Managed"
import type { XDequeue } from "../../Queue"
import { _A, _B, _EA, _EB, _RA, _RB } from "./symbols"

/**
 * A `Hub<A>` is an asynchronous message hub into which publishers can publish
 * messages of type `A` and subscribers can subscribe to take messages of type
 * `A`.
 */
export type Hub<A> = XHub<unknown, unknown, never, never, A, A>

export const HubSym = Symbol.for("@effect-ts/core/io/XHub")
export type HubSym = typeof HubSym

/**
 * An `XHub<RA, RB, EA, EB, A, B>` is an asynchronous message hub. Publishers
 * can publish messages of type `A` to the hub and subscribers can subscribe to
 * take messages of type `B` from the hub. Publishing messages can require an
 * environment of type `RA` and fail with an error of type `EA`. Taking messages
 * can require an environment of type `RB` and fail with an error of type `EB`.
 *
 * @tsplus type ets/XHub
 */
export interface XHub<RA, RB, EA, EB, A, B> {
  readonly [HubSym]: HubSym

  readonly [_RA]: (_: RA) => void
  readonly [_RB]: (_: RB) => void
  readonly [_EA]: () => EA
  readonly [_EB]: () => EB
  readonly [_A]: (_: A) => void
  readonly [_B]: () => B
}

/**
 * @tsplus type ets/XHubOps
 */
export interface XHubOps {}
export const Hub: XHubOps = {}

/**
 * @tsplus unify ets/XHub
 */
export function unifyXHub<X extends XHub<any, any, any, any, any, any>>(
  self: X
): XHub<
  [X] extends [{ [k in typeof _RA]: (_: infer RA) => void }] ? RA : never,
  [X] extends [{ [k in typeof _RB]: (_: infer RB) => void }] ? RB : never,
  [X] extends [{ [k in typeof _EA]: () => infer EA }] ? EA : never,
  [X] extends [{ [k in typeof _EB]: () => infer EB }] ? EB : never,
  [X] extends [{ [k in typeof _A]: (_: infer A) => void }] ? A : never,
  [X] extends [{ [k in typeof _B]: () => infer B }] ? B : never
> {
  return self
}

/**
 * @tsplus macro remove
 */
export function concreteHub<RA, RB, EA, EB, A, B>(
  _: XHub<RA, RB, EA, EB, A, B>
): asserts _ is XHubInternal<RA, RB, EA, EB, A, B> {
  //
}

export abstract class XHubInternal<RA, RB, EA, EB, A, B>
  implements XHub<RA, RB, EA, EB, A, B>
{
  readonly [HubSym]: HubSym = HubSym;

  readonly [_RA]!: (_: RA) => void;
  readonly [_RB]!: (_: RB) => void;
  readonly [_EA]!: () => EA;
  readonly [_EB]!: () => EB;
  readonly [_A]!: (_: A) => void;
  readonly [_B]!: () => B

  /**
   * Waits for the hub to be shut down.
   */
  abstract _awaitShutdown: UIO<void>

  /**
   * The maximum capacity of the hub.
   */
  abstract _capacity: number

  /**
   * Checks whether the hub is shut down.
   */
  abstract _isShutdown: UIO<boolean>

  /**
   * Publishes a message to the hub, returning whether the message was
   * published to the hub.
   */
  abstract _publish(a: A, __tsplusTrace?: string): Effect<RA, EA, boolean>

  /**
   * Publishes all of the specified messages to the hub, returning whether
   * they were published to the hub.
   */
  abstract _publishAll(as: Iterable<A>, __tsplusTrace?: string): Effect<RA, EA, boolean>

  /**
   * Shuts down the hub.
   */
  abstract _shutdown: UIO<void>

  /**
   * The current number of messages in the hub.
   */
  abstract _size: UIO<number>

  /**
   * Subscribes to receive messages from the hub. The resulting subscription
   * can be evaluated multiple times within the scope of the managed to take a
   * message from the hub each time.
   */
  abstract _subscribe: Managed<unknown, never, XDequeue<RB, EB, B>>
}
