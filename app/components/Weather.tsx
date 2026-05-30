import type { ReactNode } from "react";

const TOKYO_LATITUDE = 35.6762;
const TOKYO_LONGITUDE = 139.6503;
const TOKYO_TIMEZONE = "Asia/Tokyo";

type WeatherResponse = {
  current?: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    is_day: number;
    weather_code: number;
  };
  daily?: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    weather_code: number[];
  };
};

type WeatherDescriptor = {
  label: string;
  icon: ReactNode;
};

function getWeatherDescriptor(code: number, isDay: boolean): WeatherDescriptor {
  if (code === 0) {
    return {
      label: "Clear",
      icon: isDay ? (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
          <circle cx="12" cy="12" r="4.5" fill="currentColor" />
          <path
            d="M12 2.75v2.5M12 18.75v2.5M21.25 12h-2.5M5.25 12h-2.5M18.54 5.46l-1.77 1.77M7.23 16.77l-1.77 1.77M18.54 18.54l-1.77-1.77M7.23 7.23L5.46 5.46"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.7"
          />
        </svg>
      ) : (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
          <path
            d="M15.5 4.5a6.8 6.8 0 1 0 4 12.3 7.4 7.4 0 1 1-4-12.3Z"
            fill="currentColor"
          />
        </svg>
      ),
    };
  }

  if ([1, 2, 3].includes(code)) {
    return {
      label: "Clouds",
      icon: (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
          <path
            d="M7.5 18.25h8.75a4 4 0 0 0 .22-7.99A5.5 5.5 0 0 0 6 8.56a3.75 3.75 0 0 0 1.5 9.69Z"
            fill="currentColor"
          />
        </svg>
      ),
    };
  }

  if ([45, 48].includes(code)) {
    return {
      label: "Fog",
      icon: (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
          <path
            d="M5 9.5h14M3.75 13h16.5M6 16.5h12"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.8"
          />
        </svg>
      ),
    };
  }

  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    return {
      label: "Rain",
      icon: (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
          <path
            d="M7.5 14.25h8.75a4 4 0 0 0 .22-7.99A5.5 5.5 0 0 0 6 4.56a3.75 3.75 0 0 0 1.5 9.69Z"
            fill="currentColor"
          />
          <path
            d="M9 16.75l-1 3M13 16.75l-1 3M17 16.75l-1 3"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.7"
          />
        </svg>
      ),
    };
  }

  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return {
      label: "Snow",
      icon: (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
          <path
            d="M12 4.5v15M6.75 7.5l10.5 9M17.25 7.5l-10.5 9M5 12h14"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="1.6"
          />
        </svg>
      ),
    };
  }

  if ([95, 96, 99].includes(code)) {
    return {
      label: "Storm",
      icon: (
        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
          <path
            d="M7.5 13.75h8.75a4 4 0 0 0 .22-7.99A5.5 5.5 0 0 0 6 4.06a3.75 3.75 0 0 0 1.5 9.69Z"
            fill="currentColor"
          />
          <path
            d="m12.5 14.5-2 4h2.25l-1.25 3 4-5h-2.5l1.5-2Z"
            fill="currentColor"
          />
        </svg>
      ),
    };
  }

  return {
    label: "Weather",
    icon: (
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  };
}

