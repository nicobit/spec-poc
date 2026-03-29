import { ArrowLeft, Save } from 'lucide-react';
import { useMemo, useState } from 'react';

import ConstrainedSearchInput from '@/components/ConstrainedSearchInput';
import { themeClasses } from '@/theme/themeClasses';

import type { ClientAdminAssignment, ClientRecord } from '../api';
import { TIMEZONE_OPTIONS } from '../timezoneOptions';

type ClientDraft = {
  name: string;
  shortCode: string;
  country: string;
  timezone: string;
  clientAdmins: ClientAdminAssignment[];
};

type Props = {
  title: string;
  description: string;
  initialValue?: ClientRecord | null;
  saving?: boolean;
  submitLabel: string;
  onSubmit: (value: ClientDraft) => Promise<void> | void;
  onCancel: () => void;
};

const EMAIL_PATTERN = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/;

function isValidEmail(value: string) {
  return EMAIL_PATTERN.test(value.trim());
}

function uniqueEmails(values: string[]) {
  return values.filter((value, index) => values.findIndex((candidate) => candidate.toLowerCase() === value.toLowerCase()) === index);
}

function parseCommittedEmails(raw: string) {
  const normalized = raw.replace(/\n/g, ',');
  const parts = normalized.split(',');
  const endsWithSeparator = /,\s*$/.test(normalized);
  const completed = endsWithSeparator ? parts : parts.slice(0, -1);
  const remainder = endsWithSeparator ? '' : (parts.at(-1) ?? '');
  const valid: string[] = [];
  const invalid: string[] = [];

  completed
    .map((value) => value.trim())
    .filter(Boolean)
    .forEach((value) => {
      if (isValidEmail(value)) {
        valid.push(value);
      } else {
        invalid.push(value);
      }
    });

  return {
    valid,
    invalid,
    remainder,
  };
}

function finalizeEmailInput(raw: string) {
  const normalized = raw.trim();
  if (!normalized) {
    return { valid: [] as string[], invalid: [] as string[] };
  }
  if (isValidEmail(normalized)) {
    return { valid: [normalized], invalid: [] as string[] };
  }
  return { valid: [] as string[], invalid: [normalized] };
}

