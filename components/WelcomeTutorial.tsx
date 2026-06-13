"use client";

import { useState } from "react";

interface WelcomeTutorialProps {
  onClose: () => void;
}

const STEPS = [
  {
    illustration: "📓",
    title: "Bem-vinda ao Planner",
    description:
      "Seu caderno digital pessoal para organizar projetos, tarefas e metas. Vamos dar um rápido tour!",
  },
  {
    illustration: "☰",
    title: "Menu lateral",
    description:
      "Clique no ☰ para abrir o menu. Lá você encontra seus planners e pode criar novos, personalizados do seu jeito.",
  },
  {
    illustration: "🏗",
    title: "Construa seu planner",
    description:
      "Clique em 'Construir meu Planner' para escolher um template (estudos, profissional, pessoal...) e selecionar os blocos que quer ver.",
  },
  {
    illustration: "✏️",
    title: "Edite quando quiser",
    description:
      "No menu lateral, ao lado de cada planner aparece o ícone ✏️. Clique nele para personalizar blocos, cores e fontes.",
  },
  {
    illustration: "🎉",
    title: "Seu espaço, do seu jeito",
    description:
      "Comece adicionando seus primeiros projetos e tarefas. O planner cresce com você!",
  },
];

export function WelcomeTutorial({ onClose }: WelcomeTutorialProps) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(true);

  if (typeof window !== "undefined" && localStorage.getItem("welcome_seen") === "1") {
    return null;
  }

  if (!visible) return null;

  function handleClose() {
    localStorage.setItem("welcome_seen", "1");
    setVisible(false);
    onClose();
  }

  function handleNext() {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      handleClose();
    }
  }

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ backgroundColor: "rgba(44, 43, 39, 0.30)", backdropFilter: "blur(2px)" }}
    >
      <div
        className="tutorial-card p-8 max-w-md w-full mx-4 text-center"
        style={{ backgroundColor: "var(--paper)" }}
      >
        {/* Illustration */}
        <div
          key={step}
          className="text-[64px] mb-4 leading-none select-none"
          style={{ transition: "opacity 0.2s" }}
        >
          {current.illustration}
        </div>

        {/* Title */}
        <h2
          className="font-serif-note mb-2"
          style={{
            color: "var(--ink)",
            fontSize: "1.375rem",
            fontWeight: 600,
          }}
        >
          {current.title}
        </h2>

        {/* Description */}
        <p
          style={{
            color: "var(--muted)",
            fontSize: "0.9375rem",
            lineHeight: 1.6,
            marginBottom: "1.75rem",
          }}
        >
          {current.description}
        </p>

        {/* Progress dots */}
        <div
          className="flex items-center justify-center gap-2 mb-1"
          aria-label={`Passo ${step + 1} de ${STEPS.length}`}
        >
          {STEPS.map((_, i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full inline-block"
              style={{
                backgroundColor:
                  i <= step ? "var(--ink)" : "var(--hairline)",
                transition: "background-color 0.2s",
              }}
            />
          ))}
        </div>

        {/* Step counter */}
        <p
          style={{
            color: "var(--muted)",
            fontSize: "0.75rem",
            marginBottom: "1.5rem",
          }}
        >
          {step + 1} de {STEPS.length}
        </p>

        {/* Primary button */}
        <button
          className="ink-btn ink-btn-solid"
          onClick={handleNext}
          style={{ width: "100%", marginBottom: "0.875rem" }}
        >
          {isLast ? "Começar!" : "Próximo"}
        </button>

        {/* Skip link */}
        <button
          onClick={handleClose}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--muted)",
            fontSize: "0.8125rem",
            padding: "0.25rem 0.5rem",
          }}
        >
          Pular tutorial →
        </button>
      </div>
    </div>
  );
}
