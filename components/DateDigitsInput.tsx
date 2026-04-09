"use client";

function digitsOnly(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 8);
}

function digitsToDdMmYyyy(digits: string): string {
  const d = digits.slice(0, 8);
  if (d.length === 0) return "";
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

type DateDigitsInputProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Optional id of hint element for screen readers */
  ariaDescribedBy?: string;
};

/** Day/month/year from up to 8 digits only, shown as DD/MM/YYYY. */
export function DateDigitsInput({
  id,
  value,
  onChange,
  placeholder = "DD/MM/YYYY",
  ariaDescribedBy,
}: DateDigitsInputProps) {
  const display = digitsToDdMmYyyy(digitsOnly(value));

  return (
    <input
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      className="input-simplify py-2.5 text-sm font-mono tabular-nums"
      value={display}
      onChange={(e) => {
        onChange(digitsToDdMmYyyy(digitsOnly(e.target.value)));
      }}
      onKeyDown={(e) => {
        const allowSingleChar =
          /\d/.test(e.key) ||
          e.key === "Backspace" ||
          e.key === "Delete" ||
          e.key === "Tab" ||
          e.key === "ArrowLeft" ||
          e.key === "ArrowRight" ||
          e.key === "ArrowUp" ||
          e.key === "ArrowDown" ||
          e.key === "Home" ||
          e.key === "End";
        const allowCombo = e.ctrlKey || e.metaKey || e.altKey;
        if (e.key.length === 1 && !allowSingleChar && !allowCombo) {
          e.preventDefault();
        }
      }}
      placeholder={placeholder}
      maxLength={10}
      aria-describedby={ariaDescribedBy}
    />
  );
}
