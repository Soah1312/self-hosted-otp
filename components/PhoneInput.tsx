"use client";

import { ChangeEvent } from "react";
import ReactPhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

type PhoneInputProps = {
  value: string;
  onChange: (val: string) => void;
  error?: string;
  loading?: boolean;
};

export default function PhoneInput({ value, onChange, error, loading }: PhoneInputProps) {
  return (
    <div className="phoneInputCard">
      <div className="phoneInputRow">
        <ReactPhoneInput
          international
          defaultCountry="IN"
          value={value}
          onChange={(val) => onChange(val || "")}
          className="globalPhoneInput"
          placeholder="Enter mobile number"
          disabled={loading}
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
