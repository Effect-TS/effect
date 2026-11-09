import { Story } from "@effect/ui/testing"
import { describe, expect, it } from "tstyche"
import {
  Counter,
  CounterMessage,
  SaveTodo,
  Search,
  SearchMessage,
  TodoItemMessage,
  Upload
} from "../test/fixtures/components.ts"

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

  it("next and end only take stream Commands", () => {
    expect(Story.next).type.toBeCallableWith(Upload, SearchMessage.make({ _tag: "Progress", percent: 1 }))
    expect(Story.end).type.toBeCallableWith(Upload)
    expect(Story.next).type.not.toBeCallableWith(Search, SearchMessage.make({ _tag: "Results", items: [] }))
    expect(Story.end).type.not.toBeCallableWith(SaveTodo)
  })
})
