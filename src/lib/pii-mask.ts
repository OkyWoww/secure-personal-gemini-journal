export function maskPII(text: string): string {
  if (!text) return '';

  let masked = text;

  // Mask Email Addresses completely for zero PII leakage
  // e.g., user@example.com -> [REDACTED_EMAIL]
  masked = masked.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]');

  // Mask Phone Numbers (International and US/ID formats)
  // e.g., +62 812-3456-7890 -> [PHONE_REDACTED]
  // e.g., 081234567890 -> [PHONE_REDACTED]
  masked = masked.replace(/(?:\+?\d{1,3}[\s-]?)?(?:\(?\d{2,4}\)?[\s-]?)?\d{3,4}[\s-]?\d{3,4}[\s-]?\d{0,4}/g, (match) => {
    // Only mask if it looks like a phone number (e.g. at least 8 digits total)
    const digitsOnly = match.replace(/\D/g, '');
    if (digitsOnly.length >= 8 && digitsOnly.length <= 15) {
      // Preserve trailing spaces if the regex eagerly grabbed one
      const trailingSpace = match.match(/\s$/) ? ' ' : '';
      return '[PHONE_REDACTED]' + trailingSpace;
    }
    return match;
  });

  return masked;
}
