// src/mastra/workflows/code-transform-workflow.ts
import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

// Simple input schema for chat-based interactions
const Input = z.object({
  content: z.string().describe('Code content (can be pasted directly or from uploaded .txt/.doc/.pdf files)'),
  targetLanguage: z.string().describe('Target programming language (e.g., Python, JavaScript, Java, C++, etc.)'),
  sourceLanguage: z.string().optional().describe('Source programming language (will be auto-detected if not provided)'),
  mode: z.enum(['translate', 'modernize']).default('translate').describe('translate = convert to different language, modernize = update same language'),
  instructions: z.string().optional().describe('Additional specific instructions for the transformation'),
  fileName: z.string().optional().describe('Original filename if uploaded from a file'),
});

const Output = z.object({
  transformedCode: z.string().describe('The transformed code'),
  sourceLanguage: z.string().describe('Detected or specified source language'),
  targetLanguage: z.string().describe('Target language'),
  explanation: z.string().describe('Summary of changes made'),
  suggestedFileName: z.string().describe('Suggested filename for the transformed code'),
});

// Main transformation step - handles content analysis and transformation in one step
const transformStep = createStep({
  id: 'transform',
  inputSchema: Input,
  outputSchema: Output,
  execute: async ({ inputData, mastra }) => {
    if (!inputData) {
      throw new Error('Input data not found');
    }

    const agent = mastra?.getAgent('transformerAgent');
    if (!agent) throw new Error('transformerAgent not found');

    // Clean and prepare the content
    let codeContent = inputData.content.trim();
    
    // If content looks like it came from a document, try to extract code
    codeContent = extractCodeFromContent(codeContent);
    
    // Detect source language
    const detectedSourceLanguage = inputData.sourceLanguage || detectLanguageFromContent(codeContent, inputData.fileName);
    
    // Build the transformation prompt
    const userPrompt = `
TASK: ${inputData.mode.toUpperCase()} CODE TRANSFORMATION

SOURCE LANGUAGE: ${detectedSourceLanguage}
TARGET LANGUAGE: ${inputData.targetLanguage}
${inputData.instructions ? `SPECIAL INSTRUCTIONS: ${inputData.instructions}` : ''}
${inputData.fileName ? `ORIGINAL FILE: ${inputData.fileName}` : ''}

SOURCE CODE:
\`\`\`${detectedSourceLanguage.toLowerCase()}
${codeContent}
\`\`\`

Please transform this code according to the requirements. Provide:
1. The transformed code in a properly formatted code block
2. A brief explanation of the key changes made
3. Any important notes or considerations

Format your response as:
**Transformed Code:**
\`\`\`${inputData.targetLanguage.toLowerCase()}
[transformed code here]
\`\`\`

**Explanation:**
[explanation of changes made]
    `.trim();

    const stream = await agent.stream([{ role: 'user', content: userPrompt }]);

    let fullResponse = '';
    for await (const chunk of stream.textStream) {
      process.stdout.write(chunk);
      fullResponse += chunk;
    }

    // Extract the transformed code
    const codeMatch = fullResponse.match(/```[\w]*\s*\n([\s\S]*?)```/);
    const transformedCode = codeMatch ? codeMatch[1].trim() : 'Error: Could not extract transformed code';

    // Extract explanation
    const explanationMatch = fullResponse.match(/\*\*Explanation:\*\*\s*([\s\S]*?)(?=\n\*\*|$)/);
    const explanation = explanationMatch ? explanationMatch[1].trim() : fullResponse.split('```').pop()?.trim() || 'Transformation completed';

    // Generate suggested filename
    const extension = getExtensionForLanguage(inputData.targetLanguage);
    const baseName = inputData.fileName ? 
      inputData.fileName.replace(/\.[^.]*$/, '') : 
      'transformed_code';
    const suggestedFileName = `${baseName}${extension}`;

    return {
      transformedCode,
      sourceLanguage: detectedSourceLanguage,
      targetLanguage: inputData.targetLanguage,
      explanation,
      suggestedFileName,
    };
  },
});

// Helper function to extract code from various document formats
function extractCodeFromContent(content: string): string {
  // Remove common document artifacts
  let cleaned = content
    .replace(/^\s*Page \d+.*$/gm, '') // Remove page numbers
    .replace(/^\s*\d+\s*$/gm, '') // Remove standalone numbers
    .replace(/\f/g, '') // Remove form feeds
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\n{3,}/g, '\n\n'); // Reduce multiple newlines

  // If content looks like it has code patterns, extract them
  const codePatterns = [
    /```[\w]*\s*\n([\s\S]*?)```/g, // Markdown code blocks
    /(?:^|\n)(?:\s{4}|\t)(.*)/gm, // Indented code blocks
  ];

  for (const pattern of codePatterns) {
    const matches = Array.from(cleaned.matchAll(pattern));
    if (matches.length > 0) {
      return matches.map(match => match[1]).join('\n').trim();
    }
  }

  return cleaned.trim();
}

// Enhanced language detection
function detectLanguageFromContent(content: string, fileName?: string): string {
  // First try filename extension
  if (fileName) {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const extensionMap: Record<string, string> = {
      'py': 'Python', 'js': 'JavaScript', 'ts': 'TypeScript', 'java': 'Java',
      'cpp': 'C++', 'c': 'C', 'cs': 'C#', 'go': 'Go', 'rs': 'Rust',
      'php': 'PHP', 'rb': 'Ruby', 'swift': 'Swift', 'kt': 'Kotlin',
      'scala': 'Scala', 'pl': 'Perl', 'sh': 'Shell', 'ps1': 'PowerShell',
      'sql': 'SQL', 'r': 'R', 'm': 'MATLAB', 'html': 'HTML', 'css': 'CSS',
    };
    if (ext && extensionMap[ext]) {
      return extensionMap[ext];
    }
  }

  // Content-based detection
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
    { pattern: /SELECT\s+.*\s+FROM/i, language: 'SQL' },
    { pattern: /<html|<div|<span/i, language: 'HTML' },
    { pattern: /\{[^}]*color\s*:/, language: 'CSS' },
  ];

  for (const { pattern, language } of patterns) {
    if (pattern.test(content)) {
      return language;
    }
  }

  return 'Unknown';
}

// Helper function to get file extension for target language
function getExtensionForLanguage(language: string): string {
  const extensionMap: Record<string, string> = {
    'JavaScript': '.js', 'TypeScript': '.ts', 'Python': '.py', 'Java': '.java',
    'C++': '.cpp', 'C': '.c', 'C#': '.cs', 'Go': '.go', 'Rust': '.rs',
    'PHP': '.php', 'Ruby': '.rb', 'Swift': '.swift', 'Kotlin': '.kt',
    'Scala': '.scala', 'Perl': '.pl', 'Shell': '.sh', 'PowerShell': '.ps1',
    'SQL': '.sql', 'R': '.r', 'MATLAB': '.m', 'HTML': '.html', 'CSS': '.css',
  };
  return extensionMap[language] || '.txt';
}

export const codeTransformWorkflow = createWorkflow({
  id: 'code-transform-workflow',
  inputSchema: Input,
  outputSchema: Output,
})
  .then(transformStep);

codeTransformWorkflow.commit();
