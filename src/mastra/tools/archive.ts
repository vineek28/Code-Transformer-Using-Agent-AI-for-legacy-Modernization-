// src/mastra/tools/archive-tools.ts
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import AdmZip from 'adm-zip';
import * as path from 'path';
import * as fs from 'fs/promises';

//
// unzipTool: extract a zip into .mastra/output/run_<timestamp>/
// and return file list (with code if it's a text file)
//
export const unzipTool = createTool({
  id: 'unzip',
  description: 'Unzip an archive to a temp directory and return file list',
  inputSchema: z.object({
    zipPath: z.string().describe('Path to input zip file'),
  }),
  outputSchema: z.object({
    outDir: z.string(),
    files: z.array(
      z.object({
        path: z.string(),
        relPath: z.string(),
        ext: z.string(),
        code: z.string().nullable(),
      })
    ),
  }),
  execute: async ({ context }) => {
    const { zipPath } = context.inputData;
    const abs = path.resolve(process.cwd(), zipPath);
    const zip = new AdmZip(abs);

    const outDir = path.resolve(
      process.cwd(),
      `.mastra/output/run_${Date.now()}`
    );
    await fs.mkdir(outDir, { recursive: true });

    zip.extractAllTo(outDir, true);

    const results: Array<{
      path: string;
      relPath: string;
      ext: string;
      code: string | null;
    }> = [];

    async function walk(dir: string) {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const e of entries) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) {
          await walk(p);
        } else {
          const relPath = path.relative(outDir, p);
          const ext = path.extname(p).toLowerCase();
          // Read code-like files into memory
          const code = await fs.readFile(p, 'utf8').catch(() => null);
          results.push({ path: p, relPath, ext, code });
        }
      }
    }

    await walk(outDir);

    return { outDir, files: results };
  },
});

//
// writeFilesTool: write a list of code files to disk
//
export const writeFilesTool = createTool({
  id: 'write-files',
  description: 'Write a set of files into a target directory',
  inputSchema: z.object({
    outDir: z.string(),
    files: z.array(
      z.object({
        relPath: z.string(),
        code: z.string(),
      })
    ),
  }),
  outputSchema: z.object({
    outDir: z.string(),
  }),
  execute: async ({ context }) => {
    const { outDir, files } = context.inputData;
    for (const f of files) {
      const dest = path.join(outDir, f.relPath);
      await fs.mkdir(path.dirname(dest), { recursive: true });
      await fs.writeFile(dest, f.code, 'utf8');
    }
    return { outDir };
  },
});

//
// zipTool: zip a directory into .mastra/output/<zipName>
//
export const zipTool = createTool({
  id: 'zip-dir',
  description: 'Zip a directory and return the zip path',
  inputSchema: z.object({
    dir: z.string(),
    zipName: z.string().default(`transformed_${Date.now()}.zip`),
  }),
  outputSchema: z.object({
    zipPath: z.string(),
  }),
  execute: async ({ context }) => {
    const { dir, zipName } = context.inputData;
    const zip = new AdmZip();
    zip.addLocalFolder(dir);

    const out = path.resolve(process.cwd(), `.mastra/output/${zipName}`);
    zip.writeZip(out);

    return { zipPath: out };
  },
});
