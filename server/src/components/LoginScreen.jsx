// First sketch of the dashboard's login screen, per the desktop dashboard
// design canvas (WebLogin.dc.html) — visual direction only. This is NOT
// real authentication: the form doesn't validate or call a backend, and
// "Sign In" just tells App.jsx to show the dashboard. Real per-person auth
// (Task 6, ADR-002 Action Item 6a) replaces this once it's built — the
// current shared RACKIN_API_KEY is device auth, not person auth, and isn't
// what should guard this screen.

import { GYM_NAME } from "../domain/constants.js";

export default function LoginScreen({ onLogIn }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-page">
      <form
        className="w-[400px] border border-border bg-surface p-10"
        onSubmit={(e) => {
          e.preventDefault();
          onLogIn();
        }}
      >
        <div className="mb-8 flex flex-col items-center gap-2">
          <span className="font-heading text-2xl uppercase tracking-[0.02em] text-text">{GYM_NAME}</span>
          <span className="font-heading text-xs font-bold tracking-[0.12em] text-text-muted">Owner Dashboard</span>
        </div>

        <label className="mb-5 flex flex-col gap-1.5">
          <span className="font-heading text-xs font-bold tracking-[0.08em] text-text-muted">Email</span>
          <input
            type="email"
            placeholder="owner@yourgym.com"
            autoComplete="email"
            className="h-12 border border-border bg-page px-3.5 font-body text-[15px] text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
          />
        </label>
        <label className="mb-7 flex flex-col gap-1.5">
          <span className="font-heading text-xs font-bold tracking-[0.08em] text-text-muted">Password</span>
          <input
            type="password"
            placeholder="············"
            autoComplete="current-password"
            className="h-12 border border-border bg-page px-3.5 font-body text-[15px] tracking-[0.2em] text-text placeholder:tracking-normal placeholder:text-text-muted focus:border-accent focus:outline-none"
          />
        </label>

        <button
          type="submit"
          className="mb-6 h-[52px] w-full bg-accent font-heading text-sm font-extrabold tracking-[0.04em] text-page hover:opacity-90"
        >
          Sign In
        </button>

        <p className="text-center font-body text-[13px] leading-relaxed text-text-muted">
          Access is by invitation only.
          <br />
          Contact your gym to request an owner account.
        </p>
      </form>
    </div>
  );
}
