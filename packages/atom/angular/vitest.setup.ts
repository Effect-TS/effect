// oxlint-disable-next-line no-unassigned-import
import "@angular/compiler"
import { TestBed } from "@angular/core/testing"
import { BrowserTestingModule, platformBrowserTesting } from "@angular/platform-browser/testing"
import { afterEach } from "vitest"

TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting())

afterEach(() => {
  TestBed.resetTestingModule()
})
