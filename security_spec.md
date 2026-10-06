# Security Specification

## 1. Data Invariants
- `test_connection/{testId}`: Must be a transient health probe with valid test boolean and timestamp.
- `rooms/{roomId}`:
  - Document ID must be a valid room PIN or string ID (`isValidId`).
  - Required fields: `pin`, `title`, `status`, `currentQuestionIndex`, `timeLimit`, `createdAt`.
  - `status` must be one of `['waiting', 'playing', 'round_result', 'finished']`.
  - Pin must be a string up to 10 characters.
- `rooms/{roomId}/questions/{qIndex}`:
  - Required fields: `qIndex`, `word`, `meaning`, `initialHint`, `alphabetBlocks`, `limitTime`.
  - `word` and `meaning` strings bounded to max 50 and 200 chars.
- `rooms/{roomId}/participants/{studentKey}`:
  - Required fields: `studentKey`, `name`, `studentNum`, `totalScore`, `lastActive`.
  - Total score must be a non-negative number.
  - Name and studentNum are string bounded (max 40 and 30 chars).
- `history/{historyId}`:
  - Required fields: `roomId`, `roomTitle`, `completedAt`, `totalQuestions`, `participantCount`.

## 2. The "Dirty Dozen" Payloads (Must be rejected)
1. Injecting 2MB payload into room title.
2. Malicious HTML script injection in room PIN.
3. Negative totalScore (-99999) in participant score.
4. Setting room status to invalid state 'cheating_mode'.
5. Omitting mandatory word or meaning in question doc.
6. Non-numeric currentQuestionIndex ("zero").
7. Injecting arbitrary system fields into test_connection doc.
8. Modifying completed history document once closed.
9. Oversized studentKey exceeding 128 characters.
10. Unbounded alphabet blocks array with 500 items.
11. Non-string name field (e.g. number or object).
12. Attempting to write to arbitrary root collection (e.g. `system_configs/{id}`).
