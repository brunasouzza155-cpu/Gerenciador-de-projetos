"use client";

import { useState } from "react";

// Pequenos componentes compartilhados do visual de caderno.

/** Checkbox quadrado de tinta: vazio, ✓ (concluído) ou – (parcial). */
export function InkCheck({
  state,
  onToggle,
  title,
}: {
  state: "done" | "partial" | "open";
  onToggle: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      className="ink-check"
      data-state={state}
      onClick={onToggle}
      title={title}
      aria-checked={state === "done"}
      role="checkbox"
    >
      {state === "done" ? "✓" : state === "partial" ? "–" : ""}
    </button>
  );
}

/** Barra preta de título de seção, com conteúdo opcional à direita. */
export function SectionBar({
  title,
  right,
}: {
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="section-bar">
      <span>{title}</span>
      {right}
    </div>
  );
}

/** Campo "+ adicionar" que dispara no Enter e limpa em seguida. */
export function AddInline({
  placeholder,
  onAdd,
  disabled,
}: {
  placeholder: string;
  onAdd: (value: string) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState("");
  return (
    <input
      className="ink-input"
      placeholder={placeholder}
      value={value}
      disabled={disabled}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && value.trim()) {
          onAdd(value.trim());
          setValue("");
        }
      }}
    />
  );
}

/** Botãozinho de ação de linha: [+] [✎] [×] */
export function RowBtn({
  label,
  onClick,
  title,
  danger,
}: {
  label: string;
  onClick: () => void;
  title: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`text-[11px] leading-none px-1 border border-hairline hover:border-ink ${
        danger ? "text-alert" : "text-muted hover:text-ink"
      }`}
    >
      {label}
    </button>
  );
}
