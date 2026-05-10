/**
 * Fetch weather data from WeatherAPI using user's geolocation
 * Also saves Sanghar data in background via Google Sheet
 */

export interface WeatherData {
  temperature: number | null;
  humidity: number | null;
  rainChance: number | null;
  condition: string;
  location: string;
  timestamp: string | null;
}

export interface LocationData {
  latitude: number;
  longitude: number;
}

// Get user's current location
export const getUserLocation = (): Promise<LocationData> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        reject(new Error(`Geolocation error: ${error.message}`));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
    );
  });
};

// Fetch live weather data from WeatherAPI
export const fetchLiveWeatherData = async (location: LocationData): Promise<WeatherData> => {
  try {
    const apiKey = import.meta.env.VITE_WEATHERAPI_KEY || "6f99af4080c1401582b145659260905";
    const url = `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${location.latitude},${location.longitude}&days=1`;

    console.log("Fetching weather for coordinates:", location.latitude, location.longitude);
    console.log("API URL:", url);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`Weather API error: ${response.status}`);

    const data = await response.json();
    console.log("Weather API response:", data);
    console.log("Current City:", data.location?.name);

    return {
      temperature: data.current?.temp_c ?? null,
      humidity: data.current?.humidity ?? null,
      rainChance: data.forecast?.forecastday?.[0]?.day?.daily_chance_of_rain ?? 0,
      condition: data.current?.condition?.text ?? "",
      location: data.location?.name ? `${data.location.name}, ${data.location.country}` : "Sanghar",
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error fetching live weather data:", error);
    return {
      temperature: null,
      humidity: null,
      rainChance: null,
      condition: "",
      location: "Sanghar",
      timestamp: null,
    };
  }
};

// Fetch weather data with geolocation and WeatherAPI
export const fetchWeatherData = async (): Promise<WeatherData> => {
  try {
    const location = await getUserLocation();
    const weatherData = await fetchLiveWeatherData(location);

    fetchSangharDataInBackground();
    return weatherData;
  } catch (error) {
    console.error("Error in fetchWeatherData:", error);
    return await fetchSangharData();
  }
};

// Fetch Sanghar data from Google Sheet (for background saving)
const fetchSangharData = async (): Promise<WeatherData> => {
  try {
    const csvUrl =
      "https://docs.google.com/spreadsheets/d/1wqj_RynZs505hTopq2BsIBgZ_FGzWMh0sm_vTvgTTdI/export?format=csv";

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(csvUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) throw new Error("Failed to fetch CSV");

    const csvText = await response.text();
    const lines = csvText.trim().split("\n");

    if (lines.length < 2) {
      return { temperature: null, humidity: null, rainChance: null, condition: "", location: "Sanghar", timestamp: null };
    }

    // Parse header row
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const tempIndex = headers.findIndex(
      (h) =>
        h.includes("temp") ||
        h.includes("temperature") ||
        h === "temp(°c)" ||
        h === "temperature(°c)"
    );
    const humidityIndex = headers.findIndex(
      (h) =>
        h.includes("humidity") ||
        h === "humidity(%)" ||
        h === "rh(%)"
    );
    const rainChanceIndex = headers.findIndex(
      (h) =>
        h.includes("rain_chance") ||
        h.includes("rain chance") ||
        h.includes("rain")
    );
    const conditionIndex = headers.findIndex(
      (h) =>
        h.includes("condition") ||
        h.includes("weather") ||
        h.includes("forecast")
    );

    // Get the last row (most recent data)
    const lastRow = lines[lines.length - 1].split(",").map((v) => v.trim());

    const temperature =
      tempIndex >= 0 && lastRow[tempIndex]
        ? parseFloat(lastRow[tempIndex])
        : null;
    const humidity =
      humidityIndex >= 0 && lastRow[humidityIndex]
        ? parseFloat(lastRow[humidityIndex])
        : null;
    const rainChance =
      rainChanceIndex >= 0 && lastRow[rainChanceIndex]
        ? parseFloat(lastRow[rainChanceIndex])
        : null;
    const condition =
      conditionIndex >= 0 && lastRow[conditionIndex]
        ? lastRow[conditionIndex]
        : "";

    return {
      temperature: !isNaN(temperature || 0) ? temperature : null,
      humidity: !isNaN(humidity || 0) ? humidity : null,
      rainChance: !isNaN(rainChance || 0) ? rainChance : null,
      condition,
      location: "Sanghar",
      timestamp: null,
    };
  } catch (error) {
    console.error("Error fetching Sanghar data:", error);
    return { temperature: null, humidity: null, rainChance: null, condition: "", location: "Sanghar", timestamp: null };
  }
};

// Background function to fetch Sanghar data (for n8n saving)
const fetchSangharDataInBackground = async () => {
  try {
    await fetchSangharData();
    // This data can be used by n8n for background saving
  } catch (error) {
    console.error("Background Sanghar data fetch failed:", error);
  }
};