export default function ClientEditorForm({
  title,
  description,
  initialValue,
  saving = false,
  submitLabel,
  onSubmit,
  onCancel,
}: Props) {
  const [name, setName] = useState(initialValue?.name ?? '');
  const [shortCode, setShortCode] = useState(initialValue?.shortCode ?? '');
  const [country, setCountry] = useState(initialValue?.country ?? '');
  const [timezone, setTimezone] = useState(initialValue?.timezone ?? '');
  const [clientAdmins, setClientAdmins] = useState<string[]>(() => uniqueEmails((initialValue?.clientAdmins ?? []).map((item) => item.id.trim()).filter(Boolean)));
  const [clientAdminInput, setClientAdminInput] = useState('');
  const [clientAdminError, setClientAdminError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function addClientAdmins(values: string[]) {
    if (!values.length) return;
    setClientAdmins((current) => uniqueEmails([...current, ...values.map((value) => value.trim()).filter(Boolean)]));
  }

  function commitPendingEmails(rawValue: string) {
    const parsed = parseCommittedEmails(rawValue);
    if (parsed.valid.length) {
      addClientAdmins(parsed.valid);
    }
    setClientAdminInput(parsed.remainder);
    if (parsed.invalid.length) {
      setClientAdminError(`Enter valid email addresses separated by commas. Invalid: ${parsed.invalid.join(', ')}`);
    } else {
      setClientAdminError('');
    }
  }

  function finalizePendingEmails() {
    const finalized = finalizeEmailInput(clientAdminInput);
    if (finalized.valid.length) {
      addClientAdmins(finalized.valid);
      setClientAdminInput('');
      setClientAdminError('');
      return { invalid: false, nextAdmins: uniqueEmails([...clientAdmins, ...finalized.valid]) };
    }
    if (finalized.invalid.length) {
      setClientAdminError(`Enter valid email addresses separated by commas. Invalid: ${finalized.invalid.join(', ')}`);
      return { invalid: true, nextAdmins: clientAdmins };
    }
    return { invalid: false, nextAdmins: clientAdmins };
  }

  const validation = useMemo(() => {
    const normalizedTimezone = timezone.trim();
    return {
      hasName: Boolean(name.trim()),
      hasShortCode: Boolean(shortCode.trim()),
      hasCountry: /^[A-Za-z]{2}$/.test(country.trim()),
      hasTimezone: TIMEZONE_OPTIONS.includes(normalizedTimezone),
      hasAdmins: clientAdmins.length > 0,
      admins: clientAdmins,
      errors: {
        name: name.trim() ? '' : 'Enter a display name.',
        shortCode: shortCode.trim() ? '' : 'Enter a short code.',
        country: country.trim()
          ? /^[A-Za-z]{2}$/.test(country.trim())
            ? ''
            : 'Use a 2-letter country code such as CH or DE.'
          : 'Enter a 2-letter country code.',
        timezone: normalizedTimezone
          ? TIMEZONE_OPTIONS.includes(normalizedTimezone)
            ? ''
            : 'Choose a valid timezone from the suggested list.'
          : 'Select a timezone.',
        clientAdmins:
          clientAdminError || (clientAdmins.length > 0 ? '' : 'Enter at least one valid client admin email address.'),
      },
    };
  }, [clientAdminError, clientAdmins, country, name, shortCode, timezone]);

  const canSave =
    validation.hasName &&
    validation.hasShortCode &&
    validation.hasCountry &&
    validation.hasTimezone &&
    validation.hasAdmins &&
    !clientAdminError &&
    !clientAdminInput.trim() &&
    !saving;

  async function handleSubmit() {
    setSubmitted(true);
    const finalized = finalizePendingEmails();
    if (finalized.invalid) {
      return;
    }
    const admins = finalized.nextAdmins;
    if (!(validation.hasName && validation.hasShortCode && validation.hasCountry && validation.hasTimezone && admins.length > 0) || saving) {
      return;
    }
    await onSubmit({
      name: name.trim(),
      shortCode: shortCode.trim().toUpperCase(),
      country: country.trim().toUpperCase(),
      timezone: timezone.trim(),
      clientAdmins: admins.map((id) => ({ type: 'user', id })),
    });
  }

  return (
    <div className="space-y-4">
      <section className={`${themeClasses.formSection} rounded-3xl p-6`}>
        <div className={themeClasses.sectionEyebrow}>Client details</div>
        <p className={`${themeClasses.helperText} mt-2 max-w-3xl`}>{description}</p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className={themeClasses.fieldLabel}>Display name</span>
            <input
              className={`${themeClasses.field} ${submitted && validation.errors.name ? themeClasses.fieldInvalid : ''} mt-1 w-full rounded-lg px-3 py-2`}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            {submitted && validation.errors.name ? <div className={`${themeClasses.fieldError} mt-1`}>{validation.errors.name}</div> : null}
          </label>
          <label className="block">
            <span className={themeClasses.fieldLabel}>Short code</span>
            <input
              className={`${themeClasses.field} ${submitted && validation.errors.shortCode ? themeClasses.fieldInvalid : ''} mt-1 w-full rounded-lg px-3 py-2`}
              value={shortCode}
              onChange={(event) => setShortCode(event.target.value)}
            />
            {submitted && validation.errors.shortCode ? (
              <div className={`${themeClasses.fieldError} mt-1`}>{validation.errors.shortCode}</div>
            ) : null}
          </label>
          <label className="block">
            <span className={themeClasses.fieldLabel}>Country</span>
            <input
              className={`${themeClasses.field} ${submitted && validation.errors.country ? themeClasses.fieldInvalid : ''} mt-1 w-full rounded-lg px-3 py-2`}
              value={country}
              maxLength={2}
              onChange={(event) => setCountry(event.target.value)}
            />
            <div className={`${submitted && validation.errors.country ? themeClasses.fieldError : themeClasses.helperText} mt-1`}>
              {submitted && validation.errors.country ? validation.errors.country : 'Use a 2-letter country code such as `CH` or `DE`.'}
            </div>
          </label>
          <label className="block">
            <span className={themeClasses.fieldLabel}>Timezone</span>
            <div className="mt-1">
              <ConstrainedSearchInput
                options={TIMEZONE_OPTIONS}
                value={timezone}
                onChange={(value) => setTimezone(value || '')}
                placeholder="Type to search timezones..."
                maxVisible={12}
                inputClassName={submitted && validation.errors.timezone ? themeClasses.fieldInvalid : ''}
              />
            </div>
            <div className={`${submitted && validation.errors.timezone ? themeClasses.fieldError : themeClasses.helperText} mt-1`}>
              {submitted && validation.errors.timezone
                ? validation.errors.timezone
                : 'Start typing an IANA timezone such as `Europe/Zurich`, then choose one of the suggested values.'}
            </div>
          </label>
        </div>
      </section>

      <section className={`${themeClasses.formSection} rounded-3xl p-6`}>
        <div className={themeClasses.sectionEyebrow}>Client admins</div>
        <p className={`${themeClasses.helperText} mt-2 max-w-3xl`}>
          Assign one or more client-admin email addresses for ownership. Press comma or Enter to confirm each email.
        </p>
        <label className="mt-6 block">
          <span className={themeClasses.fieldLabel}>Client-admin email addresses</span>
          <div
            className={`${themeClasses.field} ${(clientAdminError || (submitted && validation.errors.clientAdmins)) ? themeClasses.fieldInvalid : ''} mt-1 flex min-h-28 w-full flex-wrap items-start gap-2 rounded-lg px-3 py-2`}
          >
            {clientAdmins.map((email) => (
              <span
                key={email}
                className={`${themeClasses.badge} inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs`}
              >
                <span>{email}</span>
                <button
                  type="button"
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] leading-none opacity-75 transition hover:opacity-100"
                  aria-label={`Remove ${email}`}
                  onClick={() => {
                    setClientAdmins((current) => current.filter((value) => value !== email));
                    if (submitted) {
                      setClientAdminError('');
                    }
                  }}
                >
                  ×
                </button>
              </span>
            ))}
            <input
              className="min-w-[14rem] flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-[var(--text-muted)]"
              value={clientAdminInput}
              onChange={(event) => {
                const nextValue = event.target.value;
                if (nextValue.includes(',')) {
                  commitPendingEmails(nextValue);
                } else {
                  setClientAdminInput(nextValue);
                  if (clientAdminError) {
                    setClientAdminError('');
                  }
                }
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  const finalized = finalizeEmailInput(clientAdminInput);
                  if (finalized.valid.length) {
                    addClientAdmins(finalized.valid);
                    setClientAdminInput('');
                    setClientAdminError('');
                  } else if (finalized.invalid.length) {
                    setClientAdminError(`Enter valid email addresses separated by commas. Invalid: ${finalized.invalid.join(', ')}`);
                  }
                } else if (event.key === 'Backspace' && !clientAdminInput && clientAdmins.length > 0) {
                  setClientAdmins((current) => current.slice(0, -1));
                }
              }}
              onBlur={() => {
                if (clientAdminInput.trim()) {
                  const finalized = finalizeEmailInput(clientAdminInput);
                  if (finalized.valid.length) {
                    addClientAdmins(finalized.valid);
                    setClientAdminInput('');
                    setClientAdminError('');
                  } else if (finalized.invalid.length) {
                    setClientAdminError(`Enter valid email addresses separated by commas. Invalid: ${finalized.invalid.join(', ')}`);
                  }
                }
              }}
              placeholder={clientAdmins.length === 0 ? 'nicol.bitetti@contoso.com, ops.client001@contoso.com' : 'Add another email...'}
            />
          </div>
          <div className={`${(clientAdminError || (submitted && validation.errors.clientAdmins)) ? themeClasses.fieldError : themeClasses.helperText} mt-1`}>
            {clientAdminError || (submitted && validation.errors.clientAdmins)
              ? validation.errors.clientAdmins
              : 'Enter valid email addresses separated by commas or press Enter to confirm each one.'}
          </div>
        </label>
      </section>

      <div className={`${themeClasses.formSection} sticky bottom-4 flex items-center justify-between rounded-3xl px-6 py-4`}>
        <div className={themeClasses.helperText}>
          Keep client identity, timezone, and ownership accurate so environments and schedules can reuse the same business context.
        </div>
        <div className="flex items-center gap-2">
          <button type="button" className={`${themeClasses.buttonSecondary} inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm`} onClick={onCancel}>
            <ArrowLeft className="h-4 w-4" />
            Cancel
          </button>
          <button
            type="button"
            className={`${themeClasses.buttonPrimary} inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm disabled:opacity-60`}
            onClick={() => void handleSubmit()}
            disabled={!canSave}
          >
            <Save className="h-4 w-4" />
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
