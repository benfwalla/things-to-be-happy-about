import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { useNavigate } from "react-router-dom";
import { Rss } from "@phosphor-icons/react";
import { api } from "../convex/_generated/api";
import { useAuth } from "./contexts/AuthContext";
import EntryCard from "./components/EntryCard";
import "./App.css";

export default function App() {
  const { isAuthenticated, isLoading, logout, adminToken } = useAuth();
  const navigate = useNavigate();
  const [allEntries, setAllEntries] = useState<any[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const deleteEntry = useMutation(api.entries.deleteEntry);

  const result = useQuery(api.entries.getEntries, {
    paginationOpts: { numItems: 20, cursor },
  });

  // Get today's date in YYYY-MM-DD format (local timezone)
  const todayDate = useMemo(() => {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const parts = formatter.formatToParts(new Date());
    const year = parts.find((p) => p.type === "year")?.value;
    const month = parts.find((p) => p.type === "month")?.value;
    const day = parts.find((p) => p.type === "day")?.value;
    if (!year || !month || !day) return "";
    return `${year}-${month}-${day}`;
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

          // If today's entry doesn't exist and user is authenticated, add a placeholder at the beginning
          if (!todayExists) {
            const placeholderEntry = {
              _id: "temp-today",
              date: todayDate,
              things: [],
              bonus: "",
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

  // Intersection Observer for infinite scroll
  useEffect(() => {
    console.log('Observer setup:', {
      hasLoadMoreRef: !!loadMoreRef.current,
      isDone: result?.isDone,
      continueCursor: result?.continueCursor,
      isLoadingMore,
      entriesLength: allEntries.length
    });
    
    if (!loadMoreRef.current || result?.isDone || isLoadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        console.log('Intersection:', {
          isIntersecting: target.isIntersecting,
          continueCursor: result?.continueCursor,
          isLoadingMore
        });
        
        if (target.isIntersecting && result?.continueCursor !== null && result?.continueCursor !== undefined && !isLoadingMore) {
          console.log('Loading more entries...');
          setIsLoadingMore(true);
          setCursor(result.continueCursor);
        }
      },
      {
        root: null,
        rootMargin: '100px',
        threshold: 0.1
      }
    );

    observer.observe(loadMoreRef.current);

    return () => {
      observer.disconnect();
    };
  }, [result?.continueCursor, result?.isDone, isLoadingMore, allEntries.length]);

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleDelete = async (id: string) => {
    if (id === "temp-today" || id.startsWith("temp-new-")) {
      // Just remove the placeholder or manually created entry
      setAllEntries((prev) => prev.filter((e) => e._id !== id));
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
      bonus: "",
    };
    setAllEntries((prev) => [newEntry, ...prev]);
  };

  if (isLoading) {
    return (
      <div className="app">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <h1>
          <a href="/" className="title-link">
            things to be happy about
          </a>
        </h1>
        <div className="header-actions">
          {isAuthenticated ? (
            <>
              <button onClick={handleCreateNew} className="new-button">
                + New
              </button>
              <button onClick={handleLogout} className="logout-button">
                Logout
              </button>
            </>
          ) : (
            <a
              href="/feed"
              target="_blank"
              rel="noopener noreferrer"
              className="rss-link"
              title="Subscribe to RSS feed"
            >
              <Rss size={24} weight="regular" />
            </a>
          )}
        </div>
      </header>
      <div className="entries-container">
        {allEntries.map((entry) => (
          <EntryCard
            key={entry._id}
            entry={entry}
            onDelete={isAuthenticated ? handleDelete : undefined}
            isNewEntry={entry._id === "temp-today" || entry._id.startsWith("temp-new-")}
            isAuthenticated={isAuthenticated}
            adminToken={adminToken}
          />
        ))}
        {!result?.isDone && <div ref={loadMoreRef} style={{ height: '20px' }} />}
        {result?.isDone && allEntries.length > 0 && (
          <div className="loading">The beginning of happiness...</div>
        )}
        {!result && <div className="loading">Loading...</div>}
      </div>
    </div>
  );
}
