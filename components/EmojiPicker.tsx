"use client";

import { useEffect, useRef, useState } from "react";

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
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const btnSize = size === "sm" ? "text-[14px] w-6 h-6" : "text-[18px] w-8 h-8";

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        className={`${btnSize} flex items-center justify-center hover:bg-tan-soft transition-colors cursor-pointer`}
        onClick={() => setOpen((o) => !o)}
        title="Escolher emoji"
      >
        {value || "📋"}
      </button>

      {open && (
        <div className="absolute z-50 left-0 top-full mt-1 w-72 bg-paper border border-hairline shadow-[0_4px_24px_rgba(0,0,0,0.12)] p-3 animate-fade-up">
          {EMOJI_GROUPS.map((group) => (
            <div key={group.label} className="mb-3">
              <p className="text-[8px] uppercase tracking-[0.2em] text-muted mb-1.5">{group.label}</p>
              <div className="flex flex-wrap gap-0.5">
                {group.emojis.map((em) => (
                  <button
                    key={em}
                    type="button"
                    className="text-[16px] w-8 h-8 flex items-center justify-center hover:bg-tan-soft transition-colors"
                    onClick={() => { onChange(em); setOpen(false); }}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
