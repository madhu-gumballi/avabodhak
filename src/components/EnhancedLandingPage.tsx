import { useState, useEffect } from 'react';
import { Box, Card, CardActionArea, Container, Typography, Fade, Grow, Chip, IconButton, Menu, MenuItem, LinearProgress } from '@mui/material';
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

interface LandingPageProps {
    onSelectStotra: (stotra: 'vsn' | 'hari' | 'keshava' | 'vayu', preferredLang?: Lang) => void;
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
                leaderboard: 'लीडरबोर्ड'
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
                leaderboard: 'ಲೀಡರ್‌ಬೋರ್ಡ್'
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
                leaderboard: 'లీడర్‌బోర్డ్'
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
                leaderboard: 'லீடர்போர்டு'
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
                leaderboard: 'ਲੀਡਰਬੋਰਡ'
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
                leaderboard: 'લીડરબોર્ડ'
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
                leaderboard: 'Leaderboard'
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
                leaderboard: 'लीडरबोर्ड'
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
                leaderboard: 'লিডারবোর্ড'
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
                leaderboard: 'ലീഡർബോർഡ്'
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
            <Grow in timeout={delay}>
                <Card
                    sx={{
                        width: { xs: '100%', sm: 320 },
                        bgcolor: 'rgba(30, 41, 59, 0.6)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(148, 163, 184, 0.1)',
                        borderRadius: 4,
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        '&:hover': {
                            transform: 'translateY(-4px)',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                            bgcolor: 'rgba(30, 41, 59, 0.8)'
                        }
                    }}
                >
                    <CardActionArea
                        onClick={() => handleStotraClick(stotra)}
                        sx={{ height: '100%', p: 3, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1.5 }}
                    >
                        {/* Header with icon and title */}
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                            <Box
                                sx={{
                                    p: 2,
                                    borderRadius: '50%',
                                    bgcolor: `${color}15`,
                                    color: color,
                                }}
                            >
                                {icon}
                            </Box>
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="h6" fontWeight="700" sx={{ mb: 0, lineHeight: 1.3 }}>
                                    {getTranslation(stotraTitleKey)}
                                </Typography>
                            </Box>
                        </Box>

