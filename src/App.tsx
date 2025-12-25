import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import EntryCard from "./components/EntryCard";
import AdminPanel from "./components/AdminPanel";
import "./App.css";

function App() {
  const [showAdmin, setShowAdmin] = useState(false);
  const [allEntries, setAllEntries] = useState<any[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const result = useQuery(api.entries.getEntries, {
    paginationOpts: { numItems: 20, cursor },
  });

  // Accumulate entries as we paginate
  useEffect(() => {
    if (result?.page) {
      setAllEntries((prev) => {
        // If cursor is null, we're starting fresh
        if (cursor === null) {
          return result.page;
        }
        // Otherwise, append new entries
        const existingIds = new Set(prev.map((e) => e._id));
        const newEntries = result.page.filter((e) => !existingIds.has(e._id));
        return [...prev, ...newEntries];
      });
      setIsLoadingMore(false);
    }
  }, [result, cursor]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const bottom = scrollHeight - scrollTop <= clientHeight + 100;

    if (bottom && result?.continueCursor && !isLoadingMore) {
      setIsLoadingMore(true);
      setCursor(result.continueCursor);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>things to be happy about</h1>
        <button
          className="admin-toggle"
          onClick={() => setShowAdmin(!showAdmin)}
        >
          {showAdmin ? "View Entries" : "Add Entry"}
        </button>
      </header>

      {showAdmin ? (
        <AdminPanel onClose={() => setShowAdmin(false)} />
      ) : (
        <div className="entries-container" onScroll={handleScroll}>
          {allEntries.map((entry) => (
            <EntryCard key={entry._id} entry={entry} />
          ))}
          {result?.isDone && allEntries.length > 0 && (
            <div className="loading">The beginning of happiness...</div>
          )}
          {!result && <div className="loading">Loading...</div>}
        </div>
      )}
    </div>
  );
}

export default App;
