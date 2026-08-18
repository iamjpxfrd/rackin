// @vitest-environment jsdom
//
// Walks the flows a staff member actually performs, through the rendered UI:
// register a member, see them on the roster, open their profile, record a
// payment. Compiling is not the same as rendering — these assert the screens
// wire up to the domain layer, not just that the imports resolve.

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, within, cleanup, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import App from "./App.jsx";
import { db, resetDatabase } from "../db/db.js";

beforeEach(async () => {
  await resetDatabase();
});

afterEach(() => {
  cleanup();
});

/** Fills in the New Member form and submits it. */
async function registerThroughUi(user, { name, amount = "500", plan = "MONTHLY" }) {
  await user.click(screen.getByRole("button", { name: /\+ New/ }));

  await user.type(await screen.findByLabelText("Name"), name);
  await user.click(screen.getByRole("radio", { name: new RegExp(plan, "i") }));
  await user.type(screen.getByLabelText("Amount"), amount);
  await user.click(screen.getByRole("radio", { name: /CASH/i }));

  await user.click(screen.getByRole("button", { name: /REGISTER MEMBER/i }));
}

describe("registration flow", () => {
  it("registers a member and shows the assigned number on the success screen", async () => {
    const user = userEvent.setup();
    render(<App />);

    await registerThroughUi(user, { name: "Placeholder Name" });

    expect(await screen.findByText("Placeholder Name is in")).toBeInTheDocument();
    expect(screen.getByText("1001")).toBeInTheDocument();
    // The QR is generated on-device, not fetched.
    expect(
      screen.getByRole("img", { name: /QR code for member 1001/i }),
    ).toBeInTheDocument();

    expect(await db.members.count()).toBe(1);
    expect(await db.payments.count()).toBe(1);
  });

  it("keeps the confirm key disabled until every required field is set", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /\+ New/ }));
    const confirm = screen.getByRole("button", { name: /REGISTER MEMBER/i });
    expect(confirm).toBeDisabled();

    await user.type(await screen.findByLabelText("Name"), "Placeholder Name");
    expect(confirm).toBeDisabled();

    await user.click(screen.getByRole("radio", { name: /MONTHLY/i }));
    await user.type(screen.getByLabelText("Amount"), "500");
    expect(confirm).toBeDisabled(); // still no payment method

    await user.click(screen.getByRole("radio", { name: /CASH/i }));
    expect(confirm).toBeEnabled();
  });

  it("previews the member number before the member is created", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /\+ New/ }));
    // Staff can start writing the physical card while still talking.
    expect(await screen.findByText("#1001")).toBeInTheDocument();
    expect(await db.members.count()).toBe(0);
  });
});

describe("session plan", () => {
  it("offers a one-day session alongside weekly and monthly", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /\+ New/ }));
    const session = await screen.findByRole("radio", { name: /SESSION/i });
    expect(session).toBeInTheDocument();
    expect(within(session).getByText("1 day")).toBeInTheDocument();
  });

  it("registers a session member covered for a single day", async () => {
    const user = userEvent.setup();
    render(<App />);

    await registerThroughUi(user, { name: "Drop In", plan: "SESSION" });
    await screen.findByText("Drop In is in");

    // By member, not by auto-increment id: resetDatabase clears rows but
    // Dexie keeps counting, so ids do not restart at 1 between tests.
    const [payment] = await db.payments.where("memberId").equals("1001").toArray();
    const days = Math.round(
      (new Date(payment.coversUntil) - new Date(payment.paidAt)) / 86_400_000,
    );
    expect(days).toBe(1);
  });

  it("labels a session member as Session, not Monthly, on their profile", async () => {
    const user = userEvent.setup();
    render(<App />);

    await registerThroughUi(user, { name: "Drop In", plan: "SESSION" });
    await screen.findByText("Drop In is in");
    await user.click(screen.getByRole("button", { name: /Members/ }));
    await user.click(await screen.findByRole("button", { name: /Drop In/ }));

    expect(await screen.findByText(/· Session/)).toBeInTheDocument();
    expect(screen.getByText(/Session plan · 1 day/)).toBeInTheDocument();
  });

  it("keeps day-passes off the Follow Up expiring list", async () => {
    const user = userEvent.setup();
    render(<App />);

    // A session is inside the 7-day window the instant it is sold; listing it
    // would bury the memberships worth calling.
    await registerThroughUi(user, { name: "Drop In", plan: "SESSION" });
    await screen.findByText("Drop In is in");
    await user.click(screen.getByRole("button", { name: /Follow Up/ }));

    expect(await screen.findByText("Nobody needs a call today.")).toBeInTheDocument();
  });
});

