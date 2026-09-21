# HTTP API contract

Base prefix: `/v1`. JSON responses use either `{ "data": ... }` or `{ "error": { "code", "message" } }`.

## Authentication

### Create or resume a guest

`POST /v1/auth/guest`

```json
{ "deviceId": "installation-generated-stable-id" }
```

Returns `201` with an `accessToken` and guest `learner`. Reusing a `deviceId` resumes the same guest record.

### Upgrade a guest

`POST /v1/auth/register` with the guest bearer token.

```json
{
  "email": "amina@example.com",
  "password": "a-long-unique-password",
  "displayName": "Amina"
}
```

The learner ID is unchanged, so attempts, progress, bookmarks, and preferences remain attached.

### Login

`POST /v1/auth/login`

```json
{ "email": "amina@example.com", "password": "a-long-unique-password" }
```

## Content

- `GET /v1/subjects`
- `GET /v1/subjects/:slug/topics`

Only published content is returned.

## Practice

All practice endpoints require `Authorization: Bearer <token>`.

### Start a session

`POST /v1/practice/sessions`

```json
{
  "topicId": "20000000-0000-4000-8000-000000000001",
  "questionCount": 10,
  "mode": "practice"
}
```

Use either `topicId` or `subjectId`, not both. The response includes the current question but does not expose the answer or explanation.

### Resume a session

`GET /v1/practice/sessions/:sessionId`

### Submit the current answer

`POST /v1/practice/sessions/:sessionId/answer`

```json
{
  "questionId": "30000000-0000-4000-8000-000000000001",
  "selectedOptionId": "b"
}
```

The response reveals correctness and the explanation, updates progress, and includes the next question. Answers must be submitted in order; replayed or out-of-order answers return `409`.

## Flashcards

`GET /v1/flashcards` requires a learner bearer token and returns cards as a
front prompt plus a back containing the answer and explanation. Optional
`subjectId` or `topicId` query parameters narrow the deck.

Each card includes a nullable `review` object for the current learner. Review
state is saved server-side and is never shared between learners.

### Save flashcard confidence

`POST /v1/flashcards/:questionId/review` requires a learner bearer token.

```json
{ "rating": "known" }
```

`rating` is either `known` (next review in three days) or `again` (next review
in ten minutes). The response returns the saved review record and its due time.

## Learner experience

- `GET /v1/me`
- `GET /v1/progress`
- `GET /v1/discovery`
- `GET /v1/bookmarks`
- `POST /v1/bookmarks/:questionId`
- `DELETE /v1/bookmarks/:questionId`

## Notifications

- `GET /v1/notification-preferences`
- `PATCH /v1/notification-preferences`
- `POST /v1/devices/push-token`

Notifications default to disabled. The client should ask for operating-system permission only after the learner deliberately enables a useful reminder.

```json
{
  "enabled": true,
  "studyReminders": true,
  "streakReminders": false,
  "preferredHour": 20,
  "timezone": "Africa/Nairobi"
}
```

## Admin media (Cloudflare R2)

These endpoints require `X-Admin-Key` and return `503` until the R2 environment variables are configured.

- `POST /v1/admin/media/upload-url` accepts `scope`, `contentType`, and `sizeBytes` (maximum 25 MiB), then returns a 10-minute signed PUT URL, a server-generated object key, expiry, and the required upload headers.
- `GET /v1/admin/media/download-url?objectKey=...` returns a five-minute signed GET URL.

Upload example:

```json
{
  "scope": "resources",
  "contentType": "application/pdf",
  "sizeBytes": 481920
}
```
