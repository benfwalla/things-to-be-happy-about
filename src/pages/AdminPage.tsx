import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { useAuth } from "../contexts/AuthContext";
import AdminEntryCard from "../components/AdminEntryCard";
import "../App.css";
import "./AdminPage.css";

export default function AdminPage() {
  const [allEntries, setAllEntries] = useState<any[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [manualNewEntries, setManualNewEntries] = useState<any[]>([]);

  const { logout } = useAuth();
  const navigate = useNavigate();
  const deleteEntry = useMutation(api.entries.deleteEntry);

  const result = useQuery(api.entries.getEntries, {
    paginationOpts: { numItems: 20, cursor },
  });

  // Get today's date in YYYY-MM-DD format
  const todayDate = useMemo(() => {
    return new Date().toISOString().split("T")[0];
  }, []);

  // Accumulate entries as we paginate
  useEffect(() => {
    if (result?.page) {
      setAllEntries((prev) => {
        // If cursor is null, we're starting fresh
        if (cursor === null) {
          const entries = result.page;
          // Check if today's entry exists in the fetched data
          const todayExists = entries.some((entry) => entry.date === todayDate);

          // If today's entry doesn't exist, add a placeholder at the beginning
          if (!todayExists) {
            const placeholderEntry = {
              _id: "temp-today",
              date: todayDate,
              things: [],
            };
            return [placeholderEntry, ...entries];
          }
          return entries;
        }
        // Otherwise, append new entries
        const existingIds = new Set(prev.map((e) => e._id));
        const newEntries = result.page.filter((e) => !existingIds.has(e._id));
        return [...prev, ...newEntries];
      });
      setIsLoadingMore(false);
    }
  }, [result, cursor, todayDate]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const bottom = scrollHeight - scrollTop <= clientHeight + 100;

    if (bottom && result?.continueCursor && !isLoadingMore) {
      setIsLoadingMore(true);
      setCursor(result.continueCursor);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleDelete = async (id: string) => {
    if (id === "temp-today" || id.startsWith("temp-new-")) {
      // Just remove the placeholder or manually created entry
      setAllEntries((prev) => prev.filter((e) => e._id !== id));
      setManualNewEntries((prev) => prev.filter((e) => e._id !== id));
      return;
    }

    if (confirm("Are you sure you want to delete this entry?")) {
      await deleteEntry({ id: id as any });
      setAllEntries((prev) => prev.filter((e) => e._id !== id));
    }
  };

  const handleCreateNew = () => {
    const newEntry = {
      _id: `temp-new-${Date.now()}`,
      date: todayDate,
      things: [],
    };
    setManualNewEntries((prev) => [...prev, newEntry]);
    setAllEntries((prev) => [newEntry, ...prev]);
  };

  return (
    <div className="app">
      <header className="header">
        <h1>things to be happy about</h1>
        <div className="header-actions">
          <button onClick={handleCreateNew} className="new-button">
            + New
          </button>
          <button onClick={handleLogout} className="logout-button">
            Logout
          </button>
        </div>
      </header>
      <div className="entries-container" onScroll={handleScroll}>
        {allEntries.map((entry) => (
          <AdminEntryCard
            key={entry._id}
            entry={entry}
            onDelete={handleDelete}
            isNewEntry={entry._id === "temp-today" || entry._id.startsWith("temp-new-")}
          />
        ))}
        {result?.isDone && allEntries.length > 0 && (
          <div className="loading">The beginning of happiness...</div>
        )}
        {!result && <div className="loading">Loading...</div>}
      </div>
    </div>
  );
}
