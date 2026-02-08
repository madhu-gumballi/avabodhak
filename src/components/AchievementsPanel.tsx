import React from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
  Typography,
  LinearProgress,
} from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import LockIcon from '@mui/icons-material/Lock'
import { useAuth } from '../context/AuthContext'
import {
  getAllAchievements,
  getUnlockedAchievements,
  getLockedAchievements,
  getAchievementProgress,
} from '../lib/achievements'
import type { AchievementId } from '../lib/userTypes'
import type { Lang } from '../data/types'

interface AchievementsPanelProps {
  open: boolean
  onClose: () => void
  lang?: Lang
}

// Localized achievement names - Sanskrit-inspired names
const ACHIEVEMENT_NAMES: Record<AchievementId, Record<Lang, string>> = {
  first_line: {
    deva: 'प्रथमपदम्',
    knda: 'ಪ್ರಥಮಪದಂ',
    tel: 'ప్రథమపదం',
    tam: 'பிரதமபதம்',
    pan: 'ਪ੍ਰਥਮਪਦਮ੍',
    guj: 'પ્રથમપદમ્',
    mr: 'प्रथमपदम्',
    ben: 'প্রথমপদম্',
    mal: 'പ്രഥമപദം',
    iast: 'Prathama Padam'
  },
  first_stotra: {
    deva: 'स्तोत्रसिद्धि',
    knda: 'ಸ್ತೋತ್ರಸಿದ್ಧಿ',
    tel: 'స్తోత్రసిద్ధి',
    tam: 'ஸ்தோத்ரஸித்தி',
    pan: 'ਸਤੋਤ੍ਰਸਿੱਧੀ',
    guj: 'સ્તોત્રસિદ્ધિ',
    mr: 'स्तोत्रसिद्धी',
    ben: 'স্তোত্রসিদ্ধি',
    mal: 'സ്തോത്രസിദ്ധി',
    iast: 'Stotra Siddhi'
  },
  streak_2: {
    deva: 'द्विदिनव्रत',
    knda: 'ದ್ವಿದಿನವ್ರತ',
    tel: 'ద్విదినవ్రత',
    tam: 'த்விதினவிரதம்',
    pan: 'ਦ੍ਵਿਦਿਨਵ੍ਰਤ',
    guj: 'દ્વિદિનવ્રત',
    mr: 'द्विदिनव्रत',
    ben: 'দ্বিদিনব্রত',
    mal: 'ദ്വിദിനവ്രതം',
    iast: 'Dvi Dina Vrata'
  },
  streak_3: {
    deva: 'त्रिदिनव्रत',
    knda: 'ತ್ರಿದಿನವ್ರತ',
    tel: 'త్రిదినవ్రత',
    tam: 'த்ரிதினவிரதம்',
    pan: 'ਤ੍ਰਿਦਿਨਵ੍ਰਤ',
    guj: 'ત્રિદિનવ્રત',
    mr: 'त्रिदिनव्रत',
    ben: 'ত্রিদিনব্রত',
    mal: 'ത്രിദിനവ്രതം',
    iast: 'Tri Dina Vrata'
  },
  streak_5: {
    deva: 'पञ्चदिनव्रत',
    knda: 'ಪಂಚದಿನವ್ರತ',
    tel: 'పంచదినవ్రత',
    tam: 'பஞ்சதினவிரதம்',
    pan: 'ਪੰਚਦਿਨਵ੍ਰਤ',
    guj: 'પંચદિનવ્રત',
    mr: 'पंचदिनव्रत',
    ben: 'পঞ্চদিনব্রত',
    mal: 'പഞ്ചദിനവ്രതം',
    iast: 'Pancha Dina Vrata'
  },
  streak_7: {
    deva: 'सप्तदिनव्रत',
    knda: 'ಸಪ್ತದಿನವ್ರತ',
    tel: 'సప్తదినవ్రత',
    tam: 'சப்தடினவிரதம்',
    pan: 'ਸਪਤਦਿਨਵ੍ਰਤ',
    guj: 'સપ્તદિનવ્રત',
    mr: 'सप्तदिनव्रत',
    ben: 'সপ্তদিনব্রত',
    mal: 'സപ്തദിനവ്രതം',
    iast: 'Sapta Dina Vrata'
  },
  streak_14: {
    deva: 'पक्षव्रत',
    knda: 'ಪಕ್ಷವ್ರತ',
    tel: 'పక్షవ్రత',
    tam: 'பக்ஷவிரதம்',
    pan: 'ਪਕ੍ਸ਼ਵ੍ਰਤ',
    guj: 'પક્ષવ્રત',
    mr: 'पक्षव्रत',
    ben: 'পক্ষব্রত',
    mal: 'പക്ഷവ്രതം',
    iast: 'Paksha Vrata'
  },
  streak_21: {
    deva: 'त्रिसप्ताहव्रत',
    knda: 'ತ್ರಿಸಪ್ತಾಹವ್ರತ',
    tel: 'త్రిసప్తాహవ్రత',
    tam: 'த்ரிசப்தாஹவிரதம்',
    pan: 'ਤ੍ਰਿਸਪ੍ਤਾਹਵ੍ਰਤ',
    guj: 'ત્રિસપ્તાહવ્રત',
    mr: 'त्रिसप्ताहव्रत',
    ben: 'ত্রিসপ্তাহব্রত',
    mal: 'ത്രിസപ്താഹവ്രതം',
    iast: 'Tri Saptaha Vrata'
  },
  streak_30: {
    deva: 'मासव्रत',
    knda: 'ಮಾಸವ್ರತ',
    tel: 'మాసవ్రత',
    tam: 'மாசவிரதம்',
    pan: 'ਮਾਸਵ੍ਰਤ',
    guj: 'માસવ્રત',
    mr: 'मासव्रत',
    ben: 'মাসব্রত',
    mal: 'മാസവ്രതം',
    iast: 'Masa Vrata'
  },
  streak_60: {
    deva: 'द्विमासव्रत',
    knda: 'ದ್ವಿಮಾಸವ್ರತ',
    tel: 'ద్విమాసవ్రత',
    tam: 'த்விமாசவிரதம்',
    pan: 'ਦ੍ਵਿਮਾਸਵ੍ਰਤ',
    guj: 'દ્વિમાસવ્રત',
    mr: 'द्विमासव्रत',
    ben: 'দ্বিমাসব্রত',
    mal: 'ദ്വിമാസവ്രതം',
    iast: 'Dvi Masa Vrata'
  },
  streak_100: {
    deva: 'शतदिनव्रत',
    knda: 'ಶತದಿನವ್ರತ',
    tel: 'శతదినవ్రత',
    tam: 'சததினவிரதம்',
    pan: 'ਸ਼ਤਦਿਨਵ੍ਰਤ',
    guj: 'શતદિનવ્રત',
    mr: 'शतदिनव्रत',
    ben: 'শতদিনব্রত',
    mal: 'ശതദിനവ്രതം',
    iast: 'Shata Dina Vrata'
  },
  puzzle_perfect_10: {
    deva: 'दशपहेलीविद्',
    knda: 'ದಶಪಹೇಲೀವಿದ್',
    tel: 'దశపహేలీవిద్',
    tam: 'தசபஹேலீவித்',
    pan: 'ਦਸ਼ਪਹੇਲੀਵਿਦ੍',
    guj: 'દશપહેલીવિદ્',
    mr: 'दशपहेलीविद्',
    ben: 'দশপহেলীবিদ্',
    mal: 'ദശപഹേലീവിദ്',
    iast: 'Dasha Paheli Vid'
  },
  polyglot: {
    deva: 'बहुलिपिज्ञ',
    knda: 'ಬಹುಲಿಪಿಜ್ಞ',
    tel: 'బహులిపిజ్ఞ',
    tam: 'பஹுலிபிஜ்ஞ',
    pan: 'ਬਹੁਲਿਪੀਜ੍ਞ',
    guj: 'બહુલિપિજ્ઞ',
    mr: 'बहुलिपिज्ञ',
    ben: 'বহুলিপিজ্ঞ',
    mal: 'ബഹുലിപിജ്ഞ',
    iast: 'Bahu Lipi Jna'
  },
  speed_learner: {
    deva: 'द्रुतशिष्य',
    knda: 'ದ್ರುತಶಿಷ್ಯ',
    tel: 'ద్రుతశిష్య',
    tam: 'த்ருதசிஷ்ய',
    pan: 'ਦ੍ਰੁਤਸ਼ਿਸ਼੍ਯ',
    guj: 'દ્રુતશિષ્ય',
    mr: 'द्रुतशिष्य',
    ben: 'দ্রুতশিষ্য',
    mal: 'ദ്രുതശിഷ്യ',
    iast: 'Druta Shishya'
  },
  all_stotras: {
    deva: 'सर्वस्तोत्रसिद्ध',
    knda: 'ಸರ್ವಸ್ತೋತ್ರಸಿದ್ಧ',
    tel: 'సర్వస్తోత్రసిద్ధ',
    tam: 'சர்வஸ்தோத்ரசித்த',
    pan: 'ਸਰਵਸਤੋਤ੍ਰਸਿੱਧ',
    guj: 'સર્વસ્તોત્રસિદ્ધ',
    mr: 'सर्वस्तोत्रसिद्ध',
    ben: 'সর্বস্তোত্রসিদ্ধ',
    mal: 'സര്വസ്തോത്രസിദ്ധ',
    iast: 'Sarva Stotra Siddha'
  },
  vsn_master: {
    deva: 'सहस्रनामसिद्ध',
    knda: 'ಸಹಸ್ರನಾಮಸಿದ್ಧ',
    tel: 'సహస్రనామసిద్ధ',
    tam: 'சஹஸ்ரநாமசித்த',
    pan: 'ਸਹਸ੍ਰਨਾਮਸਿੱਧ',
    guj: 'સહસ્રનામસિદ્ધ',
    mr: 'सहस्रनामसिद्ध',
    ben: 'সহস্রনামসিদ্ধ',
    mal: 'സഹസ്രനാമസിദ്ധ',
    iast: 'Sahasranama Siddha'
  },
  hari_master: {
    deva: 'हरिस्तुतिसिद्ध',
    knda: 'ಹರಿಸ್ತುತಿಸಿದ್ಧ',
    tel: 'హరిస్తుతిసిద్ధ',
    tam: 'ஹரிஸ்துதிசித்த',
    pan: 'ਹਰਿਸਤੁਤੀਸਿੱਧ',
    guj: 'હરિસ્તુતિસિદ્ધ',
    mr: 'हरिस्तुतिसिद्ध',
    ben: 'হরিস্তুতিসিদ্ধ',
    mal: 'ഹരിസ്തുതിസിദ്ധ',
    iast: 'Hari Stuti Siddha'
  },
  keshava_master: {
    deva: 'केशवनामसिद्ध',
    knda: 'ಕೇಶವನಾಮಸಿದ್ಧ',
    tel: 'కేశవనామసిద్ధ',
    tam: 'கேசவநாமசித்த',
    pan: 'ਕੇਸ਼ਵਨਾਮਸਿੱਧ',
    guj: 'કેશવનામસિદ્ધ',
    mr: 'केशवनामसिद्ध',
    ben: 'কেশবনামসিদ্ধ',
    mal: 'കേശവനാമസിദ്ധ',
    iast: 'Keshava Nama Siddha'
  },
  vayu_master: {
    deva: 'वायुस्तुतिसिद्ध',
    knda: 'ವಾಯುಸ್ತುತಿಸಿದ್ಧ',
    tel: 'వాయుస్తుతిసిద్ధ',
    tam: 'வாயுஸ்துதிசித்த',
    pan: 'ਵਾਯੁਸਤੁਤੀਸਿੱਧ',
    guj: 'વાયુસ્તુતિસિદ્ધ',
    mr: 'वायुस्तुतिसिद्ध',
    ben: 'বায়ুস্তুতিসিদ্ধ',
    mal: 'വായുസ്തുതിസിദ്ധ',
    iast: 'Vayu Stuti Siddha'
  },
}