describe("transfer QR", () => {
  it("reveals the payment QR when transfer is chosen, and not for cash", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /\+ New/ }));
    await user.click(await screen.findByRole("radio", { name: /CASH/i }));
    expect(screen.queryByText(/Have them scan to transfer/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: /TRANSFER/i }));
    expect(await screen.findByText(/Have them scan to transfer/i)).toBeInTheDocument();
  });

  it("offers the same QR when recording a transfer for an existing member", async () => {
    const user = userEvent.setup();
    render(<App />);

    await registerThroughUi(user, { name: "Placeholder Name" });
    await screen.findByText("Placeholder Name is in");
    await user.click(screen.getByRole("button", { name: /Members/ }));
    await user.click(await screen.findByRole("button", { name: /Placeholder Name/ }));
    await user.click(await screen.findByRole("button", { name: /RECORD PAYMENT/i }));

    const sheet = await screen.findByRole("dialog");
    await user.click(within(sheet).getByRole("radio", { name: /TRANSFER/i }));
    expect(within(sheet).getByText(/Have them scan to transfer/i)).toBeInTheDocument();
  });
});

describe("name completion", () => {
  it("offers a matching name from the roster and fills it on tap", async () => {
    const user = userEvent.setup();
    render(<App />);

    await registerThroughUi(user, { name: "Placeholder Surname" });
    await screen.findByText("Placeholder Surname is in");
    await user.click(screen.getByRole("button", { name: /Done/i }));

    await user.click(screen.getByRole("button", { name: /\+ New/ }));
    const nameInput = await screen.findByLabelText("Name");
    await user.type(nameInput, "Place");

    const suggestion = await screen.findByRole("button", { name: /Placeholder Surname/ });
    await user.click(suggestion);

    expect(nameInput).toHaveValue("Placeholder Surname");
  });

  it("warns that a name is already taken without blocking the registration", async () => {
    const user = userEvent.setup();
    render(<App />);

    await registerThroughUi(user, { name: "Placeholder Name" });
    await screen.findByText("Placeholder Name is in");
    await user.click(screen.getByRole("button", { name: /Done/i }));

    await user.click(screen.getByRole("button", { name: /\+ New/ }));
    await user.type(await screen.findByLabelText("Name"), "Placeholder Name");

    expect(await screen.findByText(/#1001 already uses this name/)).toBeInTheDocument();
    // Surfaced, never blocked — two members may share a name (PRODUCT.md).
    await user.click(screen.getByRole("radio", { name: /MONTHLY/i }));
    await user.type(screen.getByLabelText("Amount"), "500");
    await user.click(screen.getByRole("radio", { name: /CASH/i }));
    expect(screen.getByRole("button", { name: /REGISTER MEMBER/i })).toBeEnabled();
  });

  it("stays quiet until two characters are typed", async () => {
    const user = userEvent.setup();
    render(<App />);

    await registerThroughUi(user, { name: "Placeholder Surname" });
    await screen.findByText("Placeholder Surname is in");
    await user.click(screen.getByRole("button", { name: /Done/i }));

    await user.click(screen.getByRole("button", { name: /\+ New/ }));
    await user.type(await screen.findByLabelText("Name"), "P");

    expect(
      screen.queryByRole("button", { name: /Placeholder Surname/ }),
    ).not.toBeInTheDocument();
  });
});

describe("members roster", () => {
  it("lists a registered member with their status", async () => {
    const user = userEvent.setup();
    render(<App />);

    await registerThroughUi(user, { name: "Placeholder Name" });
    await screen.findByText("Placeholder Name is in");
    await user.click(screen.getByRole("button", { name: /Members/ }));

    expect(await screen.findByText("Placeholder Name")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("filters by member number", async () => {
    const user = userEvent.setup();
    render(<App />);

    await registerThroughUi(user, { name: "First Placeholder" });
    await screen.findByText("First Placeholder is in");
    await user.click(screen.getByRole("button", { name: /Done/i }));

    await registerThroughUi(user, { name: "Second Placeholder" });
    await screen.findByText("Second Placeholder is in");

    await user.click(screen.getByRole("button", { name: /Members/ }));
    await user.type(await screen.findByLabelText(/Search members/i), "1002");

    expect(screen.getByText("Second Placeholder")).toBeInTheDocument();
    expect(screen.queryByText("First Placeholder")).not.toBeInTheDocument();
  });

  it("offers the first-run empty state when nobody is registered", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /Members/ }));
    expect(await screen.findByText("No members yet.")).toBeInTheDocument();
  });
});

describe("member profile and payment", () => {
  it("opens the profile from a roster row and records a payment", async () => {
    const user = userEvent.setup();
    render(<App />);

    await registerThroughUi(user, { name: "Placeholder Name", amount: "500" });
    await screen.findByText("Placeholder Name is in");

    await user.click(screen.getByRole("button", { name: /Members/ }));
    await user.click(await screen.findByRole("button", { name: /Placeholder Name/ }));

    // Profile shows the derived coverage, not a stored status.
    expect(await screen.findByText(/Covered until/)).toBeInTheDocument();
    expect(screen.getByText("Payments")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /RECORD PAYMENT/i }));

    const sheet = await screen.findByRole("dialog");
    // Amount prefills from this member's own last payment.
    await waitFor(() =>
      expect(within(sheet).getByLabelText("Amount")).toHaveValue("500"),
    );

    await user.click(within(sheet).getByRole("radio", { name: /TRANSFER/i }));
    await user.click(within(sheet).getByRole("button", { name: /RECORD PAYMENT/i }));

    await waitFor(async () => expect(await db.payments.count()).toBe(2));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("blocks the payment until a method is chosen", async () => {
    const user = userEvent.setup();
    render(<App />);

    await registerThroughUi(user, { name: "Placeholder Name" });
    await screen.findByText("Placeholder Name is in");
    await user.click(screen.getByRole("button", { name: /Members/ }));
    await user.click(await screen.findByRole("button", { name: /Placeholder Name/ }));
    await user.click(await screen.findByRole("button", { name: /RECORD PAYMENT/i }));

    const sheet = await screen.findByRole("dialog");
    await waitFor(() =>
      expect(within(sheet).getByLabelText("Amount")).toHaveValue("500"),
    );
    // No default method: a wrong prefill would be a silently wrong record.
    expect(within(sheet).getByRole("button", { name: /RECORD PAYMENT/i })).toBeDisabled();
  });
});

describe("follow up", () => {
  it("says nobody needs a call when everyone is current", async () => {
    const user = userEvent.setup();
    render(<App />);

    // A member registered just now has not stopped coming, and their plan
    // has 30 days left — so the list is genuinely empty.
    await registerThroughUi(user, { name: "Placeholder Name" });
    await screen.findByText("Placeholder Name is in");
    await user.click(screen.getByRole("button", { name: /Follow Up/ }));

    expect(await screen.findByText("Nobody needs a call today.")).toBeInTheDocument();
  });

  it("surfaces a member who has stopped coming, with the day count", async () => {
    const user = userEvent.setup();
    render(<App />);

    await registerThroughUi(user, { name: "Placeholder Name" });
    await screen.findByText("Placeholder Name is in");

    // Their only visit was 31 days ago.
    await db.checkIns.add({
      memberId: "1001",
      timestamp: new Date(Date.now() - 31 * 86_400_000).toISOString(),
      method: "numpad",
      clientUuid: "test",
    });

    await user.click(screen.getByRole("button", { name: /Follow Up/ }));

    expect(await screen.findByText(/Stopped coming/i)).toBeInTheDocument();
    expect(screen.getByText("31")).toBeInTheDocument();
    expect(screen.getByText("Placeholder Name")).toBeInTheDocument();
  });

  it("shows a long-registered member who never visited as 'never', not a day count", async () => {
    const user = userEvent.setup();
    render(<App />);

    await registerThroughUi(user, { name: "Placeholder Name" });
    await screen.findByText("Placeholder Name is in");

    // Backdate registration past the threshold: they signed up and never came.
    await db.members.update("1001", {
      createdAt: new Date(Date.now() - 40 * 86_400_000).toISOString(),
    });

    await user.click(screen.getByRole("button", { name: /Follow Up/ }));

    expect(await screen.findByText("never")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
