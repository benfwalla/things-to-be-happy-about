import ReactMarkdown from "react-markdown";
import "./EntryCard.css";

interface Entry {
  _id: string;
  date: string;
  things: string[];
}

function EntryCard({ entry }: { entry: Entry }) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="entry-card">
      <div className="entry-date">{formatDate(entry.date)}</div>
      <ol className="entry-list">
        {entry.things.map((thing, index) => (
          <li key={index}>
            <ReactMarkdown
              components={{
                a: ({ node, ...props }) => (
                  <a {...props} target="_blank" rel="noopener noreferrer" />
                ),
                p: ({ node, ...props }) => <span {...props} />,
              }}
            >
              {thing}
            </ReactMarkdown>
          </li>
        ))}
      </ol>
    </div>
  );
}

export default EntryCard;
