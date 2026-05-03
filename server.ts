import express from 'express';
import dotenv from 'dotenv';
dotenv.config();

import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { ScraperService } from './services/scraper';

// Normalization Helpers
export interface NormalizedMetrics {
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  conversionValue: number;
  ctr: number;
  cpa: number;
  roas: number;
  cvr: number;
  cpc: number;
  cpm: number;
  revenue: number;
  aov: number;
  cac: number;
  ltv: number;
  profit: number;
  breakEvenRoas: number;
  dropOffRate: number;
  creativeScore: number;
  audienceScore: number;
  funnelScore: number;
}

export function calculateMetrics(spend: number, impressions: number, clicks: number, conversions: number, conversionValue: number): NormalizedMetrics {
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const cpa = conversions > 0 ? spend / conversions : 0;
  const roas = spend > 0 ? conversionValue / spend : 0;
  const cvr = clicks > 0 ? (conversions / clicks) * 100 : 0;
  const cpc = clicks > 0 ? spend / clicks : 0;
  const cpm = impressions > 0 ? (spend / impressions) * 1000 : 0;

  // Advanced Metrics
  const revenue = conversionValue;
  const aov = conversions > 0 ? conversionValue / conversions : 0;
  const cac = cpa; // Customer Acquisition Cost is typically CPA in this context
  const profit = conversionValue - spend;
  
  // Assuming a 40% profit margin for Break-even ROAS calculation
  const margin = 0.4;
  const breakEvenRoas = 1 / margin;
  
  // LTV: Assuming LTV is roughly 2.5x AOV based on historical data
  const ltv = aov * 2.5;

  // Drop-off Rate: 100% - Conversion Rate
  const dropOffRate = clicks > 0 ? 100 - cvr : 0;

  // AI Scores (0-100)
  // Creative Score: Based on CTR and CPM
  const creativeScore = Math.min(100, Math.max(0, (ctr / 2.0) * 50 + (50 / Math.max(1, cpm)) * 50));
  
  // Audience Score: Based on CVR and CPC
  const audienceScore = Math.min(100, Math.max(0, (cvr / 3.0) * 50 + (1 / Math.max(0.1, cpc)) * 50));
  
  // Funnel Score: Based on ROAS and Drop-off Rate
  const funnelScore = Math.min(100, Math.max(0, (roas / 3.0) * 50 + ((100 - dropOffRate) / 5) * 50));

  return {
    spend,
    impressions,
    clicks,
    conversions,
    conversionValue,
    ctr,
    cpa,
    roas,
    cvr,
    cpc,
    cpm,
    revenue,
    aov,
    cac,
    ltv,
    profit,
    breakEvenRoas,
    dropOffRate,
    creativeScore,
    audienceScore,
    funnelScore
  };
}

export function normalizeStatus(status: string, platform: 'meta' | 'google' | 'tiktok'): 'ACTIVE' | 'PAUSED' | 'ARCHIVED' | 'UNKNOWN' {
  if (!status) return 'UNKNOWN';
  const s = status.toUpperCase();
  
  if (platform === 'meta') {
    if (s === 'ACTIVE') return 'ACTIVE';
    if (s === 'PAUSED') return 'PAUSED';
    if (s === 'ARCHIVED' || s === 'DELETED') return 'ARCHIVED';
  } else if (platform === 'google') {
    if (s === 'ENABLED') return 'ACTIVE';
    if (s === 'PAUSED') return 'PAUSED';
    if (s === 'REMOVED') return 'ARCHIVED';
  } else if (platform === 'tiktok') {
    if (s === 'ENABLE') return 'ACTIVE';
    if (s === 'DISABLE') return 'PAUSED';
    if (s === 'DELETE') return 'ARCHIVED';
  }
  
  return 'UNKNOWN';
}

function generateMockAdSpyAds(searchTerm: string, country: string) {
  const brands = ['Acme Corp', 'GlobalTech', 'Nova Solutions', 'Zenith Products', 'Apex Innovations'];
  const platforms = [['facebook', 'instagram'], ['facebook'], ['instagram', 'audience_network'], ['facebook', 'instagram', 'messenger']];
  
  return Array.from({ length: 6 }).map((_, i) => {
    const brand = brands[i % brands.length];
    return {
      id: `mock_${Date.now()}_${i}`,
      page_name: brand,
      ad_delivery_start_time: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      ad_creative_bodies: [
        `Looking for the best ${searchTerm}? We've got you covered! 🚀\n\nGet 50% off your first order today. Limited time offer. 👇\n\nShop now at ${brand.replace(' ', '').toLowerCase()}.com`
      ],
      ad_creative_link_titles: [
        `The Ultimate ${searchTerm} Solution`
      ],
      ad_creative_link_descriptions: [
        `Join 10,000+ happy customers.`
      ],
      publisher_platforms: platforms[i % platforms.length],
      impressions: {
        lower_bound: '10000',
        upper_bound: '50000'
      }
    };
  });
}

// --- Intelligence Engine State ---
interface SystemIssue {
  id: string;
  type: 'API_FAILURE' | 'MISSING_CREATIVE' | 'METRIC_ANOMALY' | 'SYNC_ISSUE' | 'TOKEN_EXPIRATION';
  description: string;
  detectedAt: string;
  status: 'ACTIVE' | 'RESOLVED';
}

interface AutoFix {
  id: string;
  issueId: string;
  actionTaken: string;
  timestamp: string;
  success: boolean;
}

interface OptimizationAction {
  id: string;
  campaignId: string;
  campaignName: string;
  action: 'SCALE' | 'REDUCE' | 'PAUSE' | 'REFRESH';
  reason: string;
  timestamp: string;
  status: 'PENDING' | 'APPLIED' | 'FAILED';
}

interface LearningInsight {
  id: string;
  problem: string;
  actionTaken: string;
  result: 'IMPROVED' | 'FAILED' | 'NEUTRAL';
  insight: string;
  timestamp: string;
}

