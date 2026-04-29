"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

type RegisterApiResponse = {
  success?: boolean;
  apiKey?: string;
  tenantId?: string;
  message?: string;
};

type CodeToken = {
  text: string;
  className?: string;
};

type CodeLine = CodeToken[];

type CodeSnippet = {
  id: string;
  title: string;
  raw: string;
  lines: CodeLine[];
};

const DEFAULT_SMS_GATE_URL = "https://api.sms-gate.app/3rdparty/v1/message";

function GithubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a21.9 21.9 0 0 1 5.08-5.94" />
      <path d="M9.9 4.24A10.2 10.2 0 0 1 12 4c7 0 11 8 11 8a22.1 22.1 0 0 1-3.1 4.14" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <path d="M1 1l22 22" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m20 6-11 11-5-5" />
    </svg>
  );
}

function SuccessMarkIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="m8 12 2.5 2.5L16 9" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <path d="M12 9v5" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function codeToRaw(lines: CodeLine[]): string {
  return lines.map((line) => line.map((token) => token.text).join("")).join("\n");
}

function buildSnippets(apiKey: string): CodeSnippet[] {
  const sendLines: CodeLine[] = [
    [
      { text: "curl", className: "regTokCmd" },
      { text: " -X " },
      { text: "POST", className: "regTokKeyword" },
      { text: ' https://pingauth.vercel.app/api/otp/send \\' },
    ],
    [
      { text: "  -H ", className: "regTokFlag" },
      { text: '"Content-Type: application/json"', className: "regTokString" },
      { text: ' \\' },
    ],
    [
      { text: "  -H ", className: "regTokFlag" },
      { text: '"x-api-key: ', className: "regTokString" },
      { text: apiKey, className: "regTokKey" },
      { text: '"', className: "regTokString" },
      { text: ' \\' },
    ],
    [
      { text: "  -d ", className: "regTokFlag" },
      { text: `'{"phone": "+919876543210"}'`, className: "regTokString" },
    ],
  ];

  const verifyLines: CodeLine[] = [
    [
      { text: "curl", className: "regTokCmd" },
      { text: " -X " },
      { text: "POST", className: "regTokKeyword" },
      { text: ' https://pingauth.vercel.app/api/otp/verify \\' },
    ],
    [
      { text: "  -H ", className: "regTokFlag" },
      { text: '"Content-Type: application/json"', className: "regTokString" },
      { text: ' \\' },
    ],
    [
      { text: "  -H ", className: "regTokFlag" },
      { text: '"x-api-key: ', className: "regTokString" },
      { text: apiKey, className: "regTokKey" },
      { text: '"', className: "regTokString" },
      { text: ' \\' },
    ],
    [
      { text: "  -d ", className: "regTokFlag" },
      { text: `'{"phone": "+919876543210", "otp": "123456"}'`, className: "regTokString" },
    ],
  ];

  const widgetLines: CodeLine[] = [
    [
      { text: '<script src="https://pingauth.vercel.app/widget.js"></script>', className: "regTokString" },
    ],
    [{ text: "<script>", className: "regTokKeyword" }],
    [
      { text: "  " },
      { text: "const", className: "regTokKeyword" },
      { text: " result = " },
      { text: "await", className: "regTokKeyword" },
      { text: " PingAuth.verify({" },
    ],
    [
      { text: "    apiKey: ", className: "regTokText" },
      { text: `"${apiKey}"`, className: "regTokKey" },
      { text: "," },
    ],
    [{ text: "    phone: userPhone" }],
    [{ text: "  });" }],
    [
      { text: "  " },
      { text: "if", className: "regTokKeyword" },
      { text: " (result.success) {" },
    ],
    [{ text: "    " }, { text: "// user verified, proceed", className: "regTokComment" }],
    [{ text: "  }" }],
    [{ text: "</script>", className: "regTokKeyword" }],
  ];

  const manageLines: CodeLine[] = [
    [{ text: "# Rotate key", className: "regTokComment" }],
    [
      { text: "curl", className: "regTokCmd" },
      { text: " -X " },
      { text: "POST", className: "regTokKeyword" },
      { text: ' https://pingauth.vercel.app/api/keys/rotate \\' },
    ],
    [
      { text: "  -H ", className: "regTokFlag" },
      { text: '"x-api-key: ', className: "regTokString" },
      { text: apiKey, className: "regTokKey" },
      { text: '"', className: "regTokString" },
    ],
    [{ text: "" }],
    [{ text: "# Revoke key", className: "regTokComment" }],
    [
      { text: "curl", className: "regTokCmd" },
      { text: " -X " },
      { text: "POST", className: "regTokKeyword" },
      { text: ' https://pingauth.vercel.app/api/keys/revoke \\' },
    ],
    [
      { text: "  -H ", className: "regTokFlag" },
      { text: '"x-api-key: ', className: "regTokString" },
      { text: apiKey, className: "regTokKey" },
      { text: '"', className: "regTokString" },
    ],
  ];

  return [
    {
      id: "send-otp",
      title: "1. Send an OTP",
      lines: sendLines,
      raw: codeToRaw(sendLines),
    },
    {
      id: "verify-otp",
      title: "2. Verify an OTP",
      lines: verifyLines,
      raw: codeToRaw(verifyLines),
    },
    {
      id: "widget",
      title: "3. Use the widget",
      lines: widgetLines,
      raw: codeToRaw(widgetLines),
    },
    {
      id: "manage-key",
      title: "4. Manage your key",
      lines: manageLines,
      raw: codeToRaw(manageLines),
    },
  ];
}