async function getTokyoWeather() {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${TOKYO_LATITUDE}` +
    `&longitude=${TOKYO_LONGITUDE}` +
    `&timezone=${encodeURIComponent(TOKYO_TIMEZONE)}` +
    `&current=temperature_2m,apparent_temperature,is_day,weather_code` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
    `&forecast_days=3`;

  const response = await fetch(url, {
    next: {
      revalidate: 1800,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch Tokyo weather");
  }

  return (await response.json()) as WeatherResponse;
}

type WeatherProps = {
  className?: string;
  variant?: "compact" | "default";
};

export default async function Weather({
  className,
  variant = "default",
}: WeatherProps) {
  let data: WeatherResponse | null = null;

  try {
    data = await getTokyoWeather();
  } catch {
    data = null;
  }

  const current = data?.current;
  const daily = data?.daily;

  if (!current || !daily) {
    if (variant === "compact") {
      return (
        <div
          className={`min-w-0 rounded-xl border border-[#d6d1c8] bg-[#fffdf8] px-2 py-1.5 text-center shadow-[0_8px_20px_rgba(17,17,17,0.05)] ${
            className ?? ""
          }`}
        >
          <p className="truncate text-[0.56rem] font-black uppercase tracking-[0.12em] text-[#7a746b]">
            Tokyo
          </p>
          <p className="mt-0.5 truncate text-[0.66rem] font-semibold leading-tight text-[#111111]">
            Sin datos
          </p>
        </div>
      );
    }

    return (
      <div
        className={`w-full rounded-2xl border border-[#d6d1c8] bg-[#fffdf8] px-3 py-2 text-right shadow-[0_10px_26px_rgba(17,17,17,0.05)] md:h-[82px] md:w-[350px] ${
          className ?? ""
        }`}
      >
        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-[#7a746b]">
          Tokyo weather
        </p>

        <p className="mt-1 text-sm font-semibold text-[#111111]">
          Forecast unavailable
        </p>
      </div>
    );
  }

  const upcomingDays = daily.time.slice(1, 3).map((time, index) => ({
    time,
    label: index === 0 ? "明日" : "明後日",
    weatherCode: daily.weather_code[index + 1] ?? 0,
    max: Math.round(daily.temperature_2m_max[index + 1] ?? 0),
    min: Math.round(daily.temperature_2m_min[index + 1] ?? 0),
  }));

  const descriptor = getWeatherDescriptor(
    current.weather_code,
    current.is_day === 1,
  );

  if (variant === "compact") {
    return (
      <div
        className={`min-w-0 rounded-xl border border-[#d6d1c8] bg-[#fffdf8] px-2 py-1.5 text-center shadow-[0_8px_20px_rgba(17,17,17,0.05)] ${
          className ?? ""
        }`}
      >
        <p className="truncate text-[0.56rem] font-black uppercase tracking-[0.12em] text-[#7a746b]">
          Tokyo
        </p>
        <div className="mt-0.5 flex items-center justify-center gap-1.5 text-[#111111]">
          <span className="shrink-0 [&_svg]:h-3.5 [&_svg]:w-3.5">
            {descriptor.icon}
          </span>
          <span className="truncate text-[0.8rem] font-black leading-none">
            {Math.round(current.temperature_2m)}°C
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`w-full rounded-2xl border border-[#d6d1c8] bg-[#fffdf8] px-3 py-2 text-right shadow-[0_10px_26px_rgba(17,17,17,0.05)] md:h-[82px] md:w-[350px] ${
        className ?? ""
      }`}
    >
      <div className="flex items-center gap-2 md:gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ece8df] text-[#111111]">
          {descriptor.icon}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.2em] text-[#7a746b]">
            Tokyo now
          </p>

          <div className="mt-1 flex items-baseline justify-end gap-2">
            <p className="text-sm font-semibold text-[#111111]">
              {Math.round(current.temperature_2m)}°C
            </p>

            <p className="truncate text-xs text-[#5f5952]">
              {descriptor.label}
            </p>
          </div>

          <p className="mt-1 text-[0.68rem] text-[#7a746b]">
            Feels like {Math.round(current.apparent_temperature)}°C
          </p>
        </div>

        {upcomingDays.length > 0 && (
          <div className="hidden shrink-0 items-center gap-2 md:flex">
            {upcomingDays.map((entry) => {
              const dayDescriptor = getWeatherDescriptor(entry.weatherCode, true);

              return (
                <div
                  key={entry.time}
                  className="flex min-w-[78px] flex-col rounded-xl bg-[#f3eee5] px-2 py-1.5 text-left"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[0.7rem] font-semibold tracking-[0.04em] text-[#7a746b]">
                      {entry.label}
                    </p>

                    <div className="shrink-0 text-[#111111]">{dayDescriptor.icon}</div>
                  </div>

                  <p className="mt-0.5 text-[0.72rem] font-semibold text-[#111111]">
                    {entry.max}° / {entry.min}°
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
