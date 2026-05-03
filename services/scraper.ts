import puppeteer from 'puppeteer';
import { chromium } from 'playwright';

export interface ScrapeResult {
  url: string;
  title: string;
  content: string;
  html: string;
  screenshot?: string; // Base64
  metadata: Record<string, any>;
  engine: 'puppeteer' | 'playwright';
}

export interface ScrapeOptions {
  engine?: 'puppeteer' | 'playwright';
  screenshot?: boolean;
  waitForSelector?: string;
  timeout?: number;
  retries?: number;
}

export class ScraperService {
  private static instance: ScraperService;

  private constructor() {}

  public static getInstance(): ScraperService {
    if (!ScraperService.instance) {
      ScraperService.instance = new ScraperService();
    }
    return ScraperService.instance;
  }

  /**
   * Scrapes a website using the specified engine with fallback and retries.
   */
  public async scrape(url: string, options: ScrapeOptions = {}): Promise<ScrapeResult> {
    const {
      engine = 'puppeteer',
      retries = 2,
      timeout = 30000,
    } = options;

    let lastError: Error | null = null;
    let currentEngine = engine;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        console.log(`[Scraper] Attempt ${attempt + 1} using ${currentEngine} for ${url}`);
        if (currentEngine === 'puppeteer') {
          return await this.scrapeWithPuppeteer(url, options);
        } else {
          return await this.scrapeWithPlaywright(url, options);
        }
      } catch (error: any) {
        lastError = error;
        console.error(`[Scraper] ${currentEngine} failed: ${error.message}`);
        
        // On failure, switch engine for the next attempt if possible
        if (attempt < retries) {
          currentEngine = currentEngine === 'puppeteer' ? 'playwright' : 'puppeteer';
          // Wait a bit before retry
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    throw new Error(`Scraping failed after ${retries + 1} attempts. Last error: ${lastError?.message}`);
  }

  private async scrapeWithPuppeteer(url: string, options: ScrapeOptions): Promise<ScrapeResult> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    try {
      const page = await browser.newPage();
      await page.setDefaultNavigationTimeout(options.timeout || 30000);
      
      await page.goto(url, { waitUntil: 'networkidle2' });

      if (options.waitForSelector) {
        await page.waitForSelector(options.waitForSelector, { timeout: 10000 });
      }

      const title = await page.title();
      const content = await page.evaluate(() => document.body.innerText);
      const html = await page.content();
      
      let screenshot: string | undefined;
      if (options.screenshot) {
        screenshot = await page.screenshot({ encoding: 'base64' }) as string;
      }

      return {
        url,
        title,
        content,
        html,
        screenshot,
        metadata: {},
        engine: 'puppeteer',
      };
    } finally {
      await browser.close();
    }
  }

  private async scrapeWithPlaywright(url: string, options: ScrapeOptions): Promise<ScrapeResult> {
    const browser = await chromium.launch({
      headless: true,
    });

    try {
      const context = await browser.newContext();
      const page = await context.newPage();
      
      await page.goto(url, { waitUntil: 'networkidle', timeout: options.timeout || 30000 });

      if (options.waitForSelector) {
        await page.waitForSelector(options.waitForSelector, { timeout: 10000 });
      }

      const title = await page.title();
      const content = await page.evaluate(() => document.body.innerText);
      const html = await page.content();
      
      let screenshot: string | undefined;
      if (options.screenshot) {
        const buffer = await page.screenshot();
        screenshot = buffer.toString('base64');
      }

      return {
        url,
        title,
        content,
        html,
        screenshot,
        metadata: {},
        engine: 'playwright',
      };
    } finally {
      await browser.close();
    }
  }

  /**
   * Specialized method for social pages (e.g. Meta Ad Library)
   */
  public async scrapeSocialPage(url: string, platform: 'meta' | 'tiktok' | 'google'): Promise<any> {
    // This would contain more specific logic for each platform
    // For now, it uses the generic scrape method
    return this.scrape(url, {
      waitForSelector: platform === 'meta' ? 'div[role="main"]' : undefined,
      screenshot: true,
    });
  }
}
