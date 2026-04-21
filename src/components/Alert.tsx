import React from "react";

type Props = {
  kind?: "success" | "error" | "info" | "warning";
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
  onClick?: () => void;
};

export default function Alert({
  kind = "info",
  children,
  onClose,
  className = "",
  onClick,
}: Props) {
  return (
    <div
      className={`alert alert--${kind} ${className}`.trim()}
      role="status"
      aria-live="polite"
      onClick={onClick}
    >
      <span className="alert__content">{children}</span>

      {onClose ? (
        <button
          type="button"
          className="alert__close"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label="Fermer"
        >
          ×
        </button>
      ) : null}
    </div>
  );
}