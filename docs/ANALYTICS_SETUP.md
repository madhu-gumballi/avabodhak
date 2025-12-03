# Google Analytics 4 Setup Guide

## Overview
This app uses **Google Analytics 4 (GA4)** for free usage tracking. No OAuth or login required.

---

## Part 1: Google Analytics Setup (One-Time)

### Step 1: Create GA4 Property
1. Go to **https://analytics.google.com/**
2. Sign in with your Google account
3. Click **"Admin"** (gear icon, bottom left)
4. Click **"Create Property"**
   - **Property name**: `Stotra Maala`
   - **Reporting time zone**: Your timezone
   - **Currency**: Your currency
   - Click **"Next"**
5. Fill in business details (select any options - doesn't affect free tier)
6. Click **"Create"** and accept Terms of Service

### Step 2: Set Up Web Data Stream
1. After creating property, click **"Web"** platform
2. Enter details:
   - **Website URL**: Your production URL (e.g., `https://stotra-mala.netlify.app`)
   - **Stream name**: `Stotra Maala Web`
   - ✅ Enable **"Enhanced measurement"** (auto-tracks scrolls, clicks, downloads)
3. Click **"Create stream"**

### Step 3: Get Your Measurement ID
1. In **"Web stream details"**, copy the **Measurement ID**
   - Format: `G-XXXXXXXXXX`
2. Add it to your `.env` file:
   ```bash
   VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
   ```

### Step 4: Configure Data Retention (Recommended)
1. Admin → Property Settings → **"Data Settings"** → **"Data Retention"**
2. Set **Event data retention** to **14 months** (max for free tier)
3. Turn **OFF** "Reset user data on new activity"

---

## Part 2: Local Development Setup

### 1. Add Measurement ID to `.env`
```bash
# Copy .env.example to .env if you haven't already
cp .env.example .env

# Edit .env and add your Measurement ID
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

### 2. Restart Dev Server
```bash
npm run dev
```

### 3. Verify Tracking (Optional)
1. Open your app in browser
2. Open browser DevTools → Network tab
3. Filter by "google-analytics" or "gtag"
4. You should see requests to `google-analytics.com`

**OR** use the GA4 DebugView:
1. In GA4, go to **Admin** → **DebugView**
2. Add `?debug_mode=true` to your URL
3. Interact with the app and see events in real-time

---

## Part 3: Custom Event Tracking

### Using the Analytics Utility

Import the analytics utility in your components:

```typescript
import { analytics } from '@/lib/analytics';

// Track playback
analytics.playbackStart();
analytics.playbackPause();

// Track settings changes
analytics.languageChange('deva');
analytics.paceChange(120);

// Track search
analytics.search('vishnu', 5);

// Custom events
import { trackEvent } from '@/lib/analytics';
trackEvent('custom_event', { key: 'value' });
```

### Available Events

#### Playback
- `playbackStart()` - User starts playback
- `playbackPause()` - User pauses playback
- `playbackComplete()` - User completes a stotra

#### Navigation
- `wordNavigation(direction)` - Next/previous word navigation
- `lineJump(lineNumber)` - Jump to specific line

#### Settings
- `languageChange(language)` - Script/language change
- `paceChange(wpm)` - Playback speed change
- `pronunciationToggle(enabled)` - Pronunciation feature toggle
- `artworkToggle(enabled)` - Artwork display toggle

#### Search
- `search(query, resultsCount)` - Search performed
- `searchResultClick(lineNumber)` - Search result clicked

#### Help & Onboarding
- `helpOpen()` - Help dialog opened
- `onboardingComplete()` - Onboarding completed
- `onboardingSkip()` - Onboarding skipped

---

## Part 4: What Gets Tracked Automatically

With **Enhanced Measurement** enabled, GA4 automatically tracks:

✅ **Page views** - When users visit the app  
✅ **Scrolls** - When users scroll 90% of the page  
✅ **Outbound clicks** - Clicks on external links  
✅ **Site search** - If you use URL parameters for search  
✅ **Video engagement** - If you add videos  
✅ **File downloads** - Downloads of PDFs, etc.  

---

## Part 5: Viewing Analytics Data

### Real-Time Reports
1. Go to **Reports** → **Realtime**
2. See current active users and events

### Standard Reports
1. **Reports** → **Life cycle** → **Engagement**
   - See event counts, user engagement
2. **Reports** → **Life cycle** → **Acquisition**
   - See how users find your app
3. **Reports** → **User** → **Demographics**
   - See user locations, languages, devices

### Custom Reports
1. Go to **Explore** (left sidebar)
2. Create custom reports with specific metrics

---

## Part 6: Privacy & Compliance

### Current Setup
- ✅ No personal data collected (no login/OAuth)
- ✅ Anonymous usage tracking only
- ✅ Cookie consent not required for analytics-only tracking (in most jurisdictions)
- ✅ Respects Do Not Track browser settings

### Optional: Add Privacy Policy
If you want to be extra transparent, add a privacy policy link in your app footer:

```typescript
<a href="/privacy">Privacy Policy</a>
```

---

## Part 7: Cost & Limits (Free Tier)

### Google Analytics 4 Free Tier Includes:
- ✅ **Unlimited events** per month
- ✅ **14-month data retention** (configurable)
- ✅ **All standard reports**
- ✅ **Real-time reporting**
- ✅ **Custom dimensions & metrics** (50 custom dimensions)
- ✅ **Audience building**
- ✅ **Integration with Google Ads** (if needed later)

### No Paid Upgrade Needed Unless:
- You need **BigQuery export** (raw data export)
- You need **more than 14 months** data retention
- You have **10M+ events/month** (highly unlikely for this app)

---

## Troubleshooting

### Events Not Showing Up
1. Check `.env` has correct `VITE_GA_MEASUREMENT_ID`
2. Restart dev server after changing `.env`
3. Clear browser cache
4. Check browser console for errors
5. Use GA4 DebugView with `?debug_mode=true`

### Measurement ID Not Found
1. Verify format is `G-XXXXXXXXXX` (not `UA-XXXXXXXXX`)
2. Check you're using GA4, not Universal Analytics (deprecated)

### Data Delayed
- Real-time reports: ~seconds
- Standard reports: ~24-48 hours for full processing

---

## Next Steps

1. ✅ Set up GA4 property (follow Part 1)
2. ✅ Add Measurement ID to `.env`
3. ✅ Deploy to production
4. 📊 Monitor analytics in GA4 dashboard
5. 🎯 Optimize based on user behavior insights

---

## Resources

- [GA4 Documentation](https://support.google.com/analytics/answer/9304153)
- [GA4 Event Reference](https://support.google.com/analytics/answer/9267735)
- [GA4 DebugView](https://support.google.com/analytics/answer/7201382)
