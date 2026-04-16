# SMS OTP Microservice

A standalone reusable SMS OTP microservice built using Next.js (App Router), deployed on Vercel, with Upstash Redis for OTP storage and sms-gate.app as the Android SMS gateway.

## Setup Instructions

1. **Upstash Redis Setup**: Create an account on Upstash, create a Serverless Redis database, and get the `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.
2. **sms-gate.app Setup**: Create an account on sms-gate.app, get the login and password.
3. **Environment Variables**: Copy `.env.example` to `.env.local` and fill in the values. Set these variables in the Vercel dashboard.
4. **Vercel Deploy**: Push this repository to GitHub and connect it to a Vercel project.

## API Endpoints

### POST /api/otp/send
Sends an OTP to the given phone number.

**Headers:**
`x-api-key: your-api-secret-key`

**Request:**
```json
{
  "phone": "+919876543210"
}
```

### POST /api/otp/verify
Verifies an OTP for a phone number.

**Headers:**
`x-api-key: your-api-secret-key`

**Request:**
```json
{
  "phone": "+919876543210",
  "otp": "482910"
}
```

### GET /api/health
Health check endpoint.
```bash
curl http://localhost:3000/api/health
```

## Integration
Any app can call this microservice via HTTP by passing the `x-api-key` header.
```javascript
const response = await fetch("https://your-vercel-domain.com/api/otp/send", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "your-api-secret-key"
  },
  body: JSON.stringify({ phone: "+919876543210" })
});
```

## Security
- OTPs are hashed using SHA-256 before being stored in Redis, protecting them from unauthorized access if the database is exposed.
- Redis handles the Time-To-Live (5 minutes) and cooldowns (60 seconds) natively.
- Verification limits to 3 attempts, after which the OTP is invalidated.
