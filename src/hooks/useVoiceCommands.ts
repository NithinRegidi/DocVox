/**
 * Voice Command Navigation Hook
 * 100% Token-Free - Uses pattern matching and cached data only
 * No Gemini API calls - all processing is local
 */

import { useState, useCallback, useRef } from 'react';
import { useSpeechRecognition } from './useSpeechRecognition';
import { AIAnalysis } from '@/integrations/supabase/types';

// Supported languages for voice commands
const VOICE_LANGUAGES: Record<string, string> = {
  'telugu': 'te-IN',
  'hindi': 'hi-IN',
  'tamil': 'ta-IN',
  'kannada': 'kn-IN',
  'malayalam': 'ml-IN',
  'marathi': 'mr-IN',
  'bengali': 'bn-IN',
  'gujarati': 'gu-IN',
  'punjabi': 'pa-IN',
  'english': 'en-IN',
};

// Intent patterns - Simplified for better matching
// Priority: Single words first, then phrases
// All lowercase for matching
// Telugu patterns use phonetic representations (lowercase)
const INTENT_PATTERNS: Record<string, string[]> = {
  // HIGH PRIORITY - Single word triggers (most reliable)
  READ_SUMMARY: [
    // English
    'summary', 'summarize', 'summarise', 'summery', 'some marie', 'some mary', 'samari',
    'read', 'explain', 'tell',
    // Telugu
    'సారాంశం', 'సారాంశ', 'చదవండి', 'చదువు', 'చెప్పండి', 'చెప్పు',
    'saaramsam', 'saaram', 'chadavandi', 'chepandi', 'cheppu',
    // Tamil
    'சுருக்கம்', 'சாரம்', 'படிக்க', 'சொல்', 'விளக்கு',
    'surukkam', 'saaram', 'padikka', 'sol', 'vilakku',
    // Kannada
    'ಸಾರಾಂಶ', 'ಓದು', 'ಹೇಳು', 'ವಿವರಿಸು',
    'saaramsha', 'odu', 'helu', 'vivarisu',
    // Malayalam
    'സംഗ്രഹം', 'വായിക്കുക', 'പറയുക', 'വിശദീകരിക്കുക',
    'samgraham', 'vaayikkuka', 'parayuka', 'vishadeekarikkuka',
    // Bengali
    'সারসংক্ষেপ', 'সারাংশ', 'পড়ো', 'বলো', 'ব্যাখ্যা',
    'sarsankhep', 'saransh', 'poro', 'bolo', 'byakhya',
  ],
  GET_DEADLINES: [
    // English
    'deadline', 'deadlines', 'date', 'dates', 'when', 'due', 'expiry', 'expires', 'validity',
    // Telugu
    'గడువు', 'గడువులు', 'తేదీ', 'తేదీలు', 'ఎప్పుడు', 'కాలం',
    'gaduvu', 'teedi', 'teduvu', 'appudu', 'kalam',
    // Tamil
    'காலக்கெடு', 'தேதி', 'எப்போது', 'காலம்', 'முடிவு',
    'kaalakkedu', 'thethi', 'eppothu', 'kaalam', 'mudivu',
    // Kannada
    'ಗಡುವು', 'ದಿನಾಂಕ', 'ಯಾವಾಗ', 'ಅವಧಿ',
    'gaduvu', 'dinaanka', 'yaavaaga', 'avadhi',
    // Malayalam
    'അവസാന തീയതി', 'തീയതി', 'എപ്പോൾ', 'കാലാവധി',
    'avasaana theeyathi', 'theeyathi', 'eppol', 'kaalaavadhi',
    // Bengali
    'সময়সীমা', 'তারিখ', 'কখন', 'শেষ তারিখ',
    'somoyseema', 'tarikh', 'kokhon', 'shesh tarikh',
  ],
  GET_KEY_INFO: [
    // English
    'important', 'key', 'info', 'information', 'details', 'highlights', 'points', 'main',
    // Telugu
    'ముఖ్యమైన', 'ముఖ్యమైనవి', 'సమాచారం', 'విషయాలు', 'వివరాలు',
    'mukhya', 'mukhyam', 'samacharam', 'vishayalu', 'vivaraalu',
    // Tamil
    'முக்கியம்', 'முக்கிய', 'தகவல்', 'விவரங்கள்', 'புள்ளிகள்',
    'mukkiyam', 'mukkiya', 'thagaval', 'vivarangal', 'pulligal',
    // Kannada
    'ಮುಖ್ಯ', 'ಮಾಹಿತಿ', 'ವಿವರಗಳು', 'ಅಂಶಗಳು',
    'mukhya', 'maahiti', 'vivaragalu', 'amshagalu',
    // Malayalam
    'പ്രധാനം', 'വിവരങ്ങൾ', 'വിശദാംശങ്ങൾ', 'പോയിന്റുകൾ',
    'pradhaanam', 'vivarangal', 'vishadaamshangal', 'pointukal',
    // Bengali
    'গুরুত্বপূর্ণ', 'তথ্য', 'বিবরণ', 'মূল বিষয়',
    'gurutwopurno', 'tothyo', 'bibaron', 'mul bishoy',
  ],
  WARNINGS: [
    // English
    'warning', 'warnings', 'problem', 'problems', 'issue', 'issues', 'concern', 'concerns', 'risk', 'risks',
    // Telugu
    'హెచ్చరికలు', 'హెచ్చరిక', 'సమస్య', 'సమస్యలు', 'ఆపద', 'ఖతరా',
    'hechcharika', 'samasya', 'apada', 'khatara',
    // Tamil
    'எச்சரிக்கை', 'பிரச்சினை', 'சிக்கல்', 'ஆபத்து',
    'echarikkai', 'pirachchinai', 'sikkal', 'aapathu',
    // Kannada
    'ಎಚ್ಚರಿಕೆ', 'ಸಮಸ್ಯೆ', 'ಅಪಾಯ', 'ತೊಂದರೆ',
    'echcharike', 'samasye', 'apaaya', 'tondare',
    // Malayalam
    'മുന്നറിയിപ്പ്', 'പ്രശ്നം', 'അപകടം',
    'munnariyippu', 'prashnam', 'apakadam',
    // Bengali
    'সতর্কতা', 'সমস্যা', 'ঝুঁকি', 'বিপদ',
    'sotorkota', 'somosya', 'jhunki', 'bipod',
  ],
  GET_TYPE: [
    // English
    'type', 'kind', 'category', 'classify', 'classification',
    // Telugu
    'రకం', 'రకాలు', 'విధమైన', 'వర్గం', 'రకమేది',
    'rakam', 'vidha', 'vargam',
    // Tamil
    'வகை', 'பிரிவு', 'வகைப்படுத்து',
    'vagai', 'pirivu', 'vagaipaduthu',
    // Kannada
    'ವಿಧ', 'ಪ್ರಕಾರ', 'ವರ್ಗ',
    'vidha', 'prakaara', 'varga',
    // Malayalam
    'തരം', 'വിഭാഗം', 'തരം തിരിക്കുക',
    'tharam', 'vibhaagam', 'tharam thirikkuka',
    // Bengali
    'ধরণ', 'প্রকার', 'শ্রেণী',
    'dhoron', 'prokar', 'shreni',
  ],
  GET_ACTIONS: [
    // English
    'action', 'actions', 'todo', 'step', 'steps', 'do',
    // Telugu
    'చేయవలసిన', 'చేయాలి', 'క్రమం', 'పయనాలు', 'సూచన',
    'cheya', 'cheyavalu', 'kramamaa', 'payana', 'suuchana',
    // Tamil
    'செயல்', 'செய்ய வேண்டியவை', 'படி', 'என்ன செய்ய',
    'seyal', 'seyya vendiyavai', 'padi', 'enna seyya',
    // Kannada
    'ಕ್ರಿಯೆ', 'ಹೆಜ್ಜೆ', 'ಏನು ಮಾಡಬೇಕು',
    'kriye', 'hejje', 'enu maadabeku',
    // Malayalam
    'നടപടി', 'ഘട്ടങ്ങൾ', 'എന്ത് ചെയ്യണം',
    'nadapadi', 'ghattangal', 'enthu cheyyaNam',
    // Bengali
    'কাজ', 'পদক্ষেপ', 'কী করতে হবে',
    'kaaj', 'podokkhep', 'ki korte hobe',
  ],
  GET_AMOUNT: [
    // English
    'amount', 'money', 'price', 'cost', 'fee', 'payment', 'pay', 'total', 'rupees', 'dollars',
    // Telugu
    'అంతా', 'ఆ', 'ధర', 'ధరలు', 'ఖర్చు', 'సరిపెట్టుకో', 'చెల్లించు',
    'anta', 'dhara', 'kharchu', 'sari', 'chellinca',
    // Tamil
    'தொகை', 'விலை', 'செலவு', 'கட்டணம்', 'ரூபாய்',
    'thogai', 'vilai', 'selavu', 'kattanam', 'roopaai',
    // Kannada
    'ಮೊತ್ತ', 'ಬೆಲೆ', 'ಖರ್ಚು', 'ಶುಲ್ಕ', 'ರೂಪಾಯಿ',
    'motta', 'bele', 'kharchu', 'shulka', 'roopayi',
    // Malayalam
    'തുക', 'വില', 'ചെലവ്', 'ഫീസ്', 'രൂപ',
    'thuka', 'vila', 'chelavu', 'fees', 'roopa',
    // Bengali
    'পরিমাণ', 'দাম', 'খরচ', 'ফি', 'টাকা',
    'porimaaN', 'daam', 'khoroch', 'fee', 'taka',
  ],
  STOP: [
    // English
    'stop', 'pause', 'quiet', 'silence', 'cancel', 'enough', 'ok', 'okay', 'thanks', 'thank',
    // Telugu
    'ఆపు', 'నిలిపివేయు', 'సరిగా', 'సరి', 'ఆపేసేయు',
    'aapu', 'nilipuvu', 'sariga', 'aapeseyu',
    // Tamil
    'நிறுத்து', 'போதும்', 'நன்றி', 'சரி',
    'niruthu', 'pothum', 'nandri', 'sari',
    // Kannada
    'ನಿಲ್ಲಿಸು', 'ಸಾಕು', 'ಧನ್ಯವಾದ', 'ಸರಿ',
    'nillisu', 'saaku', 'dhanyavaada', 'sari',
    // Malayalam
    'നിർത്തുക', 'മതി', 'നന്ദി', 'ശരി',
    'nirthuka', 'mathi', 'nandi', 'shari',
    // Bengali
    'থামো', 'যথেষ্ট', 'ধন্যবাদ', 'ঠিক আছে',
    'thamo', 'jotheshto', 'dhonnobad', 'thik ache',
  ],
  HELP: [
    // English
    'help', 'commands', 'options', 'how', 'what can',
    // Telugu
    'సహాయం', 'సహాయ', 'ఆదేశాలు', 'ఎలా', 'ఏమిటి', 'గురించి',
    'sahayam', 'ela', 'emiti', 'aadeshalu',
    // Tamil
    'உதவி', 'கட்டளைகள்', 'எப்படி', 'என்ன',
    'udhavi', 'kattalaikal', 'eppadi', 'enna',
    // Kannada
    'ಸಹಾಯ', 'ಆದೇಶಗಳು', 'ಹೇಗೆ', 'ಏನು',
    'sahaaya', 'aadeshagalu', 'hege', 'enu',
    // Malayalam
    'സഹായം', 'കമാൻഡുകൾ', 'എങ്ങനെ', 'എന്ത്',
    'sahaayam', 'kammandukal', 'engane', 'enthu',
    // Bengali
    'সাহায্য', 'কমান্ড', 'কীভাবে', 'কী',
    'sahajyo', 'command', 'kibhabe', 'ki',
  ],
  REPEAT: [
    // English
    'repeat', 'again', 'pardon', 'sorry', 'once more',
    // Telugu
    'నిరిక్షించు', 'మళ్లీ', 'మరోసారి', 'పునరావృత్తి', 'అది',
    'nirikshinchu', 'malli', 'marosari', 'punaraavritti',
    // Tamil
    'மீண்டும்', 'திரும்ப', 'மன்னிக்கவும்',
    'meendum', 'thirumba', 'mannikkavum',
    // Kannada
    'ಮತ್ತೊಮ್ಮೆ', 'ಪುನರಾವರ್ತಿಸು', 'ಕ್ಷಮಿಸಿ',
    'mattomme', 'punaraavardhisu', 'kshamisi',
    // Malayalam
    'ആവർത്തിക്കുക', 'വീണ്ടും', 'ക്ഷമിക്കണം',
    'aavarththikkuka', 'veendum', 'kshamikkaNam',
    // Bengali
    'আবার', 'পুনরায়', 'মাফ করবেন',
    'aabar', 'punoraye', 'maaf korben',
  ],
  DOWNLOAD: [
    // English
    'download', 'save', 'export', 'pdf',
    // Telugu
    'డౌన్‌లోడ్', 'సేవ్', 'నిల్వ చేయు', 'వెలిపెట్టు', 'ఎక్స్‌పోర్ట్',
    'download', 'save', 'nilva', 'velipedu', 'export',
    // Tamil
    'பதிவிறக்கம்', 'சேமி', 'ஏற்றுமதி',
    'pathivirakkam', 'saemi', 'erumathi',
    // Kannada
    'ಡೌನ್‌ಲೋಡ್', 'ಉಳಿಸು', 'ರಫ್ತು',
    'download', 'ulisu', 'raphtu',
    // Malayalam
    'ഡൗൺലോഡ്', 'സേവ്', 'എക്സ്പോർട്ട്',
    'download', 'save', 'export',
    // Bengali
    'ডাউনলোড', 'সংরক্ষণ', 'এক্সপোর্ট',
    'download', 'shongrokkhon', 'export',
  ],
  SHARE: [
    // English
    'share', 'send', 'link',
    // Telugu
    'పంచుకో', 'పంపించు', 'లింక్', 'పంచు', 'పంపుతూ',
    'panchuko', 'pampinchu', 'panchu', 'link',
    // Tamil
    'பகிர்', 'அனுப்பு', 'இணைப்பு',
    'pagir', 'anuppu', 'inaippu',
    // Kannada
    'ಹಂಚು', 'ಕಳುಹಿಸು', 'ಲಿಂಕ್',
    'hanchu', 'kaluhisu', 'link',
    // Malayalam
    'പങ്കിടുക', 'അയയ്ക്കുക', 'ലിങ്ക്',
    'pangiduka', 'ayaykkuka', 'link',
    // Bengali
    'শেয়ার', 'পাঠাও', 'লিংক',
    'share', 'pathao', 'link',
  ],
  READ_FULL: [
    // English
    'full', 'everything', 'all', 'entire', 'complete', 'whole',
    // Telugu
    'పూర్తిగా', 'అందరికి', 'సంపూర్ణ', 'మొత్తం', 'సమ్మతుకు',
    'purtiga', 'sampurna', 'mottam', 'andariki',
    // Tamil
    'முழு', 'எல்லாம்', 'முழுமையான', 'மொத்த',
    'muzhu', 'ellaam', 'mulumaiyaana', 'motha',
    // Kannada
    'ಪೂರ್ಣ', 'ಎಲ್ಲ', 'ಸಂಪೂರ್ಣ', 'ಮೊತ್ತ',
    'poorna', 'ella', 'sampoorna', 'motta',
    // Malayalam
    'മുഴുവൻ', 'എല്ലാം', 'സമ്പൂർണ്ണം',
    'muzhuvan', 'ellaam', 'sampoorNNam',
    // Bengali
    'পুরো', 'সব', 'সম্পূর্ণ', 'মোট',
    'puro', 'sob', 'shompurno', 'mot',
  ],
  TRANSLATE: [
    // English
    'translate', 'telugu', 'hindi', 'tamil', 'kannada', 'malayalam', 'language',
    // Telugu
    'అనువాదం', 'భాష', 'మార్పు చేయు', 'ఆంధ్ర', 'హిందీ', 'తమిళ్',
    'anuvvadham', 'bhasha', 'maarpu', 'andhra', 'hindi', 'tamil',
    // Tamil
    'மொழிபெயர்', 'மொழி', 'தெலுங்கு', 'இந்தி', 'கன்னடம்', 'மலையாளம்',
    'mozhipeyar', 'mozhi', 'telungu', 'inthi', 'kannadam', 'malaiyaalam',
    // Kannada
    'ಭಾಷಾಂತರ', 'ಭಾಷೆ', 'ತೆಲುಗು', 'ಹಿಂದಿ', 'ತಮಿಳು', 'ಮಲಯಾಳಂ',
    'bhaashaantara', 'bhaashe', 'telugu', 'hindi', 'tamilu', 'malayaalam',
    // Malayalam
    'വിവർത്തനം', 'ഭാഷ', 'തെലുങ്ക്', 'ഹിന്ദി', 'തമിഴ്', 'കന്നഡ',
    'vivartthanam', 'bhaasha', 'telungu', 'hindi', 'tamizh', 'kannada',
    // Bengali
    'অনুবাদ', 'ভাষা', 'তেলুগু', 'হিন্দি', 'তামিল', 'কন্নড়', 'মালায়ালাম',
    'onubad', 'bhasha', 'telugu', 'hindi', 'tamil', 'kannada', 'malayalam',
  ],
};

