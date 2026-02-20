import HeaderComponent from '@/components/HeaderComponent';
import Loader from '@/components/Loader';
import { V1PlayerConfig, V2PlayerConfig } from '@/data/player-config';
import {
    fetchContent,
    getHierarchy,
    getQumlData,
} from '@/services/PlayerService';
import { PlayerConfig } from '@/utils/Interfaces';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Box, IconButton, Typography } from '@mui/material';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import { MIME_TYPE } from '@/utils/app.constant';

// @ts-ignore
const SunbirdPlayers = dynamic(() => import('players/SunbirdPlayers'), {
    ssr: false,
});

const players: React.FC = () => {
    const router = useRouter();
    const { identifier } = router.query;
    const [loading, setLoading] = useState(true);
    const { t } = useTranslation();
    const [playerConfig, setPlayerConfig] = useState<PlayerConfig | null>(null);

    useEffect(() => {
        const loadContent = async () => {
            try {
                if (identifier) {
                    // Reset playerConfig if it doesn't match the current identifier
                    if (playerConfig && playerConfig.context?.contentId !== identifier) {
                        setPlayerConfig(null);
                        setLoading(true);
                        return;
                    }
                    if (playerConfig) return;

                    const data = await fetchContent(identifier);
                    let config: PlayerConfig;

                    if (data.mimeType === MIME_TYPE.QUESTIONSET_MIME_TYPE) {
                        config = JSON.parse(JSON.stringify(V2PlayerConfig));
                        const Q1 = await getHierarchy(identifier);
                        const Q2 = await getQumlData(identifier);
                        const metadata = { ...Q1?.questionset, ...Q2?.questionset };
                        config.metadata = metadata;
                        //@ts-ignore
                        config.context['contentId'] = identifier as string;
                    } else if (MIME_TYPE.INTERACTIVE_MIME_TYPE.includes(data?.mimeType)) {
                        config = JSON.parse(JSON.stringify(V1PlayerConfig));
                        config.metadata = data;
                        //@ts-ignore
                        config.context['contentId'] = identifier as string;
                    } else {
                        config = JSON.parse(JSON.stringify(V2PlayerConfig));
                        config.metadata = data;
                        //@ts-ignore
                        config.context['contentId'] = identifier as string;
                    }

                    setPlayerConfig(config);
                    setLoading(false);
                }
            } catch (error) {
                console.error("Error loading content:", error);
                setLoading(false);
            }
        };
        loadContent();
    }, [identifier, playerConfig]);

    return (
        <Box>
            <Box>
                {/* <HeaderComponent /> */}
                <Box
                    sx={{ display: 'flex', alignItems: 'center', mb: 2, mt: 2, cursor: 'pointer' }}
                    onClick={() => router.back()}
                >
                    <IconButton>
                        <ArrowBackIcon />
                    </IconButton>
                    <Typography variant="h4">{t('COMMON.BACK')}</Typography>
                </Box>
                {loading && (
                    <Box
                        width={'100%'}
                        height={'calc(100vh - 160px)'}
                        display={'flex'}
                        flexDirection={'column'}
                        alignItems={'center'}
                        mt={'5rem'}
                    >
                        <Loader showBackdrop={false} />
                    </Box>
                )}
            </Box>
            <Box marginTop={'1rem'} px={'14px'}>
                <Typography
                    color={'#024f9d'}
                    sx={{ padding: '0 0 4px 4px', fontWeight: 'bold' }}
                >
                    {playerConfig?.metadata?.name}
                </Typography>
                {!loading && playerConfig ? <SunbirdPlayers key={identifier as string} player-config={playerConfig} /> : null}
            </Box>
        </Box>
    );
};

export async function getStaticPaths() {
    return {
        paths: [],
        fallback: 'blocking',
    };
}

export async function getStaticProps({ locale, params }: any) {
    const { identifier } = params;
    return {
        props: {
            noLayout: true,
            identifier,
            ...(await serverSideTranslations(locale, ['common'])),
        },
    };
}

export default players;
