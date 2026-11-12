// @vitest-environment happy-dom
import { describe, expect, it } from "@effect/vitest"
import { Effect } from "effect"
import { HtmlQuery } from "effect/ui/html/testing"
import { Query, Story, TestHost } from "effect/ui/testing"
import { Confirm } from "./fixtures/confirm.ts"
import { Menu, MenuMessage } from "./fixtures/popover.ts"
import { TodoApp, TodoAppMessage } from "./fixtures/todos.ts"

const el = (
  tag: string,
  attrs: Record<string, string> = {},
  ...children: ReadonlyArray<Query.Node>
): Query.Node => ({ tag, attrs, children })
const text = (text: string): Query.Node => ({ text })

describe("HtmlQuery", () => {
  describe("roles", () => {
    it("come from tags, types and attributes", () => {
      const tree = el(
        "div",
        {},
        el("a", { href: "/" }, text("Home")),
        el("a", {}, text("Not a link")),
        el("input", {}),
        el("input", { type: "checkbox" }),
        el("input", { type: "submit" }),
        el("input", { type: "hidden" }),
        el("input", { type: "search", list: "options" }),
        el("select", {}),
        el("select", { multiple: "" }),
        el("img", { alt: "" }),
        el("div", { role: "alert  status" }),
        el("ul", {}, el("li", {}))
      )
      const roles = Query.elements(tree).map((node) => HtmlQuery.roleOf(tree, node))
      expect(roles).toEqual([
        undefined,
        "link",
        undefined,
        "textbox",
        "checkbox",
        "button",
        undefined,
        "combobox",
        "combobox",
        "listbox",
        "presentation",
        "alert",
        "list",
        "listitem"
      ])
    })

    it("header and footer are landmarks outside sectioning elements only", () => {
      const tree = el("div", {}, el("header", {}), el("article", {}, el("header", {}), el("footer", {})), el("footer"))
      expect(HtmlQuery.queryAllByRole(tree, "banner")).toHaveLength(1)
      expect(HtmlQuery.queryAllByRole(tree, "contentinfo")).toHaveLength(1)
    })

    it("hidden elements are left out unless asked for", () => {
      const tree = el(
        "div",
        {},
        el("button", { hidden: "" }, text("A")),
        el("div", { "aria-hidden": "true" }, el("button", {}, text("B"))),
        el("button", {}, text("C"))
      )
      expect(HtmlQuery.queryAllByRole(tree, "button").map((node) => Query.textOf(node))).toEqual(["C"])
      expect(HtmlQuery.queryAllByRole(tree, "button", { hidden: true })).toHaveLength(3)
    })

    it.effect("a closed dialog and what's in it are hidden, and dialogState tells closed, open and modal apart", () =>
      Effect.gen(function*() {
        const dialog = HtmlQuery.role("dialog", { name: "Delete note?" })
        const keep = HtmlQuery.role("button", { name: "Keep" })
        Story.make(Confirm, { state: "closed", acceptEscape: false }, (s) => {
          s.check((story) => {
            expect(story.query(dialog)).toBeUndefined()
            expect(story.query(keep)).toBeUndefined()
            expect(HtmlQuery.dialogState(story.get(HtmlQuery.role("dialog", { hidden: true })))).toBe("closed")
          })
            .click("Ask")
            .check((story) => {
              expect(HtmlQuery.dialogState(story.get(dialog))).toBe("modal")
              expect(story.query(keep)).toBeDefined()
            })
            // Escape is rejected by `update`, so the dialog stays modal.
            .fire(dialog, "cancel")
            .check((story) => expect(HtmlQuery.dialogState(story.get(dialog))).toBe("modal"))
        })
        const open = yield* TestHost.mount(Confirm, { state: "open" as const, acceptEscape: false })
        expect(HtmlQuery.dialogState(open.get(dialog))).toBe("open")
        // A static `open` attribute counts too.
        expect(HtmlQuery.dialogState(el("dialog", { open: "" }))).toBe("open")
        expect(HtmlQuery.dialogState(document.createElement("dialog"))).toBe("closed")
      }).pipe(Effect.scoped, Effect.provide(TestHost.layer())))

    it("a dialog shown as a popover is visible though its open is false; hidden attributes still hide", () => {
      const dialog = (attrs: Record<string, string>, props: Record<string, unknown>, label: string) => ({
        tag: "dialog",
        attrs: { "aria-label": label, ...attrs },
        props,
        children: [{ tag: "button", children: [text(label)] }]
      })
      const tree = el(
        "div",
        {},
        dialog({ popover: "manual" }, { popoverOpen: true }, "As popover"),
        dialog({ popover: "manual" }, { popoverOpen: false }, "Popover closed"),
        dialog({}, { open: false }, "Closed"),
        dialog({}, { open: "modal" }, "Modal"),
        dialog({ popover: "manual", hidden: "" }, { popoverOpen: true }, "Hidden")
      )
      const names = (role: string) => HtmlQuery.queryAllByRole(tree, role).map((node) => HtmlQuery.nameOf(tree, node))
      expect(names("dialog")).toEqual(["As popover", "Modal"])
      expect(names("button")).toEqual(["As popover", "Modal"])
      expect(HtmlQuery.queryAllByRole(tree, "dialog", { hidden: true })).toHaveLength(5)
    })

    it.effect("a popover that isn't showing and what's in it are hidden, and popoverState tells", () =>
      Effect.gen(function*() {
        const menu = HtmlQuery.role("menu", { name: "Menu" })
        const rename = HtmlQuery.role("button", { name: "Rename" })
        Story.make(Menu, { mode: "auto", open: false, follow: true }, (s) => {
          s.check((story) => {
            expect(story.query(menu)).toBeUndefined()
            expect(story.query(rename)).toBeUndefined()
            expect(HtmlQuery.popoverState(story.get(HtmlQuery.role("menu", { hidden: true })))).toBe("closed")
          })
            .send(MenuMessage.make({ _tag: "Set", open: true }))
            .check((story) => expect(HtmlQuery.popoverState(story.get(menu))).toBe("open"))
            // A light dismiss, as the browser host reports it; the Model follows.
            .fire(menu, "toggle", { open: false, newState: "closed", oldState: "open" })
            .check((story) => expect(story.query(menu)).toBeUndefined())
        })
        const root = yield* TestHost.mount(Menu, { mode: "manual" as const, open: true, follow: false })
        expect(HtmlQuery.popoverState(root.get(menu))).toBe("open")
        expect(HtmlQuery.popoverState(document.createElement("div"))).toBe("closed")
      }).pipe(Effect.scoped, Effect.provide(TestHost.layer())))
  })

  describe("names", () => {
    it("follow the accessible name order", () => {
      const tree = el(
        "form",
        {},
        el("span", { id: "first" }, text("First")),
        el("span", { id: "last" }, text("name")),
        el("input", { "aria-labelledby": "first last", "aria-label": "ignored" }),
        el("input", { "aria-label": "  Search   site " }),
        el("label", { for: "email" }, text("Email")),
        el("input", { id: "email", title: "ignored" }),
        el("label", {}, el("input", { type: "checkbox" }), text(" Remember me")),
        el("input", { type: "submit" }),
        el("input", { type: "button", value: "Go" }),
        el("button", {}, el("img", { alt: "Close" })),
        el("button", { title: "Menu" }),
        el("input", { placeholder: "Notes" }),
        el("fieldset", {}, el("legend", {}, text("Address"))),
        el("h2", {}, text("Section "), el("em", {}, text("two")))
      )
      const names = HtmlQuery.queryAllByRole(tree, "textbox").map((node) => HtmlQuery.nameOf(tree, node))
      expect(names).toEqual(["First name", "Search site", "Email", "Notes"])
      expect(HtmlQuery.nameOf(tree, HtmlQuery.getByRole(tree, "checkbox"))).toBe("Remember me")
      expect(HtmlQuery.queryAllByRole(tree, "button").map((node) => HtmlQuery.nameOf(tree, node))).toEqual([
        "Submit",
        "Go",
        "Close",
        "Menu"
      ])
      expect(HtmlQuery.nameOf(tree, HtmlQuery.getByRole(tree, "group"))).toBe("Address")
      expect(HtmlQuery.getByRole(tree, "heading", { name: "Section two", level: 2 })).toBeDefined()
      expect(HtmlQuery.getByRole(tree, "heading", { name: /two$/ })).toBeDefined()
    })

    it("a label that both wraps and names a control counts once", () => {
      const container = document.createElement("div")
      container.innerHTML = `<label for="agreed">Agree <input id="agreed" type="checkbox"></label>`
      expect(HtmlQuery.getByRole(container, "checkbox", { name: "Agree" })).toBeDefined()
    })

    it("getByRole lists what's there when nothing matches", () => {
      const tree = el("div", {}, el("button", {}, text("Save")), el("a", { href: "/" }, text("Home")))
      expect(() => HtmlQuery.getByRole(tree, "button", { name: "Cancel" })).toThrow(
        "HtmlQuery: nothing has role \"button\", name \"Cancel\". Roles here:\n  button \"Save\"\n  link \"Home\""
      )
      expect(() => HtmlQuery.getByRole(el("div", {}, el("p"), el("p")), "paragraph")).toThrow("2 elements")
    })
  })

  describe("trees", () => {
    it("a story's view value", () => {
      const story = Story.make(
        TodoApp,
        {},
        (s) => s.send(TodoAppMessage.make({ _tag: "Draft", value: "Read" }))
      )
      const field = HtmlQuery.getByRole(story.root, "textbox", { name: "New todo" })
      expect((field as { readonly props?: Record<string, unknown> }).props?.value).toBe("Read")
      expect(HtmlQuery.getByRole(story.root, "button", { name: "Clear done" })).toBeDefined()
      expect(story.all(Query.inside(Query.tag("form"), HtmlQuery.role("button")))).toHaveLength(1)
    })

    it.effect("a TestHost tree, checked state included", () =>
      Effect.gen(function*() {
        const root = yield* TestHost.mount(TodoApp, {})
        root.send(TodoAppMessage.make({ _tag: "Draft", value: "Read" }))
        root.send(TodoAppMessage.make({ _tag: "Add" }))
        yield* TestHost.settle
        const box = HtmlQuery.getByRole(root.container, "checkbox", { name: "Read", checked: false })
        Query.fire(box as TestHost.TestElement, "input", { value: "on", checked: true })
        yield* TestHost.settle
        expect(HtmlQuery.queryAllByRole(root.container, "checkbox", { checked: true })).toEqual([box])
        expect(root.all(HtmlQuery.role("listitem"))).toHaveLength(1)
      }).pipe(Effect.scoped, Effect.provide(TestHost.layer())))

    it("roots that aren't elements: a document, a fragment, a structural wrapper", () => {
      const doc = document.implementation.createHTMLDocument("")
      doc.body.innerHTML = "<button>One</button>"
      const fragment = document.createDocumentFragment()
      fragment.append(document.createElement("button"))
      const wrapper: Query.Node = { children: [el("button", {}, text("Two"))] }
      expect(HtmlQuery.queryAllByRole(doc, "button").map((node) => node.textContent)).toEqual(["One"])
      expect(HtmlQuery.queryAllByRole(fragment, "button")).toHaveLength(1)
      expect(HtmlQuery.getByRole(wrapper, "button", { name: "Two" })).toBe(wrapper.children![0])
    })

    it("the DOM", () => {
      const container = document.createElement("div")
      container.innerHTML = `
        <nav aria-label="Main"><a href="/a">A</a><a href="/b">B</a></nav>
        <label>Agree <input type="checkbox" checked></label>
        <table><caption>Totals</caption><tr><th>Item</th><td>3</td></tr></table>`
      expect(HtmlQuery.queryAllByRole(container, "link").map((node) => node.textContent)).toEqual(["A", "B"])
      expect(HtmlQuery.getByRole(container, "navigation", { name: "Main" }).localName).toBe("nav")
      const box = HtmlQuery.getByRole(container, "checkbox", { name: "Agree", checked: true }) as HTMLInputElement
      box.checked = false
      expect(HtmlQuery.queryAllByRole(container, "checkbox", { checked: true })).toEqual([])
      expect(HtmlQuery.nameOf(container, HtmlQuery.getByRole(container, "table"))).toBe("Totals")
      expect(HtmlQuery.getByRole(container, "columnheader", { name: "Item" })).toBeDefined()
      expect(HtmlQuery.getByRole(container, "cell", { name: "3" })).toBeDefined()
    })
  })
})