// Common speech recognition mistakes and their corrections
// Includes English, Telugu, Tamil, Kannada, Malayalam, and Bengali variants
const SPEECH_CORRECTIONS: Record<string, string> = {
  // English corrections
  'some marie': 'summary',
  'some mary': 'summary',
  'some merry': 'summary',
  'summery': 'summary',
  'samari': 'summary',
  'samarie': 'summary',
  'dead line': 'deadline',
  'dead lines': 'deadlines',
  'dad lines': 'deadlines',
  'datelines': 'deadlines',
  'warning': 'warnings',
  'worn ings': 'warnings',
  'prob lems': 'problems',
  'down load': 'download',
  'dawn load': 'download',
  'sher': 'share',
  'sheer': 'share',
  'trans late': 'translate',
  'repete': 'repeat',
  're pete': 'repeat',
  'stopp': 'stop',
  'stap': 'stop',
  'halp': 'help',
  'held': 'help',
  
  // Telugu corrections - phonetic variations
  'sarama': 'saaramsam',
  'saraam': 'saaramsam',
  'saaram': 'saaramsam',
  'gaadu': 'gaduvu',
  'gadduvu': 'gaduvu',
  'tedi': 'teedi',
  'mukhya': 'mukhyam',
  'hechcha': 'hechcharika',
  'samasya': 'samasya',
  'cheyava': 'cheyavalusina',
  'aapu': 'aapu',
  'aapesu': 'aapu',
  'sahayam': 'sahayam',
  'panchuku': 'panchuko',
  'pampi': 'pampinchu',
  'nilwa': 'nilva',
  'dhara': 'dhara',
  'kharcha': 'kharchu',
  'malli': 'malli',
  'marosa': 'marosari',
  'anuvvad': 'anuvvadham',
  'bhasha': 'bhasha',
  'saramsam': 'saaramsam',
  'saramsha': 'saaramsam',
  'saransh': 'saaramsam',
  'saraamsh': 'saaramsam',
  'gadvu': 'gaduvu',
  'gaduv': 'gaduvu',
  'tedhi': 'teedi',
  'thedhi': 'teedi',
  'aapuu': 'aapu',
  'appu': 'aapu',
  
  // Tamil corrections - phonetic variations
  'surukam': 'surukkam',
  'surukham': 'surukkam',
  'churukkam': 'surukkam',
  'saraam': 'saaram',
  'kaalaketu': 'kaalakkedu',
  'kalakkedu': 'kaalakkedu',
  'thedi': 'thethi',
  'thethi': 'thethi',
  'mukhiyam': 'mukkiyam',
  'mukiyam': 'mukkiyam',
  'echarikai': 'echarikkai',
  'echarikei': 'echarikkai',
  'piratchinai': 'pirachchinai',
  'piracchinai': 'pirachchinai',
  'nirutu': 'niruthu',
  'niruttu': 'niruthu',
  'podhum': 'pothum',
  'podhu': 'pothum',
  'udhavi': 'udhavi',
  'udavi': 'udhavi',
  'meedum': 'meendum',
  'meendu': 'meendum',
  'thirumpa': 'thirumba',
  'pathivirakkam': 'pathivirakkam',
  'pathiviraku': 'pathivirakkam',
  'pagiru': 'pagir',
  'anuppu': 'anuppu',
  'anupu': 'anuppu',
  'mulu': 'muzhu',
  'mullu': 'muzhu',
  'ellam': 'ellaam',
  'mozhi peyar': 'mozhipeyar',
  'mozhipeyaru': 'mozhipeyar',
  'thoghai': 'thogai',
  'thokai': 'thogai',
  'vilai': 'vilai',
  'seyyal': 'seyal',
  'seyal': 'seyal',
  'vagai': 'vagai',
  'vaghai': 'vagai',
  
  // Kannada corrections - phonetic variations
  'saramsha': 'saaramsha',
  'saramsh': 'saaramsha',
  'odhu': 'odu',
  'helu': 'helu',
  'gaduv': 'gaduvu',
  'gadhuvu': 'gaduvu',
  'dinanka': 'dinaanka',
  'dinaamka': 'dinaanka',
  'mukhya': 'mukhya',
  'mukya': 'mukhya',
  'mahiti': 'maahiti',
  'mahithi': 'maahiti',
  'echarike': 'echcharike',
  'echarikhe': 'echcharike',
  'samasyae': 'samasye',
  'samasya': 'samasye',
  'nilisu': 'nillisu',
  'nillsu': 'nillisu',
  'saku': 'saaku',
  'sakhu': 'saaku',
  'sahaya': 'sahaaya',
  'sahaaye': 'sahaaya',
  'adeshagalu': 'aadeshagalu',
  'heghe': 'hege',
  'hege': 'hege',
  'mattome': 'mattomme',
  'matome': 'mattomme',
  'downlod': 'download',
  'ulisu': 'ulisu',
  'ulishu': 'ulisu',
  'hancu': 'hanchu',
  'hanccu': 'hanchu',
  'kaluhisu': 'kaluhisu',
  'kaluhishu': 'kaluhisu',
  'poorna': 'poorna',
  'purna': 'poorna',
  'sampoorna': 'sampoorna',
  'sampurna': 'sampoorna',
  'bhashantar': 'bhaashaantara',
  'bhashantara': 'bhaashaantara',
  'bhashe': 'bhaashe',
  'bhashae': 'bhaashe',
  'motta': 'motta',
  'moth': 'motta',
  'bele': 'bele',
  'belae': 'bele',
  'kriye': 'kriye',
  'kriya': 'kriye',
  'vidha': 'vidha',
  'vidh': 'vidha',
  
  // Malayalam corrections - phonetic variations
  'samgraham': 'samgraham',
  'sangraham': 'samgraham',
  'samgrahm': 'samgraham',
  'vaayikuka': 'vaayikkuka',
  'vayikkuka': 'vaayikkuka',
  'parayuka': 'parayuka',
  'parayuuka': 'parayuka',
  'avasana theeyathi': 'avasaana theeyathi',
  'avasana tiyathi': 'avasaana theeyathi',
  'tiyathi': 'theeyathi',
  'theeyati': 'theeyathi',
  'epol': 'eppol',
  'eppolu': 'eppol',
  'pradhanam': 'pradhaanam',
  'pradanam': 'pradhaanam',
  'vivarangal': 'vivarangal',
  'vivaramgal': 'vivarangal',
  'munnariyipu': 'munnariyippu',
  'munnariyip': 'munnariyippu',
  'prashnam': 'prashnam',
  'prasnam': 'prashnam',
  'nirthuka': 'nirthuka',
  'nirtuka': 'nirthuka',
  'mathi': 'mathi',
  'mati': 'mathi',
  'sahayam': 'sahaayam',
  'sahayum': 'sahaayam',
  'kammandukal': 'kammandukal',
  'kamandukal': 'kammandukal',
  'engane': 'engane',
  'engana': 'engane',
  'aavarthikkuka': 'aavarththikkuka',
  'avarthikkuka': 'aavarththikkuka',
  'veendum': 'veendum',
  'vendu': 'veendum',
  'download': 'download',
  'downlod': 'download',
  'pangiduka': 'pangiduka',
  'pangituka': 'pangiduka',
  'ayaykuka': 'ayaykkuka',
  'ayaykkuuka': 'ayaykkuka',
  'muzhuvan': 'muzhuvan',
  'muluvan': 'muzhuvan',
  'ellam': 'ellaam',
  'elam': 'ellaam',
  'sampoornam': 'sampoorNNam',
  'sampurnam': 'sampoorNNam',
  'vivarthanam': 'vivartthanam',
  'vivarttanam': 'vivartthanam',
  'bhasha': 'bhaasha',
  'basha': 'bhaasha',
  'thuka': 'thuka',
  'tuka': 'thuka',
  'vila': 'vila',
  'vilaa': 'vila',
  'nadapadi': 'nadapadi',
  'nadapati': 'nadapadi',
  'tharam': 'tharam',
  'taram': 'tharam',
  
  // Bengali corrections - phonetic variations
  'sarsankhep': 'sarsankhep',
  'sarasankhep': 'sarsankhep',
  'sarsongkhep': 'sarsankhep',
  'saransh': 'saransh',
  'saramsh': 'saransh',
  'poro': 'poro',
  'paro': 'poro',
  'bolo': 'bolo',
  'bol': 'bolo',
  'byakhya': 'byakhya',
  'bekkhya': 'byakhya',
  'somoyseema': 'somoyseema',
  'somoyshima': 'somoyseema',
  'tarikh': 'tarikh',
  'tarik': 'tarikh',
  'kokhon': 'kokhon',
  'kokon': 'kokhon',
  'gurutwopurno': 'gurutwopurno',
  'gurutopurno': 'gurutwopurno',
  'tothyo': 'tothyo',
  'totho': 'tothyo',
  'bibaron': 'bibaron',
  'bibaran': 'bibaron',
  'sotorkota': 'sotorkota',
  'sotorkota': 'sotorkota',
  'somosya': 'somosya',
  'somossa': 'somosya',
  'jhunki': 'jhunki',
  'junki': 'jhunki',
  'bipod': 'bipod',
  'bipod': 'bipod',
  'thamo': 'thamo',
  'tamo': 'thamo',
  'jotheshto': 'jotheshto',
  'joteshto': 'jotheshto',
  'dhonnobad': 'dhonnobad',
  'dhonobad': 'dhonnobad',
  'thik ache': 'thik ache',
  'thik ase': 'thik ache',
  'sahajyo': 'sahajyo',
  'sahajo': 'sahajyo',
  'kibhabe': 'kibhabe',
  'kibabe': 'kibhabe',
  'aabar': 'aabar',
  'abar': 'aabar',
  'punoraye': 'punoraye',
  'punoraya': 'punoraye',
  'maaf korben': 'maaf korben',
  'maph korben': 'maaf korben',
  'shongrokkhon': 'shongrokkhon',
  'songrokkhon': 'shongrokkhon',
  'pathao': 'pathao',
  'patao': 'pathao',
  'puro': 'puro',
  'puru': 'puro',
  'sob': 'sob',
  'sab': 'sob',
  'shompurno': 'shompurno',
  'sompurno': 'shompurno',
  'mot': 'mot',
  'moth': 'mot',
  'onubad': 'onubad',
  'onubod': 'onubad',
  'bhasha': 'bhasha',
  'basha': 'bhasha',
  'porimaan': 'porimaaN',
  'poriman': 'porimaaN',
  'daam': 'daam',
  'dam': 'daam',
  'khoroch': 'khoroch',
  'koroch': 'khoroch',
  'taka': 'taka',
  'tako': 'taka',
  'kaaj': 'kaaj',
  'kaj': 'kaaj',
  'podokkhep': 'podokkhep',
  'podokhep': 'podokkhep',
  'ki korte hobe': 'ki korte hobe',
  'ki korte hbe': 'ki korte hobe',
  'dhoron': 'dhoron',
  'doron': 'dhoron',
  'prokar': 'prokar',
  'prakar': 'prokar',
  'shreni': 'shreni',
  'sreni': 'shreni',
};

