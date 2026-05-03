import * as esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

async function build() {
  console.log('Building server...');
  try {
    await esbuild.build({
      entryPoints: ['server.ts'],
      bundle: true,
      platform: 'node',
      target: 'node20',
      outfile: 'build/server.cjs',
      format: 'cjs',
      // We keep these external because they either have binary components or are better as direct dependencies
      external: [
        'express', 
        'vite', 
        'cors', 
        'cookie-parser', 
        'dotenv', 
        '@google/genai', 
        'puppeteer', 
        'playwright'
      ],
      sourcemap: true,
      minify: false,
    });
    console.log('Server built successfully to build/server.cjs');
  } catch (error) {
    console.error('Server build failed:', error);
    process.exit(1);
  }
}

build();
