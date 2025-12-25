import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import "./AdminPanel.css";

function AdminPanel({ onClose: _onClose }: { onClose: () => void }) {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [things, setThings] = useState(["", "", "", "", ""]);
  const [message, setMessage] = useState("");

  const addEntry = useMutation(api.entries.addEntry);
  const existingEntry = useQuery(api.entries.getEntryByDate, { date });

  // Load existing entry when date changes or when data is available
  useEffect(() => {
    if (existingEntry?.things) {
      setThings(existingEntry.things);
    }
  }, [existingEntry]);

  const handleThingChange = (index: number, value: string) => {
    const newThings = [...things];
    newThings[index] = value;
    setThings(newThings);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const filledThings = things.filter((thing) => thing.trim() !== "");

    if (filledThings.length === 0) {
      setMessage("Please add at least one thing to be happy about!");
      return;
    }

    try {
      await addEntry({ date, things: filledThings });
      setMessage(`Entry saved for ${date}!`);
      setThings(["", "", "", "", ""]);
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      setMessage("Error saving entry. Please try again.");
      console.error(error);
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDate(e.target.value);
    setThings(["", "", "", "", ""]);
    setMessage("");
  };

  return (
    <div className="admin-panel">
      <div className="admin-content">
        <h2>Add Daily Entry</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="date">Date</label>
            <input
              type="date"
              id="date"
              value={date}
              onChange={handleDateChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Things to be happy about</label>
            {things.map((thing, index) => (
              <input
                key={index}
                type="text"
                value={thing}
                onChange={(e) => handleThingChange(index, e.target.value)}
                placeholder={`Thing ${index + 1}`}
                className="thing-input"
              />
            ))}
          </div>

          <div className="button-group">
            <button type="submit" className="submit-button">
              Save Entry
            </button>
          </div>

          {message && (
            <div
              className={`message ${
                message.includes("Error") ? "error" : "success"
              }`}
            >
              {message}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

export default AdminPanel;
