type Props = {
  kind?: "success" | "error" | "info" | "warning";
  children: React.ReactNode;
  onClose?: () => void;
};

export default function Alert({ kind = "info", children, onClose }: Props) {
  return (
    <div className={`alert alert--${kind}`} role="status" aria-live="polite">
      <span className="alert__content">{children}</span>
      {onClose ? (
        <button type="button" className="alert__close" onClick={onClose} aria-label="Fermer">
          ×
        </button>
      ) : null}
    </div>
  );
}
