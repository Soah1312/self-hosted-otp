"use client";

import { ChangeEvent } from "react";

type PhoneInputProps = {
  value: string;
  onChange: (val: string) => void;
  error?: string;
  loading?: boolean;
};

export default function PhoneInput({ value, onChange, error, loading }: PhoneInputProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(event.target.value.replace(/\D/g, "").slice(0, 10));
  }

  return (
    <div className="phoneInputCard">
      <div className="phoneInputRow">
        <span className="countryPrefix">🇮🇳 +91</span>
        <span className="phoneDivider" />
        <input
          className="phoneField"
          type="tel"
          inputMode="numeric"
          placeholder="98765 43210"
          value={value}
          onChange={handleChange}
          maxLength={10}
        />
      </div>

      {error ? <p className="fieldError">{error}</p> : null}

      <button className="continueButton" type="submit" disabled={loading}>
        {loading ? <span className="buttonSpinner" aria-hidden="true" /> : null}
        <span>{loading ? "Sending..." : "Continue"}</span>
      </button>
    </div>
  );
}
