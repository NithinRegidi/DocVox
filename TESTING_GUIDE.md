# DocVox - Feature Testing Guide

**Repository:** https://github.com/NithinRegidi/DocVox.git

Follow these steps in order to test every feature of your application.

---

## 🚀 PHASE 1: Start the Application

### Step 1.1: Open Terminal
```bash
cd d:\MyProjects\doc-speak-aid-main
```

### Step 1.2: Start Dev Server
```bash
npm run dev
```

### Step 1.3: Verify Server Started
**Look for:** `VITE ready` message with URL like `http://localhost:8080`

### Step 1.4: Open Browser
Go to: `http://localhost:8080`

**✅ CHECKPOINT:** You see the landing page with app title
**❌ FAIL:** If blank page, check browser console (F12) for errors

---

## 🔐 PHASE 2: Test Authentication

### Step 2.1: Navigate to Sign Up
Click "Get Started" or "Sign Up" button

**✅ CHECKPOINT:** You see a sign-up form

### Step 2.2: Create New Account
Enter:
- Email: `test@example.com` (use your email)
- Password: `Test123456`

Click "Sign Up"

**✅ CHECKPOINT:** You are redirected to dashboard
**❌ FAIL:** Check if Supabase Auth is enabled

### Step 2.3: Test Sign Out
Find and click "Sign Out" or logout button

**✅ CHECKPOINT:** You return to login/landing page

### Step 2.4: Test Sign In
1. Click "Sign In"
2. Enter same email/password
3. Click "Sign In"

**✅ CHECKPOINT:** You return to dashboard
**❌ FAIL:** Wrong password or account not confirmed

---

## 📄 PHASE 3: Test PDF Upload

### Step 3.1: Prepare PDF File
Find any PDF file on your computer (invoice, receipt, letter, etc.)

### Step 3.2: Upload PDF
1. On dashboard, find upload area
2. Drag & drop PDF file OR click to select
3. Watch progress bar

**✅ CHECKPOINT:** 
- Progress bar fills to 100%
- Status shows "✓ Done"
- Extracted text appears below

**❌ COMMON ERRORS:**

| Error Message | Solution |
|---------------|----------|
| "Authentication required" | Sign in first |
| "Failed to upload file" | Create `documents` bucket in Supabase Storage |
| "Failed to save document" | Run SQL: `ALTER TABLE documents ADD COLUMN ai_analysis JSONB;` |

### Step 3.3: Verify Text Extraction
**✅ CHECKPOINT:** You see extracted text from PDF displayed

---

## 🖼️ PHASE 4: Test Image Upload (OCR)

### Step 4.1: Prepare Image
Find an image with text (photo of document, screenshot, etc.)
Formats: PNG, JPG, JPEG, WEBP

### Step 4.2: Upload Image
1. Click upload area
2. Select image file
3. Wait for OCR processing (may take 10-30 seconds)

**✅ CHECKPOINT:**
- Progress bar completes
- Text from image is extracted and displayed

**Note:** OCR accuracy depends on image quality

---

## 📝 PHASE 5: Test Word Document Upload

### Step 5.1: Prepare Word Document
Find a .docx file (or create one in Word/Google Docs)

### Step 5.2: Upload DOCX
1. Drop or select .docx file
2. Wait for processing

**✅ CHECKPOINT:** Text from Word document is extracted

---

## 📋 PHASE 6: Test Text File Upload

### Step 6.1: Create Test Text File
Create `test.txt` with some content

### Step 6.2: Upload TXT
1. Select the .txt file
2. Should process instantly

**✅ CHECKPOINT:** Text content is displayed

---

## 🤖 PHASE 7: Test AI Analysis

> **Note:** This requires Edge Functions deployed with GEMINI_API_KEY

### Step 7.1: Check for AI Analysis Card
After uploading, look for "🤖 AI Analysis" section

**✅ CHECKPOINT (if configured):**
You see:
- Document Type badge
- Summary section
- "What This Means" explanation
- Key Information bullets
- Warnings (if any, in red)
- "What You Should Do" numbered steps
- Category and Urgency badges

**If AI Analysis is Missing:**
- Edge functions not deployed, OR
- GEMINI_API_KEY not set
- App still works without AI (just no smart analysis)

---

## 🔊 PHASE 8: Test Text-to-Speech

### Step 8.1: Find Listen Button
Look for "Listen" button (with speaker icon) in the document display

### Step 8.2: Start Speech
Click "Listen" button

**✅ CHECKPOINT:** Your browser speaks the document summary aloud

### Step 8.3: Test Pause
While speaking, click "Pause"

**✅ CHECKPOINT:** Speech pauses

### Step 8.4: Test Resume
Click "Resume" (or Play icon)

**✅ CHECKPOINT:** Speech continues from where it stopped

### Step 8.5: Test Stop
Click the Stop button (X icon)

**✅ CHECKPOINT:** Speech stops completely

**❌ IF NO SOUND:**
- Check browser volume
- Check system volume
- Some browsers block autoplay - try clicking Listen again
- Try different browser (Chrome works best)

