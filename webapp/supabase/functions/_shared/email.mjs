// Keep this list intentionally focused on disposable mailbox services. It does
// not reject privacy-forwarding aliases from normal providers.
const DISPOSABLE_DOMAINS = new Set([
  '10minutemail.com', '10minutemail.net', '20minutemail.com', '33mail.com',
  'dispostable.com', 'dropmail.me', 'emailondeck.com', 'fakeinbox.com',
  'fakemail.net', 'getnada.com', 'guerrillamail.com', 'guerrillamail.net',
  'inboxbear.com', 'maildrop.cc', 'mailinator.com', 'mailnesia.com',
  'mintemail.com', 'mohmal.com', 'mytemp.email', 'temp-mail.org',
  'tempmail.com', 'tempmailo.com', 'throwawaymail.com', 'trashmail.com',
  'yopmail.com', 'sharklasers.com', 'guerrillamailblock.com', 'spamgourmet.com',
  'getairmail.com', 'emailfake.com', 'emailtemporario.com', 'mailcatch.com',
  'mailnull.com', 'mail-temporaire.fr', 'tempinbox.com', 'temp-mail.io',
  'disposablemail.com', 'mail7.io', 'mailsac.com', 'inoutmail.de',
  'discard.email', 'burnermail.io', 'crazymailing.com', 'moakt.com',
  'tempr.email', 'tmpmail.org', 'tmpmail.net', '10mail.org', 'spam4.me',
  'getnada.cc', 'emailisvalid.com', 'inboxkitten.com', 'mailpoof.com',
  'harakirimail.com', 'mailforspam.com', 'spambog.com', 'spambog.de',
  'wegwerfmail.de', 'wegwerfmail.net', 'trash-mail.com', 'trashmail.ws',
  'mailcatch.com', 'my10minutemail.com', 'temporary-mail.net',
  'tempmailaddress.com', 'tempmail.plus', 'temp-mail.org', 'mailslurp.com',
  'mail.tm', 'mail.gw',
]);

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value) {
  const email = String(value ?? '').trim().toLowerCase();
  if (email.length < 3 || email.length > 254 || email.includes('\n') || email.includes('\r')) return null;
  if (!EMAIL_PATTERN.test(email)) return null;
  const [localPart, domain] = email.split('@');
  if (!localPart || localPart.length > 64 || !domain || domain.length > 253 || domain.startsWith('.') || domain.endsWith('.')) return null;
  if (domain.includes('..') || localPart.includes('..')) return null;
  return email;
}

export function emailDomain(value) {
  const email = normalizeEmail(value);
  return email?.split('@')[1] ?? '';
}

export function isDisposableEmail(value) {
  const domain = emailDomain(value);
  if (!domain) return false;
  return DISPOSABLE_DOMAINS.has(domain) || [...DISPOSABLE_DOMAINS].some((blocked) => domain.endsWith(`.${blocked}`));
}

export { DISPOSABLE_DOMAINS };