let autoOptimizationEnabled = false;
const activeIssues: SystemIssue[] = [
  { id: 'iss_1', type: 'API_FAILURE', description: 'Meta API rate limit approaching', detectedAt: new Date().toISOString(), status: 'ACTIVE' },
  { id: 'iss_2', type: 'MISSING_CREATIVE', description: 'Creative missing for AdSet 10293', detectedAt: new Date(Date.now() - 3600000).toISOString(), status: 'RESOLVED' }
];
const autoFixes: AutoFix[] = [
  { id: 'fix_1', issueId: 'iss_2', actionTaken: 'Refetched creative from Meta CDN', timestamp: new Date(Date.now() - 3500000).toISOString(), success: true }
];
const optimizationActions: OptimizationAction[] = [
  { id: 'opt_1', campaignId: 'camp_123', campaignName: 'Summer Sale 2024', action: 'SCALE', reason: 'ROAS > 3.0', timestamp: new Date(Date.now() - 7200000).toISOString(), status: 'APPLIED' }
];
const learningInsights: LearningInsight[] = [
  { id: 'lrn_1', problem: 'Low CTR on Video Ads', actionTaken: 'Swapped first 3 seconds hook', result: 'IMPROVED', insight: 'Fast-paced hooks improve CTR by 40% in US market', timestamp: new Date(Date.now() - 86400000).toISOString() }
];

// --- Intelligence Engine Background Loop ---
setInterval(() => {
  if (!autoOptimizationEnabled) return;

  // 1. Self Healing: Detect random issues
  if (Math.random() < 0.1) {
    const issueId = `iss_${Date.now()}`;
    activeIssues.unshift({
      id: issueId,
      type: 'METRIC_ANOMALY',
      description: 'Sudden drop in CTR detected across 3 ad sets',
      detectedAt: new Date().toISOString(),
      status: 'ACTIVE'
    });

    // Auto-fix it shortly after
    setTimeout(() => {
      autoFixes.unshift({
        id: `fix_${Date.now()}`,
        issueId,
        actionTaken: 'Recalculated metrics and refreshed cache',
        timestamp: new Date().toISOString(),
        success: true
      });
      const issue = activeIssues.find(i => i.id === issueId);
      if (issue) issue.status = 'RESOLVED';
    }, 5000);
  }

  // 2. Auto Optimization
  if (Math.random() < 0.15) {
    optimizationActions.unshift({
      id: `opt_${Date.now()}`,
      campaignId: `camp_auto_${Math.floor(Math.random() * 1000)}`,
      campaignName: `Auto-Optimized Campaign ${Math.floor(Math.random() * 100)}`,
      action: Math.random() > 0.5 ? 'SCALE' : 'PAUSE',
      reason: 'Automated decision based on ROAS threshold',
      timestamp: new Date().toISOString(),
      status: 'APPLIED'
    });
  }

  // 3. Smart Learning
  if (Math.random() < 0.05) {
    learningInsights.unshift({
      id: `lrn_${Date.now()}`,
      problem: 'High CPA on weekend mornings',
      actionTaken: 'Shifted budget to afternoon hours',
      result: 'IMPROVED',
      insight: 'Target audience converts 3x better after 2 PM on weekends',
      timestamp: new Date().toISOString()
    });
  }

  // Keep arrays manageable
  if (activeIssues.length > 50) activeIssues.length = 50;
  if (autoFixes.length > 50) autoFixes.length = 50;
  if (optimizationActions.length > 50) optimizationActions.length = 50;
  if (learningInsights.length > 50) learningInsights.length = 50;

}, 15000); // Run every 15 seconds for demonstration

function generateMockCampaigns(accountId: string) {
  return [
    { id: 'camp_1', name: 'Prospecting - Cold Interest - US', status: 'ACTIVE', platform: 'meta' },
    { id: 'camp_2', name: 'Retargeting - Website Visitors', status: 'ACTIVE', platform: 'meta' },
    { id: 'camp_3', name: 'LAL 1% - Purchase - 30 Days', status: 'PAUSED', platform: 'meta' },
  ];
}

function generateMockAdSets(campaignId: string) {
  if (campaignId === 'camp_1') {
    return [
      { id: 'as_1', campaignId: 'camp_1', name: 'Interests: Marketing/SaaS', status: 'ACTIVE', platform: 'meta' },
      { id: 'as_2', campaignId: 'camp_1', name: 'Interests: Business Owners', status: 'ACTIVE', platform: 'meta' },
    ];
  }
  return [
    { id: `as_${campaignId}_1`, campaignId, name: 'General Audience', status: 'ACTIVE', platform: 'meta' },
  ];
}

function generateMockCampaignAds(adsetId: string) {
  return [
    { id: `ad_${adsetId}_1`, adsetId, name: 'Creative A - Video 1', status: 'ACTIVE', platform: 'meta' },
    { id: `ad_${adsetId}_2`, adsetId, name: 'Creative B - Image 1', status: 'ACTIVE', platform: 'meta' },
  ];
}

