"use client";

import { useEffect, useMemo, useState } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Book {
  id: string;
  title: string;
  author: string;
  emoji: string;
  status: "lendo" | "quero-ler" | "ja-li";
  rating: number;
  progress: number;
  totalPages: number;
  currentPage: number;
  notes: string;
  startDate: string | null;
  finishDate: string | null;
  addedAt: string;
}

const LS_KEY = "leituras_data";

function loadBooks(): Book[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as Book[]) : [];
  } catch {
    return [];
  }
}

function saveBooks(books: Book[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(books));
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function newId() {
  return Math.random().toString(36).slice(2, 10);
}

// ── SVG Bar Chart ─────────────────────────────────────────────────────────────

function MonthlyChart({ books }: { books: Book[] }) {
  const MONTHS_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

  const data = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - (5 - i));
      const ym = d.toISOString().slice(0, 7);
      const label = MONTHS_PT[d.getMonth()];
      const value = books.filter((b) => b.finishDate?.startsWith(ym)).length;
      return { label, value };
    });
  }, [books]);

  const max = Math.max(...data.map((d) => d.value), 1);
  const H = 72;
  const barW = 24;
  const gap = 10;
  const totalW = data.length * (barW + gap) - gap;

  return (
    <svg width={totalW} height={H + 24} className="w-full max-w-xs">
      {data.map((d, i) => {
        const barH = Math.max(Math.round((d.value / max) * H), d.value > 0 ? 3 : 0);
        const x = i * (barW + gap);
        return (
          <g key={i}>
            <rect
              x={x}
              y={H - barH}
              width={barW}
              height={barH || 2}
              fill="var(--ink)"
              opacity={d.value === 0 ? 0.1 : 0.85}
            />
            <text
              x={x + barW / 2}
              y={H + 14}
              textAnchor="middle"
              fontSize="8"
              fill="var(--muted)"
            >
              {d.label}
            </text>
            {d.value > 0 && (
              <text
                x={x + barW / 2}
                y={H - barH - 4}
                textAnchor="middle"
                fontSize="9"
                fill="var(--ink)"
                fontWeight="600"
              >
                {d.value}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── Star Rating ───────────────────────────────────────────────────────────────

function StarRating({
  value,
  onChange,
  readonly = false,
}: {
  value: number;
  onChange?: (v: number) => void;
  readonly?: boolean;
}) {
  const [hovered, setHovered] = useState(0);

  return (
    <span className="inline-flex gap-0.5 leading-none">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = (hovered || value) >= star;
        return (
          <button
            key={star}
            type="button"
            disabled={readonly}
            className={`text-[14px] leading-none transition-colors ${
              readonly ? "cursor-default" : "cursor-pointer hover:scale-110"
            } ${filled ? "text-ink" : "text-[#D4C5A0]"}`}
            onMouseEnter={() => !readonly && setHovered(star)}
            onMouseLeave={() => !readonly && setHovered(0)}
            onClick={() => {
              if (!readonly && onChange) {
                onChange(value === star ? 0 : star);
              }
            }}
            aria-label={`${star} estrela${star > 1 ? "s" : ""}`}
          >
            {filled ? "★" : "☆"}
          </button>
        );
      })}
    </span>
  );
}

// ── Progress Bar ──────────────────────────────────────────────────────────────

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-1.5 border border-hairline bg-tan-soft w-full">
      <div
        className="h-full bg-ink transition-all duration-300"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

// ── Add Book Form ─────────────────────────────────────────────────────────────

interface AddBookFormProps {
  onAdd: (book: Book) => void;
  onCancel: () => void;
  defaultStatus?: Book["status"];
}

function AddBookForm({ onAdd, onCancel, defaultStatus = "quero-ler" }: AddBookFormProps) {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [emoji, setEmoji] = useState("📖");
  const [status, setStatus] = useState<Book["status"]>(defaultStatus);
  const [totalPages, setTotalPages] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    const pages = parseInt(totalPages) || 0;
    const book: Book = {
      id: newId(),
      title: title.trim(),
      author: author.trim(),
      emoji: emoji.trim() || "📖",
      status,
      rating: 0,
      progress: 0,
      totalPages: pages,
      currentPage: 0,
      notes: "",
      startDate: status === "lendo" ? todayISO() : null,
      finishDate: status === "ja-li" ? todayISO() : null,
      addedAt: new Date().toISOString(),
    };
    onAdd(book);
  }

  return (
    <form onSubmit={handleSubmit} className="px-4 py-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-[9px] uppercase tracking-wider text-muted block mb-1">
            Título *
          </label>
          <input
            className="ink-input"
            placeholder="Nome do livro"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            autoFocus
          />
        </div>
        <div>
          <label className="text-[9px] uppercase tracking-wider text-muted block mb-1">
            Autor
          </label>
          <input
            className="ink-input"
            placeholder="Nome do autor"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="text-[9px] uppercase tracking-wider text-muted block mb-1">
            Emoji / capa
          </label>
          <input
            className="ink-input text-xl"
            placeholder="📖"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            maxLength={4}
          />
        </div>
        <div>
          <label className="text-[9px] uppercase tracking-wider text-muted block mb-1">
            Status
          </label>
          <select
            className="ink-input"
            value={status}
            onChange={(e) => setStatus(e.target.value as Book["status"])}
          >
            <option value="quero-ler">🔖 Quero ler</option>
            <option value="lendo">📖 Lendo</option>
            <option value="ja-li">✅ Já li</option>
          </select>
        </div>
        <div>
          <label className="text-[9px] uppercase tracking-wider text-muted block mb-1">
            Total de páginas
          </label>
          <input
            className="ink-input"
            type="number"
            placeholder="0"
            min="0"
            value={totalPages}
            onChange={(e) => setTotalPages(e.target.value)}
          />
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <button type="submit" className="ink-btn ink-btn-solid">
          adicionar livro
        </button>
        <button type="button" className="ink-btn" onClick={onCancel}>
          cancelar
        </button>
      </div>
    </form>
  );
}

// ── Progress Update Popover ───────────────────────────────────────────────────

function ProgressUpdater({
  book,
  onUpdate,
  onClose,
}: {
  book: Book;
  onUpdate: (currentPage: number) => void;
  onClose: () => void;
}) {
  const [page, setPage] = useState(String(book.currentPage));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const p = Math.min(book.totalPages || 99999, Math.max(0, parseInt(page) || 0));
    onUpdate(p);
    onClose();
  }

  return (
    <div className="bg-paper border border-hairline p-3 shadow-md mt-2 animate-fade-up">
      <p className="text-[9px] uppercase tracking-wider text-muted mb-2">
        Atualizar progresso
      </p>
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          className="ink-input !w-20 tabular-nums"
          type="number"
          min="0"
          max={book.totalPages || undefined}
          value={page}
          onChange={(e) => setPage(e.target.value)}
          autoFocus
        />
        {book.totalPages > 0 && (
          <span className="text-[10px] text-muted">/ {book.totalPages} pág.</span>
        )}
        <button type="submit" className="ink-btn ink-btn-solid text-[10px]">ok</button>
        <button type="button" className="ink-btn text-[10px]" onClick={onClose}>×</button>
      </form>
    </div>
  );
}

// ── Book Card ─────────────────────────────────────────────────────────────────

function BookCard({
  book,
  onRating,
  onProgressUpdate,
  onNotesChange,
  onStatusChange,
  onDelete,
}: {
  book: Book;
  onRating: (id: string, rating: number) => void;
  onProgressUpdate: (id: string, currentPage: number) => void;
  onNotesChange: (id: string, notes: string) => void;
  onStatusChange: (id: string, status: Book["status"]) => void;
  onDelete: (id: string) => void;
}) {
  const [showNotes, setShowNotes] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [noteDraft, setNoteDraft] = useState(book.notes);
  const [showProgress, setShowProgress] = useState(false);
  const [showActions, setShowActions] = useState(false);

  function saveNotes() {
    onNotesChange(book.id, noteDraft);
    setEditingNotes(false);
  }

  return (
    <div className="bg-paper border border-hairline p-3 space-y-2 animate-fade-up group">
      {/* Top row */}
      <div className="flex items-start gap-2.5">
        <span className="text-2xl leading-none mt-0.5 shrink-0">{book.emoji}</span>

        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold leading-snug">{book.title}</p>
          {book.author && (
            <p className="text-[10px] text-muted font-serif-note">{book.author}</p>
          )}
        </div>

        {/* Actions menu */}
        <div className="relative shrink-0">
          <button
            className="ink-btn py-0.5 px-1.5 text-[9px] opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => setShowActions(!showActions)}
          >
            ···
          </button>
          {showActions && (
            <div className="absolute right-0 top-full mt-1 z-20 bg-paper border border-hairline shadow-md min-w-[140px]">
              <div className="py-1">
                {(["quero-ler", "lendo", "ja-li"] as const)
                  .filter((s) => s !== book.status)
                  .map((s) => {
                    const labels = { "quero-ler": "🔖 Quero ler", lendo: "📖 Lendo", "ja-li": "✅ Já li" };
                    return (
                      <button
                        key={s}
                        className="block w-full text-left px-3 py-1.5 text-[10px] hover:bg-tan-soft"
                        onClick={() => {
                          onStatusChange(book.id, s);
                          setShowActions(false);
                        }}
                      >
                        {labels[s]}
                      </button>
                    );
                  })}
                <div className="border-t border-hairline mt-1 pt-1">
                  <button
                    className="block w-full text-left px-3 py-1.5 text-[10px] text-alert hover:bg-tan-soft"
                    onClick={() => {
                      setShowActions(false);
                      onDelete(book.id);
                    }}
                  >
                    remover livro
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Star rating */}
      <div className="flex items-center gap-2">
        <StarRating
          value={book.rating}
          onChange={(v) => onRating(book.id, v)}
        />
        {book.rating > 0 && (
          <span className="text-[9px] text-muted">{book.rating}/5</span>
        )}
        {book.rating === 0 && (
          <span className="text-[9px] text-muted italic">sem avaliação</span>
        )}
      </div>

      {/* Progress bar — only for "lendo" */}
      {book.status === "lendo" && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[9px] uppercase tracking-wider text-muted">
              progresso
            </span>
            <button
              className="text-[9px] text-muted underline hover:text-ink transition-colors"
              onClick={() => setShowProgress(!showProgress)}
            >
              {book.progress}%
              {book.totalPages > 0 && ` · pág. ${book.currentPage}/${book.totalPages}`}
            </button>
          </div>
          <ProgressBar value={book.progress} />

          {showProgress && (
            <ProgressUpdater
              book={book}
              onUpdate={(p) => onProgressUpdate(book.id, p)}
              onClose={() => setShowProgress(false)}
            />
          )}
        </div>
      )}

      {/* Finish date — only for "ja-li" */}
      {book.status === "ja-li" && book.finishDate && (
        <p className="text-[9px] text-muted">
          concluído em{" "}
          <span className="font-medium text-ink">
            {new Date(book.finishDate + "T12:00:00").toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </span>
        </p>
      )}

      {/* Notes toggle */}
      <div>
        <button
          className="text-[9px] uppercase tracking-wider text-muted hover:text-ink transition-colors flex items-center gap-1"
          onClick={() => {
            setShowNotes(!showNotes);
            if (!showNotes) setEditingNotes(false);
          }}
        >
          <span>{showNotes ? "▾" : "▸"}</span>
          <span>notas{book.notes ? ` (${book.notes.length} car.)` : ""}</span>
        </button>

        {showNotes && (
          <div className="mt-1.5">
            {editingNotes ? (
              <div className="space-y-1">
                <textarea
                  className="ink-input min-h-[72px] text-[11px] resize-y"
                  placeholder="Anotações, citações, impressões…"
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  autoFocus
                />
                <div className="flex gap-1.5">
                  <button className="ink-btn ink-btn-solid text-[9px]" onClick={saveNotes}>
                    salvar
                  </button>
                  <button
                    className="ink-btn text-[9px]"
                    onClick={() => {
                      setNoteDraft(book.notes);
                      setEditingNotes(false);
                    }}
                  >
                    cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="text-[11px] font-serif-note text-muted border-l-2 border-hairline pl-2 py-0.5 cursor-pointer hover:border-ink transition-colors min-h-[28px]"
                onClick={() => setEditingNotes(true)}
                title="Clique para editar"
              >
                {book.notes ? (
                  book.notes
                ) : (
                  <span className="italic text-[#C0B89A]">clique para adicionar notas…</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Stats Bar ─────────────────────────────────────────────────────────────────

function StatsBar({ books }: { books: Book[] }) {
  const thisYear = new Date().getFullYear().toString();
  const total = books.length;
  const reading = books.filter((b) => b.status === "lendo").length;
  const finishedYear = books.filter(
    (b) => b.status === "ja-li" && b.finishDate?.startsWith(thisYear)
  ).length;
  const rated = books.filter((b) => b.rating > 0);
  const avgRating =
    rated.length > 0
      ? (rated.reduce((s, b) => s + b.rating, 0) / rated.length).toFixed(1)
      : "—";

  const stats = [
    { label: "Total de livros", value: total },
    { label: "Lendo agora", value: reading },
    { label: `Lidos em ${thisYear}`, value: finishedYear },
    { label: "Avaliação média", value: avgRating },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-hairline border border-hairline">
      {stats.map((s) => (
        <div key={s.label} className="bg-paper px-3 py-3 text-center">
          <p className="text-[9px] uppercase tracking-[0.18em] text-muted mb-0.5">{s.label}</p>
          <p className="text-xl font-semibold tabular-nums">{s.value}</p>
        </div>
      ))}
    </div>
  );
}

// ── Tab Nav ───────────────────────────────────────────────────────────────────

type Tab = "lendo" | "quero-ler" | "ja-li";

const TABS: { id: Tab; label: string }[] = [
  { id: "lendo", label: "📖 Lendo" },
  { id: "quero-ler", label: "🔖 Quero ler" },
  { id: "ja-li", label: "✅ Já li" },
];

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function LeiturasPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("lendo");
  const [showForm, setShowForm] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    setBooks(loadBooks());
    setMounted(true);
  }, []);

  // Persist on change
  useEffect(() => {
    if (mounted) saveBooks(books);
  }, [books, mounted]);

  function addBook(book: Book) {
    setBooks((prev) => [book, ...prev]);
    setShowForm(false);
    setActiveTab(book.status);
  }

  function updateRating(id: string, rating: number) {
    setBooks((prev) => prev.map((b) => (b.id === id ? { ...b, rating } : b)));
  }

  function updateProgress(id: string, currentPage: number) {
    setBooks((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b;
        const progress = b.totalPages > 0 ? Math.round((currentPage / b.totalPages) * 100) : 0;
        return { ...b, currentPage, progress };
      })
    );
  }

  function updateNotes(id: string, notes: string) {
    setBooks((prev) => prev.map((b) => (b.id === id ? { ...b, notes } : b)));
  }

  function updateStatus(id: string, status: Book["status"]) {
    setBooks((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b;
        return {
          ...b,
          status,
          startDate: status === "lendo" && !b.startDate ? todayISO() : b.startDate,
          finishDate: status === "ja-li" && !b.finishDate ? todayISO() : b.finishDate,
        };
      })
    );
  }

  function deleteBook(id: string) {
    if (!confirm("Remover este livro?")) return;
    setBooks((prev) => prev.filter((b) => b.id !== id));
  }

  const tabBooks = useMemo(
    () => books.filter((b) => b.status === activeTab),
    [books, activeTab]
  );

  const jaLiBooks = useMemo(() => books.filter((b) => b.status === "ja-li"), [books]);

  if (!mounted) {
    return (
      <main className="min-h-screen bg-kraft flex items-center justify-center">
        <p className="text-[12px] font-serif-note text-muted">abrindo a estante…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-kraft">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 bg-paper border-b border-hairline px-4 sm:px-8 py-3 flex items-center gap-3">
        <a href="/" className="ink-btn py-1.5 shrink-0">
          ← Voltar
        </a>
        <h1 className="flex-1 text-[11px] uppercase tracking-[0.3em] font-semibold">
          📚 Leituras
        </h1>
        <button
          className={`ink-btn shrink-0 ${showForm ? "ink-btn-solid" : ""}`}
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? "× fechar" : "+ adicionar livro"}
        </button>
      </header>

      <div className="max-w-[860px] mx-auto px-4 sm:px-8 py-6 space-y-5">

        {/* Add book form */}
        {showForm && (
          <div className="bg-paper border border-hairline animate-fade-up">
            <div className="section-bar">Novo livro</div>
            <AddBookForm
              onAdd={addBook}
              onCancel={() => setShowForm(false)}
              defaultStatus={activeTab}
            />
          </div>
        )}

        {/* Stats bar */}
        <StatsBar books={books} />

        {/* Tab navigation */}
        <div className="flex border border-hairline bg-paper overflow-hidden">
          {TABS.map((tab) => {
            const count = books.filter((b) => b.status === tab.id).length;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                className={`flex-1 text-[10px] sm:text-[11px] uppercase tracking-wider py-2.5 px-2 transition-colors border-r border-hairline last:border-r-0 ${
                  active
                    ? "bg-ink text-paper font-semibold"
                    : "text-muted hover:bg-tan-soft hover:text-ink"
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
                <span
                  className={`ml-1.5 text-[9px] tabular-nums ${
                    active ? "opacity-70" : "opacity-50"
                  }`}
                >
                  ({count})
                </span>
              </button>
            );
          })}
        </div>

        {/* Book list */}
        <div className="space-y-3">
          {tabBooks.length === 0 ? (
            <div className="bg-paper border border-hairline px-6 py-10 text-center">
              <p className="text-2xl mb-2 opacity-40">
                {activeTab === "lendo" ? "📖" : activeTab === "quero-ler" ? "🔖" : "✅"}
              </p>
              <p className="text-[12px] font-serif-note text-muted">
                {activeTab === "lendo" && "Nenhum livro em leitura no momento."}
                {activeTab === "quero-ler" && "Lista de desejos vazia."}
                {activeTab === "ja-li" && "Nenhum livro finalizado ainda."}
              </p>
              <button
                className="ink-btn mt-4"
                onClick={() => {
                  setShowForm(true);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              >
                + adicionar livro
              </button>
            </div>
          ) : (
            tabBooks.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                onRating={updateRating}
                onProgressUpdate={updateProgress}
                onNotesChange={updateNotes}
                onStatusChange={updateStatus}
                onDelete={deleteBook}
              />
            ))
          )}
        </div>

        {/* Monthly chart — shown only on "Já li" tab with at least 1 book */}
        {activeTab === "ja-li" && jaLiBooks.length > 0 && (
          <div className="bg-paper border border-hairline">
            <div className="section-bar">Livros concluídos por mês</div>
            <div className="px-4 py-5 flex flex-col items-center gap-2">
              <MonthlyChart books={jaLiBooks} />
              <p className="text-[9px] text-muted font-serif-note">últimos 6 meses</p>
            </div>
          </div>
        )}

        <footer className="text-center pt-2 pb-6">
          <p className="text-[10px] font-serif-note text-muted">
            "Uma página por vez — mas com a estante inteira à vista."
          </p>
        </footer>
      </div>
    </main>
  );
}
