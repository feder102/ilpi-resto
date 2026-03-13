# API Contracts: Password Recovery

**Feature**: 007-password-recovery
**Date**: 2026-03-11
**Version**: 1.0

## Overview

The Password Recovery API provides three public endpoints for users to reset forgotten passwords:
1. **Request Reset Link** — User submits email to receive reset link
2. **Verify & Reset** — User submits token + new password to reset account
3. **Check Token Validity** — Frontend validates token before showing form (optional)

**Base URL**: `http://localhost:8000` (development) or `https://api.example.com` (production)

**Authentication**: Public endpoints (no JWT required); all responses are HTTPS

---

## Endpoint 1: Request Password Reset (Public)

**HTTP Method**: `POST`
**Path**: `/auth/password-reset/request`
**Authentication**: None (public)
**Rate Limit**: 10 requests per minute per IP address

### Request

```http
POST /auth/password-reset/request HTTP/1.1
Host: api.example.com
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Request Schema** (Pydantic):
```python
class PasswordResetRequestSchema(BaseModel):
    email: EmailStr = Field(..., description="Registered user email")
```

**Validation**:
- `email`: Valid email format (required)
- Email must be registered in system (checked in service, but response same regardless)

---

### Success Response (200 OK)

```json
{
  "message": "Se ha enviado un enlace de recuperación de contraseña a tu email",
  "expires_in_hours": 24,
  "note": "Revisa tu bandeja de entrada (incluida spam)"
}
```

**Response Schema**:
```python
class PasswordResetRequestResponse(BaseModel):
    message: str
    expires_in_hours: int
    note: str
```

**HTTP Status**: `200 OK`

---

### Error Response: Invalid Email Format (400)

```json
{
  "error": {
    "code": "INVALID_EMAIL",
    "message": "El formato del email no es válido"
  }
}
```

**HTTP Status**: `400 Bad Request`

---

### Error Response: Rate Limit Exceeded (429)

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Has excedido el límite de solicitudes. Intenta de nuevo en 9 minutos",
    "retry_after_seconds": 540
  }
}
```

**HTTP Status**: `429 Too Many Requests`
**Headers**: `Retry-After: 540` (seconds)

---

### Error Response: SMTP Error (503)

```json
{
  "error": {
    "code": "EMAIL_SERVICE_UNAVAILABLE",
    "message": "No pudimos enviar el email. Intenta de nuevo más tarde",
    "details": {
      "service": "SMTP"
    }
  }
}
```

**HTTP Status**: `503 Service Unavailable`

---

## Endpoint 2: Verify Token & Reset Password (Public)

**HTTP Method**: `POST`
**Path**: `/auth/password-reset/verify`
**Authentication**: None (public, token-based)
**Rate Limit**: 5 requests per minute per IP address (stricter than request endpoint)

### Request

```http
POST /auth/password-reset/verify HTTP/1.1
Host: api.example.com
Content-Type: application/json

{
  "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "new_password": "MySecurePass123!"
}
```

**Request Schema** (Pydantic):
```python
class PasswordResetVerifySchema(BaseModel):
    token: str = Field(..., min_length=32, description="Reset token from email link")
    new_password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="New password"
    )
```

