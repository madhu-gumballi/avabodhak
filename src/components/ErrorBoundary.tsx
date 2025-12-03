import { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Typography, Button, Container, Paper } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <Box
                    sx={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        minHeight: '100vh',
                        bgcolor: '#0f172a',
                        color: 'white',
                        p: 2
                    }}
                >
                    <Container maxWidth="sm">
                        <Paper
                            sx={{
                                p: 4,
                                bgcolor: 'rgba(30, 41, 59, 0.8)',
                                backdropFilter: 'blur(10px)',
                                border: '1px solid rgba(148, 163, 184, 0.1)',
                                borderRadius: 4,
                                textAlign: 'center'
                            }}
                        >
                            <Typography variant="h5" component="h1" gutterBottom sx={{ fontWeight: 700, color: '#f87171' }}>
                                Something went wrong
                            </Typography>
                            <Typography variant="body1" sx={{ mb: 3, color: '#94a3b8' }}>
                                We're sorry, but the application encountered an unexpected error.
                            </Typography>
                            {this.state.error && (
                                <Box
                                    component="pre"
                                    sx={{
                                        mt: 2,
                                        mb: 3,
                                        p: 2,
                                        bgcolor: 'rgba(0, 0, 0, 0.3)',
                                        borderRadius: 2,
                                        overflow: 'auto',
                                        textAlign: 'left',
                                        fontSize: '0.75rem',
                                        color: '#e2e8f0',
                                        maxHeight: '200px'
                                    }}
                                >
                                    {this.state.error.toString()}
                                </Box>
                            )}
                            <Button
                                variant="contained"
                                startIcon={<RefreshIcon />}
                                onClick={() => window.location.reload()}
                                sx={{
                                    bgcolor: '#3b82f6',
                                    '&:hover': { bgcolor: '#2563eb' }
                                }}
                            >
                                Reload Application
                            </Button>
                        </Paper>
                    </Container>
                </Box>
            );
        }

        return this.props.children;
    }
}
