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
    inputRefs.current[0]?.focus();
    inputRefs.current[0]?.select();
  }, []);

  useEffect(() => {
    const isCleared = value.every((digit) => digit === "");
    if (!isCleared) return;
    inputRefs.current[0]?.focus();
    inputRefs.current[0]?.select();
  }, [value]);

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

  function applyDigitsFrom(index: number, rawText: string) {
    const digits = rawText.replace(/\D/g, "").slice(0, OTP_LENGTH - index);
    if (!digits) return;

    const nextValue = [...value];
    for (let offset = 0; offset < digits.length; offset += 1) {
      nextValue[index + offset] = digits[offset];
    }

    onChange(nextValue);
    const nextFocus = Math.min(index + digits.length, OTP_LENGTH - 1);
    inputRefs.current[nextFocus]?.focus();
    inputRefs.current[nextFocus]?.select();
  }

  function handleChange(index: number, rawValue: string) {
    const digitsOnly = rawValue.replace(/\D/g, "");
    if (digitsOnly.length > 1) {
      applyDigitsFrom(index, digitsOnly);
      return;
    }

    const digit = digitsOnly.slice(-1);
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

  function handlePaste(index: number, event: ClipboardEvent<HTMLElement>) {
    const pastedText = event.clipboardData.getData("text");
    if (!pastedText) return;

    event.preventDefault();
    event.stopPropagation();
    applyDigitsFrom(index, pastedText);
  }

  const gridClasses = [
    "otpGrid",
    isShaking ? "otpGridShake" : "",
    loading ? "otpGridLoading" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={gridClasses} onPaste={(event) => handlePaste(0, event)}>
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
          onPaste={(event) => handlePaste(index, event)}
          onFocus={(event) => event.currentTarget.select()}
          onKeyDown={(event) => handleKeyDown(index, event)}
        />
      ))}

      {error ? <p className="fieldError otpError">{error}</p> : null}
    </div>
  );
}
