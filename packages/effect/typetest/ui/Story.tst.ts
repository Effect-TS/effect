import { Effect, Schema, Stream } from "effect"
import { Command } from "effect/ui"
import { Story } from "effect/ui/testing"
import { describe, expect, it } from "tstyche"
import {
  Counter,
  CounterMessage,
  SaveTodo,
  Search,
  SearchMessage,
  TodoItemMessage,
  Upload
} from "../../test/ui/fixtures/components.ts"

describe("Story", () => {
  it("types steps by the component", () => {
    const story = Story.make(
      Counter,
      { initial: 0 },
      Story.model((model) => {
        expect(model).type.toBe<{ readonly count: number }>()
      }),
      Story.props((props) => {
        expect(props).type.toBe<{ readonly initial: number }>()
        return props
      }),
      Story.send(CounterMessage.make({ _tag: "Increment" }))
    )
    expect(story.model).type.toBe<{ readonly count: number }>()
    expect(Story.make).type.not.toBeCallableWith(Counter, { initial: "0" })
    expect(Story.make).type.not.toBeCallableWith(Counter, { initial: 0 }, Story.send("not a message"))
  })

  it("resolves a Command with the definition's own message", () => {
    expect(Story.resolve).type.toBeCallableWith(SaveTodo, TodoItemMessage.make({ _tag: "Saved" }))
    expect(Story.resolve).type.not.toBeCallableWith(SaveTodo, SearchMessage.make({ _tag: "Tick" }))
    expect(Story.resolve).type.toBeCallableWith(Search("x"), SearchMessage.make({ _tag: "Results", items: [] }))
  })

  it("a mapped Command as the target takes the definition's own result", () => {
    const Uploaded = Schema.TaggedUnion({ Uploaded: { url: Schema.String } })
    const UploadFile = Command.make("UploadFile", (name: string) => Effect.succeed(`https://cdn/${name}`))
    const mapped = UploadFile("me.png").pipe(Command.map((url) => Uploaded.make({ _tag: "Uploaded", url })))
    expect(mapped).type.toBe<Command.Effectful<typeof Uploaded.Type, never, string>>()
    expect(Story.resolve).type.toBeCallableWith(mapped, "https://cdn/me.png")
    expect(Story.resolve).type.not.toBeCallableWith(mapped, Uploaded.make({ _tag: "Uploaded", url: "" }))
    const Progress = Command.make("Progress", (_: string) => Stream.fromIterable([1, 2]), { stream: true })
    const mappedStream = Progress("x").pipe(
      Command.map((percent) => Uploaded.make({ _tag: "Uploaded", url: String(percent) }))
    )
    expect(Story.next).type.toBeCallableWith(mappedStream, 50)
    expect(Story.next).type.not.toBeCallableWith(mappedStream, Uploaded.make({ _tag: "Uploaded", url: "" }))
    expect(Story.end).type.toBeCallableWith(mappedStream)
  })

  it("next and end only take stream Commands", () => {
    expect(Story.next).type.toBeCallableWith(Upload, SearchMessage.make({ _tag: "Progress", percent: 1 }))
    expect(Story.end).type.toBeCallableWith(Upload)
    expect(Story.next).type.not.toBeCallableWith(Search, SearchMessage.make({ _tag: "Results", items: [] }))
    expect(Story.end).type.not.toBeCallableWith(SaveTodo)
  })
})
