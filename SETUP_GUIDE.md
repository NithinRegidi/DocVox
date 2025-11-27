# Doc Speak Aid - Complete Setup Guide

A step-by-step guide to set up and verify your document analysis application.

---

## Prerequisites Checklist

Before starting, ensure you have:
- [ ] Node.js installed (v18 or higher)
- [ ] A Supabase account (free tier works)
- [ ] A modern web browser (Chrome, Firefox, Edge)

---

## Step 1: Install Dependencies

### 1.1 Open Terminal in Project Folder
```bash
cd d:\MyProjects\doc-speak-aid-main
```

### 1.2 Install Packages
```bash
npm install
```

### 1.3 Verify Installation
**Expected Result:** No errors, packages installed successfully.

**Test Command:**
```bash
npm run build
```
**Expected Result:** Build completes with "✓ built in X seconds"

---

## Step 2: Configure Supabase Project

### 2.1 Create Supabase Project (if not done)
1. Go to [supabase.com](https://supabase.com)
2. Sign in or create account
3. Click "New Project"
4. Name it (e.g., "doc-speak-aid")
5. Set a database password (save it!)
6. Select a region close to you
7. Click "Create new project"
8. Wait 2-3 minutes for setup

### 2.2 Get Your API Keys
1. In Supabase Dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)

### 2.3 Update Environment File
Edit `.env` file in project root:
```env
VITE_SUPABASE_PROJECT_ID="your-project-id"
VITE_SUPABASE_URL="https://your-project-id.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-anon-key-here"
```

### 2.4 Verify Configuration
**Test:** Check the `.env` file exists and has values (not empty).

---

## Step 3: Set Up Database Tables

### 3.1 Open SQL Editor
1. In Supabase Dashboard, click **SQL Editor** (left sidebar)
2. Click **New Query**

### 3.2 Create Documents Table
Copy and paste this SQL, then click **Run**:

```sql
-- Create documents table
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  document_type TEXT,
  extracted_text TEXT,
  processing_status TEXT DEFAULT 'pending',
  ai_analysis JSONB,
  shared BOOLEAN DEFAULT false,
  share_token TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own documents"
ON public.documents FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own documents"
ON public.documents FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents"
ON public.documents FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents"
ON public.documents FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view shared documents"
ON public.documents FOR SELECT
USING (shared = true AND share_token IS NOT NULL);
```

### 3.3 Verify Table Created
**Test:** Go to **Table Editor** → You should see `documents` table.

---

## Step 4: Set Up Storage Bucket

### 4.1 Create Storage Bucket
1. In Supabase Dashboard, click **Storage** (left sidebar)
2. Click **New Bucket**
3. Enter name: `documents`
4. Keep "Public bucket" **UNCHECKED** (private)
5. Click **Create bucket**

### 4.2 Set Storage Policies
1. Click on the `documents` bucket
2. Click **Policies** tab
3. Click **New Policy** → **Create a policy from scratch**

**Policy 1: Upload**
- Name: `Users can upload to own folder`
- Allowed operation: `INSERT`
- Policy definition:
```sql
bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]
```

**Policy 2: Read**
- Name: `Users can read own files`
- Allowed operation: `SELECT`
- Policy definition:
```sql
bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]
```

### 4.3 Verify Storage Ready
**Test:** You should see `documents` bucket with 2 policies.

---

## Step 5: Set Up Authentication

### 5.1 Enable Email Auth
1. Go to **Authentication** → **Providers**
2. Ensure **Email** is enabled
3. (Optional) Disable "Confirm email" for easier testing

### 5.2 Verify Auth Works
**Test:** Go to **Authentication** → **Users** - this page should load without errors.

---

## Step 6: Deploy Edge Functions (Optional - for AI Analysis)

### 6.1 Install Supabase CLI
```bash
npm install -g supabase
```

### 6.2 Login to Supabase
```bash
supabase login
```

### 6.3 Link Project
```bash
supabase link --project-ref your-project-id
```

### 6.4 Set Edge Function Secrets
```bash
supabase secrets set LOVABLE_API_KEY=your-api-key-here
```

### 6.5 Deploy Functions
```bash
supabase functions deploy analyze-document
supabase functions deploy generate-share-token
```

### 6.6 Verify Functions
**Test:** Go to **Edge Functions** in dashboard - you should see your functions listed.

> **Note:** If you skip this step, documents will still upload and OCR will work, but AI analysis won't be available.

---

## Step 7: Run the Application

### 7.1 Start Development Server
```bash
npm run dev
```

### 7.2 Open in Browser
Open: `http://localhost:8080` (or the port shown in terminal)

