import { defineConfig } from "allure";

export default defineConfig({
  name: "Waveform Pytest Demo",
  output: "./allure-report",
  plugins: {
    awesome: {
      options: {
        reportName: "Waveform Pytest Demo",
        reportLanguage: "zh",
      },
    },
  },
});
