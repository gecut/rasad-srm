# AUTHENTICATION

## 1. One auth collection

Use one Payload auth-enabled `users` collection.

Roles:

- `admin`
- `employee`
- `follow_up_specialist`
- `inviter`
- `teacher`
- `receptionist`

## 2. Login identifiers

Configure Payload username login so custom-panel accounts can authenticate without email.

Recommended conceptual configuration:

- username login enabled;
- email login also allowed for Admin-side users;
- email not globally required.

For custom-panel users:

- UI field label: `شماره موبایل`;
- normalize the phone number before login/account creation;
- store the canonical normalized phone as auth `username`;
- user enters phone + password only.

Do not duplicate a separate plaintext `password` field.

## 3. Password security

Plaintext password storage is prohibited even in MVP.

Rasad relies on Payload's built-in local auth password storage and session/cookie mechanisms. This adds no product UX burden compared with plaintext storage.

## 4. Teacher identity

A `teacher` User must have `teacherProfile` referencing one active Teacher. Teacher panel authorization re-checks that link server-side.

## 5. Admin access

Only roles explicitly approved for `/admin` may enter Payload Admin. Inviter, Teacher, and Receptionist accounts are denied Admin access even though they share the same auth collection.

## 6. Session handling

Prefer secure HTTP-only cookie/session behavior provided by Payload/Next.js helpers. Do not store long-lived auth tokens in client-readable localStorage unless a later architecture decision requires it.

## 7. Brute-force protection

Keep finite login-attempt limits and lockout behavior enabled for production accounts.
