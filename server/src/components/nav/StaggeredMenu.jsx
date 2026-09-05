// Full-screen overlay nav — rebuilt on GSAP timelines, following the
// architecture of React Bits' StaggeredMenu (prelayers wipe in first, then
// the panel, then the items stagger on top) rather than the plain CSS
// transitions the design canvas used. GSAP wasn't an option while this was
// still a canvas mockup — that sandbox's CDN allowlist has no room for it —
// but this is the real built app now, so it's a normal dependency.
//
// Controlled by the same `open`/`onSelect` interface App.jsx already drives;
// this component owns only the entrance/exit choreography internally via a
// GSAP context, cleaned up on unmount.
//
// Two things kept from the earlier CSS-only build rather than copied
// verbatim from the reference: the nav list is vertically centered in
// whatever height the top bar leaves (the reference top-pins its list,
// which reads as unfinished once five short links sit in a tall panel),
// and each item's trailing number is a real flex sibling on the label's own
// baseline, not a `::after` counter positioned by eyeballed offsets.
//
// The reference's "Socials" footer doesn't fit this product — RackIn has no
// social presence and this is an internal owner dashboard, not a marketing
// site — so that slot carries the login screen's own established support
// answer ("contact your gym's admin") instead of inventing links.

import { useEffect, useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";

const SCREENS = [
  { id: "analytics", num: "01", label: "Analytics" },
  { id: "checkin", num: "02", label: "Check-In" },
  { id: "followup", num: "03", label: "Follow Up" },
  { id: "members", num: "04", label: "Members" },
  { id: "store", num: "05", label: "Store" },
];

// Two dark layers wipe in ahead of the white panel — a "walking into a
// lit court at night" reveal, built from tones already in the palette
// (page black, then the menu's own backdrop) rather than new colors.
const PRELAYER_COLORS = ["#0a0a0a", "#1c1c1c"];

export default function StaggeredMenu({ open, onSelect }) {
  const panelRef = useRef(null);
  const prelayerRefs = useRef([]);
  const itemLabelRefs = useRef([]);
  const itemNumRefs = useRef([]);
  const footerRef = useRef(null);
  const openTlRef = useRef(null);
  const closeTweenRef = useRef(null);

  // Rest state for every animated node, set once so an early unmount or a
  // close before the open timeline finishes never leaves something stranded
  // mid-transition off canvas.
  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set([...prelayerRefs.current, panelRef.current], { xPercent: 100 });
      gsap.set(itemLabelRefs.current, { yPercent: 140, rotate: 8 });
      gsap.set(itemNumRefs.current, { opacity: 0 });
      gsap.set(footerRef.current, { opacity: 0, y: 16 });
    });
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    const panel = panelRef.current;
    const layers = prelayerRefs.current;
    const labels = itemLabelRefs.current;
    const nums = itemNumRefs.current;
    const footer = footerRef.current;
    if (!panel) return;

    if (open) {
      const tl = gsap.timeline();
      layers.forEach((el, i) => {
        tl.to(el, { xPercent: 0, duration: 0.45, ease: "power4.out" }, i * 0.08);
      });
      const panelStart = (layers.length - 1) * 0.08 + 0.1;
      tl.to(panel, { xPercent: 0, duration: 0.6, ease: "power4.out" }, panelStart);
      const itemsStart = panelStart + 0.6 * 0.2;
      tl.to(labels, { yPercent: 0, rotate: 0, duration: 0.9, ease: "power4.out", stagger: 0.08 }, itemsStart);
      tl.to(nums, { opacity: 1, duration: 0.5, ease: "power2.out", stagger: 0.08 }, itemsStart + 0.1);
      tl.to(footer, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, itemsStart + 0.3);
      openTlRef.current = tl;
    } else {
      closeTweenRef.current = gsap.to([...layers, panel], {
        xPercent: 100,
        duration: 0.3,
        ease: "power3.in",
        overwrite: "auto",
        onComplete: () => {
          gsap.set(labels, { yPercent: 140, rotate: 8 });
          gsap.set(nums, { opacity: 0 });
          gsap.set(footer, { opacity: 0, y: 16 });
        },
      });
    }

    // Kills whichever animation this run started before the next run (a
    // toggle mid-transition) or unmount. Without this, an in-flight tween's
    // onComplete can fire after unmount and read stale refs — React nulls
    // out ref callbacks on unmount, mutating these same arrays in place, so
    // an async callback that captured them earlier sees null targets and
    // GSAP throws trying to animate them.
    return () => {
      openTlRef.current?.kill();
      closeTweenRef.current?.kill();
    };
  }, [open]);

  return (
    <>
      <div aria-hidden="true" className="absolute bottom-0 right-0 top-16 z-20 overflow-hidden">
        {PRELAYER_COLORS.map((color, i) => (
          <div
            key={color}
            ref={(el) => (prelayerRefs.current[i] = el)}
            className="absolute inset-y-0 right-0"
            style={{ width: "clamp(260px, 38vw, 420px)", background: color }}
          />
        ))}
      </div>
      <aside
        ref={panelRef}
        aria-hidden={!open}
        className="absolute bottom-0 right-0 top-16 z-30 flex flex-col overflow-y-auto bg-[#ffffff] px-14 py-10"
        style={{ width: "clamp(260px, 38vw, 420px)" }}
      >
        {/* Centered in whatever height the top bar leaves, rather than
            pinned to the top — five short links in a tall panel need a
            deliberate anchor or the space below reads as unfinished. */}
        <nav className="flex flex-1 flex-col justify-center gap-3">
          {SCREENS.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className="group flex items-baseline gap-5 overflow-hidden text-left"
            >
              <span
                ref={(el) => (itemLabelRefs.current[i] = el)}
                className="inline-block font-heading text-[2.8rem] uppercase leading-none tracking-tight text-[#0a0a0a] transition-colors group-hover:text-accent"
              >
                {item.label}
              </span>
              <span
                ref={(el) => (itemNumRefs.current[i] = el)}
                className="font-body text-base font-semibold text-accent-deep"
              >
                {item.num}
              </span>
            </button>
          ))}
        </nav>

        <div ref={footerRef} className="shrink-0 border-t border-[#0a0a0a1a] pt-6">
          <p className="font-heading text-[11px] uppercase tracking-[0.1em] text-[#0a0a0a80]">Need Help?</p>
          <p className="mt-1.5 font-body text-sm text-[#0a0a0a]">Contact your gym's admin.</p>
        </div>
      </aside>
    </>
  );
}
