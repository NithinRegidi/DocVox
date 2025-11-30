# 🗣️ Regional Dialect Support - Implementation Plan

## Overview

DocVox aims to support regional dialects across Indian languages to improve voice command recognition accuracy. This document outlines the comprehensive plan for implementing dialect-aware speech processing.

---

## 🎯 The Challenge

The Web Speech API supports language codes like `te-IN` (Telugu-India) but **doesn't have built-in dialect variants**:
- `te-IN-hyderabad` ❌ (doesn't exist)
- `hi-IN-mumbai` ❌ (doesn't exist)

### Our Solution: Custom Dialect Correction Layer

```
┌─────────────────┐     ┌──────────────┐     ┌───────────────────┐     ┌────────────────┐
│  User Speaks    │ ──▶ │  Speech API  │ ──▶ │ Dialect Detector  │ ──▶ │ Intent Matcher │
│  (Hyderabadi)   │     │  (Raw Text)  │     │ + Corrections     │     │                │
└─────────────────┘     └──────────────┘     └───────────────────┘     └────────────────┘
        │                      │                      │                        │
        │                      ▼                      ▼                        ▼
        │               "emi chestunnav"      "em chestunnaru"          INTENT: HELP
        │                 (Hyderabadi)          (Standard)
```

---

## 📊 Supported Dialects

### Telugu Dialects (తెలుగు మాండలికాలు)

| Dialect | Region | Code | Population | Characteristics |
|---------|--------|------|------------|-----------------|
| **Standard Telugu** | Literary/Formal | `te-standard` | - | News, textbooks, formal speech |
| **Telangana Telugu** | Telangana | `te-telangana` | ~35M | Hyderabadi influence, unique vocabulary |
| **Coastal Andhra** | Krishna, Guntur, Vizag | `te-coastal` | ~25M | Softer pronunciation, formal endings |
| **Rayalaseema** | Kurnool, Anantapur, Kadapa | `te-rayalaseema` | ~15M | Distinct vocabulary, harder consonants |
| **Uttarandhra** | Srikakulam, Vizianagaram | `te-uttarandhra` | ~8M | Odia influence, unique expressions |

### Hindi Dialects (हिंदी बोलियाँ)

| Dialect | Region | Code | Population | Characteristics |
|---------|--------|------|------------|-----------------|
| **Standard Hindi** | Khariboli | `hi-standard` | - | News, official communication |
| **Mumbai Hindi** | Maharashtra | `hi-mumbai` | ~20M | Marathi influence, "bole to", "apun" |
| **Delhi Hindi** | NCR | `hi-delhi` | ~30M | Urban slang, English mixing |
| **UP Hindi** | Uttar Pradesh | `hi-up` | ~200M | Awadhi/Bhojpuri influence |
| **Bihari Hindi** | Bihar, Jharkhand | `hi-bihari` | ~100M | Maithili/Magahi influence |
| **Rajasthani Hindi** | Rajasthan | `hi-rajasthani` | ~50M | Marwari influence |

### Tamil Dialects (தமிழ் வட்டார வழக்குகள்)

| Dialect | Region | Code | Population | Characteristics |
|---------|--------|------|------------|-----------------|
| **Standard Tamil** | Literary | `ta-standard` | - | News, formal speech |
| **Chennai Tamil** | Chennai | `ta-chennai` | ~10M | Urban, English mixing |
| **Madurai Tamil** | Madurai | `ta-madurai` | ~8M | Traditional, distinct vocabulary |
| **Coimbatore Tamil** | Kongu Nadu | `ta-kongu` | ~7M | Kannada influence |
| **Sri Lankan Tamil** | Jaffna | `ta-srilanka` | ~3M | Distinct pronunciation |

### Kannada Dialects (ಕನ್ನಡ ಉಪಭಾಷೆಗಳು)

| Dialect | Region | Code | Population | Characteristics |
|---------|--------|------|------------|-----------------|
| **Standard Kannada** | Literary | `kn-standard` | - | News, textbooks |
| **Bengaluru Kannada** | Bangalore | `kn-bengaluru` | ~12M | Urban, English/Tamil mixing |
| **Dharwad Kannada** | North Karnataka | `kn-dharwad` | ~10M | Marathi influence |
| **Mangalore Kannada** | Coastal | `kn-mangalore` | ~5M | Tulu/Konkani influence |
| **Mysore Kannada** | Old Mysore | `kn-mysore` | ~15M | Traditional, considered "pure" |

### Bengali Dialects (বাংলা উপভাষা)

| Dialect | Region | Code | Population | Characteristics |
|---------|--------|------|------------|-----------------|
| **Standard Bengali** | Kolkata | `bn-standard` | - | Literary, news |
| **Kolkata Bengali** | West Bengal | `bn-kolkata` | ~50M | Urban, English mixing |
| **Bangladesh Bengali** | Bangladesh | `bn-bangladesh` | ~170M | Different vocabulary, pronunciation |
| **Sylheti** | Sylhet | `bn-sylheti` | ~10M | Distinct, almost separate language |

### Malayalam Dialects (മലയാളം ഭാഷാഭേദങ്ങൾ)

| Dialect | Region | Code | Population | Characteristics |
|---------|--------|------|------------|-----------------|
| **Standard Malayalam** | Literary | `ml-standard` | - | News, formal |
| **Trivandrum** | Thiruvananthapuram | `ml-trivandrum` | ~5M | Tamil influence |
| **Kochi** | Ernakulam | `ml-kochi` | ~5M | Urban, cosmopolitan |
| **Malabar** | North Kerala | `ml-malabar` | ~10M | Arabic/Urdu influence (Mappila) |
| **Thrissur** | Central Kerala | `ml-thrissur` | ~5M | Considered "standard" by many |

---

## 🔤 Dialect Vocabulary Mapping

### Telugu Dialect Corrections

#### Telangana/Hyderabadi Telugu (`te-telangana`)

| Dialect Word | Standard Form | English Meaning | Usage Context |
|--------------|---------------|-----------------|---------------|
| `nakku` | `naaku` | to me | Informal speech |
| `emundi` | `emiti` | what is it | Greeting/question |
| `theesuko` | `tiskondi` | take it | Command |
| `cheppu ra` | `cheppandi` | tell me | Informal request |
| `entra` / `entri` | `emiti` | what | Casual question |
| `chadvu` | `chadavandi` | read | Command |
| `apu` | `aapu` | stop | Command |
| `ra` / `ri` | `andi` | (suffix) | Informal address |
| `em` | `emi` | what | Question |
| `endhi` | `emiti` | what is | Question |
| `saaramsha` | `saaramsam` | summary | Noun |
| `gadhuvu` | `gaduvu` | deadline | Noun |
| `mukhya` | `mukhyam` | important | Adjective |
| `hechrika` | `hechcharika` | warning | Noun |
| `saayam` | `sahayam` | help | Noun |
| `panchuko` | `panchuko` | share | Command |
| `nilpu` | `nilipiveyu` | stop | Command |

#### Coastal Andhra Telugu (`te-coastal`)

| Dialect Word | Standard Form | English Meaning | Usage Context |
|--------------|---------------|-----------------|---------------|
| `andi` | `andi` | (polite suffix) | Formal address |
| `garu` | `garu` | (respect suffix) | Formal address |
| `cheppandi` | `cheppandi` | please tell | Polite request |
| `chadavandi` | `chadavandi` | please read | Polite request |
| `saramshamu` | `saaramsam` | summary | Formal |
| `vishayamu` | `vishayam` | matter/info | Formal |
| `telupu` | `cheppandi` | inform | Formal |

#### Rayalaseema Telugu (`te-rayalaseema`)

| Dialect Word | Standard Form | English Meaning | Usage Context |
|--------------|---------------|-----------------|---------------|
| `entidi` | `emiti` | what is it | Question |
| `teeskondi` | `tiskondi` | take | Command |
| `naa` | `naaku` | to me | Informal |
| `raa` / `vaa` | `randi` | come | Informal invite |
| `saramsh` | `saaramsam` | summary | Noun |
| `gadvu` | `gaduvu` | deadline | Noun |

---

### Hindi Dialect Corrections

#### Mumbai Hindi (`hi-mumbai`)

| Dialect Word | Standard Form | English Meaning | Usage Context |
|--------------|---------------|-----------------|---------------|
| `bole to` | (remove) | meaning/like | Filler word |
| `kya re` | `kya` | what | Casual question |
| `apun` | `main` | I | Self-reference |
| `mereko` | `mujhe` | to me | Object pronoun |
| `tereko` | `tujhe` | to you | Object pronoun |
| `idhar` | `yahan` | here | Location |
| `udhar` | `wahan` | there | Location |
| `bol` | `bolo` | speak | Command |
| `dekh` | `dekho` | look/see | Command |
| `jhakkas` | `bahut accha` | great/awesome | Praise |
| `lafda` | `samasya` | problem | Issue |
| `scene` | `sthiti` | situation | Context |
| `setting` | `vyavastha` | arrangement | Plan |
| `bindaas` | `nischint` | carefree | Attitude |
| `aisa kaisa` | `aisa kaise` | how is this | Question |
| `kya bolta` | `kya kehte` | what do you say | Question |

#### UP Hindi (`hi-up`)

| Dialect Word | Standard Form | English Meaning | Usage Context |
|--------------|---------------|-----------------|---------------|
| `ka` | `kya` | what | Question |
| `hamaar` | `hamara` | our | Possessive |
| `tohar` | `tumhara` | your | Possessive |
| `rauwa` | `aap` | you (formal) | Address |
| `hum` | `main` | I | Self-reference |
| `kaisan` | `kaisa` | how | Question |
| `kahaan` | `kahan` | where | Question |
| `hoibe` | `hoga` | will be | Future tense |
| `bhaiya` | (respect term) | brother | Address |
| `kaahe` | `kyun` | why | Question |
| `raur` | `aapka` | your (formal) | Possessive |
| `aur ka` | `aur kya` | what else | Question |

#### Delhi Hindi (`hi-delhi`)

| Dialect Word | Standard Form | English Meaning | Usage Context |
|--------------|---------------|-----------------|---------------|
| `yaar` | (filler) | friend | Address |
| `chal` | `chalo` | let's go | Suggestion |
| `theek hai na` | `theek hai` | okay? | Confirmation |
| `matlab` | (filler) | meaning | Explanation |
| `basically` | (remove) | basically | Filler |
| `scene kya hai` | `sthiti kya hai` | what's the situation | Question |
| `tension mat le` | `chinta mat karo` | don't worry | Advice |

#### Bihari Hindi (`hi-bihari`)

| Dialect Word | Standard Form | English Meaning | Usage Context |
|--------------|---------------|-----------------|---------------|
| `ka ho` | `kya hai` | what is | Question |
| `kaisan ba` | `kaisa hai` | how is | Question |
| `rauwa` | `aap` | you | Formal address |
| `hamni` | `hum log` | we (plural) | Group reference |
| `okar` | `uska` | his/her | Possessive |
| `hawa` | `hai` | is | Verb |
| `ba` | `hai` | is | Verb (suffix) |
| `gail` | `gaya` | went | Past tense |
| `bujhlu` | `samjhe` | understand? | Question |

---

### Tamil Dialect Corrections

#### Chennai Tamil (`ta-chennai`)

| Dialect Word | Standard Form | English Meaning | Usage Context |
|--------------|---------------|-----------------|---------------|
| `da` / `di` | (informal suffix) | (address) | Casual |
| `machan` | (slang) | friend/bro | Address |
| `scene` | `nilai` | situation | Context |
| `waste` | `veNdam` | don't want | Rejection |
| `chance` | `vaaipu` | opportunity | Possibility |
| `matter` | `vishayam` | matter | Topic |
| `tension` | `kavalaI` | worry | Emotion |

#### Madurai Tamil (`ta-madurai`)

| Dialect Word | Standard Form | English Meaning | Usage Context |
|--------------|---------------|-----------------|---------------|
| `enna` | `enna` | what | Question |
| `ponga` | `pOngaL` | go (polite) | Command |
| `vaanga` | `vaaruNgaL` | come (polite) | Invite |
| `sollu` | `sollungaL` | say (polite) | Request |
| `paru` | `paarungaL` | see/look | Command |

---

## 🔍 Dialect Detection Algorithm

### Marker-Based Detection

```typescript
const DIALECT_MARKERS: Record<string, string[]> = {
  // Telugu dialects
  'te-telangana': ['nakku', 'emundi', 'theesuko', 'em', 'endhi', 'ra', 'ri', 'entra', 'entri'],
  'te-coastal': ['andi', 'garu', 'cheppandi', 'chadavandi', 'ండి', 'గారు'],
  'te-rayalaseema': ['entidi', 'teeskondi', 'naa', 'raa', 'vaa'],
  
  // Hindi dialects
  'hi-mumbai': ['bole to', 'kya re', 'apun', 'mereko', 'tereko', 'jhakkas', 'bindaas'],
  'hi-up': ['ka', 'hamaar', 'tohar', 'rauwa', 'hum', 'hoibe', 'kaahe'],
  'hi-delhi': ['yaar', 'chal', 'theek hai na', 'matlab', 'basically', 'scene'],
  'hi-bihari': ['ka ho', 'kaisan ba', 'rauwa', 'hamni', 'okar', 'hawa', 'ba', 'gail'],
  
  // Tamil dialects
  'ta-chennai': ['da', 'di', 'machan', 'scene', 'waste', 'tension'],
  'ta-madurai': ['ponga', 'vaanga', 'sollu', 'paru'],
  
  // Kannada dialects
  'kn-bengaluru': ['guru', 'maga', 'swalpa', 'adjust'],
  'kn-dharwad': ['appa', 'barri', 'hogri'],
  
  // Bengali dialects
  'bn-kolkata': ['dada', 'didi', 'ki re', 'arre'],
  
  // Malayalam dialects
  'ml-malabar': ['ikka', 'itha', 'pore'],
  'ml-trivandrum': ['alle', 'ille', 'enthu'],
};

function detectDialect(text: string, baseLanguage: string): string {
  const scores: Record<string, number> = {};
  const lowerText = text.toLowerCase();
  
  // Check each dialect's markers
  for (const [dialect, markers] of Object.entries(DIALECT_MARKERS)) {
    if (!dialect.startsWith(baseLanguage.split('-')[0])) continue;
    
    let score = 0;
    for (const marker of markers) {
      if (lowerText.includes(marker)) {
        score += 1;
        // Bonus for unique markers
        if (markers.length <= 5) score += 0.5;
      }
    }
    scores[dialect] = score;
  }
  
  // Return dialect with highest score
  const entries = Object.entries(scores);
  if (entries.length === 0) return `${baseLanguage.split('-')[0]}-standard`;
  
  const [bestDialect, bestScore] = entries.reduce((a, b) => a[1] > b[1] ? a : b);
  return bestScore > 0 ? bestDialect : `${baseLanguage.split('-')[0]}-standard`;
}
```

---

## 🧠 Adaptive Learning System

### User Profile Structure

```typescript
interface UserDialectProfile {
  userId: string;
  primaryLanguage: string;           // e.g., 'te-IN'
  detectedDialect: string;           // e.g., 'te-telangana'
  dialectConfidence: number;         // 0.0 to 1.0
  customCorrections: Map<string, string>; // User-specific mappings
  commandHistory: CommandRecord[];   // Last 100 commands
  lastUpdated: Date;
}

interface CommandRecord {
  timestamp: Date;
  spokenText: string;
  detectedIntent: string;
  wasSuccessful: boolean;
  correctedTo?: string;              // If user corrected it
}
```

### Learning Algorithm

```typescript
function learnFromInteraction(
  profile: UserDialectProfile,
  spokenText: string,
  intendedCommand: string,
  wasSuccessful: boolean
): UserDialectProfile {
  // 1. Update dialect detection confidence
  const newDialect = detectDialect(spokenText, profile.primaryLanguage);
  if (newDialect === profile.detectedDialect) {
    profile.dialectConfidence = Math.min(1.0, profile.dialectConfidence + 0.05);
  } else {
    profile.dialectConfidence *= 0.95; // Decay confidence
    if (profile.dialectConfidence < 0.3) {
      profile.detectedDialect = newDialect;
      profile.dialectConfidence = 0.5;
    }
  }
  
  // 2. Learn new patterns from failures
  if (!wasSuccessful && intendedCommand) {
    const words = spokenText.toLowerCase().split(/\s+/);
    const intentWords = getIntentKeywords(intendedCommand);
    
    // Find which word might map to the intent
    for (const word of words) {
      if (!isCommonWord(word) && !profile.customCorrections.has(word)) {
        // This might be a dialect-specific word for this command
        profile.customCorrections.set(word, intentWords[0]);
      }
    }
  }
  
  // 3. Record in history
  profile.commandHistory.push({
    timestamp: new Date(),
    spokenText,
    detectedIntent: intendedCommand,
    wasSuccessful,
  });
  
  // Keep only last 100
  if (profile.commandHistory.length > 100) {
    profile.commandHistory.shift();
  }
  
  profile.lastUpdated = new Date();
  return profile;
}
```

---

## 🖥️ User Interface Design

### Dialect Selection UI

```
┌─────────────────────────────────────────────────────────────┐
│ 🌐 Voice Language & Dialect Settings                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Primary Language:  [Telugu (తెలుగు)        ▼]              │
│                                                             │
│ Regional Dialect:  [○ Auto-detect (Recommended)    ]        │
│                    [○ Standard Telugu (శుద్ధ తెలుగు)]       │
│                    [● Telangana (తెలంగాణ)          ]        │
│                    [○ Coastal Andhra (కోస్తా)       ]        │
│                    [○ Rayalaseema (రాయలసీమ)        ]        │
│                                                             │
│ ─────────────────────────────────────────────────────────── │
│                                                             │
│ 🧠 Smart Learning:  [● Enabled]  [○ Disabled]              │
│    Learn my speech patterns over time                       │
│                                                             │
│ Custom Words: (3 learned)                                   │
│    "entra" → summary                                        │
│    "chadvu" → read                                          │
│    "apu" → stop                                             │
│    [Clear All] [Export]                                     │
│                                                             │
│                              [Save Settings]                │
└─────────────────────────────────────────────────────────────┘
```

### Quick Dialect Switcher (Floating)

```
┌──────────────────────┐
│ 🎤 Listening...      │
│ Dialect: Telangana   │
│ [Coastal] [Standard] │
└──────────────────────┘
```

---

## 📈 Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Create `dialectCorrections.ts` with all mappings
- [ ] Implement `detectDialect()` function
- [ ] Add dialect to `SPEECH_CORRECTIONS` pipeline
- [ ] Unit tests for all dialects

### Phase 2: UI Integration (Week 2)
- [ ] Add dialect selector to VoiceCommandButton
- [ ] Create dialect settings page
- [ ] Store user preference in localStorage
- [ ] Show detected dialect in UI

### Phase 3: Learning System (Week 3)
- [ ] Implement `UserDialectProfile` storage
- [ ] Create learning algorithm
- [ ] Add "Correct this" button for failures
- [ ] Analytics dashboard for patterns

### Phase 4: Refinement (Week 4)
- [ ] Collect user feedback
- [ ] Expand vocabulary mappings
- [ ] Optimize detection accuracy
- [ ] Performance testing

---

## 📊 Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Recognition accuracy | >90% | Correct intents / Total commands |
| Dialect detection accuracy | >85% | Correct dialect / Total detections |
| User satisfaction | >4.5/5 | In-app rating |
| Learning improvement | +10% | Accuracy after 50 commands |
| Response time | <500ms | Time from speech end to intent |

---

## 🔧 Technical Requirements

### Dependencies
- No additional libraries required
- Uses existing Web Speech API
- LocalStorage for user profiles
- Optional: IndexedDB for larger datasets

### Browser Support
- Chrome 80+ (best recognition)
- Edge 80+
- Safari 14+ (limited)
- Firefox (not supported for speech)

### Storage Requirements
- User profile: ~10KB per user
- Dialect mappings: ~50KB total
- Command history: ~100KB max

---

## 📚 References

### Linguistic Resources
- [Telugu Dialects - Wikipedia](https://en.wikipedia.org/wiki/Telugu_dialects)
- [Hindi Dialects - Wikipedia](https://en.wikipedia.org/wiki/Hindi_Belt)
- [Linguistic Survey of India](https://censusindia.gov.in/)

### Technical Resources
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [Google Cloud Speech-to-Text](https://cloud.google.com/speech-to-text/docs/languages)

---

## 🤝 Contributing

To add a new dialect:

1. Create vocabulary mapping in `DIALECT_CORRECTIONS`
2. Add detection markers in `DIALECT_MARKERS`
3. Add to `DIALECT_OPTIONS` for UI
4. Test with native speakers
5. Submit PR with test recordings

---

*Document Version: 1.0*
*Last Updated: December 2025*
*Author: DocVox Development Team*
