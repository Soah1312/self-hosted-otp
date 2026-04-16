type SmsGatewayState = "Pending" | "Processed" | "Sent" | "Delivered" | "Failed" | "Rejected" | "Undeliverable" | "Canceled";

interface SmsGatewayRecipient {
  phoneNumber: string;
  state: string;
}

interface SmsGatewayMessage {
  id: string;
  state: string;
  recipients?: SmsGatewayRecipient[];
}

interface SmsSendResult {
  messageId: string;
  state: string;
}

const DELIVERY_POLL_ATTEMPTS = 5;
const DELIVERY_POLL_INTERVAL_MS = 1200;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRecipientState(message: SmsGatewayMessage, phone: string): string {
  const recipientState = message.recipients?.find((recipient) => recipient.phoneNumber === phone)?.state;
  return recipientState ?? message.state;
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

export async function sendSms(phone: string, otp: string): Promise<SmsSendResult> {
  const login = process.env.SMS_GATE_LOGIN;
  const password = process.env.SMS_GATE_PASSWORD;
  const url = process.env.SMS_GATE_URL;

  if (!login || !password || !url) {
    throw new Error("Missing SMS Gateway environment variables");
  }

  // Keep OTP text compact because some carriers reject specific long/OTP phrasing.
  const message = `Your login code is ${otp}`;
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
    throw new Error("Failed to send SMS");
  }

  if (!response.ok) {
    const text = await response.text();
    console.error(`Failed to send SMS via sms-gate.app: ${text}`);
    throw new Error("Failed to send SMS");
  }

  let createdMessage: SmsGatewayMessage;
  try {
    createdMessage = (await response.json()) as SmsGatewayMessage;
  } catch (error) {
    console.error("sms-gate response parse error:", error);
    throw new Error("Invalid SMS gateway response");
  }

  if (!createdMessage?.id) {
    console.error("sms-gate response missing id:", createdMessage);
    throw new Error("SMS gateway did not return message id");
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
      const statusText = await statusResponse.text();
      console.error(`Failed to fetch sms-gate status: ${statusText}`);
      continue;
    }

    latestMessage = (await statusResponse.json()) as SmsGatewayMessage;
    latestState = getRecipientState(latestMessage, phone);
  }

  if (isFailureState(latestState)) {
    console.error("SMS delivery not confirmed:", {
      messageId: createdMessage.id,
      state: latestState,
    });
    throw new Error(`SMS delivery failed with state: ${latestState}`);
  }

  // If state is still Pending/Processed after polling, accept provider acknowledgement
  // and allow clients to continue; delivery may complete shortly after.

  return {
    messageId: createdMessage.id,
    state: latestState,
  };
}
