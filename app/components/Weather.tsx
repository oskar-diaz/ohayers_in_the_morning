"use client";

import { useEffect, useState } from "react";

export default function Weather() {
  const [weather, setWeather] = useState("");

  useEffect(() => {
    async function loadWeather() {
      try {
        // Get approximate location from browser
        const position = await new Promise<GeolocationPosition>(
          (resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject),
        );

        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        // Fetch weather
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m`,
        );

        const data = await res.json();

        const temp = Math.round(data.current.temperature_2m);

        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        const city = timezone.split("/").pop()?.replace("_", " ");

        setWeather(`${city} ${temp}°C`);
      } catch {
        setWeather("Tokyo 18°C");
      }
    }

    loadWeather();
  }, []);

  return <p>{weather}</p>;
}
