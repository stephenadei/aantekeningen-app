# CONTEXT — aantekeningen-app

Domain glossary for the notes/OCR app. Terms here are meaningful to someone
reasoning about *what the app does*, not how it is wired. Architecture reviews
(`/improve-codebase-architecture`) name deepened modules after these terms.

## Core entities

- **Student** — a tutoring pupil whose handwritten notes are scanned and
  organised. Has a display name; may carry a **Drive folder ID** and/or a
  **datalake path**. (DB stores the name as `name`; the app's `Student`
  interface exposes it as `displayName` — these must be reconciled in one
  place, not per call-site.)

- **Datalake path** — the canonical location of a Student's notes inside the
  medallion datalake (e.g. `notability/Priveles/<name>`). The primary way to
  list a Student's files. A Student with no notes yet has **no location**.

- **Drive folder ID** — legacy Google Drive identifier for a Student's folder.
  Supported for backward compatibility; superseded by the datalake path.

- **Firestore student ID** — legacy identifier for a Student record from the
  pre-datalake era. Still accepted as an inbound id.

## Resolution concepts

These name the two seams the file/overview/share routes currently re-implement
(with dangerous drift). See architecture review 2026-06-13.

- **Student identity resolution** — turning an inbound **id-string**
  (Drive folder ID, Firestore student ID, a datalake path, or an
  auto-detected mix) into a **Student**. Used by the files and overview
  routes. (Does *not* apply to the share route, which starts from a share
  token, never an id-string.)

- **Student location resolution** — turning a **Student** into their
  **datalake path**. Resolution order: stored Drive folder ID → stored
  datalake path → a single targeted name-lookup fallback
  (`getStudentPath(name, subject?)`) bounded by a timeout. When no path is
  found, it yields a **no-location** result; the *route* decides how to render
  that (files → empty list, overview → empty overview, share → null path).
  Used by all three routes (files, overview, share).
