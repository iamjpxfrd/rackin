import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { findMembersByName } from "../../domain/checkIn.js";

// Name search never dead-ends check-in (PRD 4.3): partial-name filtering
// resolves to the same lookup as numpad and QR.
export default function SearchPanel({ onSelect, disabled }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);

  useEffect(() => {
    let cancelled = false;
    findMembersByName(query).then((matches) => {
      if (!cancelled) setResults(matches);
    });
    return () => {
      cancelled = true;
    };
  }, [query]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-16 items-center gap-2 rounded-ds-sm border border-steel-300 bg-surface-white px-4 focus-within:outline focus-within:outline-2 focus-within:outline-steel-700">
        <Search size={20} strokeWidth={1.75} className="shrink-0 text-steel-700" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={disabled}
          placeholder="Search by name"
          className="w-full bg-transparent font-body text-lg text-ink-900 placeholder:text-steel-300 focus:outline-none"
          autoComplete="off"
        />
      </div>

      <ul className="flex max-h-96 flex-col overflow-y-auto rounded-ds-sm border border-steel-300 bg-surface-white">
        {query.trim() && results.length === 0 && (
          <li className="px-4 py-3 font-body text-base text-steel-700">
            No members match "{query.trim()}"
          </li>
        )}
        {results.map((member) => (
          <li key={member.id} className="border-b border-steel-300 last:border-b-0">
            <button
              type="button"
              onClick={() => onSelect(member.id)}
              disabled={disabled}
              className="flex h-14 w-full items-center justify-between px-4 text-left font-body text-lg text-ink-900 hover:bg-chalk-50 focus-visible:outline focus-visible:-outline-offset-2 focus-visible:outline-steel-700 disabled:opacity-50"
            >
              <span>{member.name}</span>
              <span className="font-mono text-base text-steel-700">#{member.id}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