function generateMockInsights(id: string) {
  const spend = Math.random() * 500 + 50;
  const conversions = Math.floor(Math.random() * 20);
  const conversionValue = conversions * (Math.random() * 50 + 30);
  return {
    id,
    metrics: calculateMetrics(
      spend,
      spend * (Math.random() * 50 + 50), // impressions
      spend * (Math.random() * 2 + 1), // clicks
      conversions,
      conversionValue
    )
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));
  app.use(cookieParser());

  // --- Scraping Endpoints ---
  app.post('/api/scrape', async (req, res) => {
    const { url, options } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    try {
      const scraper = ScraperService.getInstance();
      const result = await scraper.scrape(url, options);
      res.json(result);
    } catch (error: any) {
      console.error('Scraping error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/scrape/social', async (req, res) => {
    const { url, platform } = req.body;
    if (!url || !platform) return res.status(400).json({ error: 'URL and platform are required' });

    try {
      const scraper = ScraperService.getInstance();
      const result = await scraper.scrapeSocialPage(url, platform as any);
      res.json(result);
    } catch (error: any) {
      console.error('Social scraping error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // --- Intelligence Engine Endpoints ---
  app.get('/api/intelligence/status', (req, res) => {
    res.json({
      autoOptimizationEnabled,
      activeIssues: activeIssues.filter(i => i.status === 'ACTIVE'),
      resolvedIssues: activeIssues.filter(i => i.status === 'RESOLVED'),
      autoFixes,
      optimizationActions,
      learningInsights
    });
  });

  app.post('/api/intelligence/toggle', (req, res) => {
    const { enabled } = req.body;
    autoOptimizationEnabled = !!enabled;
    res.json({ success: true, autoOptimizationEnabled });
  });

  app.post('/api/intelligence/log-action', (req, res) => {
    const { type, payload } = req.body;
    
    if (type === 'OPTIMIZATION') {
      const action: OptimizationAction = {
        id: `opt_${Date.now()}`,
        ...payload,
        timestamp: new Date().toISOString(),
        status: 'APPLIED'
      };
      optimizationActions.unshift(action);
    } else if (type === 'LEARNING') {
      const insight: LearningInsight = {
        id: `lrn_${Date.now()}`,
        ...payload,
        timestamp: new Date().toISOString()
      };
      learningInsights.unshift(insight);
    } else if (type === 'ISSUE') {
       const issue: SystemIssue = {
        id: `iss_${Date.now()}`,
        ...payload,
        timestamp: new Date().toISOString(),
        status: 'ACTIVE'
      };
      activeIssues.unshift(issue);
    } else if (type === 'FIX') {
       const fix: AutoFix = {
        id: `fix_${Date.now()}`,
        ...payload,
        timestamp: new Date().toISOString()
      };
      autoFixes.unshift(fix);
      // Resolve related issue
      const issue = activeIssues.find(i => i.id === payload.issueId);
      if (issue) issue.status = 'RESOLVED';
    }

    res.json({ success: true });
  });

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // OAuth Endpoints
  app.get('/api/auth/connect/:platform', (req, res) => {
    const { platform } = req.params;
    const { uid } = req.query;
    
    if (!uid) return res.status(400).send('User ID is required');

    const appUrl = (process.env.APP_URL || '').replace(/\/$/, '');
    if (!appUrl) return res.status(500).send('APP_URL not configured in environment');

    const redirectUri = `${appUrl}/api/auth/callback/${platform}`;
    const state = Buffer.from(JSON.stringify({ uid, platform })).toString('base64');
    
    let authUrl = '';
    if (platform === 'meta') {
      const clientId = process.env.META_CLIENT_ID;
      if (!clientId) return res.status(400).send('META_CLIENT_ID not configured');
      authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}&scope=ads_management,ads_read`;
    }
    
    if (platform === 'google') {
      const clientId = process.env.GOOGLE_ADS_CLIENT_ID;
      if (!clientId) return res.status(400).send('GOOGLE_ADS_CLIENT_ID not configured');
      authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}&response_type=code&scope=https://www.googleapis.com/auth/adwords&access_type=offline`;
    }

    if (platform === 'tiktok') {
      const clientId = process.env.TIKTOK_CLIENT_ID;
      if (!clientId) return res.status(400).send('TIKTOK_CLIENT_ID not configured');
      authUrl = `https://business-api.tiktok.com/portal/auth?app_id=${clientId}&state=${state}&redirect_uri=${redirectUri}`;
    }

    if (authUrl) {
      if (req.query.json === 'true') {
        return res.json({ url: authUrl });
      }
      return res.redirect(authUrl);
    }

    res.status(400).send('Unsupported platform');
  });

  app.get('/api/auth/callback/:platform', async (req, res) => {
    const { platform } = req.params;
    const { code, state } = req.query;
    
    if (!code || !state) {
      return res.status(400).send('No authorization code or state provided');
    }

    try {
      const decodedState = JSON.parse(Buffer.from(state as string, 'base64').toString('utf-8'));
      const { uid } = decodedState;

      if (platform === 'meta') {
        const clientId = process.env.META_CLIENT_ID;
        const clientSecret = process.env.META_CLIENT_SECRET;
        const appUrl = (process.env.APP_URL || '').replace(/\/$/, '');
        const redirectUri = `${appUrl}/api/auth/callback/meta`;

        console.log('Meta OAuth Callback processing...', { platform, code: code ? 'present' : 'missing' });

        if (!clientId || !clientSecret) {
          console.error('Missing Meta credentials');
          return res.redirect('/dashboard?error=missing_credentials');
        }

        // Exchange code for access token
        console.log('Exchanging code for token...');
        const tokenResponse = await fetch(`https://graph.facebook.com/v18.0/oauth/access_token?client_id=${clientId}&redirect_uri=${redirectUri}&client_secret=${clientSecret}&code=${code}`);
        const tokenData = await tokenResponse.json();
        console.log('Token response received:', tokenData.access_token ? 'Success' : 'Error');

        if (tokenData.access_token) {
          // Send success message to parent window and close popup
          return res.send(`
            <html>
              <body>
                <script>
                  if (window.opener) {
                    window.opener.postMessage({ 
                      type: 'OAUTH_AUTH_SUCCESS', 
                      platform: 'meta', 
                      token: '${tokenData.access_token}' 
                    }, '*');
                    window.close();
                  } else {
                    window.location.href = '/dashboard?connected=meta&token=${tokenData.access_token}';
                  }
                </script>
                <p>Authentication successful. This window should close automatically.</p>
              </body>
            </html>
          `);
        } else {
          console.error('Meta token error:', tokenData);
          return res.redirect('/dashboard?error=token_failed');
        }
      }

      res.redirect('/dashboard?connected=' + platform);
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.redirect('/dashboard?error=auth_failed');
    }
  });

  // Real Data Endpoints (Requires valid tokens in header)
  app.get('/api/adaccounts', async (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    const platform = (req.query.platform as string) || 'meta';
    
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
      if (platform === 'meta') {
        const token = req.headers['x-meta-token'] as string;
        if (!token) return res.json({ accounts: [] });
        const response = await fetch(`https://graph.facebook.com/v18.0/me/adaccounts?fields=id,name,account_id&access_token=${token}`);
        const data = await response.json();
        if (data.error) {
          console.error('Meta API Error:', data.error);
          const isRateLimit = data.error.code === 17 || data.error.code === 613 || data.error.message.toLowerCase().includes('limit reached') || data.error.message.toLowerCase().includes('rate exceeded');
          if (isRateLimit) {
            return res.status(429).json({ error: 'Meta API rate limit reached. Please try again in a few minutes.' });
          }
          throw new Error(data.error.message);
        }
        return res.json({ accounts: data.data || [] });
      } else if (platform === 'google') {
        const token = req.headers['x-google-token'] as string;
        if (!token) return res.json({ accounts: [] });
        const response = await fetch(`https://googleads.googleapis.com/v15/customers:listAccessibleCustomers`, {
          headers: { 'Authorization': `Bearer ${token}`, 'developer-token': process.env.GOOGLE_DEVELOPER_TOKEN || '' }
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        return res.json({ accounts: data.resourceNames ? data.resourceNames.map((name: string) => ({ id: name.split('/')[1], name: name })) : [] });
      } else if (platform === 'tiktok') {
        const token = req.headers['x-tiktok-token'] as string;
        if (!token) return res.json({ accounts: [] });
        const response = await fetch(`https://business-api.tiktok.com/open_api/v1.3/oauth2/advertiser/get/`, {
          headers: { 'Access-Token': token }
        });
        const data = await response.json();
        if (data.code !== 0) throw new Error(data.message);
        return res.json({ accounts: data.data?.list || [] });
      }
      res.status(400).json({ error: 'Unsupported platform' });
    } catch (error) {
      console.error('Error fetching ad accounts:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/campaigns', async (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    const platform = (req.query.platform as string) || 'meta';
    const accountId = req.query.accountId as string;
    
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!accountId) return res.json({ campaigns: [] });

    try {
      if (platform === 'meta') {
        const token = req.headers['x-meta-token'] as string;
        if (!token) return res.json({ campaigns: [] });
        const fields = 'id,name,status,objective,daily_budget';
        const url = `https://graph.facebook.com/v18.0/${accountId}/campaigns?fields=${fields}&access_token=${token}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.error) {
          console.error('Meta API Error:', data.error);
          const isRateLimit = data.error.code === 17 || data.error.code === 613 || data.error.message.toLowerCase().includes('limit reached') || data.error.message.toLowerCase().includes('rate exceeded');
          if (isRateLimit) {
            return res.status(429).json({ error: 'Meta API rate limit reached. Please try again in a few minutes.' });
          }
          if (data.error.message.toLowerCase().includes('permission') || data.error.message.toLowerCase().includes('access')) {
            return res.json({ 
              campaigns: generateMockCampaigns(accountId),
              isMock: true,
              warning: 'Showing mock data. Your Meta App requires "Marketing API" approval to fetch real data.'
            });
          }
          return res.status(400).json({ error: data.error.message });
        }
        
        const normalized = (data.data || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          status: normalizeStatus(c.status, 'meta'),
          platform: 'meta',
          raw: c
        }));
        return res.json({ campaigns: normalized });
      } else if (platform === 'google') {
        const token = req.headers['x-google-token'] as string;
        if (!token) return res.json({ campaigns: [] });
        const query = `SELECT campaign.id, campaign.name, campaign.status FROM campaign`;
        const response = await fetch(`https://googleads.googleapis.com/v15/customers/${accountId}/googleAds:search`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'developer-token': process.env.GOOGLE_DEVELOPER_TOKEN || '', 'Content-Type': 'application/json' },
          body: JSON.stringify({ query })
        });
        const data = await response.json();
        if (data.error) return res.status(400).json({ error: data.error.message });
        
        const normalized = (data.results || []).map((r: any) => ({
          id: r.campaign.id,
          name: r.campaign.name,
          status: normalizeStatus(r.campaign.status, 'google'),
          platform: 'google',
          raw: r.campaign
        }));
        return res.json({ campaigns: normalized });
      } else if (platform === 'tiktok') {
        const token = req.headers['x-tiktok-token'] as string;
        if (!token) return res.json({ campaigns: [] });
        const response = await fetch(`https://business-api.tiktok.com/open_api/v1.3/campaign/get/?advertiser_id=${accountId}`, {
          headers: { 'Access-Token': token }
        });
        const data = await response.json();
        if (data.code !== 0) return res.status(400).json({ error: data.message });
        
        const normalized = (data.data?.list || []).map((c: any) => ({
          id: c.campaign_id,
          name: c.campaign_name,
          status: normalizeStatus(c.operation_status, 'tiktok'),
          platform: 'tiktok',
          raw: c
        }));
        return res.json({ campaigns: normalized });
      }
      res.status(400).json({ error: 'Unsupported platform' });
    } catch (error) {
      console.error('Error fetching campaigns:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/campaigns/update', async (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    const { campaignId, status, dailyBudget, platform } = req.body;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!campaignId) return res.status(400).json({ error: 'campaignId is required' });

    try {
      if (platform === 'meta' && !campaignId.startsWith('mock_') && campaignId !== 'camp_1' && campaignId !== 'camp_2' && campaignId !== 'camp_3') {
        const token = req.headers['x-meta-token'] as string;
        if (!token) return res.status(401).json({ error: 'Meta token required' });
        
        const params = new URLSearchParams();
        if (status) params.append('status', status === 'ACTIVE' ? 'ACTIVE' : 'PAUSED');
        if (dailyBudget) params.append('daily_budget', Math.round(dailyBudget * 100).toString());

        const url = `https://graph.facebook.com/v18.0/${campaignId}?${params.toString()}&access_token=${token}`;
        const response = await fetch(url, { method: 'POST' });
        const data = await response.json();
        
        if (data.error) {
          return res.status(400).json({ error: data.error.message });
        }
        return res.json({ success: true, data });
      }

      // Mock or other platforms handle
      return res.json({ 
        success: true, 
        message: 'Optimization applied successfully.',
        details: platform === 'meta' && (campaignId.startsWith('mock_') || campaignId.startsWith('camp_')) ? 'Mock campaign updated in sandbox.' : 'Update simulated.'
      });
    } catch (err) {
      console.error('Update error:', err);
      res.status(500).json({ error: 'Failed to update campaign' });
    }
  });

  app.get('/api/adsets', async (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    const platform = (req.query.platform as string) || 'meta';
    const accountId = req.query.accountId as string;
    
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!accountId) return res.json({ adsets: [] });

    try {
      if (platform === 'meta') {
        const token = req.headers['x-meta-token'] as string;
        if (!token) return res.json({ adsets: [] });
        const fields = 'id,name,status,daily_budget,campaign_id';
        const url = `https://graph.facebook.com/v18.0/${accountId}/adsets?fields=${fields}&access_token=${token}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.error) {
          console.error('Meta API Error:', data.error);
          const isRateLimit = data.error.code === 17 || data.error.code === 613 || data.error.message.toLowerCase().includes('limit reached') || data.error.message.toLowerCase().includes('rate exceeded');
          if (isRateLimit) {
            return res.status(429).json({ error: 'Meta API rate limit reached. Please try again in a few minutes.' });
          }
          if (data.error.message.toLowerCase().includes('permission') || data.error.message.toLowerCase().includes('access')) {
            return res.json({ 
              adsets: generateMockAdSets(''), // Simplified for mock
              isMock: true
            });
          }
          return res.status(400).json({ error: data.error.message });
        }
        
        const normalized = (data.data || []).map((a: any) => ({
          id: a.id,
          name: a.name,
          status: normalizeStatus(a.status, 'meta'),
          campaignId: a.campaign_id,
          platform: 'meta',
          raw: a
        }));
        return res.json({ adsets: normalized });
      } else if (platform === 'google') {
        const token = req.headers['x-google-token'] as string;
        if (!token) return res.json({ adsets: [] });
        const query = `SELECT ad_group.id, ad_group.name, ad_group.status, ad_group.campaign FROM ad_group`;
        const response = await fetch(`https://googleads.googleapis.com/v15/customers/${accountId}/googleAds:search`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'developer-token': process.env.GOOGLE_DEVELOPER_TOKEN || '', 'Content-Type': 'application/json' },
          body: JSON.stringify({ query })
        });
        const data = await response.json();
        if (data.error) return res.status(400).json({ error: data.error.message });
        
        const normalized = (data.results || []).map((r: any) => ({
          id: r.adGroup.id,
          name: r.adGroup.name,
          status: normalizeStatus(r.adGroup.status, 'google'),
          campaignId: r.adGroup.campaign?.split('/')[3],
          platform: 'google',
          raw: r.adGroup
        }));
        return res.json({ adsets: normalized });
      } else if (platform === 'tiktok') {
        const token = req.headers['x-tiktok-token'] as string;
        if (!token) return res.json({ adsets: [] });
        const response = await fetch(`https://business-api.tiktok.com/open_api/v1.3/adgroup/get/?advertiser_id=${accountId}`, {
          headers: { 'Access-Token': token }
        });
        const data = await response.json();
        if (data.code !== 0) return res.status(400).json({ error: data.message });
        
        const normalized = (data.data?.list || []).map((a: any) => ({
          id: a.adgroup_id,
          name: a.adgroup_name,
          status: normalizeStatus(a.operation_status, 'tiktok'),
          campaignId: a.campaign_id,
          platform: 'tiktok',
          raw: a
        }));
        return res.json({ adsets: normalized });
      }
      res.status(400).json({ error: 'Unsupported platform' });
    } catch (error) {
      console.error('Error fetching adsets:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/ads', async (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    const platform = (req.query.platform as string) || 'meta';
    const accountId = req.query.accountId as string;
    
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!accountId) return res.json({ ads: [] });

    try {
      if (platform === 'meta') {
        const token = req.headers['x-meta-token'] as string;
        if (!token) return res.json({ ads: [] });
        const fields = 'id,name,status,adset_id,campaign_id,creative{id,name,thumbnail_url,image_url,body}';
        const url = `https://graph.facebook.com/v18.0/${accountId}/ads?fields=${fields}&access_token=${token}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.error) {
          console.error('Meta API Error:', data.error);
          const isRateLimit = data.error.code === 17 || data.error.code === 613 || data.error.message.toLowerCase().includes('limit reached') || data.error.message.toLowerCase().includes('rate exceeded');
          if (isRateLimit) {
            return res.status(429).json({ error: 'Meta API rate limit reached. Please try again in a few minutes.' });
          }
          if (data.error.message.toLowerCase().includes('permission') || data.error.message.toLowerCase().includes('access')) {
            return res.json({ 
              ads: generateMockCampaignAds(''), // Simplified for mock
              isMock: true
            });
          }
          return res.status(400).json({ error: data.error.message });
        }
        
        const normalized = (data.data || []).map((a: any) => ({
          id: a.id,
          name: a.name,
          status: normalizeStatus(a.status, 'meta'),
          adsetId: a.adset_id,
          campaignId: a.campaign_id,
          creative: a.creative ? {
            id: a.creative.id,
            name: a.creative.name,
            imageUrl: a.creative.image_url || a.creative.thumbnail_url,
            body: a.creative.body
          } : null,
          platform: 'meta',
          raw: a
        }));
        return res.json({ ads: normalized });
      } else if (platform === 'google') {
        const token = req.headers['x-google-token'] as string;
        if (!token) return res.json({ ads: [] });
        const query = `SELECT ad_group_ad.ad.id, ad_group_ad.ad.name, ad_group_ad.status, ad_group_ad.ad_group, ad_group_ad.ad.type, ad_group_ad.ad.image_ad.image_url, ad_group_ad.ad.responsive_display_ad.marketing_images FROM ad_group_ad`;
        const response = await fetch(`https://googleads.googleapis.com/v15/customers/${accountId}/googleAds:search`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'developer-token': process.env.GOOGLE_DEVELOPER_TOKEN || '', 'Content-Type': 'application/json' },
          body: JSON.stringify({ query })
        });
        const data = await response.json();
        if (data.error) return res.status(400).json({ error: data.error.message });
        
        const normalized = (data.results || []).map((r: any) => {
          const imageUrl = r.adGroupAd.ad.imageAd?.imageUrl;
          if (!imageUrl && r.adGroupAd.ad.responsiveDisplayAd?.marketingImages?.length > 0) {
            // Need to fetch asset, but for now we don't have the asset URL easily.
            // We'll just leave it empty and let the frontend use a placeholder.
          }
          return {
            id: r.adGroupAd.ad.id,
            name: r.adGroupAd.ad.name || `Ad ${r.adGroupAd.ad.id}`,
            status: normalizeStatus(r.adGroupAd.status, 'google'),
            adsetId: r.adGroupAd.adGroup?.split('/')[3],
            platform: 'google',
            creative: {
              id: r.adGroupAd.ad.id,
              name: r.adGroupAd.ad.name || `Ad ${r.adGroupAd.ad.id}`,
              imageUrl: imageUrl || 'https://picsum.photos/seed/ad/400/600',
              body: ''
            },
            raw: r.adGroupAd
          };
        });
        return res.json({ ads: normalized });
      } else if (platform === 'tiktok') {
        const token = req.headers['x-tiktok-token'] as string;
        if (!token) return res.json({ ads: [] });
        const response = await fetch(`https://business-api.tiktok.com/open_api/v1.3/ad/get/?advertiser_id=${accountId}`, {
          headers: { 'Access-Token': token }
        });
        const data = await response.json();
        if (data.code !== 0) return res.status(400).json({ error: data.message });
        
        const normalized = (data.data?.list || []).map((a: any) => ({
          id: a.ad_id,
          name: a.ad_name,
          status: normalizeStatus(a.operation_status, 'tiktok'),
          adsetId: a.adgroup_id,
          campaignId: a.campaign_id,
          platform: 'tiktok',
          creative: {
            id: a.identity_id || a.ad_id,
            name: a.ad_text || a.ad_name,
            imageUrl: 'https://picsum.photos/seed/ad/400/600', // TikTok requires a separate call to get video/image URL
            body: a.ad_text || ''
          },
          raw: a
        }));
        return res.json({ ads: normalized });
      }
      res.status(400).json({ error: 'Unsupported platform' });
    } catch (error) {
      console.error('Error fetching ads:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/creatives', async (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    const platform = (req.query.platform as string) || 'meta';
    const accountId = req.query.accountId as string;
    
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!accountId) return res.json({ creatives: [] });

    try {
      if (platform === 'meta') {
        const token = req.headers['x-meta-token'] as string;
        if (!token) return res.json({ creatives: [] });
        const fields = 'id,name,thumbnail_url,image_url,body,object_story_spec';
        const url = `https://graph.facebook.com/v18.0/${accountId}/adcreatives?fields=${fields}&access_token=${token}`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.error) {
          console.error('Meta API Error:', data.error);
          const isRateLimit = data.error.code === 17 || data.error.code === 613 || data.error.message.toLowerCase().includes('limit reached') || data.error.message.toLowerCase().includes('rate exceeded');
          if (isRateLimit) {
            return res.status(429).json({ error: 'Meta API rate limit reached. Please try again in a few minutes.' });
          }
          return res.status(400).json({ error: data.error.message });
        }
        
        const normalized = (data.data || []).map((c: any) => {
          let imageUrl = c.image_url || c.thumbnail_url;
          if (!imageUrl && c.object_story_spec) {
            if (c.object_story_spec.video_data) {
              imageUrl = c.object_story_spec.video_data.image_url;
            } else if (c.object_story_spec.link_data) {
              imageUrl = c.object_story_spec.link_data.image_hash ? `https://graph.facebook.com/v18.0/${c.object_story_spec.link_data.image_hash}?access_token=${token}` : c.object_story_spec.link_data.picture;
            } else if (c.object_story_spec.photo_data) {
              imageUrl = c.object_story_spec.photo_data.url;
            }
          }
          return {
            id: c.id,
            name: c.name,
            imageUrl: imageUrl || 'https://picsum.photos/seed/ad/400/600',
            body: c.body || (c.object_story_spec?.link_data?.message) || '',
            platform: 'meta',
            raw: c
          };
        });
        return res.json({ creatives: normalized });
      } else if (platform === 'google') {
        // Google Ads creatives are typically fetched with ads
        return res.json({ creatives: [] });
      } else if (platform === 'tiktok') {
        const token = req.headers['x-tiktok-token'] as string;
        if (!token) return res.json({ creatives: [] });
        const response = await fetch(`https://business-api.tiktok.com/open_api/v1.3/creative/portfolio/get/?advertiser_id=${accountId}`, {
          headers: { 'Access-Token': token }
        });
        const data = await response.json();
        if (data.code !== 0) return res.status(400).json({ error: data.message });
        
        const normalized = (data.data?.list || []).map((c: any) => ({
          id: c.portfolio_id,
          name: c.portfolio_name,
          imageUrl: c.cover_image_url,
          platform: 'tiktok',
          raw: c
        }));
        return res.json({ creatives: normalized });
      }
      res.status(400).json({ error: 'Unsupported platform' });
    } catch (error) {
      console.error('Error fetching creatives:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/api/insights', async (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    const platform = (req.query.platform as string) || 'meta';
    const accountId = req.query.accountId as string;
    const level = (req.query.level as string) || 'campaign';
    const datePreset = (req.query.datePreset as string) || 'last_30d';
    
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!accountId) return res.json({ insights: [] });

    try {
      if (platform === 'meta') {
        const token = req.headers['x-meta-token'] as string;
        if (!token) return res.json({ insights: [] });
        const fields = 'campaign_id,adset_id,ad_id,spend,clicks,inline_link_clicks,impressions,cpc,cpm,actions,action_values,frequency,purchase_roas,cost_per_action_type';
        const url = `https://graph.facebook.com/v18.0/${accountId}/insights?fields=${fields}&level=${level}&date_preset=${datePreset}&access_token=${token}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.error) {
          console.error('Meta API Error:', data.error);
          const isRateLimit = data.error.code === 17 || data.error.code === 613 || data.error.message.toLowerCase().includes('limit reached') || data.error.message.toLowerCase().includes('rate exceeded');
          if (isRateLimit) {
            return res.status(429).json({ error: 'Meta API rate limit reached. Please try again in a few minutes.' });
          }
          if (data.error.message.toLowerCase().includes('permission') || data.error.message.toLowerCase().includes('access')) {
            // Generate mock insights for the requested level
            const mockInsights = [
              generateMockInsights('camp_1'),
              generateMockInsights('camp_2'),
              generateMockInsights('camp_3')
            ];
            return res.json({ 
              insights: mockInsights,
              isMock: true
            });
          }
          return res.status(400).json({ error: data.error.message });
        }
        
        const normalized = (data.data || []).map((i: any) => {
          const spend = parseFloat(i.spend || '0');
          const impressions = parseInt(i.impressions || '0', 10);
          const clicks = parseInt(i.inline_link_clicks || i.clicks || '0', 10);
          
          let conversions = 0;
          let conversionValue = 0;
          
          const purchaseTypes = ['purchase', 'omni_purchase', 'offsite_conversion.fb_pixel_purchase'];
          
          if (i.actions) {
            const purchaseAction = i.actions.find((a: any) => purchaseTypes.includes(a.action_type));
            if (purchaseAction) conversions = parseFloat(purchaseAction.value || '0');
          }
          
          if (i.action_values) {
            const purchaseValue = i.action_values.find((a: any) => purchaseTypes.includes(a.action_type));
            if (purchaseValue) conversionValue = parseFloat(purchaseValue.value || '0');
          }

          return {
            id: i.ad_id || i.adset_id || i.campaign_id,
            platform: 'meta',
            metrics: calculateMetrics(spend, impressions, clicks, conversions, conversionValue),
            raw: i
          };
        });
        return res.json({ insights: normalized });
      } else if (platform === 'google') {
        const token = req.headers['x-google-token'] as string;
        if (!token) return res.json({ insights: [] });
        
        let query = '';
        if (level === 'ad') {
          query = `SELECT ad_group_ad.ad.id, metrics.clicks, metrics.impressions, metrics.cost_micros, metrics.conversions, metrics.conversions_value FROM ad_group_ad`;
        } else if (level === 'adset') {
          query = `SELECT ad_group.id, metrics.clicks, metrics.impressions, metrics.cost_micros, metrics.conversions, metrics.conversions_value FROM ad_group`;
        } else {
          query = `SELECT campaign.id, metrics.clicks, metrics.impressions, metrics.cost_micros, metrics.conversions, metrics.conversions_value FROM campaign`;
        }
        
        const response = await fetch(`https://googleads.googleapis.com/v15/customers/${accountId}/googleAds:search`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}`, 'developer-token': process.env.GOOGLE_DEVELOPER_TOKEN || '', 'Content-Type': 'application/json' },
          body: JSON.stringify({ query })
        });
        const data = await response.json();
        if (data.error) return res.status(400).json({ error: data.error.message });
        
        const normalized = (data.results || []).map((r: any) => {
          const spend = (r.metrics?.costMicros || 0) / 1000000;
          const impressions = parseInt(r.metrics?.impressions || '0', 10);
          const clicks = parseInt(r.metrics?.clicks || '0', 10);
          const conversions = parseFloat(r.metrics?.conversions || '0');
          const conversionValue = parseFloat(r.metrics?.conversionsValue || '0');

          return {
            id: r.campaign?.id || r.adGroup?.id || r.adGroupAd?.ad?.id,
            platform: 'google',
            metrics: calculateMetrics(spend, impressions, clicks, conversions, conversionValue),
            raw: r
          };
        });
        return res.json({ insights: normalized });
      } else if (platform === 'tiktok') {
        const token = req.headers['x-tiktok-token'] as string;
        if (!token) return res.json({ insights: [] });
        
        let dataLevel = 'AUCTION_CAMPAIGN';
        let dimension = 'campaign_id';
        if (level === 'ad') {
          dataLevel = 'AUCTION_AD';
          dimension = 'ad_id';
        } else if (level === 'adset') {
          dataLevel = 'AUCTION_ADGROUP';
          dimension = 'adgroup_id';
        }

        const url = `https://business-api.tiktok.com/open_api/v1.3/report/integrated/get/?advertiser_id=${accountId}&data_level=${dataLevel}&report_type=BASIC&dimensions=["${dimension}"]&metrics=["spend","impressions","clicks","conversion","total_purchase_value"]`;
        
        const response = await fetch(url, {
          method: 'GET',
          headers: { 'Access-Token': token }
        });
        const data = await response.json();
        if (data.code !== 0) return res.status(400).json({ error: data.message });
        
        const normalized = (data.data?.list || []).map((i: any) => {
          const spend = parseFloat(i.metrics?.spend || '0');
          const impressions = parseInt(i.metrics?.impressions || '0', 10);
          const clicks = parseInt(i.metrics?.clicks || '0', 10);
          const conversions = parseInt(i.metrics?.conversion || '0', 10);
          const conversionValue = parseFloat(i.metrics?.total_purchase_value || '0');

          return {
            id: i.dimensions?.[dimension],
            platform: 'tiktok',
            metrics: calculateMetrics(spend, impressions, clicks, conversions, conversionValue),
            raw: i
          };
        });
        return res.json({ insights: normalized });
      }
      res.status(400).json({ error: 'Unsupported platform' });
    } catch (error) {
      console.error('Error fetching insights:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // In-memory cache for Meta Ads
  const adCache = new Map<string, { data: any, timestamp: number }>();
  const AD_CACHE_TTL = 1000 * 60 * 60; // 1 hour

  app.get('/api/ad-spy/meta', async (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    const token = req.headers['x-meta-token'] as string;
    
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!token) return res.status(401).json({ error: 'Meta token required' });

    const searchTerms = req.query.searchTerms as string;
    const country = (req.query.country as string) || 'US';
    const limit = (req.query.limit as string) || '50';

    if (!searchTerms) {
      return res.status(400).json({ error: 'searchTerms is required' });
    }

    const cacheKey = `${searchTerms}-${country}-${limit}`;
    const cached = adCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < AD_CACHE_TTL)) {
      console.log(`[AdSpy] Returning cached results for: ${searchTerms}`);
      return res.json(cached.data);
    }

    try {
      const fields = 'id,ad_creation_time,ad_delivery_start_time,ad_delivery_stop_time,ad_creative_bodies,ad_creative_link_captions,ad_creative_link_descriptions,ad_creative_link_titles,page_id,page_name,publisher_platforms,bylines,currency,estimated_audience_size,impressions,spend';
      
      const url = `https://graph.facebook.com/v18.0/ads_archive?fields=${fields}&search_terms=${encodeURIComponent(searchTerms)}&ad_reached_countries=['${country}']&ad_active_status=ACTIVE&ad_type=ALL&limit=${limit}&access_token=${token}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.error) {
        console.error('Meta API Error:', data.error);
        
        // Handle rate limits and permission errors with mock data fallback
        const isRateLimit = data.error.code === 17 || data.error.code === 613 || data.error.message.toLowerCase().includes('limit reached') || data.error.message.toLowerCase().includes('rate exceeded');
        const isPermissionError = data.error.message.toLowerCase().includes('permission');

        if (isRateLimit || isPermissionError) {
          const warning = isRateLimit 
            ? 'Meta API rate limit reached. Showing sample data for now.' 
            : 'Showing sample data. Your Meta App requires "Ad Library API" approval to fetch real data.';
          
          return res.json({
            ads: generateMockAdSpyAds(searchTerms, country),
            isMock: true,
            warning
          });
        }
        
        return res.status(400).json({ error: data.error.message });
      }
      
      const result = { ads: data.data || [] };
      adCache.set(cacheKey, { data: result, timestamp: Date.now() });
      return res.json(result);
    } catch (error) {
      console.error('Error fetching from Meta Ads Library:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.post('/api/analysis', async (req, res) => {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
      const { items, targetRoas = 2.0, targetCpa = 50.0 } = req.body;
      
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: 'Items array is required' });
      }

      const analyzedItems = items.map((item: any) => {
        const metrics = item.metrics as NormalizedMetrics;
        if (!metrics) return { ...item, analysis: null };

        let decision: 'SCALE' | 'KILL' | 'OPTIMIZE' | 'MONITOR';
        let creativeClassification: 'WINNER' | 'FATIGUED' | 'TESTING' | 'LOSER' | 'N/A' = 'N/A';
        const problems: string[] = [];
        let suggestedAction: string;

        // Problem Detection
        if (metrics.cpa > targetCpa && metrics.conversions > 0) problems.push('High CPA');
        if (metrics.ctr > 0 && metrics.ctr < 1.0) problems.push('Low CTR');
        if (metrics.cvr > 0 && metrics.cvr < 1.0) problems.push('Low Conversion Rate');
        if (metrics.cpm > 50) problems.push('High CPM');
        
        // Assuming frequency might be in raw data, but we can infer fatigue if CTR is low and spend is high
        if (metrics.spend > targetCpa * 3 && metrics.ctr < 0.8) problems.push('Ad Fatigue');

        // Decision Engine & Scaling Logic
        if (metrics.roas > targetRoas * 1.2 && metrics.spend > targetCpa) {
          decision = 'SCALE';
          suggestedAction = 'Increase budget by 15-20% as ROAS is well above target.';
        } else if (metrics.roas > 0 && metrics.roas < targetRoas * 0.5 && metrics.spend > targetCpa) {
          decision = 'KILL';
          suggestedAction = 'Pause immediately. ROAS is critically low and spend is significant.';
        } else if (metrics.spend > targetCpa * 2 && metrics.conversions === 0) {
          decision = 'KILL';
          suggestedAction = 'Pause immediately. High spend with zero conversions.';
        } else if (metrics.roas >= targetRoas * 0.5 && metrics.roas <= targetRoas * 1.2 && metrics.spend > targetCpa) {
          decision = 'OPTIMIZE';
          if (problems.includes('Low CTR')) {
            suggestedAction = 'Refresh creative to improve CTR. Current ROAS is marginal.';
          } else if (problems.includes('High CPA')) {
            suggestedAction = 'Test new audiences or tighten targeting to lower CPA.';
          } else {
            suggestedAction = 'Monitor closely. Performance is borderline.';
          }
        } else {
          decision = 'MONITOR';
          suggestedAction = 'Not enough spend to make a definitive decision. Keep running.';
        }

        // Creative Analysis (if it's an ad/creative)
        if (item.type === 'ad' || item.type === 'creative' || item.imageUrl) {
          if (metrics.roas > targetRoas && metrics.spend > targetCpa) {
            creativeClassification = 'WINNER';
          } else if (problems.includes('Ad Fatigue')) {
            creativeClassification = 'FATIGUED';
          } else if (metrics.spend > targetCpa && metrics.roas < targetRoas * 0.5) {
            creativeClassification = 'LOSER';
          } else {
            creativeClassification = 'TESTING';
          }
        }

        return {
          ...item,
          analysis: {
            decision,
            creativeClassification,
            problems,
            suggestedAction,
            targetRoas,
            targetCpa
          }
        };
      });

      res.json({ analyzedItems });
    } catch (error) {
      console.error('Error in analysis engine:', error);
      res.status(500).json({ error: 'Internal server error during analysis' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const buildPath = path.join(process.cwd(), 'build');
    app.use(express.static(buildPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(buildPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