                        {metadata && (
                            <>
                                {/* Composer section */}
                                {(metadata.composer || metadata.revealedBy) && (
                                    <Box sx={{
                                        width: '100%',
                                        py: 1,
                                        px: 1.5,
                                        borderRadius: 1.5,
                                        bgcolor: 'rgba(100, 116, 139, 0.08)',
                                        border: '1px solid rgba(148, 163, 184, 0.1)'
                                    }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <SpaIcon sx={{ fontSize: 14, color: 'rgba(148, 163, 184, 0.6)' }} />
                                            <Typography variant="caption" sx={{ color: 'rgba(203, 213, 225, 0.9)', fontSize: '0.7rem', lineHeight: 1.4 }}>
                                                {metadata.composer && (
                                                    <span>
                                                        <strong style={{ color: 'rgba(226, 232, 240, 1)' }}>{getTranslation('composer')}:</strong> {metadata.composer}
                                                    </span>
                                                )}
                                                {metadata.composer && metadata.revealedBy && <br />}
                                                {metadata.revealedBy && (
                                                    <span>
                                                        <strong style={{ color: 'rgba(226, 232, 240, 1)' }}>{getTranslation('revealedBy')}:</strong> {metadata.revealedBy}
                                                    </span>
                                                )}
                                            </Typography>
                                        </Box>
                                    </Box>
                                )}

                                {/* Stats chips */}
                                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', width: '100%' }}>
                                    <Chip
                                        icon={<FormatListNumberedIcon sx={{ fontSize: 14 }} />}
                                        label={`${metadata.totalLines} ${getTranslation('lines')}`}
                                        size="small"
                                        sx={{
                                            bgcolor: 'rgba(16, 185, 129, 0.12)',
                                            color: '#34d399',
                                            border: '1px solid rgba(16, 185, 129, 0.25)',
                                            fontSize: '0.7rem',
                                            height: 24
                                        }}
                                    />
                                    <Chip
                                        icon={<TranslateIcon sx={{ fontSize: 14 }} />}
                                        label={`${metadata.languages.length} ${getTranslation('languages')}`}
                                        size="small"
                                        sx={{
                                            bgcolor: 'rgba(245, 158, 11, 0.12)',
                                            color: '#fbbf24',
                                            border: '1px solid rgba(245, 158, 11, 0.25)',
                                            fontSize: '0.7rem',
                                            height: 24
                                        }}
                                    />
                                    {metadata.chapters > 1 && (
                                        <Chip
                                            icon={<MenuBookIcon sx={{ fontSize: 14 }} />}
                                            label={`${metadata.chapters} ${getTranslation('chapters')}`}
                                            size="small"
                                            sx={{
                                                bgcolor: 'rgba(59, 130, 246, 0.12)',
                                                color: '#60a5fa',
                                                border: '1px solid rgba(59, 130, 246, 0.25)',
                                                fontSize: '0.7rem',
                                                height: 24
                                            }}
                                        />
                                    )}
                                </Box>

                                {/* Mode badges */}
                                {(metadata.practiceMode || metadata.puzzleMode) && (
                                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', width: '100%' }}>
                                        {metadata.practiceMode && (
                                            <Chip
                                                icon={<SchoolIcon sx={{ fontSize: 13 }} />}
                                                label={getTranslation('practice')}
                                                size="small"
                                                sx={{
                                                    bgcolor: 'rgba(139, 92, 246, 0.12)',
                                                    color: '#a78bfa',
                                                    border: '1px solid rgba(139, 92, 246, 0.25)',
                                                    fontSize: '0.68rem',
                                                    height: 22
                                                }}
                                            />
                                        )}
                                        {metadata.puzzleMode && (
                                            <Chip
                                                icon={<ExtensionIcon sx={{ fontSize: 13 }} />}
                                                label={getTranslation('puzzle')}
                                                size="small"
                                                sx={{
                                                    bgcolor: 'rgba(236, 72, 153, 0.12)',
                                                    color: '#f472b6',
                                                    border: '1px solid rgba(236, 72, 153, 0.25)',
                                                    fontSize: '0.68rem',
                                                    height: 22
                                                }}
                                            />
                                        )}
                                    </Box>
                                )}
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
                alignItems: 'center',
                justifyContent: 'center',
                background: 'linear-gradient(to bottom, #0f172a, #1e293b)',
                color: 'white',
                p: 3,
                textAlign: 'center'
            }}
        >
            {/* Top Bar: Language Selector + User Menu */}
            <Box sx={{ position: 'absolute', top: 16, right: 16, display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconButton
                    onClick={handleLanguageMenuOpen}
                    sx={{
                        bgcolor: 'rgba(30, 41, 59, 0.8)',
                        backdropFilter: 'blur(12px)',
                        border: '1px solid rgba(148, 163, 184, 0.2)',
                        color: 'white',
                        '&:hover': {
                            bgcolor: 'rgba(30, 41, 59, 0.95)',
                        }
                    }}
                >
                    <LanguageIcon />
                </IconButton>
                {/* User menu or login button */}
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

            <Fade in timeout={1000}>
                <Box mb={6} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <img
                        src="/icons/stotra-mala-logo.svg"
                        alt="Avabodhak Logo"
                        style={{ width: 80, height: 80, marginBottom: 16, borderRadius: 16 }}
                    />
                    <Typography variant="h3" component="h1" fontWeight="800" gutterBottom sx={{ letterSpacing: '-0.02em', mb: 1 }}>
                        {getTranslation('title')}
                    </Typography>
                    <Typography variant="subtitle1" sx={{ opacity: 0.7, maxWidth: 500, mx: 'auto' }}>
                        {getTranslation('subtitle')}
                    </Typography>
                </Box>
            </Fade>

            <Container maxWidth="lg">
                <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'center', flexWrap: 'wrap' }}>
                    {renderStotraCard(
                        'vsn',
                        vsnLines as TextFile,
                        <AutoStoriesIcon sx={{ fontSize: 40 }} />,
                        '#0ea5e9',
                        1200
                    )}
                    {renderStotraCard(
                        'hari',
                        hariLines as TextFile,
                        <SpaIcon sx={{ fontSize: 40 }} />,
                        '#f59e0b',
                        1400
                    )}
                    {renderStotraCard(
                        'keshava',
                        keshavaLines as TextFile,
                        <SpaIcon sx={{ fontSize: 40 }} />,
                        '#8b5cf6',
                        1600
                    )}
                    {renderStotraCard(
                        'vayu',
                        vayuLines as TextFile,
                        <SpaIcon sx={{ fontSize: 40 }} />,
                        '#10b981',
                        1800
                    )}
                </Box>
            </Container>

            {/* Daily Goals Widget - shown when user is logged in */}
            {userData && (
                <Fade in timeout={1500}>
                    <Box sx={{ mt: 4, maxWidth: 400, width: '100%' }}>
                        <Card
                            sx={{
                                bgcolor: 'rgba(30, 41, 59, 0.6)',
                                backdropFilter: 'blur(12px)',
                                border: '1px solid rgba(148, 163, 184, 0.2)',
                                borderRadius: 3,
                                p: 2,
                            }}
                        >
                            <Typography variant="subtitle2" sx={{ color: '#94a3b8', mb: 2, fontWeight: 600 }}>
                                {getTranslation('dailyGoals')}
                            </Typography>

                            {/* Lines goal */}
                            <Box sx={{ mb: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                    <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                                        {getTranslation('practiceLines')}
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            color: userData.dailyGoals.linesToday >= userData.dailyGoals.linesTarget ? '#22c55e' : 'white',
                                            fontWeight: userData.dailyGoals.linesToday >= userData.dailyGoals.linesTarget ? 600 : 400,
                                        }}
                                    >
                                        {userData.dailyGoals.linesToday}/{userData.dailyGoals.linesTarget}
                                    </Typography>
                                </Box>
                                <LinearProgress
                                    variant="determinate"
                                    value={Math.min((userData.dailyGoals.linesToday / userData.dailyGoals.linesTarget) * 100, 100)}
                                    sx={{
                                        height: 6,
                                        borderRadius: 3,
                                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                                        '& .MuiLinearProgress-bar': {
                                            bgcolor: userData.dailyGoals.linesToday >= userData.dailyGoals.linesTarget ? '#22c55e' : '#0ea5e9',
                                            borderRadius: 3,
                                        },
                                    }}
                                />
                            </Box>

                            {/* Puzzles goal */}
                            <Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                    <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                                        {getTranslation('puzzlesSolved')}
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        sx={{
                                            color: userData.dailyGoals.puzzlesToday >= userData.dailyGoals.puzzlesTarget ? '#22c55e' : 'white',
                                            fontWeight: userData.dailyGoals.puzzlesToday >= userData.dailyGoals.puzzlesTarget ? 600 : 400,
                                        }}
                                    >
                                        {userData.dailyGoals.puzzlesToday}/{userData.dailyGoals.puzzlesTarget}
                                    </Typography>
                                </Box>
                                <LinearProgress
                                    variant="determinate"
                                    value={Math.min((userData.dailyGoals.puzzlesToday / userData.dailyGoals.puzzlesTarget) * 100, 100)}
                                    sx={{
                                        height: 6,
                                        borderRadius: 3,
                                        bgcolor: 'rgba(255, 255, 255, 0.1)',
                                        '& .MuiLinearProgress-bar': {
                                            bgcolor: userData.dailyGoals.puzzlesToday >= userData.dailyGoals.puzzlesTarget ? '#22c55e' : '#8b5cf6',
                                            borderRadius: 3,
                                        },
                                    }}
                                />
                            </Box>

                            {/* Quick actions */}
                            <Box sx={{ display: 'flex', gap: 1, mt: 2, pt: 2, borderTop: '1px solid rgba(148, 163, 184, 0.1)' }}>
                                <Box
                                    onClick={() => setAchievementsPanelOpen(true)}
                                    sx={{
                                        flex: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 0.5,
                                        py: 1,
                                        borderRadius: 2,
                                        bgcolor: 'rgba(245, 158, 11, 0.1)',
                                        border: '1px solid rgba(245, 158, 11, 0.2)',
                                        cursor: 'pointer',
                                        '&:hover': { bgcolor: 'rgba(245, 158, 11, 0.15)' },
                                    }}
                                >
                                    <EmojiEventsIcon sx={{ fontSize: 16, color: '#f59e0b' }} />
                                    <Typography variant="caption" sx={{ color: '#f59e0b', fontWeight: 500 }}>
                                        {getTranslation('achievements')} ({userData.achievements.length})
                                    </Typography>
                                </Box>
                                <Box
                                    onClick={() => setLeaderboardPanelOpen(true)}
                                    sx={{
                                        flex: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 0.5,
                                        py: 1,
                                        borderRadius: 2,
                                        bgcolor: 'rgba(14, 165, 233, 0.1)',
                                        border: '1px solid rgba(14, 165, 233, 0.2)',
                                        cursor: 'pointer',
                                        '&:hover': { bgcolor: 'rgba(14, 165, 233, 0.15)' },
                                    }}
                                >
                                    <LeaderboardIcon sx={{ fontSize: 16, color: '#0ea5e9' }} />
                                    <Typography variant="caption" sx={{ color: '#0ea5e9', fontWeight: 500 }}>
                                        {getTranslation('leaderboard')}
                                    </Typography>
                                </Box>
                            </Box>
                        </Card>
                    </Box>
                </Fade>
            )}

            {/* Guest mode banner */}
            {isGuest && (
                <Fade in timeout={1500}>
                    <Box sx={{ mt: 3 }}>
                        <LoginButton variant="banner" />
                    </Box>
                </Fade>
            )}

            <Box sx={{ mt: 'auto', py: 4, opacity: 0.4 }}>
                <Typography variant="caption">
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
