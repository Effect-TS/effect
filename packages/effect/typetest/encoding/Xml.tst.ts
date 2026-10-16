import { type Array as Arr, type Channel, Stream } from "effect"
import { Xml } from "effect/encoding"
import { describe, expect, it } from "tstyche"

describe("Xml", () => {
  it("decoders emit events and keep upstream errors", () => {
    expect(Xml.decodeString()).type.toBe<
      Channel.Channel<
        Arr.NonEmptyReadonlyArray<Xml.Event>,
        Xml.XmlError,
        unknown,
        Arr.NonEmptyReadonlyArray<string>,
        never,
        unknown
      >
    >()

    const bytes = Stream.fail("Io") as Stream.Stream<Uint8Array, "Io">
    expect(bytes.pipe(Stream.pipeThroughChannel(Xml.decode()))).type.toBe<
      Stream.Stream<Xml.Event, Xml.XmlError | "Io">
    >()

    const text = Stream.fail("Io") as Stream.Stream<string, "Io">
    expect(text.pipe(Stream.pipeThroughChannel(Xml.decodeString()))).type.toBe<
      Stream.Stream<Xml.Event, Xml.XmlError | "Io">
    >()
  })

  it("elements composes after a decoder", () => {
    const bytes = Stream.fail("Io") as Stream.Stream<Uint8Array, "Io">
    expect(
      bytes.pipe(
        Stream.pipeThroughChannel(Xml.decode()),
        Stream.pipeThroughChannel(Xml.elements(["rss", "channel", "item"]))
      )
    ).type.toBe<Stream.Stream<Xml.Element, Xml.XmlError | "Io">>()
  })

  it("encoders accept events only", () => {
    const events = Stream.fail("Io") as Stream.Stream<Xml.Event, "Io">
    expect(events.pipe(Stream.pipeThroughChannel(Xml.encodeString()))).type.toBe<
      Stream.Stream<string, Xml.XmlError | "Io">
    >()
    expect(events.pipe(Stream.pipeThroughChannel(Xml.encode()))).type.toBe<
      Stream.Stream<Uint8Array, Xml.XmlError | "Io">
    >()

    const starts = Stream.make({ _tag: "StartElement", name: "a", attributes: {} } as const)
    expect(starts.pipe(Stream.pipeThroughChannel(Xml.encodeString()))).type.toBe<
      Stream.Stream<string, Xml.XmlError>
    >()

    const strings = Stream.make("<a/>")
    expect(Stream.pipeThroughChannel).type.not.toBeCallableWith(strings, Xml.encodeString())
  })
})
