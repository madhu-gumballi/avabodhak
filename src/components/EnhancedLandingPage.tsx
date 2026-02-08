import { useState, useEffect } from 'react';
import { Box, Card, CardActionArea, Typography, Fade, Grow, Chip, IconButton, Menu, MenuItem, LinearProgress } from '@mui/material';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import SpaIcon from '@mui/icons-material/Spa';
import LanguageIcon from '@mui/icons-material/Language';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import TranslateIcon from '@mui/icons-material/Translate';
import SchoolIcon from '@mui/icons-material/School';
import ExtensionIcon from '@mui/icons-material/Extension';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';
import vsnLines from '../data/vs.lines.new.json';
import hariLines from '../data/hari.lines.json';
import keshavaLines from '../data/keshava.lines.json';
import vayuLines from '../data/vayu.lines.json';
import type { TextFile, Lang } from '../data/types';
import { useAuth } from '../context/AuthContext';
import UserMenu from './UserMenu';
import LoginButton from './LoginButton';
import AchievementsPanel from './AchievementsPanel';
import LeaderboardPanel from './LeaderboardPanel';
import MyProgressCard from './MyProgressCard';

interface LandingPageProps {
    onSelectStotra: (stotra: 'vsn' | 'hari' | 'keshava' | 'vayu', preferredLang?: Lang, mode?: 'reading' | 'practice' | 'puzzle', lineIndex?: number) => void;
}

const LANGUAGE_NAMES: Record<Lang, { native: string; english: string }> = {
    deva: { native: 'देवनागरी', english: 'Devanagari' },
    knda: { native: 'ಕನ್ನಡ', english: 'Kannada' },
    tel: { native: 'తెలుగు', english: 'Telugu' },
    tam: { native: 'தமிழ்', english: 'Tamil' },
    pan: { native: 'ਪੰਜਾਬੀ', english: 'Punjabi' },
    guj: { native: 'ગુજરાતી', english: 'Gujarati' },
    mr: { native: 'मराठी', english: 'Marathi' },
    ben: { native: 'বাংলা', english: 'Bengali' },
    mal: { native: 'മലയാളം', english: 'Malayalam' },
    iast: { native: 'IAST', english: 'English' }
};