### 7.3 Verify App Loads
**Expected Result:** You should see the landing page with "Doc Speak Aid" title.

---

## Step 8: Test User Authentication

### 8.1 Create Test Account
1. Click "Get Started" or "Sign Up"
2. Enter email and password
3. Click "Sign Up"

### 8.2 Verify Sign Up
**Test:** You should be redirected to the dashboard after signing up.

**If Error:** Check browser console (F12) for error messages.

---

## Step 9: Test Document Upload

### 9.1 Prepare Test File
Have ready:
- A simple PDF file, OR
- An image (PNG/JPG), OR
- A Word document (.docx)

### 9.2 Upload Document
1. On the dashboard, find the upload area
2. Drag and drop your file, OR click to select
3. Wait for processing

### 9.3 Verify Upload Success
**Expected Result:**
- Progress bar reaches 100%
- "Done" status appears
- Extracted text is displayed

**If Error - Check These:**

| Error | Cause | Solution |
|-------|-------|----------|
| "Authentication required" | Not logged in | Sign in first |
| "Failed to upload file" | Storage bucket missing | Create `documents` bucket |
| "Failed to save document" | Database table missing | Run SQL from Step 3 |
| "Unsupported file type" | Wrong file format | Use PDF, PNG, JPG, DOCX, TXT |

---

## Step 10: Test AI Analysis

### 10.1 Check Analysis Results
After upload, you should see:
- Document type badge
- AI Analysis card with:
  - Summary
  - Key Information
  - Recommended Actions

### 10.2 If No AI Analysis
This means Edge Functions aren't deployed. The app still works, but without AI features.

---

## Step 11: Test Text-to-Speech

### 11.1 Click Listen Button
1. After viewing analysis, click "Listen" button
2. Your browser should read the summary aloud

### 11.2 Test Controls
- Click "Pause" to pause
- Click "Resume" to continue
- Click stop icon to stop completely

### 11.3 Verify Audio Works
**Expected Result:** You hear the document summary spoken aloud.

**If No Sound:**
- Check browser volume
- Check system volume
- Try a different browser

---

## Step 12: Test Document History

### 12.1 View History
Click on "Document History" or similar navigation.

### 12.2 Verify Past Documents
**Expected Result:** You see previously uploaded documents listed.

---

## Troubleshooting Quick Reference

### Browser Console Errors (F12)

| Console Error | Meaning | Fix |
|---------------|---------|-----|
| `401 Unauthorized` | Not logged in | Sign in |
| `403 Forbidden` | RLS policy blocking | Check policies in Supabase |
| `404 Not Found` | Table/bucket doesn't exist | Create it in Supabase |
| `CORS error` | API misconfigured | Check Supabase URL in .env |
| `Network error` | No internet or Supabase down | Check connection |

### Common Issues

**App won't start:**
```bash
# Clear cache and reinstall
rm -rf node_modules
npm install
npm run dev
```

**Build fails:**
```bash
npm run lint  # Check for errors
npm run build # Try build again
```

**Supabase connection fails:**
- Verify `.env` file has correct values
- Check Supabase project is active (not paused)

---

## Feature Testing Checklist

Use this to verify all features work:

### Core Features
- [ ] App loads without errors
- [ ] Can sign up new account
- [ ] Can sign in with existing account
- [ ] Can sign out

### Document Upload
- [ ] Can upload PDF file
- [ ] Can upload image (PNG/JPG)
- [ ] Can upload Word document (.docx)
- [ ] Can upload text file (.txt)
- [ ] Progress bar shows during upload
- [ ] Success message after upload

### Document Processing
- [ ] Text is extracted from PDF
- [ ] Text is extracted from images (OCR)
- [ ] Text is extracted from Word docs
- [ ] Document type is detected

### AI Analysis (requires Edge Functions)
- [ ] Summary is generated
- [ ] Key information is listed
- [ ] Recommended actions are shown
- [ ] Warnings are displayed (if applicable)

### Text-to-Speech
- [ ] Listen button appears
- [ ] Clicking Listen plays audio
- [ ] Pause button works
- [ ] Resume button works
- [ ] Stop button works

### Document Management
- [ ] Can view document history
- [ ] Can copy extracted text
- [ ] Can export to PDF
- [ ] Can share document (get link)

---

## Success! 🎉

If all tests pass, your Doc Speak Aid application is fully functional!

### What You Can Do Now:
1. Upload important documents
2. Get AI-powered analysis and summaries
3. Listen to document explanations
4. Follow recommended action steps
5. Share documents with others

### Need Help?
- Check browser console (F12) for detailed errors
- Verify Supabase dashboard for database/storage issues
- Re-run setup steps if something is missing
