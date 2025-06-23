import * as Headers from "@effect/platform/Headers"
import * as IncomingMessage from "@effect/platform/HttpIncomingMessage"
import * as UrlParams from "@effect/platform/UrlParams"
import * as Effect from "effect/Effect"
import * as Inspectable from "effect/Inspectable"
import * as Option from "effect/Option"
import type * as Stream from "effect/Stream"
import type * as Http from "node:http"
import * as NodeStream from "../NodeStream.js"

/** @internal */
export abstract class HttpIncomingMessageImpl<E> extends Inspectable.Class
  implements IncomingMessage.HttpIncomingMessage<E>
{
  readonly [IncomingMessage.TypeId]: IncomingMessage.TypeId

  constructor(
    readonly source: Http.IncomingMessage,
    readonly onError: (error: unknown) => E,
    readonly remoteAddressOverride?: string
  ) {
    super()
    this[IncomingMessage.TypeId] = IncomingMessage.TypeId
  }

  get headers() {
    return Headers.fromInput(this.source.headers as any)
  }

  get remoteAddress() {
    return Option.fromNullable(this.remoteAddressOverride ?? this.source.socket.remoteAddress)
  }

  private textEffect: Effect.Effect<string, E> | undefined
  get text(): Effect.Effect<string, E> {
    if (this.textEffect) {
      return this.textEffect
    }
    this.textEffect = Effect.runSync(Effect.cached(
      Effect.flatMap(
        IncomingMessage.MaxBodySize,
        (maxBodySize) =>
          NodeStream.toString(() => this.source, {
            onFailure: this.onError,
            maxBytes: Option.getOrUndefined(maxBodySize)
          })
      )
    ))
    return this.textEffect
  }

  get unsafeText(): string {
    return Effect.runSync(this.text)
  }

  get json(): Effect.Effect<unknown, E> {
    return Effect.tryMap(this.text, {
      try: (_) => _ === "" ? null : JSON.parse(_) as unknown,
      catch: this.onError
    })
  }

  get unsafeJson(): unknown {
    return Effect.runSync(this.json)
  }

  get urlParamsBody(): Effect.Effect<UrlParams.UrlParams, E> {
    return Effect.flatMap(this.text, (_) =>
      Effect.try({
        try: () => UrlParams.fromInput(new URLSearchParams(_)),
        catch: this.onError
      }))
  }

  get stream(): Stream.Stream<Uint8Array, E> {
    return NodeStream.fromReadable<E, Uint8Array>(
      () => this.source,
      this.onError
    )
  }

  get arrayBuffer(): Effect.Effect<ArrayBuffer, E> {
    return Effect.flatMap(
      IncomingMessage.MaxBodySize,
      (maxBodySize) =>
        NodeStream.toUint8Array(() => this.source, {
          onFailure: this.onError,
          maxBytes: Option.getOrUndefined(maxBodySize)
        })
    )
  }
}
