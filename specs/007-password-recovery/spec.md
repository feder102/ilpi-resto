# Feature Specification: Password Recovery

**Feature Branch**: `007-password-recovery`
**Created**: 2026-03-11
**Status**: Draft
**Input**: User description: "Quiero que los usuarios puedan recuperar su contraseña en el caso que lo hayan olvidado" (I want users to be able to recover their password in case they forgot it)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Request Password Reset (Priority: P1)

User has forgotten their password and needs to initiate the recovery process. They access a "Forgot Password" interface and submit their email address to receive a password reset link.

**Why this priority**: This is the entry point to password recovery. Without a way to initiate recovery, users are locked out of their accounts. This is a critical blocking issue for user access.

**Independent Test**: User can independently request a password reset by entering their registered email and receive a reset link via email.

**Acceptance Scenarios**:

1. **Given** a user has forgotten their password, **When** they click "Forgot Password" on the login page, **Then** they see a form requesting their email address
2. **Given** a user enters a valid email registered in the system, **When** they submit the form, **Then** they receive confirmation that an email was sent and are redirected to a confirmation page
3. **Given** a user enters an email not registered in the system, **When** they submit the form, **Then** they still see a success message (for security: don't reveal if email exists or not)
4. **Given** a user has already requested a reset, **When** they request another reset within 10 minutes, **Then** the system prevents the request (rate limiting) and shows a message to wait before requesting again

---

### User Story 2 - Click Password Reset Link (Priority: P1)

User receives an email with a password reset link and clicks it to access the password reset form. The system verifies the reset token is valid and not expired.

**Why this priority**: This is the core mechanism for password recovery. Users must be able to verify their identity and access the reset form to create a new password.

**Independent Test**: User can click the reset link from email and access a password reset form with a verified, non-expired token.

**Acceptance Scenarios**:

1. **Given** a user has requested a password reset, **When** they click the reset link in the email within 24 hours, **Then** they are taken to a password reset form
2. **Given** a user receives a reset link, **When** the token has expired (older than 24 hours), **Then** they see an error message and are offered the option to request a new reset link
3. **Given** a user manually modifies the reset token in the URL, **When** they try to access the form, **Then** they see an error message stating the link is invalid
4. **Given** a user accesses a reset link that has already been used, **When** they try to use it again, **Then** they see an error message and are offered the option to request a new reset

---

### User Story 3 - Set New Password (Priority: P1)

User submits a new password on the reset form. The system validates the password meets security requirements, updates the user's password, and confirms the change.

**Why this priority**: This completes the recovery flow. Without the ability to set a new password, the entire recovery process fails. This directly unblocks user access.

**Independent Test**: User can successfully reset their password to a new, valid password and immediately log in with the new password.

**Acceptance Scenarios**:

1. **Given** a user is on a valid password reset form, **When** they enter a new password that meets security requirements (minimum 8 characters, at least 1 uppercase, 1 lowercase, 1 number, 1 special character), **Then** the form accepts the password
2. **Given** a user enters a password that doesn't meet requirements, **When** they try to submit, **Then** they see specific validation error messages for each requirement not met
3. **Given** a user has submitted a new password, **When** the submission is successful, **Then** they see a success message and are redirected to the login page
4. **Given** a user has successfully reset their password, **When** they log in with their email and new password, **Then** they are authenticated and granted access to their account

---

### User Story 4 - Security: Token Expiration & Invalidation (Priority: P2)

The system must automatically invalidate reset tokens after a set time period and when a password is successfully changed to prevent unauthorized access and replay attacks.

**Why this priority**: This is a critical security measure. It prevents attackers from using old reset tokens and protects accounts from unauthorized password changes. High priority for security but slightly lower than core recovery flow.

**Independent Test**: System can independently verify that expired or used tokens cannot be reused for password resets.

**Acceptance Scenarios**:

1. **Given** a reset token has been created, **When** more than 24 hours have passed, **Then** the token is no longer valid and attempting to use it shows an error
2. **Given** a user has successfully reset their password with a token, **When** someone tries to use the same token again, **Then** the token is rejected and they must request a new reset
3. **Given** a user initiates a new password reset, **When** a new token is generated, **Then** any previous unused tokens for the same email become invalid
4. **Given** a user has reset their password, **When** they attempt to log in, **Then** their old password no longer works

---

### User Story 5 - Rate Limiting & Account Protection (Priority: P2)

The system must limit password reset requests from a single email address to prevent abuse and brute force attacks on the password reset endpoint.

**Why this priority**: This protects the system from abuse and spam while also protecting user accounts from attackers flooding their mailbox with reset emails. Important security measure but does not block core functionality.

**Independent Test**: System can independently enforce rate limits on password reset requests by email address.

**Acceptance Scenarios**:

1. **Given** a user requests a password reset, **When** they request another reset within 10 minutes for the same email, **Then** the system rejects the request and shows a message indicating they must wait
2. **Given** multiple users request password resets, **When** the system receives 5+ requests in 1 hour from the same IP address, **Then** the IP is temporarily rate-limited and subsequent requests are rejected
3. **Given** a rate limit is in place, **When** the wait period expires, **Then** the user can request a new password reset

---

### Edge Cases

- What happens if a user requests a password reset, receives the email, then requests another reset before using the first link? (First link should be invalidated)
- How does the system handle password reset requests for email addresses that don't exist in the system? (Send success message to prevent email enumeration attacks)
- What happens if a user resets their password while logged in? (Should either require logout first or allow direct password change)
- How are reset emails handled if email delivery fails? (System should log the failure and provide admin visibility)
- What if a user changes their password while a reset token is pending? (Token should become invalid; user should use login with new password)
- Can a user reset their password multiple times in succession? (Yes, but with rate limiting - e.g., max 5 resets per day per email)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a "Forgot Password" link on the login page that is immediately visible and accessible
- **FR-002**: System MUST display a form requesting the user's email address for password reset initiation
- **FR-003**: System MUST send a password reset email containing a unique, secure token-based link when a user requests a reset
- **FR-004**: System MUST validate that the reset token is valid and not expired before allowing password change
- **FR-005**: System MUST display a password reset form with password input field and security requirement indicators
- **FR-006**: System MUST validate new passwords against security requirements (minimum 8 characters, uppercase, lowercase, number, special character)
- **FR-007**: System MUST securely hash and store the new password using bcrypt with cost ≥10
- **FR-008**: System MUST invalidate all reset tokens for a user after a successful password change
- **FR-009**: System MUST automatically expire reset tokens after 24 hours
- **FR-010**: System MUST prevent users from using the same password reset token twice
- **FR-011**: System MUST enforce rate limiting: maximum 1 reset request per email address every 10 minutes
- **FR-012**: System MUST enforce rate limiting: maximum 5 reset requests per email address per day
- **FR-013**: System MUST prevent email enumeration by returning the same success message regardless of whether the email exists in the system
- **FR-014**: System MUST log all password reset attempts for audit and security monitoring
- **FR-015**: Users MUST receive clear error messages explaining why a reset link is invalid or expired, with an option to request a new link
- **FR-016**: System MUST use TLS/SSL encryption for all password reset communications

### Key Entities *(include if feature involves data)*

- **PasswordResetToken**: Temporary token used for password recovery
  - `id`: Unique identifier
  - `user_id`: Foreign key to User
  - `token`: Secure random token (hashed)
  - `expires_at`: Timestamp when token becomes invalid (24 hours from creation)
  - `used_at`: Timestamp when token was used (NULL until used, then marked to prevent reuse)
  - `created_at`: Timestamp of token creation
  - `ip_address`: IP address that requested the reset (for audit logging)
  - `tenant_id`: Multi-tenant support

- **User** (existing entity with new field):
  - `password_reset_attempts`: Count of reset attempts in current day (for rate limiting)
  - `last_reset_request_at`: Timestamp of last reset request (for rate limiting)

- **AuditLog** (existing security audit trail):
  - Events logged: password_reset_requested, password_reset_token_created, password_reset_attempted, password_changed_via_reset

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can successfully reset a forgotten password in under 5 minutes from initial request to login with new password
- **SC-002**: 95% of password reset emails are successfully delivered and opened within 1 hour
- **SC-003**: System prevents unauthorized password changes: 0 successful password resets with invalid or expired tokens
- **SC-004**: Rate limiting is effective: system blocks more than 80% of brute force reset attempts (5+ requests per hour per email)
- **SC-005**: No security incidents related to password reset (no token reuse, no email enumeration, no plaintext tokens)
- **SC-006**: 99% of users who request a password reset understand the next steps and can navigate to their email
- **SC-007**: Support tickets related to "forgot password" decrease by at least 40% compared to baseline
- **SC-008**: System maintains password reset token validity and expiration with 100% accuracy

## Assumptions

- Email delivery service (SMTP) is configured and operational
- Reset tokens are generated using cryptographically secure random generators
- Passwords are validated using the same security requirements as account registration
- User email addresses are unique per tenant (already enforced in User model)
- System uses secure cookie-based JWT refresh tokens (per project security architecture)
- Email reset links will be sent from a noreply address that users recognize and trust
- 24-hour token expiration is acceptable for user experience and security balance
- Rate limiting is implemented per email address and optionally per IP for suspicious activity
