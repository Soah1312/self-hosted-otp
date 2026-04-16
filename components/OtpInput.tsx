"use client";

import { ClipboardEvent, KeyboardEvent, useEffect, useRef, useState } from "react";

type OtpInputProps = {
  value: string[];
  onChange: (val: string[]) => void;
  error?: string;
  loading?: boolean;
};

const OTP_LENGTH = 6;

export default function OtpInput({ value, onChange, error, loading }: OtpInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => {
    if (!error) return;
    setIsShaking(true);
    const timeoutId = window.setTimeout(() => setIsShaking(false), 360);
    return () => window.clearTimeout(timeoutId);
  }, [error]);

  function focusNext(index: number) {
    if (index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function focusPrevious(index: number) {
    if (index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handleChange(index: number, rawValue: string) {
    const digit = rawValue.replace(/\D/g, "").slice(-1);
    const nextValue = [...value];
    nextValue[index] = digit;
    onChange(nextValue);
    if (digit) focusNext(index);
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !value[index]) {
      focusPrevious(index);
    }
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    const pastedText = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pastedText) return;
    event.preventDefault();
    const nextValue = Array.from({ length: OTP_LENGTH }, (_, index) => pastedText[index] ?? "");
    onChange(nextValue);
    const nextFocus = Math.min(pastedText.length, OTP_LENGTH - 1);
    inputRefs.current[nextFocus]?.focus();
  }

  const gridClasses = [
    "otpGrid",
    isShaking ? "otpGridShake" : "",
    loading ? "otpGridLoading" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={gridClasses} onPaste={handlePaste}>
      {Array.from({ length: OTP_LENGTH }).map((_, index) => (
        <input
          key={index}
          ref={(element) => {
            inputRefs.current[index] = element;
          }}
          className="otpCell"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          value={value[index] ?? ""}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
        />
      ))}

      {error ? <p className="fieldError otpError">{error}</p> : null}
    </div>
  );
}
