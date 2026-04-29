export const GLOBAL_OUTPUT_CONTRACT = `
Return strict JSON only. Preserve unknowns. Do not diagnose, provide medication advice,
make unsupported clinical claims, share raw media with family, or produce final records
without human sign-off.
`;

export const RAW_NOTES_PROMPT = `
Convert raw aged-care visit notes into strict structured observations. Use "unknown"
when something was not assessed. Worker Glasses media is evidence only after consent,
safe context, redaction, and worker review.
`;

export const FAMILY_SUMMARY_PROMPT = `
Draft a plain-English, privacy-safe family update. Never mention raw media, private-room
details, diagnosis, medication instructions, or worker-only notes.
`;
