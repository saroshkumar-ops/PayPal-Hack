import axios from 'axios';
import type { AxiosInstance, AxiosError } from 'axios';

const JAVA_BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';
const AI_MICROSERVICE_URL = import.meta.env.VITE_AI_URL || 'http://localhost:8001';

/**
 * Axios client instance for Java Core Backend (Port 8080)
 * Handles DB, ledger math, PayPal orders & payouts
 */
export const backendClient: AxiosInstance = axios.create({
  baseURL: JAVA_BACKEND_URL,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

/**
 * Axios client instance for Python AI Microservice (Port 8001)
 * Handles Gemini Vision OCR, Roast Generator, and tool-calling
 */
export const aiClient: AxiosInstance = axios.create({
  baseURL: AI_MICROSERVICE_URL,
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Interceptor for logging & connection diagnosis
backendClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Graceful log without unhandled rejection
    if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') {
      console.info(
        `[Backend API] Backend at ${JAVA_BACKEND_URL} is currently offline. Operating in autonomous mock mode.`
      );
    }
    return Promise.reject(error);
  }
);