// Telugu response templates - 100% token-free, pre-written responses
const TELUGU_RESPONSES: Record<string, {
  withData: (data: string) => string;
  noData: string;
}> = {
  READ_SUMMARY: {
    withData: (summary) => `ఇదిగో సారాంశం: ${summary}`,
    noData: 'ఈ డాక్యుమెంట్‌కి సారాంశం అందుబాటులో లేదు. దయచేసి విశ్లేషణ పూర్తయ్యే వరకు వేచి ఉండండి.',
  },
  GET_DEADLINES: {
    withData: (deadlines) => `ఈ డాక్యుమెంట్‌లో గడువులు కనుగొన్నాను. ${deadlines}`,
    noData: 'ఈ డాక్యుమెంట్‌లో గడువులు కనుగొనబడలేదు.',
  },
  GET_KEY_INFO: {
    withData: (info) => `ముఖ్యమైన సమాచారం ఇక్కడ ఉంది: ${info}`,
    noData: 'ఈ డాక్యుమెంట్ నుండి ముఖ్యమైన సమాచారం ఇంకా తీయబడలేదు.',
  },
  GET_TYPE: {
    withData: (type) => `ఇది ${type} డాక్యుమెంట్.`,
    noData: 'డాక్యుమెంట్ రకాన్ని నిర్ధారించలేకపోయాను.',
  },
  GET_ACTIONS: {
    withData: (actions) => `సూచించిన చర్యలు ఇక్కడ ఉన్నాయి: ${actions}`,
    noData: 'ఈ డాక్యుమెంట్‌కు నిర్దిష్ట చర్యలు అవసరం లేదు.',
  },
  GET_AMOUNT: {
    withData: (amount) => `ఈ మొత్తం సమాచారం కనుగొన్నాను: ${amount}`,
    noData: 'ఈ డాక్యుమెంట్‌లో డబ్బు మొత్తాలు కనుగొనబడలేదు.',
  },
  WARNINGS: {
    withData: (warnings) => `హెచ్చరిక! ${warnings}`,
    noData: 'ఈ డాక్యుమెంట్‌లో హెచ్చరికలు లేదా ఆందోళనలు కనుగొనబడలేదు.',
  },
  STOP: {
    withData: () => 'సరే, ఆపుతున్నాను.',
    noData: 'సరే, ఆపుతున్నాను.',
  },
  HELP: {
    withData: () => 'మీరు తెలుగులో మాట్లాడవచ్చు! ఈ ఆదేశాలు ప్రయత్నించండి: సారాంశం చదవండి, గడువులు ఏమిటి, ముఖ్యమైన సమాచారం, హెచ్చరికలు, డౌన్‌లోడ్, షేర్, లేదా ఆపు.',
    noData: 'మీరు తెలుగులో మాట్లాడవచ్చు! ఈ ఆదేశాలు ప్రయత్నించండి: సారాంశం, గడువులు, ముఖ్యమైన, హెచ్చరికలు, ఆపు.',
  },
  REPEAT: {
    withData: (last) => last,
    noData: 'ఇంకా పునరావృతం చేయడానికి ఏమీ లేదు. ముందుగా నన్ను ఏదైనా అడగండి.',
  },
  DOWNLOAD: {
    withData: () => 'డౌన్‌లోడ్ ఆప్షన్ తెరుస్తున్నాను. డాక్యుమెంట్‌ను సేవ్ చేయడానికి డౌన్‌లోడ్ PDF బటన్ క్లిక్ చేయండి.',
    noData: 'డౌన్‌లోడ్ ఆప్షన్ తెరుస్తున్నాను. డాక్యుమెంట్‌ను సేవ్ చేయడానికి డౌన్‌లోడ్ PDF బటన్ క్లిక్ చేయండి.',
  },
  SHARE: {
    withData: () => 'షేర్ ఆప్షన్ తెరుస్తున్నాను. ఈ డాక్యుమెంట్‌ను షేర్ చేయడానికి షేర్ బటన్ క్లిక్ చేయండి.',
    noData: 'షేర్ ఆప్షన్ తెరుస్తున్నాను. ఈ డాక్యుమెంట్‌ను షేర్ చేయడానికి షేర్ బటన్ క్లిక్ చేయండి.',
  },
  READ_FULL: {
    withData: (text) => `డాక్యుమెంట్ టెక్స్ట్ ఇక్కడ ఉంది: ${text}`,
    noData: 'ఈ డాక్యుమెంట్ నుండి టెక్స్ట్ ఇంకా తీయబడలేదు.',
  },
  TRANSLATE: {
    withData: (lang) => `సరే, ${lang} లోకి అనువదిస్తాను. పూర్తి అనువాదం వినడానికి యాప్‌లో అనువాద బటన్ ఉపయోగించండి.`,
    noData: 'అనువాదం కోసం దయచేసి భాషను ఎంచుకోండి.',
  },
  UNKNOWN: {
    withData: () => 'క్షమించండి, నాకు అర్థం కాలేదు. అందుబాటులో ఉన్న ఆదేశాలను వినడానికి సహాయం అని చెప్పండి.',
    noData: 'క్షమించండి, నాకు అర్థం కాలేదు. అందుబాటులో ఉన్న ఆదేశాలను వినడానికి సహాయం అని చెప్పండి.',
  },
};

