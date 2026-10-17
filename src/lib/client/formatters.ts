const idrCurrencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

export function formatIdr(amountIdr: number): string {
  if (!Number.isFinite(amountIdr)) {
    return "Rp0";
  }
  return `Rp${numberFormatter.format(Math.trunc(amountIdr))}`;
}

export function formatIdrLocale(amountIdr: number): string {
  if (!Number.isFinite(amountIdr)) {
    return "Rp 0";
  }
  return idrCurrencyFormatter.format(Math.trunc(amountIdr));
}

export function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return isoString;
  }
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatShortDate(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    return isoString;
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
