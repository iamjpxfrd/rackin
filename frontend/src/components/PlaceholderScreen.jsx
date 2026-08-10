// Reachable destination, not yet built out (shape brief scope: Check-In
// only this pass). Quiet by design — no fake content, no "coming soon"
// SaaS cheer, matching DESIGN.md's plain, no-false-cheer voice.
export default function PlaceholderScreen({ title }) {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <p className="font-body text-base text-steel-700">{title} isn't built yet.</p>
    </div>
  );
}
