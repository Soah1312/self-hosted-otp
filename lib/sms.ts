type SmsGatewayState = "Pending" | "Processed" | "Sent" | "Delivered" | "Failed" | "Rejected" | "Undeliverable" | "Canceled";

interface SmsGatewayRecipient {
  phoneNumber: string;
  state: string;
  code?: number;
  errorCode?: number;
  error?: { code?: number };
}

interface SmsGatewayMessage {
  id?: string;
  state?: string;
  code?: number;
  errorCode?: number;
  error?: { code?: number };
  recipients?: SmsGatewayRecipient[];
}

export class SmsCredentialError extends Error {
  constructor(message = "Invalid SMS gateway credentials") {
    super(message);
    this.name = "SmsCredentialError";
  }
}

export class SmsQuotaError extends Error {
  constructor(message = "SMS quota exhausted") {
    super(message);
    this.name = "SmsQuotaError";
  }
}

export class SmsBlockedError extends Error {
  constructor(message = "SMS delivery blocked by carrier") {
    super(message);
    this.name = "SmsBlockedError";
  }
}

export class SmsDeliveryError extends Error {
  constructor(message = "SMS delivery failed") {
    super(message);
    this.name = "SmsDeliveryError";
  }
}

type SendSmsParams = {
  phone: string;
  message: string;
  credentials: {
    login: string;
    password: string;
    url: string;
  };
};

const DELIVERY_POLL_ATTEMPTS = 5;
const DELIVERY_POLL_INTERVAL_MS = 1200;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readResponsePayload(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function readErrorCodeFromPayload(payload: unknown): number | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const directCode = record.code ?? record.errorCode;

  if (typeof directCode === "number") {
    return directCode;
  }

  if (typeof record.error === "object" && record.error) {
    const nestedCode = (record.error as Record<string, unknown>).code;
    if (typeof nestedCode === "number") {
      return nestedCode;
    }
  }

  if (Array.isArray(record.recipients)) {
    for (const recipient of record.recipients) {
      if (!recipient || typeof recipient !== "object") {
        continue;
      }

      const recipientCode = (recipient as Record<string, unknown>).errorCode ?? (recipient as Record<string, unknown>).code;
      if (typeof recipientCode === "number") {
        return recipientCode;
      }
    }
  }

  return null;
}

function assertResponseOkOrThrow(status: number, payload: unknown): void {
  if (status === 401) {
    throw new SmsCredentialError();
  }

  if (status === 402) {
    throw new SmsQuotaError();
  }

  if (readErrorCodeFromPayload(payload) === 65) {
    throw new SmsBlockedError();
  }

  throw new SmsDeliveryError();
}

function getRecipientState(message: SmsGatewayMessage, phone: string): string {
  const recipientState = message.recipients?.find((recipient) => recipient.phoneNumber === phone)?.state;
  return recipientState ?? message.state ?? "Pending";
}

function isFailureState(state: string): boolean {
  const failureStates = new Set<string>(["Failed", "Rejected", "Undeliverable", "Canceled"]);
  return failureStates.has(state);
}

function isSuccessState(state: string): boolean {
  // Some carriers do not provide delivery receipts, so Sent is considered acceptable.
  const successStates = new Set<string>(["Delivered", "Sent"]);
  return successStates.has(state);
}

export async function sendSms(params: SendSmsParams): Promise<void> {
  const { phone, message, credentials } = params;
  const { login, password, url } = credentials;
  const authHeader = "Basic " + Buffer.from(`${login}:${password}`).toString("base64");

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        message,
        phoneNumbers: [phone],
      }),
    });
  } catch (error) {
    console.error("SMS gateway network error:", error);
    throw new SmsDeliveryError();
  }

  if (!response.ok) {
    const payload = await readResponsePayload(response);
    assertResponseOkOrThrow(response.status, payload);
  }

  const createdPayload = await readResponsePayload(response);
  const createdMessage = (createdPayload ?? {}) as SmsGatewayMessage;

  if (readErrorCodeFromPayload(createdPayload) === 65) {
    throw new SmsBlockedError();
  }

  try {
    if (!createdMessage || typeof createdMessage !== "object") {
      throw new Error("Invalid SMS payload");
    }
  } catch (error) {
    console.error("sms-gate response parse error:", error);
    throw new SmsDeliveryError();
  }

  if (!createdMessage?.id) {
    console.error("sms-gate response missing id:", createdMessage);
    throw new SmsDeliveryError();
  }

  let latestMessage = createdMessage;
  let latestState = getRecipientState(latestMessage, phone);

  for (let attempt = 0; attempt < DELIVERY_POLL_ATTEMPTS; attempt += 1) {
    if (isSuccessState(latestState) || isFailureState(latestState)) {
      break;
    }

    await sleep(DELIVERY_POLL_INTERVAL_MS);

    const statusResponse = await fetch(`${url}/${createdMessage.id}`, {
      method: "GET",
      headers: {
        Authorization: authHeader,
      },
    });

    if (!statusResponse.ok) {
      const statusPayload = await readResponsePayload(statusResponse);
      if (statusResponse.status === 401 || statusResponse.status === 402 || readErrorCodeFromPayload(statusPayload) === 65) {
        assertResponseOkOrThrow(statusResponse.status, statusPayload);
      }

      console.error("Failed to fetch sms-gate status:", statusPayload);
      continue;
    }

    const statusPayload = await readResponsePayload(statusResponse);
    latestMessage = (statusPayload ?? {}) as SmsGatewayMessage;

    if (readErrorCodeFromPayload(statusPayload) === 65) {
      throw new SmsBlockedError();
    }

    latestState = getRecipientState(latestMessage, phone);
  }

  if (isFailureState(latestState)) {
    if (readErrorCodeFromPayload(latestMessage) === 65) {
      throw new SmsBlockedError();
    }

    console.error("SMS delivery not confirmed:", {
      messageId: createdMessage.id,
      state: latestState,
    });
    throw new SmsDeliveryError();
  }

  // If state is still Pending/Processed after polling, accept provider acknowledgement
  // and allow clients to continue; delivery may complete shortly after.
}
