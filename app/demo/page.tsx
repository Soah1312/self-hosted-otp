"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import PhoneInput from "@/components/PhoneInput";
import OtpInput from "@/components/OtpInput";
import { isValidPhoneNumber } from "react-phone-number-input";

type ApiResponse = {
  success?: boolean;
  message?: string;
  retryAfter?: number;
  attemptsLeft?: number;
  deliveryState?: string;
};

const OTP_LENGTH = 6;

async function postJson<T extends object>(
  url: string,
  body: T,
  apiKey: string
): Promise<{ status: number; data: ApiResponse }> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(body),
  });

  const data = (await response.json().catch(() => ({ success: false, message: "Invalid JSON response" }))) as ApiResponse;
  return { status: response.status, data };
}

/* ─── Phone Illustration SVG (warm palette) ──────────────── */

function PhoneIllustration() {
  return (
    <svg
      className="phoneIllustrationSvg"
      viewBox="0 0 160 260"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Phone body */}
      <rect x="20" y="10" width="120" height="240" rx="24" fill="#fff" stroke="#d6d3d1" strokeWidth="1.5" />
      {/* Screen area */}
      <rect x="30" y="30" width="100" height="200" rx="10" fill="#FDFCF8" />
      {/* Coral chat bubble */}
      <rect x="40" y="52" width="80" height="44" rx="14" fill="#FFB7B2" />
      {/* White dots on bubble */}
      <circle cx="56" cy="74" r="3.5" fill="#fff" />
      <circle cx="68" cy="74" r="3.5" fill="#fff" />
      <circle cx="80" cy="74" r="3.5" fill="#fff" />
      <circle cx="92" cy="74" r="3.5" fill="#fff" />
      {/* Dark shield / checkmark box */}
      <rect x="52" y="114" width="56" height="56" rx="16" fill="#292524" />
      {/* White checkmark */}
      <path
        d="M68 142 l8 8 l16 -16"
        stroke="#fff"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Bottom bar */}
      <rect x="58" y="192" width="44" height="8" rx="4" fill="#e7e5e4" />
    </svg>
  );
}

/* ─── Green Checkmark SVG ───────────────────────────────── */

function CheckmarkIcon() {
  return (
    <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M10 18 l6 6 l10 -12"
        stroke="#16a34a"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SendActionIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="sendActionAnim">
      <path
        d="M3 10L17 3L13.5 17L9.7 10.3L3 10Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.6" />
      <path d="M9 8.2V12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="9" cy="5.7" r="0.9" fill="currentColor" />
    </svg>
  );
}

