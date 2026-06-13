"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  {
    label: "Objetos",
    emojis: [
      "📋","📌","📍","📎","🖊","📝","📂","📁","🗂","📅","📆","🗒","🗓",
      "📊","📈","📉","🎯","✅","☑","🔖","💡","🔍","⚡","🔔","💬","📣",
    ],
  },
  {
    label: "Natureza",
    emojis: [
      "🌸","🌺","🌻","🌿","🍃","🌱","🍀","🌊","⭐","🌙","☀","🌈","🍂","🌾",
      "🌵","🎋","🌲","🌳","🍁","🌼","🌷","🌹","💫","✨",
    ],
  },
  {
    label: "Categorias",
    emojis: [
      "💼","🏠","🎓","🏋","🎨","🎵","✈","🏆","💰","🛒","🍽","🏃","💻","📱",
      "🎮","🎬","🎤","🚗","⚽","🏀","🎯","🎪","🎭","🎩",
    ],
  },
  {
    label: "Expressões",
    emojis: [
      "🎉","🥳","🙏","💪","👍","❤","💙","💚","💜","🧡","💛","🤝","👏",
      "🌟","💎","🔥","⚡","🎀","🏅","🥇","🎊","🪄","✨","🎁",
    ],
  },
];

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
  size?: "sm" | "md";
}

export function EmojiPicker({ value, onChange, size = "md" }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const picker = document.getElementById("emoji-picker-portal");
      if (picker && !picker.contains(target) && btnRef.current && !btnRef.current.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleOpen = () => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const pickerWidth = 288; // w-72
    const spaceRight = window.innerWidth - rect.left;
    const left = spaceRight < pickerWidth ? Math.max(4, rect.right - pickerWidth) : rect.left;
    setPos({ top: rect.bottom + 4, left });
    setOpen((o) => !o);
  };

  const btnSize = size === "sm" ? "text-[14px] w-6 h-6" : "text-[18px] w-8 h-8";

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className={`${btnSize} flex items-center justify-center hover:bg-tan-soft rounded-lg transition-colors cursor-pointer`}
        onClick={handleOpen}
        title="Escolher emoji"
      >
        {value || "📋"}
      </button>

      {open && pos && typeof document !== "undefined" && createPortal(
        <div
          id="emoji-picker-portal"
          className="fixed z-[300] w-72 bg-paper border border-hairline shadow-[0_8px_32px_rgba(0,0,0,0.14)] p-3 animate-fade-up"
          style={{ top: pos.top, left: pos.left, borderRadius: 16 }}
        >
          {EMOJI_GROUPS.map((group) => (
            <div key={group.label} className="mb-3">
              <p className="text-[8px] uppercase tracking-[0.2em] text-muted mb-1.5">{group.label}</p>
              <div className="flex flex-wrap gap-0.5">
                {group.emojis.map((em) => (
                  <button
                    key={em}
                    type="button"
                    className="text-[16px] w-8 h-8 flex items-center justify-center hover:bg-tan-soft rounded-lg transition-colors"
                    onClick={() => { onChange(em); setOpen(false); }}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}
