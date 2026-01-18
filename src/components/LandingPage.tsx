import { Box, Card, CardActionArea, CardContent, Container, Typography, useTheme, Fade, Grow } from '@mui/material';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import SpaIcon from '@mui/icons-material/Spa';

interface LandingPageProps {
    onSelectStotra: (stotra: 'vsn' | 'hari' | 'keshava') => void;
}

export function LandingPage({ onSelectStotra }: LandingPageProps) {
    const theme = useTheme();

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
            <Fade in timeout={1000}>
                <Box mb={6} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <img
                        src="/icons/stotra-mala-logo.svg"
                        alt="Avabodhak Logo"
                        style={{ width: 80, height: 80, marginBottom: 16, borderRadius: 16 }}
                    />
                    <Typography variant="h3" component="h1" fontWeight="800" gutterBottom sx={{ letterSpacing: '-0.02em', mb: 1 }}>
                        Avabodhak
                    </Typography>
                    <Typography variant="subtitle1" sx={{ opacity: 0.7, maxWidth: 400, mx: 'auto' }}>
                        Practice stotras and gamify chants.
                    </Typography>
                </Box>
            </Fade>

            <Container maxWidth="md">
                <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'center' }}>

                    <Grow in timeout={1200}>
                        <Card
                            sx={{
                                width: { xs: '100%', sm: 300 },
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
                                onClick={() => onSelectStotra('vsn')}
                                sx={{ height: '100%', p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}
                            >
                                <Box
                                    sx={{
                                        p: 2,
                                        borderRadius: '50%',
                                        bgcolor: 'rgba(14, 165, 233, 0.15)',
                                        color: '#0ea5e9',
                                        mb: 1
                                    }}
                                >
                                    <AutoStoriesIcon sx={{ fontSize: 40 }} />
                                </Box>
                                <Box>
                                    <Typography variant="h6" fontWeight="700" gutterBottom>
                                        Vishnu Sahasranama
                                    </Typography>
                                    <Typography variant="body2" sx={{ opacity: 0.6 }}>
                                        The Thousand Names of Lord Vishnu. Chanting for peace and focus.
                                    </Typography>
                                </Box>
                            </CardActionArea>
                        </Card>
                    </Grow>

                    <Grow in timeout={1400}>
                        <Card
                            sx={{
                                width: { xs: '100%', sm: 300 },
                                bgcolor: 'rgba(30, 41, 59, 0.3)',
                                backdropFilter: 'blur(12px)',
                                border: '1px solid rgba(148, 163, 184, 0.1)',
                                borderRadius: 4,
                                opacity: 0.8, // Slightly dimmed to imply secondary/coming soon
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                '&:hover': {
                                    transform: 'translateY(-4px)',
                                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                                    bgcolor: 'rgba(30, 41, 59, 0.5)',
                                    opacity: 1
                                }
                            }}
                        >
                            <CardActionArea
                                onClick={() => onSelectStotra('hari')}
                                sx={{ height: '100%', p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}
                            >
                                <Box
                                    sx={{
                                        p: 2,
                                        borderRadius: '50%',
                                        bgcolor: 'rgba(245, 158, 11, 0.15)',
                                        color: '#f59e0b',
                                        mb: 1
                                    }}
                                >
                                    <SpaIcon sx={{ fontSize: 40 }} />
                                </Box>
                                <Box>
                                    <Typography variant="h6" fontWeight="700" gutterBottom>
                                        Sri Hari Stotram
                                    </Typography>
                                    <Typography variant="body2" sx={{ opacity: 0.6 }}>
                                        A beautiful hymn in praise of Lord Hari (Vishnu).
                                    </Typography>
                                </Box>
                            </CardActionArea>
                        </Card>
                    </Grow>

                    <Grow in timeout={1600}>
                        <Card
                            sx={{
                                width: { xs: '100%', sm: 300 },
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
                                onClick={() => onSelectStotra('keshava')}
                                sx={{ height: '100%', p: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}
                            >
                                <Box
                                    sx={{
                                        p: 2,
                                        borderRadius: '50%',
                                        bgcolor: 'rgba(139, 92, 246, 0.15)',
                                        color: '#8b5cf6',
                                        mb: 1
                                    }}
                                >
                                    <SpaIcon sx={{ fontSize: 40 }} />
                                </Box>
                                <Box>
                                    <Typography variant="h6" fontWeight="700" gutterBottom>
                                        Keshava Nama
                                    </Typography>
                                    <Typography variant="body2" sx={{ opacity: 0.6 }}>
                                        A devotional hymn invoking the names of Lord Keshava.
                                    </Typography>
                                </Box>
                            </CardActionArea>
                        </Card>
                    </Grow>

                </Box>
            </Container>

            <Box sx={{ mt: 'auto', py: 4, opacity: 0.4 }}>
                <Typography variant="caption">
                     Avabodhak - https://github.com/madhu-gumballi/avabodhak/ | Credits: vignanam.org for stotra content
                </Typography>
            </Box>
        </Box>
    );
}