---

## 📥 PHASE 9: Test Copy to Clipboard

### Step 9.1: Click Copy Button
Find "Copy Text" button and click it

### Step 9.2: Verify Copy
Open any text editor and paste (Ctrl+V)

**✅ CHECKPOINT:** Extracted text is pasted

---

## 📤 PHASE 10: Test PDF Export

### Step 10.1: Click Export PDF
Find "Export PDF" button and click it

### Step 10.2: Check Download
A PDF file should download

### Step 10.3: Open Downloaded PDF
Open the downloaded file

**✅ CHECKPOINT:** PDF contains document analysis report

---

## 🔗 PHASE 11: Test Document Sharing

### Step 11.1: Click Share Button
Find "Share" button and click it

### Step 11.2: Check Share Link
A share link should appear

### Step 11.3: Copy Link
Click "Copy" on the share link

### Step 11.4: Test Share Link
1. Open new incognito/private browser window
2. Paste the share link
3. Visit the URL

**✅ CHECKPOINT:** Document is viewable without login

---

## 📚 PHASE 12: Test Document History

### Step 12.1: Upload Multiple Documents
Upload 2-3 different documents

### Step 12.2: View History
Navigate to "Document History" or similar section

**✅ CHECKPOINT:** You see list of all uploaded documents

### Step 12.3: Click on Old Document
Click on a previously uploaded document

**✅ CHECKPOINT:** Document details and analysis load

---

## 🏷️ PHASE 13: Test Tags (if available)

### Step 13.1: Add Tag
Look for tag management option
Create a new tag (e.g., "Important")

### Step 13.2: Assign Tag
Assign the tag to a document

### Step 13.3: Filter by Tag
Filter documents by the tag

**✅ CHECKPOINT:** Only tagged documents show

---

## 📱 PHASE 14: Test Responsive Design

### Step 14.1: Desktop View
View app in full browser window

**✅ CHECKPOINT:** Layout looks good

### Step 14.2: Tablet View
Resize browser to ~768px width

**✅ CHECKPOINT:** Layout adjusts properly

### Step 14.3: Mobile View
Resize browser to ~375px width (or use mobile device)

**✅ CHECKPOINT:** App is usable on mobile

---

## 🔄 PHASE 15: Test Batch Upload

### Step 15.1: Select Multiple Files
1. Click upload area
2. Select 3-5 files at once (Ctrl+Click)

### Step 15.2: Watch Progress
Each file should show individual progress

**✅ CHECKPOINT:** 
- All files process
- "Batch processing complete" message appears
- Success count matches files uploaded

---

## ✅ FINAL CHECKLIST

Mark each feature as tested:

### Authentication
- [ ] Sign Up works
- [ ] Sign In works  
- [ ] Sign Out works

### File Upload
- [ ] PDF upload works
- [ ] Image upload works (OCR)
- [ ] Word document upload works
- [ ] Text file upload works
- [ ] Batch upload works

### Document Processing
- [ ] Text extraction works
- [ ] Document type detection works
- [ ] AI Analysis appears (if configured)

### Text-to-Speech
- [ ] Listen/Play works
- [ ] Pause works
- [ ] Resume works
- [ ] Stop works

### Document Actions
- [ ] Copy to clipboard works
- [ ] Export to PDF works
- [ ] Share link generation works
- [ ] Shared link access works

### Document Management
- [ ] Document history shows
- [ ] Can view old documents
- [ ] Tag management works (if available)

### UI/UX
- [ ] Desktop layout correct
- [ ] Mobile layout usable
- [ ] No console errors

---

## 🐛 Troubleshooting Reference

### Console Error Quick Fixes

Open browser console with F12, then:

| Error Contains | Meaning | Fix |
|----------------|---------|-----|
| `401` | Not authenticated | Sign in |
| `403` | Permission denied | Check Supabase RLS policies |
| `404` | Resource not found | Create missing table/bucket |
| `422` | Invalid data | Check column exists in database |
| `500` | Server error | Check Edge Function logs |
| `CORS` | Cross-origin blocked | Verify Supabase URL in .env |
| `network` | Connection failed | Check internet & Supabase status |

### Quick Database Fixes

Run in Supabase SQL Editor:

```sql
-- Add missing ai_analysis column
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS ai_analysis JSONB;

-- Add missing sharing columns
ALTER TABLE public.documents 
ADD COLUMN IF NOT EXISTS shared BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS share_token TEXT UNIQUE;
```

### Quick Storage Fix

1. Supabase Dashboard → Storage
2. Create bucket named `documents`
3. Add these policies:

**INSERT Policy:**
```sql
bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]
```

**SELECT Policy:**
```sql
bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]
```

---

## 🎉 All Tests Passed?

Congratulations! Your DocVox application is fully functional!

**Your app now supports:**
- ✅ Multi-format document upload (PDF, Images, Word, Text)
- ✅ Automatic text extraction & OCR
- ✅ AI-powered document analysis
- ✅ Text-to-speech for accessibility
- ✅ Document sharing & export
- ✅ User authentication & document history
