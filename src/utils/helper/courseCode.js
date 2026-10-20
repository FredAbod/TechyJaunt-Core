// Short human-friendly course identifier used in admin CSV imports, e.g. "DA-101".
export const COURSE_CODE_PATTERN = /^[A-Z0-9][A-Z0-9-]{1,19}$/;
export const COURSE_CODE_HINT =
  "2-20 characters: letters, numbers and dashes, starting with a letter or number";

export const normalizeCourseCode = (value) =>
  String(value ?? "").trim().toUpperCase();
