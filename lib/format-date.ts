import { siteTimeZone } from "./site";

const publicationDateTimeFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: siteTimeZone,
});

export function formatPublicationDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return publicationDateTimeFormatter.format(date);
}
