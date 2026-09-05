// @vitest-environment jsdom
//
// This used to walk the full staff flow through the rendered UI: register a
// member, see them on the roster, open their profile, record a payment. All
// of that is gone — android/ is the only client that creates or edits data
// now, and server/ reads whatever synced to the backend
// ([[Decisions/Web Becomes a Read-Only Dashboard]], accepted 2026-08-22).
// This build has no backend configured in tests, so every read resolves to
// its empty default; these tests assert the read-only shell renders that
// correctly rather than crashing.
//
// The shell is now login-gated (LoginScreen) with a staggered overlay menu
// in place of the old always-visible tab bar, per the desktop dashboard
// design canvas — see App.jsx for why the login gate is a UI sketch only,
// not real authentication.

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import App from "./App.jsx";
import { GYM_NAME } from "./domain/constants.js";

afterEach(() => {
  cleanup();
});

/** Renders the app and clicks through the (unvalidated, sketch-only) login gate. */
async function renderLoggedIn() {
  const user = userEvent.setup();
  render(<App />);
  await user.click(screen.getByRole("button", { name: "Sign In" }));
  return user;
}

async function openMenuAndSelect(user, name) {
  await user.click(screen.getByRole("button", { name: /Menu/ }));
  await user.click(screen.getByRole("button", { name }));
}

describe("login gate", () => {
  it("shows the login sketch before anything else", () => {
    render(<App />);
    expect(screen.getByText("Owner Dashboard")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Menu/ })).not.toBeInTheDocument();
  });
});

describe("shell", () => {
  it("shows the gym's own name once past login, with no attribution control", async () => {
    await renderLoggedIn();
    expect(screen.getAllByText(GYM_NAME).length).toBeGreaterThan(0);
    expect(screen.queryByText(/On desk/)).not.toBeInTheDocument();
  });

  it("offers Analytics, Check-In, Follow Up, Members, and Store via the menu — no + New", async () => {
    const user = await renderLoggedIn();
    await user.click(screen.getByRole("button", { name: /Menu/ }));
    for (const name of [/Analytics/, /Check-In/, /Follow Up/, /Members/, /Store/]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
    expect(screen.queryByRole("button", { name: /\+ New/ })).not.toBeInTheDocument();
  });
});

describe("analytics", () => {
  it("is the landing screen and labels its numbers as sample data", async () => {
    await renderLoggedIn();
    expect(screen.getByRole("heading", { name: "Analytics" })).toBeInTheDocument();
    expect(screen.getByText(/Sample Data/)).toBeInTheDocument();
  });
});

describe("check-in", () => {
  it("shows the read-only activity feed, with no numpad, search, or QR", async () => {
    const user = await renderLoggedIn();
    await openMenuAndSelect(user, /Check-In/);
    expect(await screen.findByText("No check-ins yet today.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "CHECK IN" })).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Search by name/)).not.toBeInTheDocument();
  });
});

describe("follow up", () => {
  it("says nothing needs a call when no backend is configured", async () => {
    const user = await renderLoggedIn();
    await openMenuAndSelect(user, /Follow Up/);
    expect(await screen.findByText("No one is expiring soon.")).toBeInTheDocument();
    expect(await screen.findByText("No one has lapsed.")).toBeInTheDocument();
  });
});

describe("members", () => {
  it("shows the empty roster, with no register-first action", async () => {
    const user = await renderLoggedIn();
    await openMenuAndSelect(user, /Members/);
    expect(await screen.findByText("No members yet.")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Register the first member/ }),
    ).not.toBeInTheDocument();
  });
});

describe("store", () => {
  it("labels its transactions as sample data", async () => {
    const user = await renderLoggedIn();
    await openMenuAndSelect(user, /Store/);
    expect(screen.getByText("Sample Data")).toBeInTheDocument();
  });
});
