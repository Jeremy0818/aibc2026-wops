const idrCurrencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
  minimumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

export function formatIdr(amountIdr?: number | null): string {
  if (amountIdr === undefined || amountIdr === null) {
    return "TBD (from brief)";
  }
  if (!Number.isFinite(amountIdr)) {
    return "Rp0";
  }
  return `Rp${numberFormatter.format(Math.trunc(amountIdr))}`;
}

export function formatIdrLocale(amountIdr?: number | null): string {
  if (amountIdr === undefined || amountIdr === null) {
    return "TBD";
  }
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

export function formatFileSize(bytes?: number): string {
  if (typeof bytes !== "number" || !Number.isFinite(bytes) || bytes < 0) {
    return "PDF document";
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${Math.round(kb)} KB`;
  }
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

export function formatCallDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const remainingSecs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${remainingSecs.toString().padStart(2, "0")}`;
}

