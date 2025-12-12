# 🎙️ DocVox - Voice-Enabled Document Assistant

**Repository:** https://github.com/NithinRegidi/DocVox.git

DocVox is an accessibility-focused document analysis application that helps users understand their documents through AI-powered analysis and voice interactions. Upload documents, get instant summaries, and interact using voice commands in multiple Indian languages.

---

## ✨ Features

### 📄 Document Processing
- **Multi-format Support**: PDF, Images (PNG, JPG, WEBP), Word Documents (.docx), Text files
- **OCR Technology**: Extract text from scanned documents and images
- **AI Analysis**: Automatic document type detection, summaries, key information extraction
- **Smart Deadlines**: AI-detected deadlines and important dates

### 🎤 Voice Commands (7 Languages)
- **Supported Languages**: English, Telugu, Hindi, Tamil, Kannada, Malayalam, Bengali
- **Voice Navigation**: Control the app hands-free with natural language
- **Multi-dialect Support**: Understands regional variations (Hyderabadi Telugu, Mumbai Hindi, etc.)

### 🔊 Text-to-Speech
- **Native Indian Voices**: Sarvam AI integration for authentic Indian language TTS
- **Multiple Providers**: Fallback chain - Sarvam AI → Murf AI → Google Cloud → ElevenLabs → Browser TTS
- **Language Auto-detection**: Automatically speaks in the document's language

### 🌐 Translation
- **20+ Languages**: Translate documents to Hindi, Telugu, Tamil, Bengali, and more
- **Free Fallback**: Works even without API quota using MyMemory translation

### 📱 Additional Features
- **Document Sharing**: Generate shareable links for documents
- **PDF Export**: Download analysis reports as PDFs
- **Reminders**: Set deadline reminders with notifications
- **Tags & Folders**: Organize documents efficiently
- **Smart Search**: Search across all your documents
- **Dark/Light Theme**: Comfortable viewing in any environment

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, shadcn/ui |
| Backend | Supabase (Auth, Database, Storage) |
| AI | Google Gemini API |
| TTS | Sarvam AI, Murf AI, Google Cloud TTS, ElevenLabs |
| Speech | Web Speech API |

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18 or higher
- npm or bun
- Supabase account (free tier works)

### Installation

```bash
# Clone the repository
git clone https://github.com/NithinRegidi/DocVox.git

# Navigate to project directory
cd DocVox

# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Setup

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-anon-key
VITE_GOOGLE_API=your-gemini-api-key
VITE_SARVAM_API_KEY=your-sarvam-api-key (optional)
```

---

## 🎤 Voice Commands

| Command | Action |
|---------|--------|
| "Read summary" / "సారాంశం చదవు" | Read document summary |
| "What are the deadlines" / "గడువులు ఏమిటి" | List important dates |
| "Key information" / "ముఖ్యమైన సమాచారం" | Read key points |
| "Translate to Hindi" / "హిందీలో అనువదించు" | Translate document |
| "Stop" / "ఆపు" | Stop speaking |
| "Help" / "సహాయం" | Show available commands |

---

## 📁 Project Structure

```
DocVox/
├── src/
│   ├── components/     # React components
│   ├── hooks/          # Custom hooks (voice commands, TTS)
│   ├── lib/            # Utilities (TTS, translation, AI)
│   ├── pages/          # Page components
│   └── integrations/   # Supabase integration
├── supabase/
│   ├── functions/      # Edge functions
│   └── migrations/     # Database migrations
└── public/             # Static assets
```

---

## 📖 Documentation

- [Setup Guide](SETUP_GUIDE.md) - Complete installation instructions
- [Testing Guide](TESTING_GUIDE.md) - Feature testing checklist
- [Dialect Support Plan](DIALECT_SUPPORT_PLAN.md) - Regional dialect implementation

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📄 License

This project is open source and available under the MIT License.

---

**Made with ❤️ for accessibility**
