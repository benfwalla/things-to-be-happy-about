import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import { api } from "../../convex/_generated/api";
import "@blocknote/mantine/style.css";
import "./EntryEditor.css";

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

interface EntryEditorProps {
  entry: Entry | null;
  onClose: () => void;
}

export default function EntryEditor({ entry, onClose }: EntryEditorProps) {
  const [date, setDate] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const addEntry = useMutation(api.entries.addEntry);

  // Initialize with today's date for new entries, or the entry's date for editing
  useEffect(() => {
    if (entry) {
      setDate(entry.date);
    } else {
      const today = new Date().toISOString().split("T")[0];
      setDate(today);
    }
  }, [entry]);

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

  const handleSave = async () => {
    if (!date) {
      alert("Please select a date");
      return;
    }

    setIsSaving(true);
    try {
      const blocks = editor.document;
      const things = extractThingsFromBlocks(blocks);

      if (things.length === 0) {
        alert("Please add at least one item");
        setIsSaving(false);
        return;
      }

      await addEntry({ date, things });
      onClose();
    } catch (error) {
      console.error("Error saving entry:", error);
      alert("Failed to save entry");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="editor-overlay">
      <div className="editor-modal">
        <div className="editor-header">
          <h2>{entry ? "Edit Entry" : "New Entry"}</h2>
          <button onClick={onClose} className="close-button">
            ✕
          </button>
        </div>
        <div className="editor-date">
          <label htmlFor="date">Date:</label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="date-input"
          />
        </div>
        <div className="editor-content">
          <BlockNoteView
            editor={editor}
            theme="light"
            formattingToolbar={true}
          />
        </div>
        <div className="editor-footer">
          <button onClick={onClose} className="cancel-button">
            Cancel
          </button>
          <button onClick={handleSave} className="save-button" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
