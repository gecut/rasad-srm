# RECEPTION PANEL — `/reception`

## 1. Purpose

Fast ceremony arrival processing with two paths:

1. find an existing Student and confirm attendance;
2. create an unknown walk-in Student and check them in immediately.

## 2. Authentication

Phone number + password. Role must be `receptionist`.

## 3. Working context

Receptionist selects or receives:

- Ceremony;
- current physical Session being admitted.

The context stays visible at all times.

## 4. Search

Primary search is Student name. Phone may be used as a secondary disambiguator.

Search results show only necessary fields:

- full name;
- grade when known;
- masked/limited phone context if useful;
- expected assigned Session for the Ceremony if accepted;
- whether already checked in.

## 5. Existing Student check-in

One action confirms attendance and creates `session-checkin` for the current reception Session.

If the Student was invited to a different Session, show a warning but allow authorized reception to record actual attendance; do not rewrite the Invitation assignment silently.

## 6. Quick new Student

If search fails, a prominent `دانش‌آموز جدید` action opens a minimal form.

Required:

- first name;
- last name.

Optional when known:

- grade;
- Student mobile;
- mother mobile;
- father mobile.

Submit through one server action that:

1. creates Student with `origin = reception_walk_in`;
2. creates Check-in for current Session;
3. returns success atomically as far as the DB adapter supports.

## 7. Duplicate protection

Before quick creation, server should run a lightweight duplicate check by normalized name + available phone. If a likely match exists, return candidates instead of silently creating another Student.

## 8. Performance UX

- search should be keyboard-first;
- Enter selects/advances where safe;
- keep current Ceremony/Session sticky;
- after success, clear search and focus the search field;
- avoid multi-step wizards.