// Localized achievement descriptions
const ACHIEVEMENT_DESCRIPTIONS: Record<AchievementId, Record<Lang, string>> = {
  first_line: {
    deva: 'अभ्यास में पहली पंक्ति पूर्ण करें',
    knda: 'ಅಭ್ಯಾಸದಲ್ಲಿ ಮೊದಲ ಸಾಲು ಪೂರ್ಣಗೊಳಿಸಿ',
    tel: 'అభ్యాసంలో మొదటి పంక్తిని పూర్తి చేయండి',
    tam: 'பயிற்சியில் முதல் வரி முடிக்கவும்',
    pan: 'ਅਭਿਆਸ ਵਿੱਚ ਪਹਿਲੀ ਲਾਈਨ ਪੂਰੀ ਕਰੋ',
    guj: 'અભ્યાસમાં પહેલી લાઇન પૂર્ણ કરો',
    mr: 'सरावात पहिली ओळ पूर्ण करा',
    ben: 'অনুশীলনে প্রথম লাইন সম্পূর্ণ করুন',
    mal: 'പരിശീലനത്തില്‍ ആദ്യ വരി പൂര്‍ത്തിയാക്കുക',
    iast: 'Complete your first line in practice'
  },
  first_stotra: {
    deva: 'किसी भी स्तोत्र की सभी पंक्तियाँ पूर्ण करें',
    knda: 'ಯಾವುದೇ ಸ್ತೋತ್ರದ ಎಲ್ಲಾ ಸಾಲುಗಳನ್ನು ಪೂರ್ಣಗೊಳಿಸಿ',
    tel: 'ఏదైనా స్తోత్రం యొక్క అన్ని పంక్తులు పూర్తి చేయండి',
    tam: 'எந்த ஸ்தோத்திரத்தின் அனைத்து வரிகளையும் முடிக்கவும்',
    pan: 'ਕਿਸੇ ਵੀ ਸਤੋਤਰ ਦੀਆਂ ਸਾਰੀਆਂ ਲਾਈਨਾਂ ਪੂਰੀਆਂ ਕਰੋ',
    guj: 'કોઈપણ સ્તોત્રની બધી લાઇનો પૂર્ણ કરો',
    mr: 'कोणत्याही स्तोत्राच्या सर्व ओळी पूर्ण करा',
    ben: 'যেকোনো স্তোত্রের সমস্ত লাইন সম্পূর্ণ করুন',
    mal: 'ഏതെങ്കിലും സ്തോത്രത്തിന്റെ എല്ലാ വരികളും പൂര്‍ത്തിയാക്കുക',
    iast: 'Complete all lines of any stotra'
  },
  streak_2: {
    deva: '२ दिन की निरंतर अभ्यास',
    knda: '೨ ದಿನಗಳ ನಿರಂತರ ಅಭ್ಯಾಸ',
    tel: '౨ రోజుల నిరంతర అభ్యాసం',
    tam: '௨ நாள் தொடர் பயிற்சி',
    pan: '੨ ਦਿਨਾਂ ਦਾ ਲਗਾਤਾਰ ਅਭਿਆਸ',
    guj: '૨ દિવસનો સતત અભ્યાસ',
    mr: '२ दिवसांचा सलग सराव',
    ben: '২ দিনের ধারাবাহিক অনুশীলন',
    mal: '൨ ദിവസത്തെ തുടര്‍ച്ചയായ പരിശീലനം',
    iast: '2 consecutive days of practice'
  },
  streak_3: {
    deva: '३ दिन की निरंतर अभ्यास',
    knda: '೩ ದಿನಗಳ ನಿರಂತರ ಅಭ್ಯಾಸ',
    tel: '౩ రోజుల నిరంతర అభ్యాసం',
    tam: '௩ நாள் தொடர் பயிற்சி',
    pan: '੩ ਦਿਨਾਂ ਦਾ ਲਗਾਤਾਰ ਅਭਿਆਸ',
    guj: '૩ દિવસનો સતત અભ્યાસ',
    mr: '३ दिवसांचा सलग सराव',
    ben: '৩ দিনের ধারাবাহিক অনুশীলন',
    mal: '൩ ദിവസത്തെ തുടര്‍ച്ചയായ പരിശീലനം',
    iast: '3 consecutive days of practice'
  },
  streak_5: {
    deva: '५ दिन की निरंतर अभ्यास',
    knda: '೫ ದಿನಗಳ ನಿರಂತರ ಅಭ್ಯಾಸ',
    tel: '౫ రోజుల నిరంతర అభ్యాసం',
    tam: '௫ நாள் தொடர் பயிற்சி',
    pan: '੫ ਦਿਨਾਂ ਦਾ ਲਗਾਤਾਰ ਅਭਿਆਸ',
    guj: '૫ દિવસનો સતત અભ્યાસ',
    mr: '५ दिवसांचा सलग सराव',
    ben: '৫ দিনের ধারাবাহিক অনুশীলন',
    mal: '൫ ദിവസത്തെ തുടര്‍ച്ചയായ പരിശീലനം',
    iast: '5 consecutive days of practice'
  },
  streak_7: {
    deva: '७ दिन की निरंतर अभ्यास',
    knda: '೭ ದಿನಗಳ ನಿರಂತರ ಅಭ್ಯಾಸ',
    tel: '౭ రోజుల నిరంతర అభ్యాసం',
    tam: '௭ நாள் தொடர் பயிற்சி',
    pan: '੭ ਦਿਨਾਂ ਦਾ ਲਗਾਤਾਰ ਅਭਿਆਸ',
    guj: '૭ દિવસનો સતત અભ્યાસ',
    mr: '७ दिवसांचा सलग सराव',
    ben: '৭ দিনের ধারাবাহিক অনুশীলন',
    mal: '൭ ദിവസത്തെ തുടര്‍ച്ചയായ പരിശീലനം',
    iast: '7 consecutive days of practice'
  },
  streak_14: {
    deva: '१४ दिन की निरंतर अभ्यास',
    knda: '೧೪ ದಿನಗಳ ನಿರಂತರ ಅಭ್ಯಾಸ',
    tel: '౧౪ రోజుల నిరంతర అభ్యాసం',
    tam: '௧௪ நாள் தொடர் பயிற்சி',
    pan: '੧੪ ਦਿਨਾਂ ਦਾ ਲਗਾਤਾਰ ਅਭਿਆਸ',
    guj: '૧૪ દિવસનો સતત અભ્યાસ',
    mr: '१४ दिवसांचा सलग सराव',
    ben: '১৪ দিনের ধারাবাহিক অনুশীলন',
    mal: '൧൪ ദിവസത്തെ തുടര്‍ച്ചയായ പരിശീലനം',
    iast: '14 consecutive days of practice'
  },
  streak_21: {
    deva: '२१ दिन की निरंतर अभ्यास',
    knda: '೨೧ ದಿನಗಳ ನಿರಂತರ ಅಭ್ಯಾಸ',
    tel: '౨౧ రోజుల నిరంతర అభ్యాసం',
    tam: '௨௧ நாள் தொடர் பயிற்சி',
    pan: '੨੧ ਦਿਨਾਂ ਦਾ ਲਗਾਤਾਰ ਅਭਿਆਸ',
    guj: '૨૧ દિવસનો સતત અભ્યાસ',
    mr: '२१ दिवसांचा सलग सराव',
    ben: '২১ দিনের ধারাবাহিক অনুশীলন',
    mal: '൨൧ ദിവസത്തെ തുടര്‍ച്ചയായ പരിശീലനം',
    iast: '21 consecutive days of practice'
  },
  streak_30: {
    deva: '३० दिन की निरंतर अभ्यास',
    knda: '೩೦ ದಿನಗಳ ನಿರಂತರ ಅಭ್ಯಾಸ',
    tel: '౩౦ రోజుల నిరంతర అభ్యాసం',
    tam: '௩௦ நாள் தொடர் பயிற்சி',
    pan: '੩੦ ਦਿਨਾਂ ਦਾ ਲਗਾਤਾਰ ਅਭਿਆਸ',
    guj: '૩૦ દિવસનો સતત અભ્યાસ',
    mr: '३० दिवसांचा सलग सराव',
    ben: '৩০ দিনের ধারাবাহিক অনুশীলন',
    mal: '൩൦ ദിവസത്തെ തുടര്‍ച്ചയായ പരിശീലനം',
    iast: '30 consecutive days of practice'
  },
  streak_60: {
    deva: '६० दिन की निरंतर अभ्यास',
    knda: '೬೦ ದಿನಗಳ ನಿರಂತರ ಅಭ್ಯಾಸ',
    tel: '౬౦ రోజుల నిరంతర అభ్యాసం',
    tam: '௬௦ நாள் தொடர் பயிற்சி',
    pan: '੬੦ ਦਿਨਾਂ ਦਾ ਲਗਾਤਾਰ ਅਭਿਆਸ',
    guj: '૬૦ દિવસનો સતત અભ્યાસ',
    mr: '६० दिवसांचा सलग सराव',
    ben: '৬০ দিনের ধারাবাহিক অনুশীলন',
    mal: '൬൦ ദിവസത്തെ തുടര്‍ച്ചയായ പരിശീലനം',
    iast: '60 consecutive days of practice'
  },
  streak_100: {
    deva: '१०० दिन की निरंतर अभ्यास',
    knda: '೧೦೦ ದಿನಗಳ ನಿರಂತರ ಅಭ್ಯಾಸ',
    tel: '౧౦౦ రోజుల నిరంతర అభ్యాసం',
    tam: '௧௦௦ நாள் தொடர் பயிற்சி',
    pan: '੧੦੦ ਦਿਨਾਂ ਦਾ ਲਗਾਤਾਰ ਅਭਿਆਸ',
    guj: '૧૦૦ દિવસનો સતત અભ્યાસ',
    mr: '१०० दिवसांचा सलग सराव',
    ben: '১০০ দিনের ধারাবাহিক অনুশীলন',
    mal: '൧൦൦ ദിവസത്തെ തുടര്‍ച്ചയായ പരിശീലനം',
    iast: '100 consecutive days of practice'
  },
  puzzle_perfect_10: {
    deva: 'बिना संकेत के १० पहेलियाँ हल करें',
    knda: 'ಸುಳಿವು ಇಲ್ಲದೆ ೧೦ ಒಗಟುಗಳನ್ನು ಬಿಡಿಸಿ',
    tel: 'సూచన లేకుండా ౧౦ పజిల్స్ పరిష్కరించండి',
    tam: 'குறிப்பு இல்லாமல் ௧௦ புதிர்களை தீர்க்கவும்',
    pan: 'ਸੰਕੇਤ ਤੋਂ ਬਿਨਾਂ ੧੦ ਪਹੇਲੀਆਂ ਹੱਲ ਕਰੋ',
    guj: 'સંકેત વિના ૧૦ પઝલ ઉકેલો',
    mr: 'संकेतशिवाय १० कोडी सोडवा',
    ben: 'সংকেত ছাড়া ১০ ধাঁধা সমাধান করুন',
    mal: 'സൂചന ഇല്ലാതെ ൧൦ പസിലുകള്‍ പരിഹരിക്കുക',
    iast: 'Solve 10 puzzles without hints'
  },
  polyglot: {
    deva: '३ या अधिक लिपियों में अभ्यास करें',
    knda: '೩ ಅಥವಾ ಹೆಚ್ಚು ಲಿಪಿಗಳಲ್ಲಿ ಅಭ್ಯಾಸ ಮಾಡಿ',
    tel: '౩ లేదా అంతకంటే ఎక్కువ లిపులలో అభ్యాసం చేయండి',
    tam: '௩ அல்லது அதிக எழுத்துக்களில் பயிற்சி செய்யுங்கள்',
    pan: '੩ ਜਾਂ ਵੱਧ ਲਿਪੀਆਂ ਵਿੱਚ ਅਭਿਆਸ ਕਰੋ',
    guj: '૩ અથવા વધુ લિપિઓમાં અભ્યાસ કરો',
    mr: '३ किंवा अधिक लिपींमध्ये सराव करा',
    ben: '৩ বা তার বেশি লিপিতে অনুশীলন করুন',
    mal: '൩ അല്ലെങ്കില്‍ അതിലധികം ലിപികളില്‍ പരിശീലിക്കുക',
    iast: 'Practice in 3 or more scripts'
  },
  speed_learner: {
    deva: 'एक सत्र में ५० पंक्तियाँ पूर्ण करें',
    knda: 'ಒಂದು ಅಧಿವೇಶನದಲ್ಲಿ ೫೦ ಸಾಲುಗಳನ್ನು ಪೂರ್ಣಗೊಳಿಸಿ',
    tel: 'ఒక సెషన్‌లో ౫౦ పంక్తులు పూర్తి చేయండి',
    tam: 'ஒரு அமர்வில் ௫௦ வரிகள் முடிக்கவும்',
    pan: 'ਇੱਕ ਸੈਸ਼ਨ ਵਿੱਚ ੫੦ ਲਾਈਨਾਂ ਪੂਰੀਆਂ ਕਰੋ',
    guj: 'એક સત્રમાં ૫૦ લાઇનો પૂર્ણ કરો',
    mr: 'एका सत्रात ५० ओळी पूर्ण करा',
    ben: 'এক সেশনে ৫০ লাইন সম্পূর্ণ করুন',
    mal: 'ഒരു സെഷനില്‍ ൫൦ വരികള്‍ പൂര്‍ത്തിയാക്കുക',
    iast: 'Complete 50 lines in one session'
  },
  all_stotras: {
    deva: 'सभी उपलब्ध स्तोत्र पूर्ण करें',
    knda: 'ಎಲ್ಲಾ ಲಭ್ಯವಿರುವ ಸ್ತೋತ್ರಗಳನ್ನು ಪೂರ್ಣಗೊಳಿಸಿ',
    tel: 'అందుబాటులో ఉన్న అన్ని స్తోత్రాలు పూర్తి చేయండి',
    tam: 'கிடைக்கும் அனைத்து ஸ்தோத்திரங்களையும் முடிக்கவும்',
    pan: 'ਸਾਰੇ ਉਪਲਬਧ ਸਤੋਤਰ ਪੂਰੇ ਕਰੋ',
    guj: 'બધા ઉપલબ્ધ સ્તોત્રો પૂર્ણ કરો',
    mr: 'सर्व उपलब्ध स्तोत्रे पूर्ण करा',
    ben: 'সমস্ত উপলব্ধ স্তোত্র সম্পূর্ণ করুন',
    mal: 'ലഭ്യമായ എല്ലാ സ്തോത്രങ്ങളും പൂര്‍ത്തിയാക്കുക',
    iast: 'Complete all available stotras'
  },
  vsn_master: {
    deva: 'विष्णु सहस्रनाम का अभ्यास और पहेली पूर्ण करें',
    knda: 'ವಿಷ್ಣು ಸಹಸ್ರನಾಮದ ಅಭ್ಯಾಸ ಮತ್ತು ಒಗಟು ಪೂರ್ಣಗೊಳಿಸಿ',
    tel: 'విష్ణు సహస్రనామ అభ్యాసం మరియు పజిల్ పూర్తి చేయండి',
    tam: 'விஷ்ணு சஹஸ்ரநாமம் பயிற்சி மற்றும் புதிர் முடிக்கவும்',
    pan: 'ਵਿਸ਼ਨੂ ਸਹਸ੍ਰਨਾਮ ਅਭਿਆਸ ਅਤੇ ਪਹੇਲੀ ਪੂਰੀ ਕਰੋ',
    guj: 'વિષ્ણુ સહસ્રનામ અભ્યાસ અને પઝલ પૂર્ણ કરો',
    mr: 'विष्णू सहस्रनाम सराव आणि कोडे पूर्ण करा',
    ben: 'বিষ্ণু সহস্রনাম অনুশীলন এবং ধাঁধা সম্পূর্ণ করুন',
    mal: 'വിഷ്ണു സഹസ്രനാമ പരിശീലനവും പസിലും പൂര്‍ത്തിയാക്കുക',
    iast: 'Complete Vishnu Sahasranama practice and puzzle'
  },
  hari_master: {
    deva: 'हरि स्तुति का अभ्यास और पहेली पूर्ण करें',
    knda: 'ಹರಿ ಸ್ತುತಿ ಅಭ್ಯಾಸ ಮತ್ತು ಒಗಟು ಪೂರ್ಣಗೊಳಿಸಿ',
    tel: 'హరి స్తుతి అభ్యాసం మరియు పజిల్ పూర్తి చేయండి',
    tam: 'ஹரி ஸ்துதி பயிற்சி மற்றும் புதிர் முடிக்கவும்',
    pan: 'ਹਰਿ ਸਤੁਤੀ ਅਭਿਆਸ ਅਤੇ ਪਹੇਲੀ ਪੂਰੀ ਕਰੋ',
    guj: 'હરિ સ્તુતિ અભ્યાસ અને પઝલ પૂર્ણ કરો',
    mr: 'हरी स्तुती सराव आणि कोडे पूर्ण करा',
    ben: 'হরি স্তুতি অনুশীলন এবং ধাঁধা সম্পূর্ণ করুন',
    mal: 'ഹരി സ്തുതി പരിശീലനവും പസിലും പൂര്‍ത്തിയാക്കുക',
    iast: 'Complete Hari Stuti practice and puzzle'
  },
  keshava_master: {
    deva: 'केशव नाम का अभ्यास और पहेली पूर्ण करें',
    knda: 'ಕೇಶವ ನಾಮ ಅಭ್ಯಾಸ ಮತ್ತು ಒಗಟು ಪೂರ್ಣಗೊಳಿಸಿ',
    tel: 'కేశవ నామ అభ్యాసం మరియు పజిల్ పూర్తి చేయండి',
    tam: 'கேசவ நாமம் பயிற்சி மற்றும் புதிர் முடிக்கவும்',
    pan: 'ਕੇਸ਼ਵ ਨਾਮ ਅਭਿਆਸ ਅਤੇ ਪਹੇਲੀ ਪੂਰੀ ਕਰੋ',
    guj: 'કેશવ નામ અભ્યાસ અને પઝલ પૂર્ણ કરો',
    mr: 'केशव नाम सराव आणि कोडे पूर्ण करा',
    ben: 'কেশব নাম অনুশীলন এবং ধাঁধা সম্পূর্ণ করুন',
    mal: 'കേശവ നാമ പരിശീലനവും പസിലും പൂര്‍ത്തിയാക്കുക',
    iast: 'Complete Keshava Nama practice and puzzle'
  },
  vayu_master: {
    deva: 'वायु स्तुति का अभ्यास और पहेली पूर्ण करें',
    knda: 'ವಾಯು ಸ್ತುತಿ ಅಭ್ಯಾಸ ಮತ್ತು ಒಗಟು ಪೂರ್ಣಗೊಳಿಸಿ',
    tel: 'వాయు స్తుతి అభ్యాసం మరియు పజిల్ పూర్తి చేయండి',
    tam: 'வாயு ஸ்துதி பயிற்சி மற்றும் புதிர் முடிக்கவும்',
    pan: 'ਵਾਯੁ ਸਤੁਤੀ ਅਭਿਆਸ ਅਤੇ ਪਹੇਲੀ ਪੂਰੀ ਕਰੋ',
    guj: 'વાયુ સ્તુતિ અભ્યાસ અને પઝલ પૂર્ણ કરો',
    mr: 'वायू स्तुती सराव आणि कोडे पूर्ण करा',
    ben: 'বায়ু স্তুতি অনুশীলন এবং ধাঁধা সম্পূর্ণ করুন',
    mal: 'വായു സ്തുതി പരിശീലനവും പസിലും പൂര്‍ത്തിയാക്കുക',
    iast: 'Complete Vayu Stuti practice and puzzle'
  },
}

