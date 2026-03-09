# API Contract: Employee Authentication

**Feature**: 005-employee-workspace | **Endpoints**: Password setup, Login, Logout

---

## POST /auth/password-setup

**Purpose**: Employee sets password using token sent via email

**Request**:
```json
{
  "token": "string (from email link)",
  "password": "string (min 8 chars, mix case + numbers)",
  "password_confirm": "string (must match password)"
}
```

**Response 200 OK**:
```json
{
  "message": "Password set successfully. You can now log in.",
  "redirect_url": "/login"
}
```

**Response 400 Bad Request**:
```json
{
  "error": {
    "code": "INVALID_PASSWORD",
    "message": "Password too weak. Must have letters, numbers, and 8+ characters."
  }
}
```

**Response 401 Unauthorized**:
```json
{
  "error": {
    "code": "TOKEN_EXPIRED",
    "message": "Password reset link has expired. Request a new one."
  }
}
```

**Response 404 Not Found**:
```json
{
  "error": {
    "code": "TOKEN_NOT_FOUND",
    "message": "Invalid or already-used password reset link."
  }
}
```

---

## POST /auth/login

**Purpose**: Employee logs in with email + password

**Request**:
```json
{
  "email": "string (email@example.com)",
  "password": "string"
}
```

**Response 200 OK**:
```json
{
  "access_token": "eyJhbGc...",
  "user": {
    "id": "uuid",
    "email": "juan@ilpi.es",
    "role": "Empleado",
    "employee_id": "uuid"
  }
}
```

**Cookies Set**:
- `refresh_token`: HttpOnly, Secure, SameSite=Strict, expires in 7 days

**Response 401 Unauthorized**:
```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Email or password incorrect."
  }
}
```

**Response 403 Forbidden**:
```json
{
  "error": {
    "code": "ACCOUNT_NOT_ACTIVE",
    "message": "Account not active. Please set your password."
  }
}
```

**Rate Limit**: 10 requests per minute per IP (429 Too Many Requests if exceeded)

---

## POST /auth/logout

**Purpose**: Employee logs out

**Request**: No body required

**Response 200 OK**:
```json
{
  "message": "Logged out successfully."
}
```

**Cookies Cleared**: `refresh_token` removed

---

## POST /auth/refresh

**Purpose**: Refresh expired access token

**Request**: Refresh token sent in HttpOnly cookie (automatic)

**Response 200 OK**:
```json
{
  "access_token": "eyJhbGc..."
}
```

**Response 401 Unauthorized**:
```json
{
  "error": {
    "code": "TOKEN_INVALID",
    "message": "Refresh token invalid or expired. Please log in again."
  }
}
```

---

## Email Content: Password Setup

**Subject**: "Set Your ILPI Password"

**Body**:
```
Hello [Employee Name],

Your ILPI account has been created. Click the link below to set your password and activate your account:

[https://ilpi.example.com/auth/password-setup?token=xyz]

This link expires in 15 minutes.

If you didn't request this, please contact your manager.

ILPI Admin
```

---

## Error Codes Reference

| Code | HTTP Status | Meaning |
|------|-------------|---------|
| `INVALID_CREDENTIALS` | 401 | Email or password incorrect |
| `INVALID_PASSWORD` | 400 | Password format invalid |
| `TOKEN_EXPIRED` | 401 | Password reset link expired |
| `TOKEN_NOT_FOUND` | 404 | Token doesn't exist or already used |
| `ACCOUNT_NOT_ACTIVE` | 403 | Account not activated (password not set) |
| `TOKEN_INVALID` | 401 | Refresh token invalid/expired |
| `EMAIL_NOT_FOUND` | 404 | Email not registered |
