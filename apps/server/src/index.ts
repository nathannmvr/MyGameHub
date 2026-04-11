// src/index.ts
// Server entry point — uses createApp() factory for testability

import dotenv from 'dotenv';
import { createApp } from './app.js';

dotenv.config();

const app = createApp();
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Game Hub Server running on http://localhost:${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
  console.log(`📋 API v1: http://localhost:${PORT}/api/v1`);
});

export default app;
