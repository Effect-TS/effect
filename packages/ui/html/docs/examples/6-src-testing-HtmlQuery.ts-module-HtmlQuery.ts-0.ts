import { HtmlQuery } from "@effect/ui-html/testing"

const tree = {
  tag: "form",
  children: [
    { tag: "label", attrs: { for: "new" }, children: [{ text: "New todo" }] },
    { tag: "input", attrs: { id: "new" } },
    { tag: "button", attrs: { type: "submit" }, children: [{ text: "Add" }] }
  ]
}

console.log(HtmlQuery.getByRole(tree, "button", { name: "Add" }) === tree.children[2]) // true
console.log(HtmlQuery.nameOf(tree, HtmlQuery.getByRole(tree, "textbox"))) // "New todo"