export function EnhancedLandingPage({ onSelectStotra }: LandingPageProps) {
    const { user, userData, isGuest } = useAuth();
    const [achievementsPanelOpen, setAchievementsPanelOpen] = useState(false);
    const [leaderboardPanelOpen, setLeaderboardPanelOpen] = useState(false);

    const [selectedLang, setSelectedLang] = useState<Lang>(() => {
        try {
            const stored = localStorage.getItem('landing:lang') as Lang | null;
            return stored || 'deva';
        } catch {
            return 'deva';
        }
    });

    const [langMenuAnchor, setLangMenuAnchor] = useState<null | HTMLElement>(null);

    useEffect(() => {
        try {
            localStorage.setItem('landing:lang', selectedLang);
        } catch {}
    }, [selectedLang]);

    const handleLanguageMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        setLangMenuAnchor(event.currentTarget);
    };

    const handleLanguageMenuClose = () => {
        setLangMenuAnchor(null);
    };

    const handleLanguageSelect = (lang: Lang) => {
        setSelectedLang(lang);
        handleLanguageMenuClose();
    };

    const handleStotraClick = (stotra: 'vsn' | 'hari' | 'keshava' | 'vayu') => {
        onSelectStotra(stotra, selectedLang);
    };

    const getTranslation = (key: string): string => {
        const translations: Record<Lang, Record<string, string>> = {
            deva: {
                title: 'अवबोधक',
                subtitle: 'स्तोत्रों का अभ्यास करें और जप को गेमिफाई करें',
                chapters: 'अध्याय',
                lines: 'पंक्तियाँ',
                languages: 'भाषाएँ',
                selectLanguage: 'भाषा चुनें',
                credits: 'अवबोधक - स्तोत्र सामग्री के लिए vignanam.org को धन्यवाद',
                stotra_vsn: 'श्री विष्णु सहस्रनाम',
                stotra_hari: 'श्री हरि स्तुति',
                stotra_keshava: 'श्री केशव नाम',
                stotra_vayu: 'श्री वायु स्तुति',
                composer: 'रचयिता',
                revealedBy: 'प्रकाशक',
                practice: 'अभ्यास',
                puzzle: 'पहेली',
                dailyGoals: 'दैनिक लक्ष्य',
                practiceLines: 'अभ्यास पंक्तियाँ',
                puzzlesSolved: 'पहेलियाँ हल',
                achievements: 'उपलब्धियाँ',
                leaderboard: 'लीडरबोर्ड',
                myProgress: 'मेरी प्रगति',
                continue: 'जारी रखें',
                stotras: 'स्तोत्र'
            },
            knda: {
                title: 'ಅವಬೋಧಕ',
                subtitle: 'ಸ್ತೋತ್ರಗಳನ್ನು ಅಭ್ಯಾಸ ಮಾಡಿ ಮತ್ತು ಜಪವನ್ನು ಗೇಮಿಫೈ ಮಾಡಿ',
                chapters: 'ಅಧ್ಯಾಯಗಳು',
                lines: 'ಸಾಲುಗಳು',
                languages: 'ಭಾಷೆಗಳು',
                selectLanguage: 'ಭಾಷೆ ಆಯ್ಕೆಮಾಡಿ',
                credits: 'ಅವಬೋಧಕ - ಸ್ತೋತ್ರ ವಿಷಯಕ್ಕಾಗಿ vignanam.org ಗೆ ಧನ್ಯವಾದಗಳು',
                stotra_vsn: 'ಶ್ರೀ ವಿಷ್ಣು ಸಹಸ್ರನಾಮ',
                stotra_hari: 'ಶ್ರೀ ಹರಿ ಸ್ತುತಿ',
                stotra_keshava: 'ಶ್ರೀ ಕೇಶವ ನಾಮ',
                stotra_vayu: 'ಶ್ರೀ ವಾಯು ಸ್ತುತಿ',
                composer: 'ರಚನೆಕಾರ',
                revealedBy: 'ಪ್ರಕಾಶಕ',
                practice: 'ಅಭ್ಯಾಸ',
                puzzle: 'ಒಗಟು',
                dailyGoals: 'ದೈನಿಕ ಗುರಿಗಳು',
                practiceLines: 'ಅಭ್ಯಾಸ ಸಾಲುಗಳು',
                puzzlesSolved: 'ಒಗಟುಗಳು ಬಗೆಹರಿಸಲಾಗಿದೆ',
                achievements: 'ಸಾಧನೆಗಳು',
                leaderboard: 'ಲೀಡರ್‌ಬೋರ್ಡ್',
                myProgress: 'ನನ್ನ ಪ್ರಗತಿ',
                continue: 'ಮುಂದುವರಿಸಿ',
                stotras: 'ಸ್ತೋತ್ರಗಳು'
            },
            tel: {
                title: 'అవబోధక',
                subtitle: 'స్తోత్రాలను అభ్యసించండి మరియు జపాన్ని గేమిఫై చేయండి',
                chapters: 'అధ్యాయాలు',
                lines: 'పంక్తులు',
                languages: 'భాషలు',
                selectLanguage: 'భాష ఎంచుకోండి',
                credits: 'అవబోధక - స్తోత్ర కంటెంట్ కోసం vignanam.org కు ధన్యవాదాలు',
                stotra_vsn: 'శ్రీ విష్ణు సహస్రనామ',
                stotra_hari: 'శ్రీ హరి స్తుతి',
                stotra_keshava: 'శ్రీ కేశవ నామ',
                stotra_vayu: 'శ్రీ వాయు స్తుతి',
                composer: 'రచయిత',
                revealedBy: 'ప్రకాశకుడు',
                practice: 'అభ్యాసం',
                puzzle: 'పజిల్',
                dailyGoals: 'రోజువారీ లక్ష్యాలు',
                practiceLines: 'అభ్యాస పంక్తులు',
                puzzlesSolved: 'పజిల్స్ పరిష్కరించబడ్డాయి',
                achievements: 'సాధనలు',
                leaderboard: 'లీడర్‌బోర్డ్',
                myProgress: 'నా ప్రగతి',
                continue: 'కొనసాగించు',
                stotras: 'స్తోత్రాలు'
            },
            tam: {
                title: 'அவபோதக',
                subtitle: 'ஸ்தோத்திரங்களை பயிற்சி செய்யுங்கள் மற்றும் ஜபத்தை கேமிஃபை செய்யுங்கள்',
                chapters: 'அத்தியாயங்கள்',
                lines: 'வரிகள்',
                languages: 'மொழிகள்',
                selectLanguage: 'மொழியைத் தேர்ந்தெடுக்கவும்',
                credits: 'அவபோதக - ஸ்தோத்திர உள்ளடக்கத்திற்கு vignanam.org க்கு நன்றி',
                stotra_vsn: 'ஸ்ரீ விஷ்ணு சஹஸ்ரநாம',
                stotra_hari: 'ஸ்ரீ ஹரி ஸ்துதி',
                stotra_keshava: 'ஸ்ரீ கேசவ நாம',
                stotra_vayu: 'ஸ்ரீ வாயு ஸ்துதி',
                composer: 'இயற்றியவர்',
                revealedBy: 'வெளிப்படுத்தியவர்',
                practice: 'பயிற்சி',
                puzzle: 'புதிர்',
                dailyGoals: 'தினசரி இலக்குகள்',
                practiceLines: 'பயிற்சி வரிகள்',
                puzzlesSolved: 'புதிர்கள் தீர்க்கப்பட்டன',
                achievements: 'சாதனைகள்',
                leaderboard: 'லீடர்போர்டு',
                myProgress: 'என் முன்னேற்றம்',
                continue: 'தொடரவும்',
                stotras: 'ஸ்தோத்திரங்கள்'
            },
            pan: {
                title: 'ਅਵਬੋਧਕ',
                subtitle: 'ਸਤੋਤਰਾਂ ਦਾ ਅਭਿਆਸ ਕਰੋ ਅਤੇ ਜਪ ਨੂੰ ਗੇਮੀਫਾਈ ਕਰੋ',
                chapters: 'ਅਧਿਆਇ',
                lines: 'ਲਾਈਨਾਂ',
                languages: 'ਭਾਸ਼ਾਵਾਂ',
                selectLanguage: 'ਭਾਸ਼ਾ ਚੁਣੋ',
                credits: 'ਅਵਬੋਧਕ - ਸਤੋਤਰ ਸਮੱਗਰੀ ਲਈ vignanam.org ਦਾ ਧੰਨਵਾਦ',
                stotra_vsn: 'ਸ਼੍ਰੀ ਵਿਸ਼ਨੂ ਸਹਸ੍ਰਨਾਮ',
                stotra_hari: 'ਸ਼੍ਰੀ ਹਰਿ ਸਤੁਤਿ',
                stotra_keshava: 'ਸ਼੍ਰੀ ਕੇਸ਼ਵ ਨਾਮ',
                stotra_vayu: 'ਸ਼੍ਰੀ ਵਾਯੁ ਸਤੁਤਿ',
                composer: 'ਰਚਨਾਕਾਰ',
                revealedBy: 'ਪ੍ਰਕਾਸ਼ਕ',
                practice: 'ਅਭਿਆਸ',
                puzzle: 'ਪਹੇਲੀ',
                dailyGoals: 'ਰੋਜ਼ਾਨਾ ਟੀਚੇ',
                practiceLines: 'ਅਭਿਆਸ ਲਾਈਨਾਂ',
                puzzlesSolved: 'ਪਹੇਲੀਆਂ ਹੱਲ',
                achievements: 'ਪ੍ਰਾਪਤੀਆਂ',
                leaderboard: 'ਲੀਡਰਬੋਰਡ',
                myProgress: 'ਮੇਰੀ ਪ੍ਰਗਤੀ',
                continue: 'ਜਾਰੀ ਰੱਖੋ',
                stotras: 'ਸਤੋਤਰ'
            },
            guj: {
                title: 'અવબોધક',
                subtitle: 'સ્તોત્રોનો અભ્યાસ કરો અને જપને ગેમિફાય કરો',
                chapters: 'અધ્યાયો',
                lines: 'લાઇનો',
                languages: 'ભાષાઓ',
                selectLanguage: 'ભાષા પસંદ કરો',
                credits: 'અવબોધક - સ્તોત્ર સામગ્રી માટે vignanam.org નો આભાર',
                stotra_vsn: 'શ્રી વિષ્ણુ સહસ્રનામ',
                stotra_hari: 'શ્રી હરિ સ્તુતિ',
                stotra_keshava: 'શ્રી કેશવ નામ',
                stotra_vayu: 'શ્રી વાયુ સ્તુતિ',
                composer: 'રચયિતા',
                revealedBy: 'પ્રકાશક',
                practice: 'અભ્યાસ',
                puzzle: 'પઝલ',
                dailyGoals: 'દૈનિક લક્ષ્યો',
                practiceLines: 'અભ્યાસ લાઇનો',
                puzzlesSolved: 'પઝલ ઉકેલાયા',
                achievements: 'સિદ્ધિઓ',
                leaderboard: 'લીડરબોર્ડ',
                myProgress: 'મારી પ્રગતિ',
                continue: 'ચાલુ રાખો',
                stotras: 'સ્તોત્રો'
            },
            iast: {
                title: 'Avabodhak',
                subtitle: 'Practice stotras and gamify chants',
                chapters: 'Chapters',
                lines: 'Lines',
                languages: 'Languages',
                selectLanguage: 'Select Language',
                credits: 'Avabodhak - Credits to vignanam.org for stotra content',
                stotra_vsn: 'Sri Vishnu Sahasranama',
                stotra_hari: 'Sri Hari Stuti',
                stotra_keshava: 'Sri Keshava Nama',
                stotra_vayu: 'Sri Vayu Stuti',
                composer: 'Composer',
                revealedBy: 'Revealed by',
                practice: 'Practice',
                puzzle: 'Puzzle',
                dailyGoals: 'Daily Goals',
                practiceLines: 'Practice Lines',
                puzzlesSolved: 'Puzzles Solved',
                achievements: 'Achievements',
                leaderboard: 'Leaderboard',
                myProgress: 'My Progress',
                continue: 'Continue',
                stotras: 'Stotras'
            },
            mr: {
                title: 'अवबोधक',
                subtitle: 'स्तोत्रांचा सराव करा आणि जपाला गेमिफाय करा',
                chapters: 'अध्याय',
                lines: 'ओळी',
                languages: 'भाषा',
                selectLanguage: 'भाषा निवडा',
                credits: 'अवबोधक - स्तोत्र सामग्रीसाठी vignanam.org चे आभार',
                stotra_vsn: 'श्री विष्णू सहस्रनाम',
                stotra_hari: 'श्री हरी स्तुती',
                stotra_keshava: 'श्री केशव नाम',
                stotra_vayu: 'श्री वायू स्तुती',
                composer: 'रचनाकार',
                revealedBy: 'प्रकाशक',
                practice: 'सराव',
                puzzle: 'कोडे',
                dailyGoals: 'दैनिक उद्दिष्टे',
                practiceLines: 'सराव ओळी',
                puzzlesSolved: 'कोडी सोडवली',
                achievements: 'साध्ये',
                leaderboard: 'लीडरबोर्ड',
                myProgress: 'माझी प्रगती',
                continue: 'सुरू ठेवा',
                stotras: 'स्तोत्रे'
            },
            ben: {
                title: 'অববোধক',
                subtitle: 'স্তোত্র অনুশীলন করুন এবং জপ গেমিফাই করুন',
                chapters: 'অধ্যায়',
                lines: 'লাইন',
                languages: 'ভাষা',
                selectLanguage: 'ভাষা নির্বাচন করুন',
                credits: 'অববোধক - স্তোত্র বিষয়বস্তুর জন্য vignanam.org কে ধন্যবাদ',
                stotra_vsn: 'শ্রী বিষ্ণু সহস্রনাম',
                stotra_hari: 'শ্রী হরি স্তুতি',
                stotra_keshava: 'শ্রী কেশব নাম',
                stotra_vayu: 'শ্রী বায়ু স্তুতি',
                composer: 'রচয়িতা',
                revealedBy: 'প্রকাশক',
                practice: 'অনুশীলন',
                puzzle: 'ধাঁধা',
                dailyGoals: 'দৈনিক লক্ষ্য',
                practiceLines: 'অনুশীলন লাইন',
                puzzlesSolved: 'ধাঁধা সমাধান',
                achievements: 'অর্জন',
                leaderboard: 'লিডারবোর্ড',
                myProgress: 'আমার অগ্রগতি',
                continue: 'চালিয়ে যান',
                stotras: 'স্তোত্র'
            },
            mal: {
                title: 'അവബോധക',
                subtitle: 'സ്തോത്രങ്ങൾ പരിശീലിക്കുകയും ജപം ഗെയിമിഫൈ ചെയ്യുകയും ചെയ്യുക',
                chapters: 'അധ്യായങ്ങൾ',
                lines: 'വരികൾ',
                languages: 'ഭാഷകൾ',
                selectLanguage: 'ഭാഷ തിരഞ്ഞെടുക്കുക',
                credits: 'അവബോധക - സ്തോത്ര ഉള്ളടക്കത്തിനായി vignanam.org ന് നന്ദി',
                stotra_vsn: 'ശ്രീ വിഷ്ണു സഹസ്രനാമ',
                stotra_hari: 'ശ്രീ ഹരി സ്തുതി',
                stotra_keshava: 'ശ്രീ കേശവ നാമ',
                stotra_vayu: 'ശ്രീ വായു സ്തുതി',
                composer: 'രചയിതാവ്',
                revealedBy: 'പ്രകാശിതം',
                practice: 'പരിശീലനം',
                puzzle: 'പസിൽ',
                dailyGoals: 'ദൈനിക ലക്ഷ്യങ്ങൾ',
                practiceLines: 'പരിശീലന വരികൾ',
                puzzlesSolved: 'പസിലുകൾ പരിഹരിച്ചു',
                achievements: 'നേട്ടങ്ങൾ',
                leaderboard: 'ലീഡർബോർഡ്',
                myProgress: 'എന്റെ പുരോഗതി',
                continue: 'തുടരുക',
                stotras: 'സ്തോത്രങ്ങൾ'
            }
        };

        return translations[selectedLang]?.[key] || translations.iast[key] || key;
    };

    const renderStotraCard = (
        stotra: 'vsn' | 'hari' | 'keshava' | 'vayu',
        data: TextFile,
        icon: React.ReactNode,
        color: string,
        delay: number
    ) => {
        const metadata = data.metadata;
        const stotraTitleKey = `stotra_${stotra}`;

        return (
            <Grow in timeout={delay} key={stotra}>
                <Card
                    sx={{
                        bgcolor: 'rgba(30, 41, 59, 0.6)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(148, 163, 184, 0.1)',
                        borderRadius: 3,
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: '0 12px 20px -4px rgba(0, 0, 0, 0.2)',
                            bgcolor: 'rgba(30, 41, 59, 0.8)'
                        }
                    }}
                >
                    <CardActionArea
                        onClick={() => handleStotraClick(stotra)}
                        sx={{ p: { xs: 1.5, sm: 2 }, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}
                    >
                        {/* Header with icon and title */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%' }}>
                            <Box
                                sx={{
                                    p: 1,
                                    borderRadius: '50%',
                                    bgcolor: `${color}15`,
                                    color: color,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                {icon}
                            </Box>
                            <Typography variant="body1" fontWeight="700" sx={{ lineHeight: 1.3, flex: 1 }}>
                                {getTranslation(stotraTitleKey)}
                            </Typography>
                        </Box>

                        {metadata && (
                            <>
                                {/* Composer - compact single line */}
                                {(metadata.composer || metadata.revealedBy) && (
                                    <Typography variant="caption" sx={{ color: 'rgba(148, 163, 184, 0.8)', fontSize: '0.65rem', lineHeight: 1.3, pl: 0.5 }}>
                                        {metadata.composer && <>{metadata.composer}</>}
                                        {metadata.composer && metadata.revealedBy && ' / '}
                                        {metadata.revealedBy && <>{metadata.revealedBy}</>}
                                    </Typography>
                                )}

                                {/* Stats + mode chips in one compact row */}
                                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', width: '100%' }}>
                                    <Chip
                                        icon={<FormatListNumberedIcon sx={{ fontSize: 12 }} />}
                                        label={`${metadata.totalLines}`}
                                        size="small"
                                        sx={{
                                            bgcolor: 'rgba(16, 185, 129, 0.12)',
                                            color: '#34d399',
                                            border: '1px solid rgba(16, 185, 129, 0.2)',
                                            fontSize: '0.65rem',
                                            height: 20,
                                            '& .MuiChip-icon': { ml: 0.5 },
                                        }}
                                    />
                                    <Chip
                                        icon={<TranslateIcon sx={{ fontSize: 12 }} />}
                                        label={`${metadata.languages.length}`}
                                        size="small"
                                        sx={{
                                            bgcolor: 'rgba(245, 158, 11, 0.12)',
                                            color: '#fbbf24',
                                            border: '1px solid rgba(245, 158, 11, 0.2)',
                                            fontSize: '0.65rem',
                                            height: 20,
                                            '& .MuiChip-icon': { ml: 0.5 },
                                        }}
                                    />
                                    {metadata.chapters > 1 && (
                                        <Chip
                                            icon={<MenuBookIcon sx={{ fontSize: 12 }} />}
                                            label={`${metadata.chapters}`}
                                            size="small"
                                            sx={{
                                                bgcolor: 'rgba(59, 130, 246, 0.12)',
                                                color: '#60a5fa',
                                                border: '1px solid rgba(59, 130, 246, 0.2)',
                                                fontSize: '0.65rem',
                                                height: 20,
                                                '& .MuiChip-icon': { ml: 0.5 },
                                            }}
                                        />
                                    )}
                                    {metadata.practiceMode && (
                                        <Chip
                                            icon={<SchoolIcon sx={{ fontSize: 11 }} />}
                                            label={getTranslation('practice')}
                                            size="small"
                                            sx={{
                                                bgcolor: 'rgba(139, 92, 246, 0.12)',
                                                color: '#a78bfa',
                                                border: '1px solid rgba(139, 92, 246, 0.2)',
                                                fontSize: '0.6rem',
                                                height: 20,
                                                '& .MuiChip-icon': { ml: 0.5 },
                                            }}
                                        />
                                    )}
                                    {metadata.puzzleMode && (
                                        <Chip
                                            icon={<ExtensionIcon sx={{ fontSize: 11 }} />}
                                            label={getTranslation('puzzle')}
                                            size="small"
                                            sx={{
                                                bgcolor: 'rgba(236, 72, 153, 0.12)',
                                                color: '#f472b6',
                                                border: '1px solid rgba(236, 72, 153, 0.2)',
                                                fontSize: '0.6rem',
                                                height: 20,
                                                '& .MuiChip-icon': { ml: 0.5 },
                                            }}
                                        />
                                    )}
                                </Box>
                            </>
                        )}
                    </CardActionArea>
                </Card>
            </Grow>
        );
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                background: 'linear-gradient(to bottom, #0f172a, #1e293b)',
                color: 'white',
            }}
        >
            {/* ===== Compact Header Bar ===== */}
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    px: { xs: 2, sm: 3 },
                    py: 1.5,
                    borderBottom: '1px solid rgba(148, 163, 184, 0.08)',
                }}
            >
                {/* Logo + Title */}
                <Fade in timeout={600}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <img
                            src="/icons/stotra-mala-logo.svg"
                            alt="Avabodhak Logo"
                            style={{ width: 36, height: 36, borderRadius: 8 }}
                        />
                        <Box>
                            <Typography variant="h6" fontWeight="800" sx={{ lineHeight: 1.1, letterSpacing: '-0.01em' }}>
                                {getTranslation('title')}
                            </Typography>
                            <Typography variant="caption" sx={{ opacity: 0.5, fontSize: '0.65rem', lineHeight: 1 }}>
                                {getTranslation('subtitle')}
                            </Typography>
                        </Box>
                    </Box>
                </Fade>

                {/* Actions */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <IconButton
                        size="small"
                        onClick={handleLanguageMenuOpen}
                        sx={{
                            color: 'rgba(148, 163, 184, 0.8)',
                            '&:hover': { color: 'white' },
                        }}
                    >
                        <LanguageIcon fontSize="small" />
                    </IconButton>
                    {(user || isGuest) ? (
                        <UserMenu
                            onShowAchievements={() => setAchievementsPanelOpen(true)}
                            onShowLeaderboard={() => setLeaderboardPanelOpen(true)}
                        />
                    ) : (
                        <LoginButton variant="icon" />
                    )}
                    <Menu
                        anchorEl={langMenuAnchor}
                        open={Boolean(langMenuAnchor)}
                        onClose={handleLanguageMenuClose}
                        PaperProps={{
                            sx: {
                                bgcolor: 'rgba(30, 41, 59, 0.95)',
                                backdropFilter: 'blur(12px)',
                                border: '1px solid rgba(148, 163, 184, 0.2)',
                                maxHeight: 400
                            }
                        }}
                    >
                        {Object.entries(LANGUAGE_NAMES).map(([code, names]) => (
                            <MenuItem
                                key={code}
                                onClick={() => handleLanguageSelect(code as Lang)}
                                selected={selectedLang === code}
                                sx={{
                                    color: 'white',
                                    '&.Mui-selected': {
                                        bgcolor: 'rgba(59, 130, 246, 0.2)',
                                    }
                                }}
                            >
                                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                    <Typography variant="body2" fontWeight="600">{names.native}</Typography>
                                    <Typography variant="caption" sx={{ opacity: 0.6 }}>{names.english}</Typography>
                                </Box>
                            </MenuItem>
                        ))}
                    </Menu>
                </Box>
            </Box>

            {/* ===== Scrollable Content ===== */}
            <Box sx={{ flex: 1, overflow: 'auto', px: { xs: 2, sm: 3 }, py: { xs: 2, sm: 3 } }}>

                {/* ===== Engagement Section (Goals + Progress + Quick Actions) ===== */}
                {userData && (
                    <Fade in timeout={800}>
                        <Box sx={{ mb: 3, maxWidth: { xs: 700, md: 1000 }, mx: 'auto' }}>
                            {/* Daily Goals - compact inline version */}
                            <Card
                                sx={{
                                    bgcolor: 'rgba(30, 41, 59, 0.6)',
                                    backdropFilter: 'blur(12px)',
                                    border: '1px solid rgba(148, 163, 184, 0.15)',
                                    borderRadius: 3,
                                    p: { xs: 1.5, sm: 2 },
                                    mb: 1.5,
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                                    <Typography variant="caption" sx={{ color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '0.65rem' }}>
                                        {getTranslation('dailyGoals')}
                                    </Typography>
                                    {/* Quick action buttons */}
                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                        <Box
                                            onClick={() => setAchievementsPanelOpen(true)}
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 0.5,
                                                px: 1,
                                                py: 0.25,
                                                borderRadius: 1.5,
                                                bgcolor: 'rgba(245, 158, 11, 0.1)',
                                                border: '1px solid rgba(245, 158, 11, 0.15)',
                                                cursor: 'pointer',
                                                '&:hover': { bgcolor: 'rgba(245, 158, 11, 0.2)' },
                                            }}
                                        >
                                            <EmojiEventsIcon sx={{ fontSize: 14, color: '#f59e0b' }} />
                                            <Typography variant="caption" sx={{ color: '#f59e0b', fontWeight: 500, fontSize: '0.65rem' }}>
                                                {userData.achievements.length}
                                            </Typography>
                                        </Box>
                                        <Box
                                            onClick={() => setLeaderboardPanelOpen(true)}
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 0.5,
                                                px: 1,
                                                py: 0.25,
                                                borderRadius: 1.5,
                                                bgcolor: 'rgba(14, 165, 233, 0.1)',
                                                border: '1px solid rgba(14, 165, 233, 0.15)',
                                                cursor: 'pointer',
                                                '&:hover': { bgcolor: 'rgba(14, 165, 233, 0.2)' },
                                            }}
                                        >
                                            <LeaderboardIcon sx={{ fontSize: 14, color: '#0ea5e9' }} />
                                        </Box>
                                    </Box>
                                </Box>

                                {/* Two progress bars side by side */}
                                <Box sx={{ display: 'flex', gap: { xs: 2, sm: 3 } }}>
                                    {/* Lines goal */}
                                    <Box sx={{ flex: 1 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                            <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.65rem' }}>
                                                {getTranslation('practiceLines')}
                                            </Typography>
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    color: userData.dailyGoals.linesToday >= userData.dailyGoals.linesTarget ? '#22c55e' : 'white',
                                                    fontWeight: 600,
                                                    fontSize: '0.65rem',
                                                }}
                                            >
                                                {userData.dailyGoals.linesToday}/{userData.dailyGoals.linesTarget}
                                            </Typography>
                                        </Box>
                                        <LinearProgress
                                            variant="determinate"
                                            value={Math.min((userData.dailyGoals.linesToday / userData.dailyGoals.linesTarget) * 100, 100)}
                                            sx={{
                                                height: 5,
                                                borderRadius: 3,
                                                bgcolor: 'rgba(255, 255, 255, 0.08)',
                                                '& .MuiLinearProgress-bar': {
                                                    bgcolor: userData.dailyGoals.linesToday >= userData.dailyGoals.linesTarget ? '#22c55e' : '#0ea5e9',
                                                    borderRadius: 3,
                                                },
                                            }}
                                        />
                                    </Box>
                                    {/* Puzzles goal */}
                                    <Box sx={{ flex: 1 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                            <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: '0.65rem' }}>
                                                {getTranslation('puzzlesSolved')}
                                            </Typography>
                                            <Typography
                                                variant="caption"
                                                sx={{
                                                    color: userData.dailyGoals.puzzlesToday >= userData.dailyGoals.puzzlesTarget ? '#22c55e' : 'white',
                                                    fontWeight: 600,
                                                    fontSize: '0.65rem',
                                                }}
                                            >
                                                {userData.dailyGoals.puzzlesToday}/{userData.dailyGoals.puzzlesTarget}
                                            </Typography>
                                        </Box>
                                        <LinearProgress
                                            variant="determinate"
                                            value={Math.min((userData.dailyGoals.puzzlesToday / userData.dailyGoals.puzzlesTarget) * 100, 100)}
                                            sx={{
                                                height: 5,
                                                borderRadius: 3,
                                                bgcolor: 'rgba(255, 255, 255, 0.08)',
                                                '& .MuiLinearProgress-bar': {
                                                    bgcolor: userData.dailyGoals.puzzlesToday >= userData.dailyGoals.puzzlesTarget ? '#22c55e' : '#8b5cf6',
                                                    borderRadius: 3,
                                                },
                                            }}
                                        />
                                    </Box>
                                </Box>
                            </Card>

                            {/* My Progress Card */}
                            <MyProgressCard
                                onContinue={(stotra, lang, mode, lineIndex) => {
                                    onSelectStotra(stotra, lang, mode, lineIndex);
                                }}
                                getTranslation={getTranslation}
                            />
                        </Box>
                    </Fade>
                )}

                {/* Guest mode banner */}
                {isGuest && (
                    <Fade in timeout={800}>
                        <Box sx={{ mb: 2, maxWidth: { xs: 700, md: 1000 }, mx: 'auto' }}>
                            <LoginButton variant="banner" />
                        </Box>
                    </Fade>
                )}

                {/* ===== Stotra Grid Section ===== */}
                <Box sx={{ maxWidth: { xs: 700, md: 1000 }, mx: 'auto' }}>
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.6rem', mb: 1.5, display: 'block' }}>
                        {getTranslation('stotras')}
                    </Typography>

                    {/* 2-column grid on mobile, auto on desktop */}
                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: { xs: '1fr 1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' },
                            gap: { xs: 1.5, sm: 2 },
                        }}
                    >
                        {renderStotraCard(
                            'vsn',
                            vsnLines as TextFile,
                            <AutoStoriesIcon sx={{ fontSize: { xs: 24, sm: 28 } }} />,
                            '#0ea5e9',
                            600
                        )}
                        {renderStotraCard(
                            'hari',
                            hariLines as TextFile,
                            <SpaIcon sx={{ fontSize: { xs: 24, sm: 28 } }} />,
                            '#f59e0b',
                            700
                        )}
                        {renderStotraCard(
                            'keshava',
                            keshavaLines as TextFile,
                            <SpaIcon sx={{ fontSize: { xs: 24, sm: 28 } }} />,
                            '#8b5cf6',
                            800
                        )}
                        {renderStotraCard(
                            'vayu',
                            vayuLines as TextFile,
                            <SpaIcon sx={{ fontSize: { xs: 24, sm: 28 } }} />,
                            '#10b981',
                            900
                        )}
                    </Box>
                </Box>
            </Box>

            {/* ===== Footer ===== */}
            <Box sx={{ py: 2, textAlign: 'center', opacity: 0.3 }}>
                <Typography variant="caption" sx={{ fontSize: '0.6rem' }}>
                    {getTranslation('credits')}
                </Typography>
            </Box>

            {/* Achievements Panel */}
            <AchievementsPanel
                open={achievementsPanelOpen}
                onClose={() => setAchievementsPanelOpen(false)}
                lang={selectedLang}
            />

            {/* Leaderboard Panel */}
            <LeaderboardPanel
                open={leaderboardPanelOpen}
                onClose={() => setLeaderboardPanelOpen(false)}
                lang={selectedLang}
            />
        </Box>
    );
}