// Hindi response templates
const HINDI_RESPONSES: Record<string, {
  withData: (data: string) => string;
  noData: string;
}> = {
  READ_SUMMARY: {
    withData: (summary) => `यहाँ सारांश है: ${summary}`,
    noData: 'इस दस्तावेज़ के लिए सारांश उपलब्ध नहीं है। कृपया विश्लेषण पूर्ण होने तक प्रतीक्षा करें।',
  },
  GET_DEADLINES: {
    withData: (deadlines) => `इस दस्तावेज़ में समय सीमाएं मिलीं। ${deadlines}`,
    noData: 'इस दस्तावेज़ में कोई समय सीमा नहीं मिली।',
  },
  GET_KEY_INFO: {
    withData: (info) => `यहाँ महत्वपूर्ण जानकारी है: ${info}`,
    noData: 'इस दस्तावेज़ से अभी तक कोई महत्वपूर्ण जानकारी नहीं निकाली गई।',
  },
  GET_TYPE: {
    withData: (type) => `यह एक ${type} दस्तावेज़ है।`,
    noData: 'दस्तावेज़ का प्रकार निर्धारित नहीं कर सका।',
  },
  GET_ACTIONS: {
    withData: (actions) => `यहाँ सुझाई गई कार्रवाइयां हैं: ${actions}`,
    noData: 'इस दस्तावेज़ के लिए कोई विशेष कार्रवाई आवश्यक नहीं है।',
  },
  GET_AMOUNT: {
    withData: (amount) => `यह राशि जानकारी मिली: ${amount}`,
    noData: 'इस दस्तावेज़ में कोई राशि नहीं मिली।',
  },
  WARNINGS: {
    withData: (warnings) => `चेतावनी! ${warnings}`,
    noData: 'इस दस्तावेज़ में कोई चेतावनी या चिंताएं नहीं मिलीं।',
  },
  STOP: {
    withData: () => 'ठीक है, रुक रहा हूं।',
    noData: 'ठीक है, रुक रहा हूं।',
  },
  HELP: {
    withData: () => 'आप हिंदी में बोल सकते हैं! ये आदेश आज़माएं: सारांश पढ़ो, समय सीमाएं क्या हैं, महत्वपूर्ण जानकारी, चेतावनियां, डाउनलोड, शेयर, या रुको।',
    noData: 'आप हिंदी में बोल सकते हैं! ये आदेश आज़माएं: सारांश, समय सीमा, महत्वपूर्ण, चेतावनी, रुको।',
  },
  REPEAT: {
    withData: (last) => last,
    noData: 'अभी दोहराने के लिए कुछ नहीं है। पहले मुझसे कुछ पूछें।',
  },
  DOWNLOAD: {
    withData: () => 'डाउनलोड विकल्प खोल रहा हूं। दस्तावेज़ सहेजने के लिए PDF डाउनलोड बटन क्लिक करें।',
    noData: 'डाउनलोड विकल्प खोल रहा हूं। दस्तावेज़ सहेजने के लिए PDF डाउनलोड बटन क्लिक करें।',
  },
  SHARE: {
    withData: () => 'शेयर विकल्प खोल रहा हूं। इस दस्तावेज़ को शेयर करने के लिए शेयर बटन क्लिक करें।',
    noData: 'शेयर विकल्प खोल रहा हूं। इस दस्तावेज़ को शेयर करने के लिए शेयर बटन क्लिक करें।',
  },
  READ_FULL: {
    withData: (text) => `यहाँ दस्तावेज़ का पाठ है: ${text}`,
    noData: 'इस दस्तावेज़ से अभी तक कोई पाठ नहीं निकाला गया।',
  },
  TRANSLATE: {
    withData: (lang) => `ठीक है, ${lang} में अनुवाद करूंगा। पूर्ण अनुवाद सुनने के लिए ऐप में अनुवाद बटन का उपयोग करें।`,
    noData: 'कृपया अनुवाद के लिए भाषा चुनें।',
  },
  UNKNOWN: {
    withData: () => 'क्षमा करें, मुझे समझ नहीं आया। उपलब्ध आदेशों को सुनने के लिए मदद कहें।',
    noData: 'क्षमा करें, मुझे समझ नहीं आया। उपलब्ध आदेशों को सुनने के लिए मदद कहें।',
  },
};

