"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import PhoneInput from "@/components/PhoneInput";
import OtpInput from "@/components/OtpInput";

type ApiResponse = {
  success?: boolean;
  message?: string;
  retryAfter?: number;
  attemptsLeft?: number;
  deliveryState?: string;
};

const OTP_LENGTH = 6;

function getApiKey(): string {
  return process.env.NEXT_PUBLIC_API_SECRET_KEY ?? "";
}

async function postJson<T extends object>(url: string, body: T): Promise<{ status: number; data: ApiResponse }> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": getApiKey(),
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

export default function DemoPage() {
  const [screen, setScreen] = useState<"phone" | "otp">("phone");
  const [fadeKey, setFadeKey] = useState(0);
  const [phone, setPhone] = useState("8714256600");
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
  const submittedOtpRef = useRef("");
  const redirectTimerRef = useRef<number | null>(null);

  const phoneWithCode = useMemo(() => `+91${phone}`, [phone]);
  const phoneDigitsValid = /^\d{10}$/.test(phone);
  const otpValue = otp.join("");
  const nextPublicApiKeyPresent = getApiKey().length > 0;

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
      setPhoneError("Enter a valid 10-digit Indian mobile number");
      return;
    }

    setPhoneLoading(true);
    const result = await postJson("/api/otp/send", { phone: phoneWithCode });
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

    setPhoneError(result.data.message ?? "Unable to send OTP");
  }

  async function verifyOtp(explicitOtp?: string) {
    if (otpLoading || isVerified) return;
    const otpToUse = explicitOtp ?? otpValue;
    if (!/^\d{6}$/.test(otpToUse)) return;

    setOtpLoading(true);
    setOtpError("");
    setLastResponseMessage("");

    const result = await postJson("/api/otp/verify", {
      phone: phoneWithCode,
      otp: otpToUse,
    });

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

    setOtpError(result.data.message ?? "Verification failed");
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

  async function resendOtp() {
    if (retryCountdown > 0 || phoneLoading) return;
    setResendInfo("");
    setPhoneError("");
    setPhoneLoading(true);
    const result = await postJson("/api/otp/send", { phone: phoneWithCode });
    setPhoneLoading(false);

    if (result.status === 200) {
      setResendInfo("OTP resent");
      setOtp(Array.from({ length: OTP_LENGTH }, () => ""));
      setOtpError("");
      submittedOtpRef.current = "";
      return;
    }

    if (result.status === 429 && result.data.retryAfter) {
      setResendInfo(`Resend available in ${result.data.retryAfter}s`);
      setRetryCountdown(result.data.retryAfter);
      return;
    }

    setResendInfo(result.data.message ?? "Unable to resend OTP");
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

  if (!nextPublicApiKeyPresent) {
    // The UI still renders; the message makes local misconfiguration obvious.
  }

  return (
    <main className="demoShell">
      <div className="demoCard" key={fadeKey}>
        {/* ── Brand logo — always top-left ── */}
        <div className="demoBrandRow">
          <span className="demoBrandMark" aria-hidden="true" />
          <span className="demoBrandText">PingAuth</span>
        </div>

        {/* ── Screen 1 — Phone ── */}
        {screen === "phone" ? (
          <div className="demoContent fadeSlideIn">
            <h1>Verify your identity</h1>
            <p className="demoSubtitle">
              Enter your mobile number to receive a verification code
            </p>

            <form onSubmit={continueWithPhone} className="demoForm">
              <PhoneInput value={phone} onChange={setPhone} error={phoneError} loading={phoneLoading} />
            </form>

            {!nextPublicApiKeyPresent ? (
              <p className="demoNotice">NEXT_PUBLIC_API_SECRET_KEY is not set in your environment.</p>
            ) : null}

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
              <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: "#292524", lineHeight: 1.2 }}>
                Verify your account
              </h1>
              <p className="demoSubtitle">
                Enter the 6-digit code sent to {phoneWithCode}
              </p>

              <OtpInput value={otp} onChange={handleOtpChange} error={otpError} loading={otpLoading} />

              <div className="resendRow">
                <span>Haven&apos;t received the OTP?</span>
                <button type="button" className="sendAgainLink" onClick={resendOtp} disabled={retryCountdown > 0 || phoneLoading}>
                  {retryCountdown > 0 ? `Send again in ${retryCountdown}s` : "Send again"}
                </button>
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