**Validation**:
- `token`: Non-empty string (checked against DB hash)
- `new_password`:
  - Minimum 8 characters
  - At least 1 uppercase letter
  - At least 1 lowercase letter
  - At least 1 number
  - At least 1 special character (!@#$%^&*(),.?":{}|<>)

---

### Success Response (200 OK)

```json
{
  "message": "Contraseña restablecida exitosamente",
  "action": "redirect_to_login",
  "redirect_url": "/login",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com"
  }
}
```

**Response Schema**:
```python
class PasswordResetVerifyResponse(BaseModel):
    message: str
    action: str
    redirect_url: str
    user: {
        id: UUID,
        email: EmailStr
    }
```

**HTTP Status**: `200 OK`

---

### Error Response: Invalid Token (400)

```json
{
  "error": {
    "code": "INVALID_RESET_TOKEN",
    "message": "El enlace de recuperación es inválido. Solicita uno nuevo",
    "action": "request_new_token",
    "link": "/password-reset"
  }
}
```

**Reasons**:
- Token doesn't exist in database
- Token has been modified or corrupted
- Token was already used

**HTTP Status**: `400 Bad Request`

---

### Error Response: Expired Token (410)

```json
{
  "error": {
    "code": "TOKEN_EXPIRED",
    "message": "El enlace ha expirado. Solicita uno nuevo",
    "action": "request_new_token",
    "link": "/password-reset",
    "expired_at": "2026-03-12T10:30:45Z"
  }
}
```

**HTTP Status**: `410 Gone` (token permanently expired)

---

### Error Response: Invalid Password (422)

```json
{
  "error": {
    "code": "PASSWORD_VALIDATION_FAILED",
    "message": "La contraseña no cumple con los requisitos",
    "details": {
      "requirements": [
        {
          "requirement": "minimum_length",
          "message": "Mínimo 8 caracteres",
          "satisfied": true
        },
        {
          "requirement": "uppercase",
          "message": "Al menos una mayúscula",
          "satisfied": false
        },
        {
          "requirement": "lowercase",
          "message": "Al menos una minúscula",
          "satisfied": true
        },
        {
          "requirement": "number",
          "message": "Al menos un número",
          "satisfied": true
        },
        {
          "requirement": "special_char",
          "message": "Al menos un carácter especial",
          "satisfied": true
        }
      ]
    }
  }
}
```

**HTTP Status**: `422 Unprocessable Entity`

---

### Error Response: Rate Limit Exceeded (429)

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Demasiados intentos de restablecimiento. Intenta de nuevo en 5 minutos",
    "retry_after_seconds": 300
  }
}
```

**HTTP Status**: `429 Too Many Requests`

---

## Endpoint 3: Check Token Validity (Optional, Frontend Convenience)

**HTTP Method**: `GET`
**Path**: `/auth/password-reset/verify?token={token}`
**Authentication**: None (public)
**Rate Limit**: 20 requests per minute per IP address

### Purpose
Frontend calls this to validate token before showing password form. Provides better UX (fail fast before user enters password).

### Request

```http
GET /auth/password-reset/verify?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9... HTTP/1.1
Host: api.example.com
```

**Query Parameters**:
- `token` (required): Reset token from email link

---

### Success Response (200 OK)

```json
{
  "valid": true,
  "user_email": "user@example.com",
  "expires_at": "2026-03-12T10:30:45Z",
  "message": "Token es válido"
}
```

**HTTP Status**: `200 OK`

---

### Error Response: Invalid/Expired Token (400)

```json
{
  "error": {
    "code": "INVALID_RESET_TOKEN",
    "message": "El enlace es inválido o ha expirado",
    "valid": false
  }
}
```

**HTTP Status**: `400 Bad Request`

---

## Common Response Fields

### Error Response Structure (All Errors)

```json
{
  "error": {
    "code": "ERROR_CODE_CONSTANT",
    "message": "Human-readable message in Spanish",
    "details": {}  // Optional: additional context
  }
}
```

**Error Codes**:
- `INVALID_EMAIL` — Email format invalid
- `INVALID_RESET_TOKEN` — Token doesn't exist, corrupted, or already used
- `TOKEN_EXPIRED` — Token past 24-hour expiration window
- `PASSWORD_VALIDATION_FAILED` — Password doesn't meet requirements
- `RATE_LIMIT_EXCEEDED` — Too many requests from this IP/email
- `EMAIL_SERVICE_UNAVAILABLE` — SMTP/email service error
- `INTERNAL_SERVER_ERROR` — Unexpected server error (no details leaked)

---

## Security Headers (All Responses)

```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Content-Security-Policy: default-src 'self'
Referrer-Policy: strict-origin-when-cross-origin
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

---

## Rate Limiting Details

| Endpoint | Limit | Scope | Reason |
|----------|-------|-------|--------|
| `/request` | 10/min | Per IP | Prevent email flood attacks |
| `/request` | 1/10min | Per email | Prevent user email spam |
| `/request` | 5/day | Per email | Daily cap on requests |
| `/verify` | 5/min | Per IP | Prevent password brute force |
| `/verify` (GET) | 20/min | Per IP | Token validation is cheap |

---

## Examples: Frontend Integration

### Example 1: Request Reset Link

```javascript
// Frontend: POST /auth/password-reset/request
const response = await axios.post(
  'http://api.example.com/auth/password-reset/request',
  { email: 'user@example.com' }
);

// Success (200)
console.log(response.data);
// {
//   message: "Se ha enviado un enlace...",
//   expires_in_hours: 24,
//   note: "Revisa tu bandeja..."
// }

// Error (429 Rate Limit)
catch (error) {
  if (error.response.status === 429) {
    const retryAfter = error.response.data.error.retry_after_seconds;
    console.log(`Intenta de nuevo en ${retryAfter} segundos`);
  }
}
```

### Example 2: Verify Token & Reset Password

```javascript
// Frontend: POST /auth/password-reset/verify
const response = await axios.post(
  'http://api.example.com/auth/password-reset/verify',
  {
    token: new URLSearchParams(window.location.search).get('token'),
    new_password: 'MySecurePass123!'
  }
);

// Success (200) → Redirect to login
if (response.status === 200) {
  window.location.href = response.data.redirect_url;
}

// Error: Show password validation details
catch (error) {
  if (error.response?.data?.error?.code === 'PASSWORD_VALIDATION_FAILED') {
    const requirements = error.response.data.error.details.requirements;
    // Display which requirements failed
    requirements.forEach(req => {
      if (!req.satisfied) {
        console.log(`❌ ${req.message}`);
      }
    });
  }
}
```

---

## Testing Scenarios

### Test Case 1: Happy Path
1. User requests reset for registered email
2. User clicks link in email
3. User enters valid new password
4. User redirected to login
5. User logs in with new password → Success ✅

### Test Case 2: Expired Token
1. User requests reset
2. Waits 24+ hours
3. Clicks link → Token expired error ✅

### Test Case 3: Invalid Password
1. User requests reset
2. Enters password with no uppercase → Validation error ✅

### Test Case 4: Rate Limiting
1. User requests reset 11 times in 1 minute → Rate limit on request 11 ✅
2. User requests reset 6 times for same email in 24h → Rate limit on request 6 ✅

### Test Case 5: Email Enumeration Protection
1. Request reset for registered email → Success message
2. Request reset for unregistered email → Same success message ✅
3. Backend logs show actual result (one succeeded, one failed) ✅