export default function DemoPage() {
  const [screen, setScreen] = useState<"phone" | "otp">("phone");
  const [fadeKey, setFadeKey] = useState(0);
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [otp, setOtp] = useState<string[]>(Array.from({ length: OTP_LENGTH }, () => ""));
  const [otpError, setOtpError] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [retryCountdown, setRetryCountdown] = useState(0);
  const [redirectCountdown, setRedirectCountdown] = useState(0);
  const [resendInfo, setResendInfo] = useState("");
  const [lastResponseMessage, setLastResponseMessage] = useState("");
  const [apiKey, setApiKey] = useState("");
  const submittedOtpRef = useRef("");
  const redirectTimerRef = useRef<number | null>(null);

  const phoneWithCode = phone;
  const phoneDigitsValid = phone ? isValidPhoneNumber(phone) : false;
  const otpValue = otp.join("");

  useEffect(() => {
    setFadeKey((value) => value + 1);
  }, [screen]);

  useEffect(() => {
    if (retryCountdown <= 0) return undefined;
    const intervalId = window.setInterval(() => {
      setRetryCountdown((value) => (value > 0 ? value - 1 : 0));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [retryCountdown]);

  useEffect(() => {
    if (redirectCountdown <= 0) return undefined;
    const intervalId = window.setInterval(() => {
      setRedirectCountdown((value) => (value > 0 ? value - 1 : 0));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [redirectCountdown]);

  useEffect(() => {
    if (redirectCountdown > 0) return undefined;

    if (redirectTimerRef.current) {
      window.clearTimeout(redirectTimerRef.current);
      redirectTimerRef.current = null;
    }

    return undefined;
  }, [redirectCountdown]);

  useEffect(() => {
    if (screen !== "otp" || isVerified) return;
    if (!/^\d{6}$/.test(otpValue)) return;
    if (submittedOtpRef.current === otpValue) return;

    submittedOtpRef.current = otpValue;
    void verifyOtp(otpValue);
  }, [isVerified, otpValue, screen]);

  async function continueWithPhone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPhoneError("");
    setLastResponseMessage("");

    if (!phoneDigitsValid) {
      setPhoneError("Enter a valid mobile number for your country");
      return;
    }

    if (!apiKey.trim()) {
      setPhoneError("Enter your tenant API key to continue");
      return;
    }

    setPhoneLoading(true);
    const result = await postJson("/api/otp/send", { phone: phoneWithCode }, apiKey.trim());
    setPhoneLoading(false);

    if (result.status === 200) {
      setScreen("otp");
      setOtp(Array.from({ length: OTP_LENGTH }, () => ""));
      setOtpError("");
      setResendInfo("");
      setRetryCountdown(0);
      return;
    }

    if (result.status === 429 && result.data.retryAfter) {
      setPhoneError(`Resend available in ${result.data.retryAfter}s`);
      setRetryCountdown(result.data.retryAfter);
      return;
    }

    setPhoneError(result.data.message ?? "The server might be sleeping. Try again later!");
  }

  async function verifyOtp(explicitOtp?: string) {
    if (otpLoading || isVerified) return;
    const otpToUse = explicitOtp ?? otpValue;
    if (!/^\d{6}$/.test(otpToUse)) return;

    setOtpLoading(true);
    setOtpError("");
    setLastResponseMessage("");

    if (!apiKey.trim()) {
      setOtpLoading(false);
      setOtpError("Enter your tenant API key");
      submittedOtpRef.current = "";
      return;
    }

    const result = await postJson("/api/otp/verify", {
      phone: phoneWithCode,
      otp: otpToUse,
    }, apiKey.trim());

    setOtpLoading(false);

    if (result.status === 200) {
      setIsVerified(true);
      setLastResponseMessage("Verified successfully!");
      return;
    }

    if (result.status === 400) {
      submittedOtpRef.current = "";
      setOtpError(`Invalid OTP. ${result.data.attemptsLeft ?? 0} attempts left.`);
      setOtp(Array.from({ length: OTP_LENGTH }, () => ""));
      return;
    }

    if (result.status === 410 || result.status === 404) {
      setOtpError(result.data.message ?? "OTP expired.");
      startRedirectCountdown();
      return;
    }

    setOtpError(result.data.message ?? "Hmm, something snapped. Let's try again in a bit.");
  }

  function startRedirectCountdown() {
    setRedirectCountdown(3);
    if (redirectTimerRef.current) {
      window.clearTimeout(redirectTimerRef.current);
    }

    redirectTimerRef.current = window.setTimeout(() => {
      setScreen("phone");
      setOtp(Array.from({ length: OTP_LENGTH }, () => ""));
      setOtpError("");
      setRetryCountdown(0);
      setRedirectCountdown(0);
      setIsVerified(false);
      setLastResponseMessage("");
      submittedOtpRef.current = "";
    }, 3000);
  }

  function handleOtpChange(nextValue: string[]) {
    setOtp(nextValue);
    setOtpError("");
  }

  function changePhoneNumber() {
    setScreen("phone");
    setOtp(Array.from({ length: OTP_LENGTH }, () => ""));
    setOtpError("");
    setResendInfo("");
    setRetryCountdown(0);
    setLastResponseMessage("");
    submittedOtpRef.current = "";
  }

  async function resendOtp() {
    setResendInfo("My mobile must be offline, dont even bother on clicking on send again");
  }

  function backToHome() {
    setScreen("phone");
    setIsVerified(false);
    setOtp(Array.from({ length: OTP_LENGTH }, () => ""));
    setPhoneError("");
    setOtpError("");
    setResendInfo("");
    setRetryCountdown(0);
    setRedirectCountdown(0);
    setLastResponseMessage("");
    submittedOtpRef.current = "";
  }

  return (
    <main className="demoShell">
      <div className={`demoCard ${screen === "otp" && !isVerified ? "demoCard--wide" : ""}`} key={fadeKey}>
        {/* ── Brand logo — always top-left ── */}
        <div className="demoBrandRow">
          <span className="demoBrandMark" aria-hidden="true" />
          <span className="demoBrandText">SMS-Verify</span>
        </div>

        {/* ── Screen 1 — Phone ── */}
        {screen === "phone" ? (
          <div className="demoContent fadeSlideIn">
            <div className="demoStepRow" aria-label="Progress step 1 of 2">
              <span className="demoStepPill">Step 1 of 2</span>
              <div className="demoStepDots" aria-hidden="true">
                <span className="demoStepDot demoStepDot--active" />
                <span className="demoStepDot" />
              </div>
            </div>

            <h1>Verify your identity</h1>
            <p className="demoSubtitle">
              Enter your mobile number to receive a verification code
            </p>

            <div style={{ marginTop: 18 }}>
              <label htmlFor="tenant-api-key" style={{ fontSize: 13, fontWeight: 600, color: "#57534e" }}>
                Tenant API key
              </label>
              <input
                id="tenant-api-key"
                type="text"
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                placeholder="Paste your tenant API key"
                autoComplete="off"
                spellCheck={false}
                style={{
                  width: "100%",
                  marginTop: 8,
                  border: "1.5px solid #e7e5e4",
                  borderRadius: 14,
                  padding: "12px 14px",
                  background: "#FDFCF8",
                  color: "#292524",
                }}
              />
            </div>

            <form onSubmit={continueWithPhone} className="demoForm">
              <PhoneInput value={phone} onChange={setPhone} error={phoneError} loading={phoneLoading} />
            </form>

            <p className="demoBottomNote">
              By continuing you agree to receive an SMS for verification
            </p>
          </div>

        /* ── Screen 3 — Verified ── */
        ) : isVerified ? (
          <div className="verifiedState fadeSlideIn">
            <div className="verifiedIcon">
              <CheckmarkIcon />
            </div>
            <h2 className="verifiedHeading">Verified successfully!</h2>
            <p className="verifiedSubtext">Your identity has been confirmed</p>
            <button type="button" className="backHomeButton" onClick={backToHome}>
              Back to Home
            </button>
          </div>

        /* ── Screen 2 — OTP ── */
        ) : (
          <div className="demoOtpLayout fadeSlideIn">
            <div className="otpLeftCol">
              <div className="demoStepRow" aria-label="Progress step 2 of 2">
                <span className="demoStepPill">Step 2 of 2</span>
                <div className="demoStepDots" aria-hidden="true">
                  <span className="demoStepDot demoStepDot--active" />
                  <span className="demoStepDot demoStepDot--active" />
                </div>
              </div>

              <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: "#292524", lineHeight: 1.2 }}>
                Verify your account
              </h1>
              <div className="otpTargetRow">
                <p className="demoSubtitle">
                  Enter the 6-digit code sent to {phoneWithCode}
                </p>
                <button type="button" className="changeNumberLink" onClick={changePhoneNumber}>
                  Change number
                </button>
              </div>

              <OtpInput value={otp} onChange={handleOtpChange} error={otpError} loading={otpLoading} />

              <div className="resendBlock" aria-live="polite">
                <div className="resendRow">
                  <span>Haven&apos;t received the OTP?</span>
                  <button type="button" className="sendAgainLink" onClick={resendOtp} disabled={retryCountdown > 0 || phoneLoading}>
                    {phoneLoading ? (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                        Sending <SendActionIcon />
                      </span>
                    ) : retryCountdown > 0 ? (
                      `Send again in ${retryCountdown}s`
                    ) : (
                      "Send again"
                    )}
                  </button>
                </div>
                <p className="resendHint">
                  <span className="resendHintIcon">
                    <InfoIcon />
                  </span>
                  SMS won't ever be sent if my  mobile is offline(sorry).
                </p>
              </div>

              {resendInfo ? <p className="demoNotice">{resendInfo}</p> : null}
              {redirectCountdown > 0 ? <p className="demoNotice">OTP expired. Returning in {redirectCountdown}s.</p> : null}
              {lastResponseMessage ? <p className="successNotice">{lastResponseMessage}</p> : null}
            </div>

            <div className="otpRightCol">
              <aside className="verificationArt" aria-hidden="true">
                <PhoneIllustration />
              </aside>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
