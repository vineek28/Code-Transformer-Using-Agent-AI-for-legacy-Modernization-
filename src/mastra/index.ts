
// import { Mastra } from '@mastra/core/mastra';
// import { PinoLogger } from '@mastra/loggers';
// import { LibSQLStore } from '@mastra/libsql';
// import { weatherWorkflow } from './workflows/weather-workflow';
// import { weatherAgent } from './agents/weather-agent';

// export const mastra = new Mastra({
//   workflows: { weatherWorkflow },
//   agents: { weatherAgent },
//   storage: new LibSQLStore({
//     // stores telemetry, evals, ... into memory storage, if it needs to persist, change to file:../mastra.db
//     url: ":memory:",
//   }),
//   logger: new PinoLogger({
//     name: 'Mastra',
//     level: 'info',
//   }),
// });
// src/mastra/index.ts
import { Mastra } from '@mastra/core/mastra';
import { PinoLogger } from '@mastra/loggers';
import { LibSQLStore } from '@mastra/libsql';

import { transformerAgent } from './agents/code-transformer-agent';
import { codeTransformWorkflow } from './workflows/code-transform-workflow';

export const mastra = new Mastra({
  agents: {
    transformerAgent,
  },
  workflows: {
    codeTransformWorkflow,
  },
  storage: new LibSQLStore({
    // Persist telemetry/evals so runs show up across sessions
    url: 'file:../mastra.db',
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
});
