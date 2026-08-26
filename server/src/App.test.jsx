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

import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import App from "./App.jsx";

afterEach(() => {
  cleanup();
});

describe("shell", () => {
  it("shows the app name, with no attribution control", () => {
    render(<App />);
    expect(screen.getByText("RackIn")).toBeInTheDocument();
    expect(screen.queryByText(/On desk/)).not.toBeInTheDocument();
  });

  it("offers Check-In, Follow Up, and Members — no + New tab", () => {
    render(<App />);
    expect(screen.getByRole("button", { name: /Check-In/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Follow Up/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Members/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /\+ New/ })).not.toBeInTheDocument();
  });
});

describe("check-in", () => {
  it("shows the read-only activity feed, with no numpad, search, or QR", async () => {
    render(<App />);
    expect(await screen.findByText("No check-ins yet today.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "CHECK IN" })).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Search by name/)).not.toBeInTheDocument();
  });
});

describe("follow up", () => {
  it("says nobody needs a call when no backend is configured", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Follow Up/ }));
    expect(await screen.findByText("Nobody needs a call today.")).toBeInTheDocument();
  });
});

describe("members", () => {
  it("shows the empty roster, with no register-first action", async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole("button", { name: /Members/ }));
    expect(await screen.findByText("No members yet.")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Register the first member/ }),
    ).not.toBeInTheDocument();
  });
});
