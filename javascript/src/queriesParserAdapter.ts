/**
 * Adapter wrapper around Peggy-generated queries parser
 * Provides TypeScript interfaces and high-level API
 */

import { parse, SyntaxError } from './queriesParser.js';
import * as fs from 'fs';

export interface Query {
  key: string;
  expected: string;
}

export interface QueryBlock {
  comments: string[];
  context: Record<string, string | string[]>;
  queries: Query[];
}

export class QueriesParserAdapter {
  static parse(content: string): QueryBlock[] {
    const blocks: QueryBlock[] = [];
    const lines = content.split('\n');
    let i = 0;

    while (i < lines.length) {
      // Skip blank lines
      while (i < lines.length && lines[i].trim() === '') {
        i++;
      }

      if (i >= lines.length) break;

      // Parse comments
      const comments: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('#')) {
        comments.push(lines[i].substring(1).trim());
        i++;
      }

      // Skip blank lines after comments
      while (i < lines.length && lines[i].trim() === '') {
        i++;
      }

      if (i >= lines.length) break;

      // Parse context
      const context: Record<string, string | string[]> = {};
      while (i < lines.length && lines[i].trim().startsWith('-')) {
        const line = lines[i].substring(1).trim();
        const [key, ...valueParts] = line.split(':');
        const value = valueParts.join(':').trim();

        if (key && value) {
          if (key in context) {
            if (!Array.isArray(context[key])) {
              context[key] = [context[key] as string];
            }
            (context[key] as string[]).push(value);
          } else {
            context[key] = value;
          }
        }
        i++;
      }

      // Skip blank lines before queries
      while (i < lines.length && lines[i].trim() === '') {
        i++;
      }

      // Parse queries
      const queries: Query[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>>>')) {
        const key = lines[i].substring(3).trim();
        i++;

        // Skip blank lines
        while (i < lines.length && lines[i].trim() === '') {
          i++;
        }

        if (i < lines.length && !lines[i].trim().startsWith('#') && !lines[i].trim().startsWith('-') && !lines[i].trim().startsWith('>>>')) {
          const expected = lines[i].trim();
          queries.push({ key, expected });
          i++;
        }
      }

      if (context || queries.length > 0) {
        blocks.push({ comments, context, queries });
      }
    }

    return blocks;
  }
}

export async function loadQueriesFile(filePath: string): Promise<QueryBlock[]> {
  const content = await fs.promises.readFile(filePath, 'utf-8');
  return QueriesParserAdapter.parse(content);
}
