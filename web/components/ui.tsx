import type { ReactNode } from "react";

/** A full-width notice bar (e.g. "no runner configured yet"). */
export function Banner({
  tone = "warn",
  children,
}: {
  tone?: "warn" | "info";
  children: ReactNode;
}) {
  return <div className={`banner banner-${tone}`}>{children}</div>;
}

/** A small spinning dot used inside busy phase readouts / buttons. */
export function Spinner() {
  return <span className="spinner" aria-hidden="true" />;
}

/** Centered loading state for the stage. */
export function Loading({ label }: { label: string }) {
  return (
    <div className="stage-center">
      <Spinner />
      <p className="muted">{label}</p>
    </div>
  );
}
