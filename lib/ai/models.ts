import { google } from "@ai-sdk/google"
import type { LanguageModel } from "ai"

export const geminiFlash: LanguageModel = google("gemini-2.0-flash")
export const geminiPro: LanguageModel = google("gemini-1.5-pro")