// Tamil response templates - 100% token-free, pre-written responses
const TAMIL_RESPONSES: Record<string, {
  withData: (data: string) => string;
  noData: string;
}> = {
  READ_SUMMARY: {
    withData: (summary) => `இதோ சுருக்கம்: ${summary}`,
    noData: 'இந்த ஆவணத்திற்கு சுருக்கம் கிடைக்கவில்லை. பகுப்பாய்வு முடியும் வரை காத்திருக்கவும்.',
  },
  GET_DEADLINES: {
    withData: (deadlines) => `இந்த ஆவணத்தில் காலக்கெடுக்கள் கண்டறியப்பட்டன. ${deadlines}`,
    noData: 'இந்த ஆவணத்தில் காலக்கெடுக்கள் இல்லை.',
  },
  GET_KEY_INFO: {
    withData: (info) => `முக்கியமான தகவல் இங்கே: ${info}`,
    noData: 'இந்த ஆவணத்திலிருந்து முக்கிய தகவல் இன்னும் எடுக்கப்படவில்லை.',
  },
  GET_TYPE: {
    withData: (type) => `இது ஒரு ${type} ஆவணம்.`,
    noData: 'ஆவண வகையை தீர்மானிக்க முடியவில்லை.',
  },
  GET_ACTIONS: {
    withData: (actions) => `பரிந்துரைக்கப்பட்ட நடவடிக்கைகள்: ${actions}`,
    noData: 'இந்த ஆவணத்திற்கு குறிப்பிட்ட நடவடிக்கைகள் தேவையில்லை.',
  },
  GET_AMOUNT: {
    withData: (amount) => `இந்த தொகை தகவல் கண்டறியப்பட்டது: ${amount}`,
    noData: 'இந்த ஆவணத்தில் பணத் தொகைகள் இல்லை.',
  },
  WARNINGS: {
    withData: (warnings) => `எச்சரிக்கை! ${warnings}`,
    noData: 'இந்த ஆவணத்தில் எச்சரிக்கைகள் அல்லது கவலைகள் இல்லை.',
  },
  STOP: {
    withData: () => 'சரி, நிறுத்துகிறேன்.',
    noData: 'சரி, நிறுத்துகிறேன்.',
  },
  HELP: {
    withData: () => 'நீங்கள் தமிழில் பேசலாம்! இந்த கட்டளைகளை முயற்சிக்கவும்: சுருக்கம் படிக்க, காலக்கெடு என்ன, முக்கிய தகவல், எச்சரிக்கைகள், பதிவிறக்கம், பகிர், அல்லது நிறுத்து.',
    noData: 'நீங்கள் தமிழில் பேசலாம்! இந்த கட்டளைகளை முயற்சிக்கவும்: சுருக்கம், காலக்கெடு, முக்கியம், எச்சரிக்கை, நிறுத்து.',
  },
  REPEAT: {
    withData: (last) => last,
    noData: 'இன்னும் திரும்ப சொல்ல எதுவும் இல்லை. முதலில் என்னிடம் ஏதாவது கேளுங்கள்.',
  },
  DOWNLOAD: {
    withData: () => 'பதிவிறக்க விருப்பத்தை திறக்கிறேன். ஆவணத்தை சேமிக்க PDF பதிவிறக்க பொத்தானை கிளிக் செய்யவும்.',
    noData: 'பதிவிறக்க விருப்பத்தை திறக்கிறேன். ஆவணத்தை சேமிக்க PDF பதிவிறக்க பொத்தானை கிளிக் செய்யவும்.',
  },
  SHARE: {
    withData: () => 'பகிர் விருப்பத்தை திறக்கிறேன். இந்த ஆவணத்தை பகிர பகிர் பொத்தானை கிளிக் செய்யவும்.',
    noData: 'பகிர் விருப்பத்தை திறக்கிறேன். இந்த ஆவணத்தை பகிர பகிர் பொத்தானை கிளிக் செய்யவும்.',
  },
  READ_FULL: {
    withData: (text) => `ஆவண உரை இங்கே: ${text}`,
    noData: 'இந்த ஆவணத்திலிருந்து உரை இன்னும் எடுக்கப்படவில்லை.',
  },
  TRANSLATE: {
    withData: (lang) => `சரி, ${lang} மொழியில் மொழிபெயர்க்கிறேன். முழு மொழிபெயர்ப்பை கேட்க ஆப்பில் மொழிபெயர்ப்பு பொத்தானை பயன்படுத்தவும்.`,
    noData: 'மொழிபெயர்ப்புக்கு மொழியை தேர்ந்தெடுக்கவும்.',
  },
  UNKNOWN: {
    withData: () => 'மன்னிக்கவும், புரியவில்லை. கிடைக்கும் கட்டளைகளை கேட்க உதவி என்று சொல்லுங்கள்.',
    noData: 'மன்னிக்கவும், புரியவில்லை. கிடைக்கும் கட்டளைகளை கேட்க உதவி என்று சொல்லுங்கள்.',
  },
};

// Kannada response templates - 100% token-free, pre-written responses
const KANNADA_RESPONSES: Record<string, {
  withData: (data: string) => string;
  noData: string;
}> = {
  READ_SUMMARY: {
    withData: (summary) => `ಇಲ್ಲಿ ಸಾರಾಂಶವಿದೆ: ${summary}`,
    noData: 'ಈ ಡಾಕ್ಯುಮೆಂಟ್‌ಗೆ ಸಾರಾಂಶ ಲಭ್ಯವಿಲ್ಲ. ವಿಶ್ಲೇಷಣೆ ಮುಗಿಯುವವರೆಗೆ ಕಾಯಿರಿ.',
  },
  GET_DEADLINES: {
    withData: (deadlines) => `ಈ ಡಾಕ್ಯುಮೆಂಟ್‌ನಲ್ಲಿ ಗಡುವುಗಳು ಕಂಡುಬಂದಿವೆ. ${deadlines}`,
    noData: 'ಈ ಡಾಕ್ಯುಮೆಂಟ್‌ನಲ್ಲಿ ಗಡುವುಗಳು ಕಂಡುಬಂದಿಲ್ಲ.',
  },
  GET_KEY_INFO: {
    withData: (info) => `ಮುಖ್ಯ ಮಾಹಿತಿ ಇಲ್ಲಿದೆ: ${info}`,
    noData: 'ಈ ಡಾಕ್ಯುಮೆಂಟ್‌ನಿಂದ ಮುಖ್ಯ ಮಾಹಿತಿ ಇನ್ನೂ ಹೊರತೆಗೆದಿಲ್ಲ.',
  },
  GET_TYPE: {
    withData: (type) => `ಇದು ${type} ಡಾಕ್ಯುಮೆಂಟ್.`,
    noData: 'ಡಾಕ್ಯುಮೆಂಟ್ ಪ್ರಕಾರವನ್ನು ನಿರ್ಧರಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ.',
  },
  GET_ACTIONS: {
    withData: (actions) => `ಸೂಚಿಸಿದ ಕ್ರಿಯೆಗಳು: ${actions}`,
    noData: 'ಈ ಡಾಕ್ಯುಮೆಂಟ್‌ಗೆ ನಿರ್ದಿಷ್ಟ ಕ್ರಿಯೆಗಳು ಅಗತ್ಯವಿಲ್ಲ.',
  },
  GET_AMOUNT: {
    withData: (amount) => `ಈ ಮೊತ್ತದ ಮಾಹಿತಿ ಕಂಡುಬಂದಿದೆ: ${amount}`,
    noData: 'ಈ ಡಾಕ್ಯುಮೆಂಟ್‌ನಲ್ಲಿ ಹಣದ ಮೊತ್ತಗಳು ಕಂಡುಬಂದಿಲ್ಲ.',
  },
  WARNINGS: {
    withData: (warnings) => `ಎಚ್ಚರಿಕೆ! ${warnings}`,
    noData: 'ಈ ಡಾಕ್ಯುಮೆಂಟ್‌ನಲ್ಲಿ ಎಚ್ಚರಿಕೆಗಳು ಅಥವಾ ಕಾಳಜಿಗಳು ಕಂಡುಬಂದಿಲ್ಲ.',
  },
  STOP: {
    withData: () => 'ಸರಿ, ನಿಲ್ಲಿಸುತ್ತಿದ್ದೇನೆ.',
    noData: 'ಸರಿ, ನಿಲ್ಲಿಸುತ್ತಿದ್ದೇನೆ.',
  },
  HELP: {
    withData: () => 'ನೀವು ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡಬಹುದು! ಈ ಆದೇಶಗಳನ್ನು ಪ್ರಯತ್ನಿಸಿ: ಸಾರಾಂಶ ಓದು, ಗಡುವು ಏನು, ಮುಖ್ಯ ಮಾಹಿತಿ, ಎಚ್ಚರಿಕೆಗಳು, ಡೌನ್‌ಲೋಡ್, ಹಂಚು, ಅಥವಾ ನಿಲ್ಲಿಸು.',
    noData: 'ನೀವು ಕನ್ನಡದಲ್ಲಿ ಮಾತನಾಡಬಹುದು! ಈ ಆದೇಶಗಳನ್ನು ಪ್ರಯತ್ನಿಸಿ: ಸಾರಾಂಶ, ಗಡುವು, ಮುಖ್ಯ, ಎಚ್ಚರಿಕೆ, ನಿಲ್ಲಿಸು.',
  },
  REPEAT: {
    withData: (last) => last,
    noData: 'ಇನ್ನೂ ಪುನರಾವರ್ತಿಸಲು ಏನೂ ಇಲ್ಲ. ಮೊದಲು ನನ್ನನ್ನು ಏನಾದರೂ ಕೇಳಿ.',
  },
  DOWNLOAD: {
    withData: () => 'ಡೌನ್‌ಲೋಡ್ ಆಯ್ಕೆಯನ್ನು ತೆರೆಯುತ್ತಿದ್ದೇನೆ. ಡಾಕ್ಯುಮೆಂಟ್ ಉಳಿಸಲು PDF ಡೌನ್‌ಲೋಡ್ ಬಟನ್ ಕ್ಲಿಕ್ ಮಾಡಿ.',
    noData: 'ಡೌನ್‌ಲೋಡ್ ಆಯ್ಕೆಯನ್ನು ತೆರೆಯುತ್ತಿದ್ದೇನೆ. ಡಾಕ್ಯುಮೆಂಟ್ ಉಳಿಸಲು PDF ಡೌನ್‌ಲೋಡ್ ಬಟನ್ ಕ್ಲಿಕ್ ಮಾಡಿ.',
  },
  SHARE: {
    withData: () => 'ಹಂಚು ಆಯ್ಕೆಯನ್ನು ತೆರೆಯುತ್ತಿದ್ದೇನೆ. ಈ ಡಾಕ್ಯುಮೆಂಟ್ ಹಂಚಲು ಹಂಚು ಬಟನ್ ಕ್ಲಿಕ್ ಮಾಡಿ.',
    noData: 'ಹಂಚು ಆಯ್ಕೆಯನ್ನು ತೆರೆಯುತ್ತಿದ್ದೇನೆ. ಈ ಡಾಕ್ಯುಮೆಂಟ್ ಹಂಚಲು ಹಂಚು ಬಟನ್ ಕ್ಲಿಕ್ ಮಾಡಿ.',
  },
  READ_FULL: {
    withData: (text) => `ಡಾಕ್ಯುಮೆಂಟ್ ಪಠ್ಯ ಇಲ್ಲಿದೆ: ${text}`,
    noData: 'ಈ ಡಾಕ್ಯುಮೆಂಟ್‌ನಿಂದ ಪಠ್ಯ ಇನ್ನೂ ಹೊರತೆಗೆದಿಲ್ಲ.',
  },
  TRANSLATE: {
    withData: (lang) => `ಸರಿ, ${lang} ಭಾಷೆಗೆ ಅನುವಾದಿಸುತ್ತೇನೆ. ಪೂರ್ಣ ಅನುವಾದ ಕೇಳಲು ಆ್ಯಪ್‌ನಲ್ಲಿ ಅನುವಾದ ಬಟನ್ ಬಳಸಿ.`,
    noData: 'ಅನುವಾದಕ್ಕಾಗಿ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ.',
  },
  UNKNOWN: {
    withData: () => 'ಕ್ಷಮಿಸಿ, ನನಗೆ ಅರ್ಥವಾಗಲಿಲ್ಲ. ಲಭ್ಯವಿರುವ ಆದೇಶಗಳನ್ನು ಕೇಳಲು ಸಹಾಯ ಎಂದು ಹೇಳಿ.',
    noData: 'ಕ್ಷಮಿಸಿ, ನನಗೆ ಅರ್ಥವಾಗಲಿಲ್ಲ. ಲಭ್ಯವಿರುವ ಆದೇಶಗಳನ್ನು ಕೇಳಲು ಸಹಾಯ ಎಂದು ಹೇಳಿ.',
  },
};