// UI text translations
const UI_TEXT: Record<string, Record<Lang, string>> = {
  achievements: {
    deva: 'उपलब्धियाँ',
    knda: 'ಸಾಧನೆಗಳು',
    tel: 'సాధనలు',
    tam: 'சாதனைகள்',
    pan: 'ਪ੍ਰਾਪਤੀਆਂ',
    guj: 'સિદ્ધિઓ',
    mr: 'साध्ये',
    ben: 'অর্জন',
    mal: 'നേട്ടങ്ങൾ',
    iast: 'Achievements'
  },
  unlocked: {
    deva: 'अनलॉक',
    knda: 'ಅನ್‌ಲಾಕ್',
    tel: 'అన్‌లాక్',
    tam: 'திறக்கப்பட்டது',
    pan: 'ਅਨਲੌਕ',
    guj: 'અનલૉક',
    mr: 'अनलॉक',
    ben: 'আনলক',
    mal: 'അൺലോക്ക്',
    iast: 'Unlocked'
  },
  locked: {
    deva: 'लॉक',
    knda: 'ಲಾಕ್',
    tel: 'లాక్',
    tam: 'பூட்டப்பட்டது',
    pan: 'ਲੌਕ',
    guj: 'લૉક',
    mr: 'लॉक',
    ben: 'লক',
    mal: 'ലോക്ക്',
    iast: 'Locked'
  },
  progress: {
    deva: 'प्रगति',
    knda: 'ಪ್ರಗತಿ',
    tel: 'పురోగతి',
    tam: 'முன்னேற்றம்',
    pan: 'ਪ੍ਰਗਤੀ',
    guj: 'પ્રગતિ',
    mr: 'प्रगती',
    ben: 'অগ্রগতি',
    mal: 'പുരോഗതി',
    iast: 'Progress'
  },
  startPracticing: {
    deva: 'उपलब्धियाँ अनलॉक करने के लिए अभ्यास शुरू करें!',
    knda: 'ಸಾಧನೆಗಳನ್ನು ಅನ್‌ಲಾಕ್ ಮಾಡಲು ಅಭ್ಯಾಸ ಪ್ರಾರಂಭಿಸಿ!',
    tel: 'సాధనలను అన్‌లాక్ చేయడానికి అభ్యాసం ప్రారంభించండి!',
    tam: 'சாதனைகளைத் திறக்க பயிற்சி தொடங்குங்கள்!',
    pan: 'ਪ੍ਰਾਪਤੀਆਂ ਅਨਲੌਕ ਕਰਨ ਲਈ ਅਭਿਆਸ ਸ਼ੁਰੂ ਕਰੋ!',
    guj: 'સિદ્ધિઓ અનલૉક કરવા અભ્યાસ શરૂ કરો!',
    mr: 'साध्ये अनलॉक करण्यासाठी सराव सुरू करा!',
    ben: 'অর্জন আনলক করতে অনুশীলন শুরু করুন!',
    mal: 'നേട്ടങ്ങൾ അൺലോക്ക് ചെയ്യാൻ പരിശീലനം ആരംഭിക്കുക!',
    iast: 'Start practicing to unlock achievements!'
  },
  today: {
    deva: 'आज',
    knda: 'ಇಂದು',
    tel: 'ఈరోజు',
    tam: 'இன்று',
    pan: 'ਅੱਜ',
    guj: 'આજે',
    mr: 'आज',
    ben: 'আজ',
    mal: 'ഇന്ന്',
    iast: 'today'
  },
  yesterday: {
    deva: 'कल',
    knda: 'ನಿನ್ನೆ',
    tel: 'నిన్న',
    tam: 'நேற்று',
    pan: 'ਕੱਲ੍ਹ',
    guj: 'ગઈકાલે',
    mr: 'काल',
    ben: 'গতকাল',
    mal: 'ഇന്നലെ',
    iast: 'yesterday'
  },
  daysAgo: {
    deva: 'दिन पहले',
    knda: 'ದಿನಗಳ ಹಿಂದೆ',
    tel: 'రోజుల క్రితం',
    tam: 'நாட்களுக்கு முன்',
    pan: 'ਦਿਨ ਪਹਿਲਾਂ',
    guj: 'દિવસ પહેલા',
    mr: 'दिवसांपूर्वी',
    ben: 'দিন আগে',
    mal: 'ദിവസം മുമ്പ്',
    iast: 'days ago'
  },
  weeksAgo: {
    deva: 'सप्ताह पहले',
    knda: 'ವಾರಗಳ ಹಿಂದೆ',
    tel: 'వారాల క్రితం',
    tam: 'வாரங்களுக்கு முன்',
    pan: 'ਹਫ਼ਤੇ ਪਹਿਲਾਂ',
    guj: 'અઠવાડિયા પહેલા',
    mr: 'आठवड्यांपूर्वी',
    ben: 'সপ্তাহ আগে',
    mal: 'ആഴ്ച മുമ്പ്',
    iast: 'weeks ago'
  },
  bestStreak: {
    deva: 'सर्वश्रेष्ठ धारा',
    knda: 'ಅತ್ಯುತ್ತಮ ಸರಣಿ',
    tel: 'అత్యుత్తమ స్ట్రీక్',
    tam: 'சிறந்த தொடர்',
    pan: 'ਸਰਬੋਤਮ ਲੜੀ',
    guj: 'શ્રેષ્ઠ શ્રેણી',
    mr: 'सर्वोत्तम मालिका',
    ben: 'সেরা ধারা',
    mal: 'ഏറ്റവും നല്ല സ്ട്രീക്ക്',
    iast: 'Best Streak'
  },
  days: {
    deva: 'दिन',
    knda: 'ದಿನಗಳು',
    tel: 'రోజులు',
    tam: 'நாட்கள்',
    pan: 'ਦਿਨ',
    guj: 'દિવસ',
    mr: 'दिवस',
    ben: 'দিন',
    mal: 'ദിവസം',
    iast: 'days'
  },
}

