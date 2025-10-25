export const configs = {
  nodeEnv: process.env.NODE_ENV!,
  corsOrigins: (process.env.CORS_ORIGINS || "").split(","),
};