async function copyToClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

function CodeSnippetCard({
  snippet,
  isCopied,
  onCopy,
}: {
  snippet: CodeSnippet;
  isCopied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="regCodeWrap">
      <h3 className="regStepTitle">{snippet.title}</h3>
      <div className="regCodeCard">
        <button type="button" className="regCopyButton" onClick={onCopy} aria-label={`Copy ${snippet.title}`}>
          {isCopied ? <CheckIcon /> : <CopyIcon />}
        </button>
        <pre className="regCodePre">
          {snippet.lines.map((line, lineIndex) => (
            <div className="regCodeLine" key={`${snippet.id}-${lineIndex}`}>
              {line.map((token, tokenIndex) => (
                <span key={`${snippet.id}-${lineIndex}-${tokenIndex}`} className={token.className}>
                  {token.text}
                </span>
              ))}
            </div>
          ))}
        </pre>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  const [smsGateLogin, setSmsGateLogin] = useState("");
  const [smsGatePassword, setSmsGatePassword] = useState("");
  const [smsGateUrl, setSmsGateUrl] = useState(DEFAULT_SMS_GATE_URL);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const snippets = useMemo(() => {
    if (!apiKey) {
      return [];
    }

    return buildSnippets(apiKey);
  }, [apiKey]);

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!smsGateLogin.trim() || !smsGatePassword.trim() || !smsGateUrl.trim()) {
      setError("All fields are required.");
      return;
    }

    if (!smsGateUrl.startsWith("https://")) {
      setError("sms-gate URL must start with https://");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/keys/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          smsGateLogin: smsGateLogin.trim(),
          smsGatePassword: smsGatePassword.trim(),
          smsGateUrl: smsGateUrl.trim(),
        }),
      });

      const data = (await response.json().catch(() => ({ success: false, message: "Invalid server response" }))) as RegisterApiResponse;

      if (!response.ok || !data.success || !data.apiKey) {
        setError(data.message ?? "Could not generate API key");
        return;
      }

      setApiKey(data.apiKey);
    } catch {
      setError("Could not connect to server. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy(text: string, id: string) {
    try {
      await copyToClipboard(text);
      setCopiedId(id);
      window.setTimeout(() => {
        setCopiedId((current) => (current === id ? null : current));
      }, 2000);
    } catch {
      setError("Could not copy to clipboard");
    }
  }

  return (
    <>
      <div className="lpGrain" aria-hidden="true" />

      <nav className="lpNav">
        <div className="lpNavInner">
          <div className="lpNavLeft">
            <span className="lpNavLogo" aria-hidden="true">
              <span className="lpNavLogoDot" />
            </span>
            <span className="lpNavBrand">SMS-Verify</span>
          </div>
          <div className="lpNavRight">
            <Link href="/demo" className="lpNavDemoLink">View Demo</Link>
            <a
              className="lpNavDemoPill"
              href="https://github.com/Soah1312/self-hosted-otp"
              target="_blank"
              rel="noreferrer"
            >
              <span className="regNavGhIcon"><GithubIcon /></span>
              GitHub
            </a>
          </div>
        </div>
      </nav>

      <main className="regShell">
        <section className="regContainer">
          <article className="regCard">
            {!apiKey ? (
              <div className="regStateFade">
                <h1 className="regTitle">Get your API key</h1>
                <p className="regSubtitle">
                  Connect your sms-gate account and start verifying users.
                </p>

                <form className="regForm" onSubmit={handleRegister}>
                  <label className="regFieldLabel" htmlFor="sms-login">sms-gate Login (email)</label>
                  <input
                    id="sms-login"
                    className="regInput"
                    value={smsGateLogin}
                    onChange={(event) => setSmsGateLogin(event.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    disabled={loading}
                  />

                  <label className="regFieldLabel" htmlFor="sms-password">sms-gate Password</label>
                  <div className="regInputWrap">
                    <input
                      id="sms-password"
                      className="regInput regInputPassword"
                      value={smsGatePassword}
                      onChange={(event) => setSmsGatePassword(event.target.value)}
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your sms-gate password"
                      autoComplete="current-password"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      className="regPasswordToggle"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>

                  <label className="regFieldLabel" htmlFor="sms-url">sms-gate URL</label>
                  <input
                    id="sms-url"
                    className="regInput"
                    value={smsGateUrl}
                    onChange={(event) => setSmsGateUrl(event.target.value)}
                    placeholder={DEFAULT_SMS_GATE_URL}
                    autoComplete="off"
                    disabled={loading}
                  />

                  <button className="regSubmitButton" type="submit" disabled={loading}>
                    {loading ? <span className="regSpinner" aria-hidden="true" /> : null}
                    <span>{loading ? "Generating..." : "Generate API Key"}</span>
                  </button>

                  <p className="regSecurityNote">
                    <span className="regSecurityIcon" aria-hidden="true"><LockIcon /></span>
                    Your credentials are AES-256 encrypted and never returned in any API response
                  </p>

                  {error ? <p className="regErrorText">{error}</p> : null}
                </form>
              </div>
            ) : (
              <div className="regStateFade">
                <div className="regSuccessHeading">
                  <span className="regSuccessIcon" aria-hidden="true"><SuccessMarkIcon /></span>
                  <div>
                    <h1 className="regTitle regSuccessTitle">You&apos;re all set!</h1>
                    <p className="regSubtitle">Your API key has been generated.</p>
                  </div>
                </div>

                <div className="regKeyBox">
                  <code>{apiKey}</code>
                  <button
                    type="button"
                    className="regCopyButton"
                    onClick={() => handleCopy(apiKey, "api-key")}
                    aria-label="Copy API key"
                  >
                    {copiedId === "api-key" ? <CheckIcon /> : <CopyIcon />}
                  </button>
                </div>

                <p className="regWarningText">
                  <span className="regWarningIcon" aria-hidden="true"><WarningIcon /></span>
                  Save this now. It will not be shown again. We cannot recover it.
                </p>

                <section className="regGuideSection">
                  <h2 className="regGuideTitle">Getting Started</h2>
                  {snippets.map((snippet) => (
                    <CodeSnippetCard
                      key={snippet.id}
                      snippet={snippet}
                      isCopied={copiedId === snippet.id}
                      onCopy={() => handleCopy(snippet.raw, snippet.id)}
                    />
                  ))}
                </section>

                <Link href="/demo" className="regSubmitButton regDemoButton">
                  View Live Demo
                </Link>
              </div>
            )}
          </article>
        </section>
      </main>
    </>
  );
}