export default function AchievementsPanel({ open, onClose, lang = 'deva' }: AchievementsPanelProps) {
  const { userData } = useAuth()

  const getUIText = (key: string): string => {
    return UI_TEXT[key]?.[lang] || UI_TEXT[key]?.iast || key
  }

  const getAchievementName = (id: AchievementId): string => {
    return ACHIEVEMENT_NAMES[id]?.[lang] || ACHIEVEMENT_NAMES[id]?.iast || id
  }

  const getAchievementDescription = (id: AchievementId): string => {
    return ACHIEVEMENT_DESCRIPTIONS[id]?.[lang] || ACHIEVEMENT_DESCRIPTIONS[id]?.iast || ''
  }

  const formatDate = (date: Date): string => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (days === 0) return getUIText('today')
    if (days === 1) return getUIText('yesterday')
    if (days < 7) return `${days} ${getUIText('daysAgo')}`
    if (days < 30) return `${Math.floor(days / 7)} ${getUIText('weeksAgo')}`
    return date.toLocaleDateString()
  }

  if (!userData) return null

  const unlocked = getUnlockedAchievements(userData)
  const locked = getLockedAchievements(userData)
  const total = getAllAchievements().length

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 3,
          maxHeight: '80vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pb: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6" fontWeight="bold">
            {getUIText('achievements')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {unlocked.length}/{total}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {/* Best Streak banner */}
        {userData.stats.longestStreak > 0 && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              mb: 3,
              p: 1.5,
              borderRadius: 2,
              bgcolor: 'rgba(245, 158, 11, 0.1)',
              border: '1px solid rgba(245, 158, 11, 0.25)',
            }}
          >
            <Typography sx={{ fontSize: '1.5rem', lineHeight: 1 }}>
              {'\uD83D\uDD25'}
            </Typography>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ color: 'rgb(245, 158, 11)' }}>
              {getUIText('bestStreak')}: {userData.stats.longestStreak} {getUIText('days')}
            </Typography>
          </Box>
        )}

        {/* Unlocked achievements */}
        {unlocked.length > 0 && (
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ mb: 2 }}
            >
              {getUIText('unlocked')}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {unlocked.map((achievement) => (
                <AchievementCard
                  key={achievement.id}
                  icon={achievement.icon}
                  name={getAchievementName(achievement.id)}
                  description={getAchievementDescription(achievement.id)}
                  unlocked
                  unlockedAt={achievement.unlockedAt}
                  formatDate={formatDate}
                />
              ))}
            </Box>
          </Box>
        )}

        {/* Locked achievements */}
        {locked.length > 0 && (
          <Box>
            <Typography
              variant="subtitle2"
              color="text.secondary"
              sx={{ mb: 2 }}
            >
              {getUIText('locked')}
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {locked.map((achievement) => {
                const progress = getAchievementProgress(userData, achievement.id)
                return (
                  <AchievementCard
                    key={achievement.id}
                    icon={achievement.icon}
                    name={getAchievementName(achievement.id)}
                    description={getAchievementDescription(achievement.id)}
                    unlocked={false}
                    progress={progress}
                    progressLabel={getUIText('progress')}
                  />
                )
              })}
            </Box>
          </Box>
        )}

        {/* Empty state */}
        {unlocked.length === 0 && locked.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">
              {getUIText('startPracticing')}
            </Typography>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  )
}