// Malayalam response templates - 100% token-free, pre-written responses
const MALAYALAM_RESPONSES: Record<string, {
  withData: (data: string) => string;
  noData: string;
}> = {
  READ_SUMMARY: {
    withData: (summary) => `ഇതാ സംഗ്രഹം: ${summary}`,
    noData: 'ഈ ഡോക്യുമെന്റിന് സംഗ്രഹം ലഭ്യമല്ല. വിശകലനം പൂർത്തിയാകുന്നതുവരെ കാത്തിരിക്കുക.',
  },
  GET_DEADLINES: {
    withData: (deadlines) => `ഈ ഡോക്യുമെന്റിൽ അവസാന തീയതികൾ കണ്ടെത്തി. ${deadlines}`,
    noData: 'ഈ ഡോക്യുമെന്റിൽ അവസാന തീയതികൾ കണ്ടെത്തിയില്ല.',
  },
  GET_KEY_INFO: {
    withData: (info) => `പ്രധാന വിവരങ്ങൾ ഇവിടെ: ${info}`,
    noData: 'ഈ ഡോക്യുമെന്റിൽ നിന്ന് പ്രധാന വിവരങ്ങൾ ഇതുവരെ എടുത്തിട്ടില്ല.',
  },
  GET_TYPE: {
    withData: (type) => `ഇത് ഒരു ${type} ഡോക്യുമെന്റ് ആണ്.`,
    noData: 'ഡോക്യുമെന്റ് തരം നിർണ്ണയിക്കാൻ കഴിഞ്ഞില്ല.',
  },
  GET_ACTIONS: {
    withData: (actions) => `നിർദ്ദേശിച്ച നടപടികൾ: ${actions}`,
    noData: 'ഈ ഡോക്യുമെന്റിന് പ്രത്യേക നടപടികൾ ആവശ്യമില്ല.',
  },
  GET_AMOUNT: {
    withData: (amount) => `ഈ തുക വിവരം കണ്ടെത്തി: ${amount}`,
    noData: 'ഈ ഡോക്യുമെന്റിൽ പണത്തുക കണ്ടെത്തിയില്ല.',
  },
  WARNINGS: {
    withData: (warnings) => `മുന്നറിയിപ്പ്! ${warnings}`,
    noData: 'ഈ ഡോക്യുമെന്റിൽ മുന്നറിയിപ്പുകളോ ആശങ്കകളോ കണ്ടെത്തിയില്ല.',
  },
  STOP: {
    withData: () => 'ശരി, നിർത്തുന്നു.',
    noData: 'ശരി, നിർത്തുന്നു.',
  },
  HELP: {
    withData: () => 'നിങ്ങൾക്ക് മലയാളത്തിൽ സംസാരിക്കാം! ഈ കമാൻഡുകൾ പരീക്ഷിക്കുക: സംഗ്രഹം വായിക്കുക, അവസാന തീയതി എന്താണ്, പ്രധാന വിവരങ്ങൾ, മുന്നറിയിപ്പുകൾ, ഡൗൺലോഡ്, പങ്കിടുക, അല്ലെങ്കിൽ നിർത്തുക.',
    noData: 'നിങ്ങൾക്ക് മലയാളത്തിൽ സംസാരിക്കാം! ഈ കമാൻഡുകൾ പരീക്ഷിക്കുക: സംഗ്രഹം, തീയതി, പ്രധാനം, മുന്നറിയിപ്പ്, നിർത്തുക.',
  },
  REPEAT: {
    withData: (last) => last,
    noData: 'ആവർത്തിക്കാൻ ഇതുവരെ ഒന്നുമില്ല. ആദ്യം എന്നോട് എന്തെങ്കിലും ചോദിക്കൂ.',
  },
  DOWNLOAD: {
    withData: () => 'ഡൗൺലോഡ് ഓപ്ഷൻ തുറക്കുന്നു. ഡോക്യുമെന്റ് സേവ് ചെയ്യാൻ PDF ഡൗൺലോഡ് ബട്ടൺ ക്ലിക്ക് ചെയ്യുക.',
    noData: 'ഡൗൺലോഡ് ഓപ്ഷൻ തുറക്കുന്നു. ഡോക്യുമെന്റ് സേവ് ചെയ്യാൻ PDF ഡൗൺലോഡ് ബട്ടൺ ക്ലിക്ക് ചെയ്യുക.',
  },
  SHARE: {
    withData: () => 'ഷെയർ ഓപ്ഷൻ തുറക്കുന്നു. ഈ ഡോക്യുമെന്റ് പങ്കിടാൻ ഷെയർ ബട്ടൺ ക്ലിക്ക് ചെയ്യുക.',
    noData: 'ഷെയർ ഓപ്ഷൻ തുറക്കുന്നു. ഈ ഡോക്യുമെന്റ് പങ്കിടാൻ ഷെയർ ബട്ടൺ ക്ലിക്ക് ചെയ്യുക.',
  },
  READ_FULL: {
    withData: (text) => `ഡോക്യുമെന്റ് ടെക്സ്റ്റ് ഇവിടെ: ${text}`,
    noData: 'ഈ ഡോക്യുമെന്റിൽ നിന്ന് ടെക്സ്റ്റ് ഇതുവരെ എടുത്തിട്ടില്ല.',
  },
  TRANSLATE: {
    withData: (lang) => `ശരി, ${lang} ഭാഷയിലേക്ക് വിവർത്തനം ചെയ്യുന്നു. പൂർണ്ണ വിവർത്തനം കേൾക്കാൻ ആപ്പിൽ വിവർത്തന ബട്ടൺ ഉപയോഗിക്കുക.`,
    noData: 'വിവർത്തനത്തിന് ഭാഷ തിരഞ്ഞെടുക്കുക.',
  },
  UNKNOWN: {
    withData: () => 'ക്ഷമിക്കണം, എനിക്ക് മനസ്സിലായില്ല. ലഭ്യമായ കമാൻഡുകൾ കേൾക്കാൻ സഹായം എന്ന് പറയുക.',
    noData: 'ക്ഷമിക്കണം, എനിക്ക് മനസ്സിലായില്ല. ലഭ്യമായ കമാൻഡുകൾ കേൾക്കാൻ സഹായം എന്ന് പറയുക.',
  },
};

// Bengali response templates - 100% token-free, pre-written responses
const BENGALI_RESPONSES: Record<string, {
  withData: (data: string) => string;
  noData: string;
}> = {
  READ_SUMMARY: {
    withData: (summary) => `এখানে সারসংক্ষেপ: ${summary}`,
    noData: 'এই নথির জন্য সারসংক্ষেপ উপলব্ধ নেই। বিশ্লেষণ সম্পূর্ণ হওয়া পর্যন্ত অপেক্ষা করুন।',
  },
  GET_DEADLINES: {
    withData: (deadlines) => `এই নথিতে সময়সীমা পাওয়া গেছে। ${deadlines}`,
    noData: 'এই নথিতে কোনো সময়সীমা পাওয়া যায়নি।',
  },
  GET_KEY_INFO: {
    withData: (info) => `গুরুত্বপূর্ণ তথ্য এখানে: ${info}`,
    noData: 'এই নথি থেকে এখনও গুরুত্বপূর্ণ তথ্য বের করা হয়নি।',
  },
  GET_TYPE: {
    withData: (type) => `এটি একটি ${type} নথি।`,
    noData: 'নথির ধরণ নির্ধারণ করা যায়নি।',
  },
  GET_ACTIONS: {
    withData: (actions) => `প্রস্তাবিত পদক্ষেপ: ${actions}`,
    noData: 'এই নথির জন্য কোনো নির্দিষ্ট পদক্ষেপের প্রয়োজন নেই।',
  },
  GET_AMOUNT: {
    withData: (amount) => `এই পরিমাণের তথ্য পাওয়া গেছে: ${amount}`,
    noData: 'এই নথিতে কোনো অর্থের পরিমাণ পাওয়া যায়নি।',
  },
  WARNINGS: {
    withData: (warnings) => `সতর্কতা! ${warnings}`,
    noData: 'এই নথিতে কোনো সতর্কতা বা উদ্বেগ পাওয়া যায়নি।',
  },
  STOP: {
    withData: () => 'ঠিক আছে, থামছি।',
    noData: 'ঠিক আছে, থামছি।',
  },
  HELP: {
    withData: () => 'আপনি বাংলায় বলতে পারেন! এই কমান্ডগুলো চেষ্টা করুন: সারসংক্ষেপ পড়ো, সময়সীমা কী, গুরুত্বপূর্ণ তথ্য, সতর্কতা, ডাউনলোড, শেয়ার, অথবা থামো।',
    noData: 'আপনি বাংলায় বলতে পারেন! এই কমান্ডগুলো চেষ্টা করুন: সারসংক্ষেপ, সময়সীমা, গুরুত্বপূর্ণ, সতর্কতা, থামো।',
  },
  REPEAT: {
    withData: (last) => last,
    noData: 'এখনও পুনরাবৃত্তি করার কিছু নেই। প্রথমে আমাকে কিছু জিজ্ঞাসা করুন।',
  },
  DOWNLOAD: {
    withData: () => 'ডাউনলোড অপশন খুলছি। নথি সংরক্ষণ করতে PDF ডাউনলোড বোতামে ক্লিক করুন।',
    noData: 'ডাউনলোড অপশন খুলছি। নথি সংরক্ষণ করতে PDF ডাউনলোড বোতামে ক্লিক করুন।',
  },
  SHARE: {
    withData: () => 'শেয়ার অপশন খুলছি। এই নথি শেয়ার করতে শেয়ার বোতামে ক্লিক করুন।',
    noData: 'শেয়ার অপশন খুলছি। এই নথি শেয়ার করতে শেয়ার বোতামে ক্লিক করুন।',
  },
  READ_FULL: {
    withData: (text) => `নথির টেক্সট এখানে: ${text}`,
    noData: 'এই নথি থেকে এখনও টেক্সট বের করা হয়নি।',
  },
  TRANSLATE: {
    withData: (lang) => `ঠিক আছে, ${lang} ভাষায় অনুবাদ করছি। সম্পূর্ণ অনুবাদ শুনতে অ্যাপে অনুবাদ বোতাম ব্যবহার করুন।`,
    noData: 'অনুবাদের জন্য ভাষা নির্বাচন করুন।',
  },
  UNKNOWN: {
    withData: () => 'দুঃখিত, বুঝতে পারিনি। উপলব্ধ কমান্ড শুনতে সাহায্য বলুন।',
    noData: 'দুঃখিত, বুঝতে পারিনি। উপলব্ধ কমান্ড শুনতে সাহায্য বলুন।',
  },
};

