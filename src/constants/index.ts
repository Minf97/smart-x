export const LOCAL_STORAGE_KEYS = {
  AUTH_SESSION: "smart-x.auth-session",
  ONBOARDING_COMPLETE: "smart-x.onboarding-complete",
  LANGUAGE: "lang",
  THEME: "theme",
};

export const IPC_CHANNELS = {
  START_ORPC_SERVER: "start-orpc-server",
};

export const ENVIRONMENT_VARIABLES = {
  NODE_ENV: import.meta.env.MODE,
};

export const inDevelopment = ENVIRONMENT_VARIABLES.NODE_ENV === "development";
