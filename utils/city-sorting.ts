import { SelectedCity } from '@/contexts/selected-cities-context';
import { CityOrderMode } from '@/contexts/notifications-sort-context';

type GetCitySortLabel = (city: SelectedCity) => string;

function getTimezoneOffsetMinutes(timezone: string) {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const getPart = (type: string) => parseInt(parts.find((part) => part.type === type)?.value || '0', 10);
  const cityAsUtc = Date.UTC(
    getPart('year'),
    getPart('month') - 1,
    getPart('day'),
    getPart('hour'),
    getPart('minute'),
    getPart('second')
  );

  return Math.round((cityAsUtc - now.getTime()) / 60000);
}

export function sortCitiesByOrder(
  cities: SelectedCity[],
  cityOrder: CityOrderMode,
  locale: string,
  getCitySortLabel: GetCitySortLabel = (city) => city.customName || city.name
) {
  if (cityOrder === 'none') {
    return cities;
  }

  return cities.slice().sort((a, b) => {
    if (cityOrder === 'name-asc' || cityOrder === 'name-desc') {
      const direction = cityOrder === 'name-asc' ? 1 : -1;
      const aName = getCitySortLabel(a);
      const bName = getCitySortLabel(b);
      const byName = aName.localeCompare(bName, locale, { sensitivity: 'base' });

      if (byName !== 0) {
        return byName * direction;
      }

      return a.name.localeCompare(b.name, locale, { sensitivity: 'base' }) * direction;
    }

    const direction = cityOrder === 'timezone-asc' ? 1 : -1;
    const aOffset = getTimezoneOffsetMinutes(a.tz);
    const bOffset = getTimezoneOffsetMinutes(b.tz);

    if (aOffset !== bOffset) {
      return (aOffset - bOffset) * direction;
    }

    const byTimezone = a.tz.localeCompare(b.tz, locale, { sensitivity: 'base' });

    if (byTimezone !== 0) {
      return byTimezone * direction;
    }

    const aName = getCitySortLabel(a);
    const bName = getCitySortLabel(b);

    return aName.localeCompare(bName, locale, { sensitivity: 'base' }) * direction;
  });
}