// Get language code base (te from te-IN)
const getLanguageBase = (langCode: string): string => langCode.split('-')[0];

export type VoiceIntent = 
  | 'READ_SUMMARY' 
  | 'GET_DEADLINES' 
  | 'GET_KEY_INFO' 
  | 'GET_TYPE'
  | 'GET_ACTIONS'
  | 'GET_AMOUNT'
  | 'TRANSLATE' 
  | 'STOP' 
  | 'HELP'
  | 'REPEAT'
  | 'DOWNLOAD'
  | 'SHARE'
  | 'READ_FULL'
  | 'WARNINGS'
  | 'UNKNOWN';

export interface VoiceCommandResult {
  intent: VoiceIntent;
  params: {
    language?: string;
    languageCode?: string;
  };
  transcript: string;
  response: string;
}

interface UseVoiceCommandsProps {
  aiAnalysis?: AIAnalysis | null;
  extractedText?: string;
  documentType?: string;
  onSpeak: (text: string, options?: { languageCode?: string }) => Promise<void>;
  onStop: () => void;
  onTranslate?: (targetLang: string) => void;
  currentLanguage?: string;
}

export const useVoiceCommands = ({
  aiAnalysis,
  extractedText,
  documentType,
  onSpeak,
  onStop,
  onTranslate,
  currentLanguage = 'en-IN'
}: UseVoiceCommandsProps) => {
  const [isCommandMode, setIsCommandMode] = useState(false);
  const [lastCommand, setLastCommand] = useState<VoiceCommandResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const lastResponseRef = useRef<string>('');
  const [commandLanguage, setCommandLanguage] = useState<string>('en-IN'); // Language for voice commands

  // Use existing speech recognition hook
  const {
    isListening,
    transcript,
    startListening,
    stopListening,
    error: speechError,
    isSupported
  } = useSpeechRecognition();

  // Apply speech corrections for common recognition errors
  const correctSpeech = useCallback((text: string): string => {
    let corrected = text.toLowerCase().trim();
    
    // Apply known corrections
    for (const [mistake, correction] of Object.entries(SPEECH_CORRECTIONS)) {
      corrected = corrected.replace(new RegExp(mistake, 'gi'), correction);
    }
    
    return corrected;
  }, []);

  // Calculate similarity between two words (simple Levenshtein-inspired)
  const wordSimilarity = useCallback((word1: string, word2: string): number => {
    if (word1 === word2) return 1;
    if (word1.includes(word2) || word2.includes(word1)) return 0.8;
    
    // Check if words start with same letters
    const minLen = Math.min(word1.length, word2.length);
    let matchCount = 0;
    for (let i = 0; i < minLen; i++) {
      if (word1[i] === word2[i]) matchCount++;
      else break;
    }
    
    if (matchCount >= 3) return 0.6; // First 3+ chars match
    return 0;
  }, []);

  // Detect intent from transcript - Smart pattern matching
  const detectIntent = useCallback((text: string): { intent: VoiceIntent; params: any } => {
    // Step 1: Clean and correct the text
    const correctedText = correctSpeech(text);
    const words = correctedText.split(/\s+/).filter(w => w.length > 0);
    
    console.log('🎤 Voice Command - Original:', text);
    console.log('🎤 Voice Command - Corrected:', correctedText);
    console.log('🎤 Voice Command - Words:', words);

    // Step 2: Try exact word match first (highest priority)
    for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
      for (const pattern of patterns) {
        const patternLower = pattern.toLowerCase();
        
        // Check if any word exactly matches the pattern
        if (words.includes(patternLower)) {
          console.log('✅ Exact word match:', intent, '←', patternLower);
          
          if (intent === 'TRANSLATE') {
            const detectedLang = Object.keys(VOICE_LANGUAGES).find(lang => 
              correctedText.includes(lang)
            );
            return {
              intent: intent as VoiceIntent,
              params: {
                language: detectedLang || 'hindi',
                languageCode: VOICE_LANGUAGES[detectedLang || 'hindi']
              }
            };
          }
          return { intent: intent as VoiceIntent, params: {} };
        }
      }
    }

    // Step 3: Try phrase/substring match
    for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
      for (const pattern of patterns) {
        const patternLower = pattern.toLowerCase();
        
        if (correctedText.includes(patternLower)) {
          console.log('✅ Phrase match:', intent, '←', patternLower);
          
          if (intent === 'TRANSLATE') {
            const detectedLang = Object.keys(VOICE_LANGUAGES).find(lang => 
              correctedText.includes(lang)
            );
            return {
              intent: intent as VoiceIntent,
              params: {
                language: detectedLang || 'hindi',
                languageCode: VOICE_LANGUAGES[detectedLang || 'hindi']
              }
            };
          }
          return { intent: intent as VoiceIntent, params: {} };
        }
      }
    }

    // Step 4: Try fuzzy matching for single words
    for (const word of words) {
      if (word.length < 3) continue; // Skip very short words
      
      for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
        for (const pattern of patterns) {
          const patternLower = pattern.toLowerCase();
          const similarity = wordSimilarity(word, patternLower);
          
          if (similarity >= 0.6) {
            console.log('✅ Fuzzy match:', intent, '← word:', word, '~ pattern:', patternLower);
            return { intent: intent as VoiceIntent, params: {} };
          }
        }
      }
    }
    
    console.log('❌ No intent matched for:', correctedText);
    return { intent: 'UNKNOWN', params: {} };
  }, [correctSpeech, wordSimilarity]);

  // Generate response based on intent - uses CACHED data only, NO API calls
  // Language-aware: Returns responses in selected language
  const generateResponse = useCallback((intent: VoiceIntent, params: any): string => {
    const langBase = getLanguageBase(commandLanguage);
    const isTeluguMode = langBase === 'te';
    const isHindiMode = langBase === 'hi';
    const isTamilMode = langBase === 'ta';
    const isKannadaMode = langBase === 'kn';
    const isMalayalamMode = langBase === 'ml';
    const isBengaliMode = langBase === 'bn';
    
    // Check if text contains various Indian language scripts
    const isTeluguText = (text: string): boolean => /[\u0C00-\u0C7F]/.test(text);
    const isHindiText = (text: string): boolean => /[\u0900-\u097F]/.test(text);
    const isTamilText = (text: string): boolean => /[\u0B80-\u0BFF]/.test(text);
    const isKannadaText = (text: string): boolean => /[\u0C80-\u0CFF]/.test(text);
    const isMalayalamText = (text: string): boolean => /[\u0D00-\u0D7F]/.test(text);
    const isBengaliText = (text: string): boolean => /[\u0980-\u09FF]/.test(text);
    const isIndianLanguageText = (text: string): boolean => 
      isTeluguText(text) || isHindiText(text) || isTamilText(text) || 
      isKannadaText(text) || isMalayalamText(text) || isBengaliText(text);
    
    // Get appropriate response template based on language
    // Only use localized template if:
    // 1. User selected that language mode AND
    // 2. Data is in that language (or no data - just static message)
    const getLocalizedResponse = (intentKey: string, data?: string): string => {
      // If we have data, check if it's already in the target language
      const dataInTargetLang = data ? (
        (isTeluguMode && isTeluguText(data)) ||
        (isHindiMode && isHindiText(data)) ||
        (isTamilMode && isTamilText(data)) ||
        (isKannadaMode && isKannadaText(data)) ||
        (isMalayalamMode && isMalayalamText(data)) ||
        (isBengaliMode && isBengaliText(data)) ||
        isIndianLanguageText(data) // Data is already translated
      ) : true; // No data means static message, always localize
      
      // Telugu responses
      if (isTeluguMode && TELUGU_RESPONSES[intentKey] && dataInTargetLang) {
        return data ? TELUGU_RESPONSES[intentKey].withData(data) : TELUGU_RESPONSES[intentKey].noData;
      }
      // Hindi responses
      if (isHindiMode && HINDI_RESPONSES[intentKey] && dataInTargetLang) {
        return data ? HINDI_RESPONSES[intentKey].withData(data) : HINDI_RESPONSES[intentKey].noData;
      }
      // Tamil responses
      if (isTamilMode && TAMIL_RESPONSES[intentKey] && dataInTargetLang) {
        return data ? TAMIL_RESPONSES[intentKey].withData(data) : TAMIL_RESPONSES[intentKey].noData;
      }
      // Kannada responses
      if (isKannadaMode && KANNADA_RESPONSES[intentKey] && dataInTargetLang) {
        return data ? KANNADA_RESPONSES[intentKey].withData(data) : KANNADA_RESPONSES[intentKey].noData;
      }
      // Malayalam responses
      if (isMalayalamMode && MALAYALAM_RESPONSES[intentKey] && dataInTargetLang) {
        return data ? MALAYALAM_RESPONSES[intentKey].withData(data) : MALAYALAM_RESPONSES[intentKey].noData;
      }
      // Bengali responses
      if (isBengaliMode && BENGALI_RESPONSES[intentKey] && dataInTargetLang) {
        return data ? BENGALI_RESPONSES[intentKey].withData(data) : BENGALI_RESPONSES[intentKey].noData;
      }
      
      // If user wants Indian language but data is in English, 
      // return just the data (without mixing languages awkwardly)
      const isIndianLangMode = isTeluguMode || isHindiMode || isTamilMode || isKannadaMode || isMalayalamMode || isBengaliMode;
      if (isIndianLangMode && data && !dataInTargetLang) {
        // Just speak the English data, TTS will handle it
        // This avoids weird mixing like "ఇదిగో సారాంశం: This is an English summary"
        return data;
      }
      
      return ''; // Return empty to use English fallback
    };
    
    switch (intent) {
      case 'READ_SUMMARY':
        if (aiAnalysis?.speakableSummary) {
          const localResp = getLocalizedResponse('READ_SUMMARY', aiAnalysis.speakableSummary);
          return localResp || aiAnalysis.speakableSummary;
        }
        if (aiAnalysis?.summary) {
          const localResp = getLocalizedResponse('READ_SUMMARY', aiAnalysis.summary);
          return localResp || `Here's the summary: ${aiAnalysis.summary}`;
        }
        return getLocalizedResponse('READ_SUMMARY') || "No summary available for this document. Please wait for the analysis to complete.";

      case 'GET_DEADLINES':
        if (aiAnalysis?.deadlines && aiAnalysis.deadlines.length > 0) {
          const deadlineText = aiAnalysis.deadlines.join('. ');
          const localResp = getLocalizedResponse('GET_DEADLINES', deadlineText);
          return localResp || `I found ${aiAnalysis.deadlines.length} deadline${aiAnalysis.deadlines.length > 1 ? 's' : ''} in this document. ${deadlineText}`;
        }
        return getLocalizedResponse('GET_DEADLINES') || "No deadlines found in this document.";

      case 'GET_KEY_INFO':
        if (aiAnalysis?.keyInformation && aiAnalysis.keyInformation.length > 0) {
          const keyInfo = aiAnalysis.keyInformation.slice(0, 5).join('. ');
          const localResp = getLocalizedResponse('GET_KEY_INFO', keyInfo);
          return localResp || `Here's the key information: ${keyInfo}`;
        }
        return getLocalizedResponse('GET_KEY_INFO') || "No key information extracted from this document yet.";

      case 'GET_TYPE':
        if (documentType) {
          const localResp = getLocalizedResponse('GET_TYPE', documentType);
          return localResp || `This is a ${documentType} document.`;
        }
        if (aiAnalysis?.documentType) {
          const localResp = getLocalizedResponse('GET_TYPE', aiAnalysis.documentType);
          return localResp || `This appears to be a ${aiAnalysis.documentType} document.`;
        }
        return getLocalizedResponse('GET_TYPE') || "I couldn't determine the document type.";

      case 'GET_ACTIONS':
        if (aiAnalysis?.suggestedActions && aiAnalysis.suggestedActions.length > 0) {
          const actions = aiAnalysis.suggestedActions.slice(0, 3).join('. ');
          const localResp = getLocalizedResponse('GET_ACTIONS', actions);
          return localResp || `Here are the suggested actions: ${actions}`;
        }
        return getLocalizedResponse('GET_ACTIONS') || "No specific actions required for this document.";

      case 'GET_AMOUNT':
        // Look for amounts in key information
        if (aiAnalysis?.keyInformation) {
          const amountInfo = aiAnalysis.keyInformation.find(info => 
            /₹|rs|rupee|dollar|\$|amount|payment|fee|cost/i.test(info)
          );
          if (amountInfo) {
            const localResp = getLocalizedResponse('GET_AMOUNT', amountInfo);
            return localResp || `I found this amount information: ${amountInfo}`;
          }
        }
        return getLocalizedResponse('GET_AMOUNT') || "No monetary amounts found in this document.";

      case 'TRANSLATE': {
        const langName = params.language || 'hindi';
        const localTranslateResp = getLocalizedResponse('TRANSLATE', langName);
        return localTranslateResp || `Okay, I'll translate to ${langName}. Please use the translate button in the app to hear the full translation.`;
      }

      case 'STOP':
        return getLocalizedResponse('STOP') || "Okay, stopping.";

      case 'HELP':
        return getLocalizedResponse('HELP') || "You can speak in English, Telugu, Hindi, Tamil, Kannada, Malayalam, or Bengali! Try saying: Read the summary, What are the deadlines, Key information, Warnings, Download PDF, Share, or Stop.";

      case 'REPEAT':
        if (lastResponseRef.current) {
          return getLocalizedResponse('REPEAT', lastResponseRef.current) || lastResponseRef.current;
        }
        return getLocalizedResponse('REPEAT') || "Nothing to repeat yet. Try asking me something first.";

      case 'DOWNLOAD':
        return getLocalizedResponse('DOWNLOAD') || "Opening download option. Please click the Download PDF button to save the document.";

      case 'SHARE':
        return getLocalizedResponse('SHARE') || "Opening share option. Please click the Share button to share this document.";

      case 'READ_FULL':
        if (extractedText) {
          // Return first 500 chars to avoid very long speech
          const preview = extractedText.substring(0, 500);
          // Get language-specific suffix for truncated text
          const getSuffix = (): string => {
            if (extractedText.length <= 500) return '';
            if (isTeluguMode) return '... డాక్యుమెంట్ మరింత కొనసాగుతుంది.';
            if (isHindiMode) return '... दस्तावेज़ आगे जारी है।';
            if (isTamilMode) return '... ஆவணம் தொடர்கிறது.';
            if (isKannadaMode) return '... ಡಾಕ್ಯುಮೆಂಟ್ ಮುಂದುವರಿಯುತ್ತದೆ.';
            if (isMalayalamMode) return '... ഡോക്യുമെന്റ് തുടരുന്നു.';
            if (isBengaliMode) return '... নথি আরও চলছে।';
            return '... The document continues further.';
          };
          const suffix = getSuffix();
          const localResp = getLocalizedResponse('READ_FULL', preview + suffix);
          return localResp || `Here's the document text: ${preview}${suffix}`;
        }
        return getLocalizedResponse('READ_FULL') || "No text extracted from this document yet.";

      case 'WARNINGS':
        if (aiAnalysis?.warnings && aiAnalysis.warnings.length > 0) {
          const warnings = aiAnalysis.warnings.slice(0, 3).join('. ');
          const localResp = getLocalizedResponse('WARNINGS', warnings);
          return localResp || `Warning! ${warnings}`;
        }
        return getLocalizedResponse('WARNINGS') || "No warnings or concerns found in this document.";

      case 'UNKNOWN':
        return getLocalizedResponse('UNKNOWN') || "Sorry, I didn't understand that. Say 'help' to hear available commands. You can speak in English, Telugu, Hindi, Tamil, Kannada, Malayalam, or Bengali.";

      default:
        return getLocalizedResponse('UNKNOWN') || "I'm not sure how to help with that.";
    }
  }, [aiAnalysis, documentType, commandLanguage, extractedText]);

  // Process voice command
  const processCommand = useCallback(async (commandText: string) => {
    if (!commandText.trim()) return null;

    console.log('🎤 Processing voice command:', commandText);
    setIsProcessing(true);
    
    try {
      const { intent, params } = detectIntent(commandText);
      console.log('🎯 Detected intent:', intent, 'params:', params);
      const response = generateResponse(intent, params);
      console.log('💬 Generated response:', response.substring(0, 100) + '...');
      
      const result: VoiceCommandResult = {
        intent,
        params,
        transcript: commandText,
        response
      };
      
      setLastCommand(result);
      
      // Store for repeat command
      if (intent !== 'REPEAT' && intent !== 'STOP' && intent !== 'HELP') {
        lastResponseRef.current = response;
      }

      // Execute the command
      if (intent === 'STOP') {
        onStop();
        // Don't wait for anything, just stop immediately
        setIsProcessing(false);
        return result;
      } else if (intent === 'TRANSLATE' && onTranslate) {
        onTranslate(params.languageCode || 'hi-IN');
        // Speak in the selected command language (response is already localized)
        onSpeak(response, { languageCode: commandLanguage }).catch(() => {});
      } else {
        // Speak in the selected command language
        // Response text is already localized (Telugu/Hindi/English based on commandLanguage)
        onSpeak(response, { languageCode: commandLanguage }).catch(() => {});
      }

      return result;
    } finally {
      // Small delay to show processing state, then clear it
      setTimeout(() => setIsProcessing(false), 300);
    }
  }, [detectIntent, generateResponse, onSpeak, onStop, onTranslate, commandLanguage]);

  // Start listening for commands with selected language
  const startCommandMode = useCallback((language?: string) => {
    const lang = language || commandLanguage;
    setIsCommandMode(true);
    console.log('🎤 Starting voice commands in language:', lang);
    startListening({ language: lang, continuous: false, interimResults: true });
  }, [startListening, commandLanguage]);

  // Stop listening
  const stopCommandMode = useCallback(() => {
    setIsCommandMode(false);
    stopListening();
  }, [stopListening]);

  // Set command language
  const setVoiceLanguage = useCallback((lang: string) => {
    setCommandLanguage(lang);
    console.log('🌐 Voice command language set to:', lang);
  }, []);

  // Process transcript when it changes
  const handleTranscript = useCallback(async () => {
    if (transcript && isCommandMode && !isProcessing) {
      stopCommandMode();
      await processCommand(transcript);
    }
  }, [transcript, isCommandMode, isProcessing, stopCommandMode, processCommand]);

  return {
    // State
    isCommandMode,
    isListening,
    isProcessing,
    lastCommand,
    transcript,
    speechError,
    isSupported,
    commandLanguage,
    
    // Actions
    startCommandMode,
    stopCommandMode,
    processCommand,
    handleTranscript,
    setVoiceLanguage,
    
    // Utils
    detectIntent,
    availableCommands: Object.keys(INTENT_PATTERNS),
    availableLanguages: VOICE_LANGUAGES
  };
};

export default useVoiceCommands;
