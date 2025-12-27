import { useState, useRef, useEffect } from "react";
import { PencilSimple, Trash } from "@phosphor-icons/react";
import { useMutation } from "convex/react";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/mantine";
import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import { en } from "@blocknote/core/locales";
import { api } from "../../convex/_generated/api";
import ReactMarkdown from "react-markdown";
import "@blocknote/mantine/style.css";
import "./EntryCard.css";

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
  bonus?: string;
}

interface EntryCardProps {
  entry: Entry;
  onDelete?: (id: string) => void;
  isNewEntry?: boolean;
  isAuthenticated?: boolean;
  adminToken?: string | null;
}


function EntryCard({ entry, onDelete, isNewEntry = false, isAuthenticated = false, adminToken }: EntryCardProps) {
  const [isEditing, setIsEditing] = useState(isNewEntry);
  const [editDate, setEditDate] = useState(entry.date);
  const [bonusCharCount, setBonusCharCount] = useState((entry.bonus ?? "").length);
  const addEntry = useMutation(api.entries.addEntry);
  const updateBonus = useMutation(api.entries.updateBonus);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const bonusSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wasNewEntryRef = useRef(isNewEntry);
  const [currentEasternDate, setCurrentEasternDate] = useState(() =>
    getEasternDateString()
  );

  // Keep edit mode open if this started as a new entry, even after first save
  useEffect(() => {
    if (wasNewEntryRef.current && !isEditing) {
      setIsEditing(true);
    }
  }, [entry._id, isEditing]);

  const formatDate = (dateString: string) => {
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day, 12, 0, 0);
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
          type: "numberedListItem" as const,
          content: [],
        },
      ];
    }

    return entry.things.map((thing) => ({
      type: "numberedListItem" as const,
      content: [
        {
          type: "text" as const,
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

  const bonusEditor = useCreateBlockNote({
    schema: BlockNoteSchema.create({
      blockSpecs: {
        paragraph: defaultBlockSpecs.paragraph,
      },
    }),
    initialContent: getBonusInitialContent(entry.bonus),
    dictionary: {
      ...en,
      placeholders: {
        ...en.placeholders,
        default: "Go ahead, write anything you want :)",
        emptyDocument: "Go ahead, write anything you want :)",
      },
    },
  });

  // Extract text from BlockNote blocks
  const extractThingsFromBlocks = (blocks: any[]): string[] => {
    const things: string[] = [];

    const processBlock = (block: any) => {
      if (block.type === "bulletListItem" || block.type === "numberedListItem") {
        const text = extractTextFromContent(block.content || []);
        if (text.trim()) {
          things.push(text.trim());
        }
      } else if (block.type === "paragraph") {
        const text = extractTextFromContent(block.content || []);
        if (text.trim()) {
          const lines = text.split(/\n-\s*/);
          lines.forEach((line) => {
            const trimmed = line.trim();
            if (trimmed) {
              things.push(trimmed);
            }
          });
        }
      }

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

  const extractBonusFromBlocks = (blocks: any[]): string => {
    const lines: string[] = [];
    blocks.forEach((block) => {
      if (block.type === "paragraph") {
        const text = extractTextFromContent(block.content || []);
        if (text.trim()) {
          lines.push(text.trim());
        }
      }
    });
    return lines.join("\n");
  };

  // Auto-save on editor change (doesn't close edit mode)
  const handleSave = async () => {
    const blocks = editor.document;
    const things = extractThingsFromBlocks(blocks);

    if (things.length > 0) {
      try {
        await addEntry({ date: editDate, things });
      } catch (error) {
        console.error("Error saving entry:", error);
      }
    }
  };

  // Debounced save - only triggers on change while editing
  const handleChange = () => {
    if (!isEditing) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      handleSave();
    }, 1000);
  };

  // Cleanup timeout on unmount
  const cleanup = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    if (bonusSaveTimeoutRef.current) {
      clearTimeout(bonusSaveTimeoutRef.current);
    }
  };

  useEffect(() => cleanup, []);

  useEffect(() => {
    if (bonusSaveTimeoutRef.current) {
      clearTimeout(bonusSaveTimeoutRef.current);
    }
    setBonusCharCount((entry.bonus ?? "").length);
    bonusEditor.replaceBlocks(
      bonusEditor.document,
      getBonusInitialContent(entry.bonus)
    );
  }, [entry.bonus, bonusEditor]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentEasternDate(getEasternDateString());
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const canEditBonus =
    (!isAuthenticated && entry.date === currentEasternDate) ||
    (isAuthenticated && (isEditing || entry.date === currentEasternDate));
  const isBonusLocked = !canEditBonus;
  const remainingChars = Math.max(0, 250 - bonusCharCount);

  const saveBonus = async (value: string) => {
    if (isBonusLocked && !isAuthenticated) return;
    try {
      await updateBonus({
        date: entry.date,
        bonus: value,
        adminToken: isAuthenticated ? adminToken ?? undefined : undefined,
      });
    } catch (error) {
      console.error("Error saving bonus:", error);
    }
  };

  const scheduleBonusSave = (value: string) => {
    if (isBonusLocked && !isAuthenticated) return;
    if (bonusSaveTimeoutRef.current) {
      clearTimeout(bonusSaveTimeoutRef.current);
    }
    bonusSaveTimeoutRef.current = setTimeout(() => {
      saveBonus(value);
    }, 500);
  };

  const handleBonusChange = () => {
    const bonusText = extractBonusFromBlocks(bonusEditor.document);
    if (bonusText.length > 250) {
      const trimmed = bonusText.slice(0, 250);
      setBonusCharCount(trimmed.length);
      bonusEditor.replaceBlocks(
        bonusEditor.document,
        getBonusInitialContent(trimmed)
      );
      scheduleBonusSave(trimmed);
      return;
    }
    setBonusCharCount(bonusText.length);
    scheduleBonusSave(bonusText);
  };

  return (
    <div className={isAuthenticated ? "admin-entry-card" : "entry-card"}>
      <div className="card-header">
        <div className="entry-date">
          {isEditing && isAuthenticated ? (
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
        {isAuthenticated && (
          <div className="card-actions">
            {!isEditing && (
              <button onClick={() => setIsEditing(true)} className="edit-button" title="Edit">
                <PencilSimple size={20} weight="regular" />
              </button>
            )}
            {isEditing && (
              <>
                {onDelete && (
                  <button onClick={() => onDelete(entry._id)} className="delete-button" title="Delete">
                    <Trash size={20} weight="regular" />
                  </button>
                )}
                <button onClick={async () => { 
                  wasNewEntryRef.current = false; 
                  await handleSave(); 
                  setIsEditing(false); 
                }} className="done-button" title="Done">
                  Done
                </button>
              </>
            )}
          </div>
        )}
      </div>
      {isEditing && isAuthenticated ? (
        <div className="editor-content-inline">
          <BlockNoteView
            editor={editor}
            theme="light"
            formattingToolbar={true}
            sideMenu={false}
            onChange={handleChange}
            data-libre-baskerville-font
          />
        </div>
      ) : (
        <>
          {entry.things.length === 0 && !isAuthenticated && entry.date === currentEasternDate ? (
            <p className="no-entries-placeholder">
              No entries from Ben yet.
            </p>
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
        </>
      )}
      {(!isAuthenticated && !entry.bonus && entry.date !== currentEasternDate) || (isAuthenticated && !canEditBonus && !entry.bonus) ? null : (
        <div className="bonus-section">
        {canEditBonus ? (
          <>
            <div className="bonus-editor-clean">
              <span 
                className={entry.date === currentEasternDate ? "bonus-label tooltip-trigger" : "bonus-label"}
                data-tooltip-id={entry.date === currentEasternDate ? "bonus-tooltip" : undefined}
                data-tooltip-content={entry.date === currentEasternDate ? "Add anything you want. Bonus boxes get locked at the end of the day." : undefined}
                data-tooltip-place="top"
              >
                Bonus:
              </span>
              <div className="bonus-blocknote-wrapper">
                <BlockNoteView
                  editor={bonusEditor}
                  theme="light"
                  formattingToolbar={false}
                  sideMenu={false}
                  onChange={handleBonusChange}
                  data-libre-baskerville-font
                />
              </div>
              <span className={remainingChars <= 10 ? "bonus-counter warning" : "bonus-counter"}>
                {remainingChars}
              </span>
            </div>
          </>
        ) : entry.bonus ? (
          <div className="bonus-display">
            <span 
              className={entry.date === currentEasternDate ? "bonus-label tooltip-trigger" : "bonus-label"}
              data-tooltip-id={entry.date === currentEasternDate ? "bonus-tooltip" : undefined}
              data-tooltip-content={entry.date === currentEasternDate ? "Add anything you want! Bonus boxes get locked at the end of the day." : undefined}
              data-tooltip-place="top"
            >
              Bonus:
            </span>{" "}
            <ReactMarkdown
              components={{
                a: ({ node, ...props }) => (
                  <a {...props} target="_blank" rel="noopener noreferrer" />
                ),
                p: ({ node, ...props }) => <span {...props} />,
              }}
            >
              {entry.bonus}
            </ReactMarkdown>
          </div>
        ) : null}
      </div>
      )}
    </div>
  );
}

export default EntryCard;

function getEasternDateString() {
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
  if (!year || !month || !day) {
    throw new Error("Unable to compute Eastern date");
  }
  return `${year}-${month}-${day}`;
}

function getBonusInitialContent(bonus?: string) {
  if (!bonus) {
    return [
      {
        type: "paragraph" as const,
        content: [],
      },
    ];
  }

  return [
    {
      type: "paragraph" as const,
      content: [
        {
          type: "text" as const,
          text: bonus,
          styles: {},
        },
      ],
    },
  ];
}
