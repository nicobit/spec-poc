export type SchedulePattern = 'daily' | 'weekdays' | 'selected-days';

export type DayOfWeek = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export type ScheduleBuilderState = {
  pattern: SchedulePattern;
  daysOfWeek: DayOfWeek[];
  time: string;
};

const DAY_LABELS: Record<DayOfWeek, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
};

const DAY_TO_CRON: Record<DayOfWeek, number> = {
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
  sun: 0,
};

const CRON_TO_DAY: Record<string, DayOfWeek> = {
  '0': 'sun',
  '1': 'mon',
  '2': 'tue',
  '3': 'wed',
  '4': 'thu',
  '5': 'fri',
  '6': 'sat',
  '7': 'sun',
};

export const DEFAULT_SCHEDULE_BUILDER: ScheduleBuilderState = {
  pattern: 'weekdays',
  daysOfWeek: ['mon', 'tue', 'wed', 'thu', 'fri'],
  time: '08:00',
};

export function getDayLabel(day: DayOfWeek) {
  return DAY_LABELS[day];
}

function normalizeSelectedDays(days: DayOfWeek[]) {
  const uniqueDays = Array.from(new Set(days));
  const orderedDays = (Object.keys(DAY_TO_CRON) as DayOfWeek[]).filter((day) => uniqueDays.includes(day));
  return orderedDays;
}

export function cronFromBuilder(state: ScheduleBuilderState) {
  const [hours, minutes] = state.time.split(':');
  const hourNumber = Number(hours);
  const minuteNumber = Number(minutes);

  if (!Number.isInteger(hourNumber) || hourNumber < 0 || hourNumber > 23) {
    return null;
  }
  if (!Number.isInteger(minuteNumber) || minuteNumber < 0 || minuteNumber > 59) {
    return null;
  }

  switch (state.pattern) {
    case 'daily':
      return `${minuteNumber} ${hourNumber} * * *`;
    case 'weekdays':
      return `${minuteNumber} ${hourNumber} * * 1-5`;
    case 'selected-days': {
      const days = normalizeSelectedDays(state.daysOfWeek);
      if (days.length === 0) return null;
      return `${minuteNumber} ${hourNumber} * * ${days.map((day) => DAY_TO_CRON[day]).join(',')}`;
    }
    default:
      return null;
  }
}

export function parseCronToBuilder(cron?: string | null): ScheduleBuilderState | null {
  if (!cron) return null;
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return null;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  if (dayOfMonth !== '*' || month !== '*') return null;
  if (!/^\d+$/.test(minute) || !/^\d+$/.test(hour)) return null;

  const minuteNumber = Number(minute);
  const hourNumber = Number(hour);
  if (!Number.isInteger(minuteNumber) || minuteNumber < 0 || minuteNumber > 59) return null;
  if (!Number.isInteger(hourNumber) || hourNumber < 0 || hourNumber > 23) return null;

  const time = `${String(hourNumber).padStart(2, '0')}:${String(minuteNumber).padStart(2, '0')}`;

  if (dayOfWeek === '*') {
    return { pattern: 'daily', daysOfWeek: [], time };
  }

  if (dayOfWeek === '1-5') {
    return { pattern: 'weekdays', daysOfWeek: ['mon', 'tue', 'wed', 'thu', 'fri'], time };
  }

  if (/^[0-7](,[0-7])*$/.test(dayOfWeek)) {
    const parsedDays = dayOfWeek
      .split(',')
      .map((entry) => CRON_TO_DAY[entry])
      .filter(Boolean) as DayOfWeek[];
    const normalizedDays = normalizeSelectedDays(parsedDays);
    if (normalizedDays.length === 0) return null;
    return { pattern: 'selected-days', daysOfWeek: normalizedDays, time };
  }

  return null;
}

function describeDayPattern(state: ScheduleBuilderState) {
  switch (state.pattern) {
    case 'daily':
      return 'every day';
    case 'weekdays':
      return 'weekdays';
    case 'selected-days':
      return normalizeSelectedDays(state.daysOfWeek).map(getDayLabel).join(', ');
    default:
      return 'custom schedule';
  }
}

export function describeSchedule(action?: string | null, cron?: string | null, timezone?: string | null) {
  const builder = parseCronToBuilder(cron);
  const actionLabel = action ? `${action.charAt(0).toUpperCase()}${action.slice(1)}` : 'Run';
  const timezoneLabel = timezone || 'UTC';

  if (!builder) {
    return cron ? `${actionLabel} on advanced schedule (${cron}) ${timezoneLabel}` : `${actionLabel} on advanced schedule`;
  }

  return `${actionLabel} ${describeDayPattern(builder)} at ${builder.time} ${timezoneLabel}`;
}