interface AchievementCardProps {
  icon: string
  name: string
  description: string
  unlocked: boolean
  unlockedAt?: Date
  progress?: { current: number; target: number; percentage: number }
  formatDate?: (date: Date) => string
  progressLabel?: string
}

function AchievementCard({
  icon,
  name,
  description,
  unlocked,
  unlockedAt,
  progress,
  formatDate,
  progressLabel = 'Progress',
}: AchievementCardProps) {
  return (
    <Box
      sx={{
        p: 2,
        bgcolor: unlocked
          ? 'rgba(245, 158, 11, 0.1)'
          : 'rgba(255, 255, 255, 0.02)',
        borderRadius: 2,
        border: unlocked
          ? '1px solid rgba(245, 158, 11, 0.3)'
          : '1px solid rgba(255, 255, 255, 0.05)',
        opacity: unlocked ? 1 : 0.7,
        transition: 'all 0.2s',
        '&:hover': {
          opacity: 1,
          bgcolor: unlocked
            ? 'rgba(245, 158, 11, 0.15)'
            : 'rgba(255, 255, 255, 0.05)',
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
        {/* Icon */}
        <Box
          sx={{
            width: 40,
            height: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 2,
            bgcolor: unlocked
              ? 'rgba(245, 158, 11, 0.2)'
              : 'rgba(255, 255, 255, 0.05)',
            fontSize: '1.5rem',
            filter: unlocked ? 'none' : 'grayscale(1)',
          }}
        >
          {unlocked ? icon : <LockIcon sx={{ fontSize: 20, color: 'text.disabled' }} />}
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            variant="subtitle2"
            fontWeight={unlocked ? 'bold' : 'medium'}
            sx={{
              color: unlocked ? 'rgb(245, 158, 11)' : 'text.primary',
            }}
          >
            {name}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: 'block',
              lineHeight: 1.4,
              mt: 0.25,
            }}
          >
            {description}
          </Typography>

          {/* Progress bar for locked achievements */}
          {!unlocked && progress && progress.percentage > 0 && (
            <Box sx={{ mt: 1 }}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  mb: 0.5,
                }}
              >
                <Typography variant="caption" color="text.disabled">
                  {progressLabel}
                </Typography>
                <Typography variant="caption" color="text.disabled">
                  {progress.current}/{progress.target}
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={progress.percentage}
                sx={{
                  height: 4,
                  borderRadius: 2,
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                  '& .MuiLinearProgress-bar': {
                    bgcolor: 'rgba(245, 158, 11, 0.5)',
                    borderRadius: 2,
                  },
                }}
              />
            </Box>
          )}

          {/* Unlocked date */}
          {unlocked && unlockedAt && formatDate && (
            <Typography
              variant="caption"
              color="text.disabled"
              sx={{ display: 'block', mt: 0.5 }}
            >
              {formatDate(unlockedAt)}
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  )
}
