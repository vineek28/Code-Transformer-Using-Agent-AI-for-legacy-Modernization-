// src/mastra/workflows/simple-code-transform.ts
import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

const SimpleInput = z.object({
  code: z.string().describe('Paste your code here'),
  targetLanguage: z.string().describe('What language do you want to convert to? (e.g., Python, JavaScript, Java, etc.)'),
  instructions: z.string().optional().describe('Any specific instructions? (optional)'),
});

const SimpleOutput = z.object({
  transformedCode: z.string(),
  explanation: z.string(),
  filename: z.string(),
});

const simpleTransformStep = createStep({
  id: 'simple-transform',
  inputSchema: SimpleInput,
  outputSchema: SimpleOutput,
  execute: async ({ inputData, mastra }) => {
    if (!inputData) {
      throw new Error('Input data not found');
    }

    const agent = mastra?.getAgent('transformerAgent');
    if (!agent) throw new Error('transformerAgent not found');

    // Detect source language from content
    const sourceLanguage = detectLanguageFromContent(inputData.code);
    
    const userPrompt = `
Please transform the following code to ${inputData.targetLanguage}.

SOURCE CODE:
\`\`\`${sourceLanguage.toLowerCase()}
${inputData.code}
\`\`\`

TARGET LANGUAGE: ${inputData.targetLanguage}
${inputData.instructions ? `SPECIAL INSTRUCTIONS: ${inputData.instructions}` : ''}

Please:
1. Convert the code to ${inputData.targetLanguage}
2. Follow ${inputData.targetLanguage} best practices and conventions
3. Maintain the same functionality
4. Provide a brief explanation of key changes made

Format your response as:
**Transformed Code:**
\`\`\`${inputData.targetLanguage.toLowerCase()}
[your transformed code here]
\`\`\`

**Explanation:**
[Brief explanation of changes made]
    `.trim();

    const stream = await agent.stream([{ role: 'user', content: userPrompt }]);

    let fullResponse = '';
    for await (const chunk of stream.textStream) {
      process.stdout.write(chunk);
      fullResponse += chunk;
    }

    // Extract code block
    const codeMatch = fullResponse.match(/```[\w]*\s*\n([\s\S]*?)```/);
    const transformedCode = codeMatch ? codeMatch[1].trim() : 'Error: Could not extract transformed code';

    // Extract explanation
    const explanationMatch = fullResponse.match(/\*\*Explanation:\*\*\s*([\s\S]*?)(?=\n\*\*|$)/);
    const explanation = explanationMatch ? explanationMatch[1].trim() : fullResponse;

    // Generate appropriate filename
    const extension = getExtensionForLanguage(inputData.targetLanguage);
    const filename = `transformed_code${extension}`;

    return {
      transformedCode,
      explanation,
      filename,
    };
  },
});

// Helper functions
function detectLanguageFromContent(content: string): string {
  const patterns = [
    { pattern: /def\s+\w+\s*\(.*\)\s*:/, language: 'Python' },
    { pattern: /function\s+\w+\s*\(.*\)\s*{/, language: 'JavaScript' },
    { pattern: /public\s+class\s+\w+/, language: 'Java' },
    { pattern: /#include\s*<.*>/, language: 'C++' },
    { pattern: /using\s+System;/, language: 'C#' },
    { pattern: /func\s+\w+\s*\(.*\)/, language: 'Go' },
    { pattern: /fn\s+\w+\s*\(.*\)/, language: 'Rust' },
    { pattern: /<\?php/, language: 'PHP' },
    { pattern: /def\s+\w+/, language: 'Ruby' },
    { pattern: /sub\s+\w+\s*{/, language: 'Perl' },
    { pattern: /console\.log/, language: 'JavaScript' },
    { pattern: /print\s*\(/, language: 'Python' },
    { pattern: /System\.out\.println/, language: 'Java' },
    { pattern: /cout\s*<</, language: 'C++' },
  ];

  for (const { pattern, language } of patterns) {
    if (pattern.test(content)) {
      return language;
    }
  }

  return 'Unknown';
}

function getExtensionForLanguage(language: string): string {
  const extensionMap: Record<string, string> = {
    'JavaScript': '.js',
    'TypeScript': '.ts',
    'Python': '.py',
    'Java': '.java',
    'C++': '.cpp',
    'C': '.c',
    'C#': '.cs',
    'Go': '.go',
    'Rust': '.rs',
    'PHP': '.php',
    'Ruby': '.rb',
    'Swift': '.swift',
    'Kotlin': '.kt',
    'Scala': '.scala',
    'Perl': '.pl',
    'Shell': '.sh',
    'PowerShell': '.ps1',
    'SQL': '.sql',
    'R': '.r',
    'MATLAB': '.m',
  };
  return extensionMap[language] || '.txt';
}

export const simpleCodeTransformWorkflow = createWorkflow({
  id: 'simple-code-transform',
  inputSchema: SimpleInput,
  outputSchema: SimpleOutput,
})
  .then(simpleTransformStep);

simpleCodeTransformWorkflow.commit();
