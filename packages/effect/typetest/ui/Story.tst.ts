import { Data, Effect, Schema, Stream } from "effect"
import { Command, Component } from "effect/ui"
import { Story } from "effect/ui/testing"
import { describe, expect, it } from "tstyche"
import type { SearchBox, TodoItem } from "../../test/ui/fixtures/components.ts"
import {
  Counter,
  CounterMessage,
  SaveTodo,
  Search,
  SearchMessage,
  TodoItemMessage,
  Upload
} from "../../test/ui/fixtures/components.ts"

declare const counter: Story.Steps<typeof Counter>
declare const todoItem: Story.Steps<typeof TodoItem>
declare const searchBox: Story.Steps<typeof SearchBox>

describe("Story", () => {
  it("types steps by the component", () => {
    const story = Story.make(Counter, { initial: 0 }, (s) =>
      s.model((model) => {
        expect(model).type.toBe<{ readonly count: number }>()
      })
        .props((props) => {
          expect(props).type.toBe<{ readonly initial: number }>()
          return props
        })
        .send(CounterMessage.make({ _tag: "Increment" })))
    expect(story.model).type.toBe<{ readonly count: number }>()
    expect(Story.make).type.not.toBeCallableWith(Counter, { initial: "0" }, () => {})
    expect(counter.send).type.not.toBeCallableWith("not a message")
    expect(counter.send).type.not.toBeCallableWith(TodoItemMessage.make({ _tag: "Save" }))
    expect(counter.given).type.not.toBeCallableWith({ saving: true })
  })

  it("a chained arrow and a block callback with no return both compile", () => {
    expect(Story.make).type.toBeCallableWith(
      Counter,
      { initial: 0 },
      (s: Story.Steps<typeof Counter>) => s.click("+").click("+")
    )
    expect(Story.make).type.toBeCallableWith(Counter, { initial: 0 }, (s: Story.Steps<typeof Counter>) => {
      s.click("+")
    })
  })

  it("a shared step needs no explicit generics", () => {
    const twice = (s: Story.Steps<typeof Counter>) => s.click("+").click("+")
    expect(counter.pipe(twice)).type.toBe<Story.Steps<typeof Counter>>()
    expect(todoItem.pipe).type.not.toBeCallableWith(twice)
  })

  it("a step over any component keeps the caller's type", () => {
    const clickPlus = <S extends Story.Steps.Any>(s: S): S => s.click("+")
    expect(clickPlus(counter)).type.toBe<Story.Steps<typeof Counter>>()
    expect(counter.pipe(clickPlus).current.model).type.toBe<{ readonly count: number }>()
  })

  it("a component with no messages is a story, with its types kept", () => {
    const Static = Component.make({
      name: "Static",
      model: Schema.Number,
      message: Schema.Never,
      init: () => 0,
      update: (model) => model,
      view: (model, h) => h.el("p", String(model))
    })
    const steps = Story.start(Static, {})
    expect(steps).type.toBe<Story.Steps<typeof Static>>()
    expect(steps.current.model).type.toBe<number>()
    expect(Story.make(Static, {}, (s) => s.given(1)).model).type.toBe<number>()
    expect(steps.send).type.not.toBeCallableWith(CounterMessage.make({ _tag: "Increment" }))
    const shared = <S extends Story.Steps.Any>(s: S): S => s
    expect(shared(steps)).type.toBe<Story.Steps<typeof Static>>()
  })

  it("resolves a Command with the definition's own message", () => {
    expect(todoItem.resolve).type.toBeCallableWith(SaveTodo, TodoItemMessage.make({ _tag: "Saved" }))
    expect(todoItem.resolve).type.not.toBeCallableWith(SaveTodo, SearchMessage.make({ _tag: "Tick" }))
    expect(searchBox.resolve).type.toBeCallableWith(
      Search({ text: "x" }),
      SearchMessage.make({ _tag: "Results", items: [] })
    )
    expect(searchBox.resolve).type.not.toBeCallableWith(Search({ text: "x" }), TodoItemMessage.make({ _tag: "Saved" }))
  })

  it("an issued Command whose result never arrives is a target, and takes no result", () => {
    const Hold = Command.make("Hold", { args: { key: Schema.String } }, () => Effect.never)
    const Watch = Command.make("Watch", { args: { key: Schema.String }, stream: true }, () => Stream.never)
    expect(counter.expectExact).type.toBeCallableWith(Hold({ key: "one" }), Watch({ key: "one" }))
    expect(counter.expectHas).type.toBeCallableWith(Hold({ key: "one" }))
    expect(counter.end).type.toBeCallableWith(Watch({ key: "one" }))
    expect(counter.end).type.not.toBeCallableWith(Hold({ key: "one" }))
    expect(counter.resolve).type.not.toBeCallableWith(Hold({ key: "one" }), "anything")
    expect(counter.next).type.not.toBeCallableWith(Watch({ key: "one" }), "anything")
  })

  it("a mapped Command as the target takes the definition's own result", () => {
    const Uploaded = Schema.TaggedUnion({ Uploaded: { url: Schema.String } })
    const UploadFile = Command.make(
      "UploadFile",
      { args: { name: Schema.String } },
      ({ name }) => Effect.succeed(`https://cdn/${name}`)
    )
    const mapped = UploadFile({ name: "me.png" }).pipe(Command.map((url) => Uploaded.make({ _tag: "Uploaded", url })))
    expect(mapped).type.toBe<Command.Issued<typeof Uploaded.Type, never, string, "Effect">>()
    expect(counter.resolve).type.toBeCallableWith(mapped, "https://cdn/me.png")
    expect(counter.resolve).type.not.toBeCallableWith(mapped, Uploaded.make({ _tag: "Uploaded", url: "" }))
    const Progress = Command.make(
      "Progress",
      { args: { name: Schema.String }, stream: true },
      () => Stream.fromIterable([1, 2])
    )
    const mappedStream = Progress({ name: "x" }).pipe(
      Command.map((percent) => Uploaded.make({ _tag: "Uploaded", url: String(percent) }))
    )
    expect(counter.next).type.toBeCallableWith(mappedStream, 50)
    expect(counter.next).type.not.toBeCallableWith(mappedStream, Uploaded.make({ _tag: "Uploaded", url: "" }))
    expect(counter.end).type.toBeCallableWith(mappedStream)
  })

  it("next and end only take stream Commands", () => {
    expect(searchBox.next).type.toBeCallableWith(Upload, SearchMessage.make({ _tag: "Progress", percent: 1 }))
    expect(searchBox.end).type.toBeCallableWith(Upload)
    expect(searchBox.next).type.not.toBeCallableWith(Search, SearchMessage.make({ _tag: "Results", items: [] }))
    expect(searchBox.end).type.not.toBeCallableWith(SaveTodo)
  })

  it("fail takes the typed failure of a Command whose body can fail", () => {
    class SaveFailed extends Data.TaggedError("SaveFailed")<{ readonly reason: string }> {}
    class Save extends Command.Service<Save>()(
      "Save",
      { args: {}, invalidates: () => [] },
      Effect.succeed(() => Effect.fail(new SaveFailed({ reason: "x" })))
    ) {}
    const matched = Save.make().pipe(Command.match({ onSuccess: () => 1, onFailure: () => 2 }))
    expect(counter.fail).type.toBeCallableWith(Save, new SaveFailed({ reason: "disk full" }))
    expect(counter.fail).type.toBeCallableWith(matched, new SaveFailed({ reason: "disk full" }))
    expect(counter.fail).type.not.toBeCallableWith(Save, new Error("other"))
    expect(todoItem.fail).type.not.toBeCallableWith(SaveTodo, new Error("never fails"))
  })
})
