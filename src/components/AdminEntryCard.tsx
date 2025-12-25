import { useState, useEffect, useRef } from "react";
import { PencilSimple, Trash } from "@phosphor-icons/react";
import { useMutation } from "convex/react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import { api } from "../../convex/_generated/api";
import ReactMarkdown from "react-markdown";
import "@blocknote/mantine/style.css";
import "./EntryCard.css"; // Shared base styles
import "./AdminEntryCard.css"; // Admin-specific styles

// Create a custom schema with only numbered lists and paragraph blocks
const schema = BlockNoteSchema.create({
  blockSpecs: {
    paragraph: defaultBlockSpecs.paragraph,
    numberedListItem: defaultBlockSpecs.numberedListItem,
  },
});

interface Entry {
  _id: string;
  date: string;
  things: string[];
}

interface AdminEntryCardProps {
  entry: Entry;
  onDelete: (id: string) => void;
  isNewEntry?: boolean;
}

function AdminEntryCard({ entry, onDelete, isNewEntry = false }: AdminEntryCardProps) {
  const [isEditing, setIsEditing] = useState(isNewEntry);
  const [editDate, setEditDate] = useState(entry.date);
  const addEntry = useMutation(api.entries.addEntry);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Convert things array to BlockNote format
  const getInitialContent = () => {
    if (!entry || entry.things.length === 0) {
      return [
        {
          type: "numberedListItem",
          content: [],
        },
      ];
    }

    return entry.things.map((thing) => ({
      type: "numberedListItem",
      content: [
        {
          type: "text",
          text: thing,
          styles: {},
        },
      ],
    }));
  };

  const editor = useCreateBlockNote({
    schema,
    initialContent: getInitialContent(),
  });

  // Extract text from BlockNote blocks
  const extractThingsFromBlocks = (blocks: any[]): string[] => {
    const things: string[] = [];

    const processBlock = (block: any) => {
      // Handle bullet list items and numbered list items
      if (block.type === "bulletListItem" || block.type === "numberedListItem") {
        const text = extractTextFromContent(block.content || []);
        if (text.trim()) {
          things.push(text.trim());
        }
      }
      // Handle paragraph blocks (in case user types without bullets)
      else if (block.type === "paragraph") {
        const text = extractTextFromContent(block.content || []);
        if (text.trim()) {
          // Split by hyphens at the start of lines for manual bullet points
          const lines = text.split(/\n-\s*/);
          lines.forEach((line) => {
            const trimmed = line.trim();
            if (trimmed) {
              things.push(trimmed);
            }
          });
        }
      }

      // Process children recursively
      if (block.children && Array.isArray(block.children)) {
        block.children.forEach(processBlock);
      }
    };

    blocks.forEach(processBlock);
    return things;
  };

  // Extract text content from content array, preserving formatting
  const extractTextFromContent = (content: any[]): string => {
    let text = "";

    content.forEach((item) => {
      if (item.type === "text") {
        let itemText = item.text || "";

        // Wrap with markdown for bold, italic, underline
        if (item.styles) {
          if (item.styles.bold) itemText = `**${itemText}**`;
          if (item.styles.italic) itemText = `*${itemText}*`;
          if (item.styles.underline) itemText = `__${itemText}__`;
        }

        text += itemText;
      } else if (item.type === "link") {
        const linkText = item.content?.[0]?.text || item.href;
        text += `[${linkText}](${item.href})`;
      }
    });

    return text;
  };

  // Auto-save on editor change
  useEffect(() => {
    if (!isEditing) return;

    const handleChange = () => {
      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Set new timeout to save after 1 second of no changes
      saveTimeoutRef.current = setTimeout(async () => {
        const blocks = editor.document;
        const things = extractThingsFromBlocks(blocks);

        // Only save if there's at least one item
        if (things.length > 0) {
          try {
            await addEntry({ date: editDate, things });
          } catch (error) {
            console.error("Error auto-saving entry:", error);
          }
        }
      }, 1000);
    };

    // Subscribe to editor changes
    return editor.onChange(handleChange);
  }, [isEditing, editor, editDate, addEntry]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="admin-entry-card">
      <div className="card-header">
        <div className="entry-date">
          {isEditing ? (
            <input
              type="date"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              className="date-input"
            />
          ) : (
            formatDate(entry.date)
          )}
        </div>
        <div className="card-actions">
          {!isEditing && (
            <button onClick={() => setIsEditing(true)} className="edit-button" title="Edit">
              <PencilSimple size={20} weight="regular" />
            </button>
          )}
          {isEditing && (
            <>
              <button onClick={() => onDelete(entry._id)} className="delete-button" title="Delete">
                <Trash size={20} weight="regular" />
              </button>
              <button onClick={() => setIsEditing(false)} className="done-button" title="Done">
                Done
              </button>
            </>
          )}
        </div>
      </div>
      {isEditing ? (
        <div className="editor-content-inline">
          <BlockNoteView
            editor={editor}
            theme="light"
            formattingToolbar={true}
          />
        </div>
      ) : (
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
      )}
    </div>
  );
}

export default AdminEntryCard;
