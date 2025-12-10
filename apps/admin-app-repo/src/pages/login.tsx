/* eslint-disable @nx/enforce-module-boundaries */
import {
  Box,
  Button,
  FormControl,
  IconButton,
  InputAdornment,
  TextField,
  Grid,
  Typography,
  useMediaQuery, // Import useMediaQuery hook
} from '@mui/material';
import React, { useEffect, useRef, useState } from 'react';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import { Visibility, VisibilityOff } from '@mui/icons-material';
import ReactGA from 'react-ga4';
import Checkbox from '@mui/material/Checkbox';
import Image from 'next/image';
import Loader from '../components/Loader';
import MenuItem from '@mui/material/MenuItem';
import config from '../../config.json';
import { getUserId, login, getTenant } from '../services/LoginService';
import { getTenantConfig, getTenantContentFilter, Tenant, TenantContentFilter } from '../services/DomainTenantService';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'next-i18next';
import { telemetryFactory } from '@/utils/telemetry';
import { logEvent } from '@/utils/googleAnalytics';
import { showToastMessage } from '@/components/Toastify';
import Link from '@mui/material/Link';
import loginImage from '../../public/loginImage.jpg';
import { useUserIdStore } from '@/store/useUserIdStore';
import { getUserDetailsInfo } from '@/services/UserList';
import { Storage, TenantName } from '@/utils/app.constant';
import useSubmittedButtonStore from '@/utils/useSharedState';
import { Role } from '@/utils/app.constant';
import { AcademicYear } from '@/utils/Interfaces';
import { getAcademicYear } from '@/services/AcademicYearService';
import useStore from '@/store/store';
import loginImg from '../../public/images/login-image.jpg';
import TenantService from '@/services/TenantService';
import { transformLabel } from '@/utils/Helper';

const LoginPage = () => {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [usernameError, setUsernameError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState(lang);
  const [language, setLanguage] = useState(selectedLanguage);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [tenantContentFilter, setTenantContentFilter] = useState<TenantContentFilter | null>(null);
  const [availableLanguages, setAvailableLanguages] = useState<string[]>([]);
  const setIsActiveYearSelected = useStore(
    (state: { setIsActiveYearSelected: any }) => state.setIsActiveYearSelected
  );

  const theme = useTheme<any>();
  const router = useRouter();
  const { setUserId } = useUserIdStore();
  const setAdminInformation = useSubmittedButtonStore(
    (state: any) => state.setAdminInformation
  );

  // Use useMediaQuery to detect screen size
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isMedium = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  const passwordRef = useRef<HTMLInputElement>(null);
  const loginButtonRef = useRef<HTMLButtonElement>(null);

  // Fetch tenant configuration based on domain
  useEffect(() => {
    const fetchDomainTenantConfig = async () => {
      try {
        console.log('🔍 Fetching tenant configuration from domain...');
        
        // Fetch tenant config first to get the actual domain being used
        const tenantData = await getTenantConfig();
        
        if (tenantData) {
          console.log('✅ Tenant config loaded:', tenantData);
          
          // Check if tenant domain or name contains 'swadhaar'
          const tenantDomain = tenantData.domain?.toLowerCase() || '';
          const tenantName = tenantData.name?.toLowerCase() || '';
          const currentDomain = typeof window !== 'undefined' ? window.location.hostname.toLowerCase() : '';
          
          const isSwadhaarDomain = 
            tenantDomain.includes('swadhaar') || 
            tenantName.includes('swadhaar') ||
            currentDomain.includes('swadhaar');
          
          console.log('🌐 Current domain:', currentDomain);
          console.log('🏢 Tenant domain:', tenantDomain);
          console.log('🏷️ Tenant name:', tenantName);
          console.log(`${isSwadhaarDomain ? '🟢' : '🔵'} Is Swadhaar domain: ${isSwadhaarDomain}`);
          
          // Only apply tenant config if it's Swadhaar domain
          if (isSwadhaarDomain) {
            setTenant(tenantData);
            
            const contentFilter = getTenantContentFilter(tenantData);
            if (contentFilter) {
              console.log('📋 Swadhaar Content filter:', contentFilter);
              console.log('🎨 Swadhaar Theme:', contentFilter.theme);
              console.log('🌐 Swadhaar Available Languages in config:', contentFilter.languages);
              
              setTenantContentFilter(contentFilter);
              
              // Set available languages - Force English only for Swadhaar
              setAvailableLanguages(['en']);
              console.log('🔒 Swadhaar: Language restricted to English only');
              
              // Set language to English
              const preferredLang = 'en';
              setLanguage(preferredLang);
              setLang(preferredLang);
              localStorage.setItem('preferredLanguage', preferredLang);
              
              // Store tenant theme config
              if (contentFilter.theme) {
                localStorage.setItem('tenantTheme', JSON.stringify(contentFilter.theme));
                console.log('💾 Swadhaar theme saved to localStorage');
              }
              
              // Store tenant logo
              if (contentFilter.icon) {
                localStorage.setItem('tenantLogo', contentFilter.icon);
                console.log('💾 Swadhaar logo saved to localStorage');
              }
            }
          } else {
            console.log('ℹ️ Non-Swadhaar domain detected - using default configuration');
            console.log('📌 Using standard branding and all configured languages from config.json');
            // For non-Swadhaar domains, don't apply custom config
            // Keep default logos, themes, and language options from config.json
          }
        } else {
          console.log('ℹ️ No tenant config found - using default configuration');
          console.log('📌 Using standard branding and all configured languages from config.json');
        }
      } catch (error) {
        console.error('❌ Error fetching tenant config:', error);
        // Fallback to default config for errors
      }
    };
    
    fetchDomainTenantConfig();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      // If no tenant config applied (non-Swadhaar), use default language handling
      if (availableLanguages.length === 0) {
        const preferredLang = localStorage.getItem('preferredLanguage') || 'en';
        setLanguage(preferredLang);
        setLang(preferredLang);
      }
      const storedUserData = localStorage.getItem('adminInfo');

      const token = localStorage.getItem('token');
      if (token) {
        const { locale } = router;
        if (locale) {
          let role;
          if (storedUserData) {
            role = JSON.parse(storedUserData);
            if (role?.role === Role.ADMIN) {
              // Redirect ADMIN users to /learners (first Manage Users option)
              router.push('/learners', undefined, { locale: locale });
            } else if (role?.role === Role.SCTA || role?.role === Role.CCTA || role?.role === Role.TEACHER) {
              // Redirect SCTA and CCTA users to workspace
              router.push('/workspace', undefined, { locale: locale });
            } else if (
              role?.role === Role.CENTRAL_ADMIN &&
              role?.tenantData[0]?.tenantName ==
                TenantName.SECOND_CHANCE_PROGRAM
            ) {
              router.push('/programs', undefined, { locale: locale });
            }
            
          }
        } else {
          let role;
          if (storedUserData) {
            role = JSON.parse(storedUserData);
            if (role?.role === Role.ADMIN) {
              // Redirect ADMIN users to /learners (first Manage Users option)
              router.push('/learners');
            } else if (role?.role === Role.SCTA || role?.role === Role.CCTA || role?.role === Role.TEACHER) {
              // Redirect SCTA and CCTA users to workspace
              router.push('/workspace');
            } else if (
              role?.role === Role.CENTRAL_ADMIN &&
              role?.tenantData[0]?.tenantName ==
                TenantName.SECOND_CHANCE_PROGRAM
            ) {
              router.push('/programs');
            }
          }
        }
      }
    }
  }, []);

  const handleUsernameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    const trimmedValue = value.trim();
    setUsername(trimmedValue);
    setUsernameError(/\s/.test(trimmedValue));
  };

  const handlePasswordChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    setPassword(value);
  };

  const handleClickShowPassword = () => {
    setShowPassword((show) => !show);
    logEvent({
      action: 'show-password-icon-clicked',
      category: 'Login Page',
      label: 'Show Password',
    });
  };

  const handleMouseDownPassword = (
    event: React.MouseEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();
  };

  const fetchUserDetail = async () => {
    let userId;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        userId = localStorage.getItem(Storage.USER_ID);
      }
      const fieldValue = true;
      if (userId) {
        const response = await getUserDetailsInfo(userId, fieldValue);

        const userInfo = response?.userData;
        //set user info in zustand store
        if (typeof window !== 'undefined' && window.localStorage) {
          if (userInfo) {
            if (userInfo?.customFields) {
              const boardValues = userInfo.customFields
                .filter((field: any) => field.label === 'BOARD')
                .flatMap((field: any) => field.value.split(','))
                .map((board: string) => board.trim());

              // Check if boardValues is not empty
              // if (boardValues.length > 0) {
              //   console.log(boardValues);
              //   localStorage.setItem(
              //     'userSpecificBoard',
              //     JSON.stringify(boardValues)
              //   );
              // } else {
              //   console.log(
              //     'No BOARD field found in customFields. Skipping localStorage update.'
              //   );
              // }
            }
            console.log('userInfo', userInfo);
            localStorage.setItem('adminInfo', JSON.stringify(userInfo));
            const roleId = userInfo.tenantData?.[0]?.roleId || '';
            const roleName = userInfo.tenantData?.[0]?.roleName || '';
            const program = userInfo.tenantData?.[0]?.tenantName || '';

            // Set roleName and program FIRST before any redirect
            localStorage.setItem('roleId', roleId);
            localStorage.setItem('roleName', roleName);
            localStorage.setItem('program', program);
            
            // Force synchronous write to ensure values are persisted
            // This ensures MenuWrapper can read these values immediately
            if (typeof window !== 'undefined') {
              // Trigger a small delay to ensure localStorage is fully written
              await new Promise(resolve => setTimeout(resolve, 50));
            }
          }
          const selectedStateName = transformLabel(
            userInfo?.customFields.find(
              (field: { label: string }) => field?.label === 'STATE'
            )?.selectedValues[0]?.value
          );
          localStorage.setItem('stateName', selectedStateName);
          const selectedStateId = userInfo?.customFields.find(
            (field: { label: string }) => field?.label === 'STATE'
          )?.selectedValues[0]?.id;
          localStorage.setItem('stateId', selectedStateId);
        }
        // if (
        //   userInfo?.role !== Role.ADMIN &&
        //   userInfo?.role !== Role.CENTRAL_ADMIN &&
        //   userInfo?.role !== Role.SCTA &&
        //   userInfo?.role !== Role.CCTA
        // ) {
        //   // const errorMessage = t("LOGIN_PAGE.YOU_DONT_HAVE_APPROPRIATE_PRIVILEGES_TO_ACCESS");
        //   // showToastMessage(errorMessage, "error");
        //   //localStorage.removeItem("token");
        //   localStorage.setItem('previousPage', 'login');
        //   router.push({
        //     pathname: '/unauthorized',
        //     query: { role: userInfo?.role }, // Pass your query parameters here
        //   });
        // } else {
        // setAdminInformation(userInfo);
        
        // Verify roleName and program are set before redirecting
        const verifyRoleName = localStorage.getItem('roleName');
        const verifyProgram = localStorage.getItem('program');
        console.log('🔍 Verifying before redirect - roleName:', verifyRoleName, 'program:', verifyProgram);
        console.log('🔍 Current pathname:', router.pathname, 'User role:', userInfo?.role);
        
        // Always redirect based on role, ignoring current URL
        // Use replace() to avoid back button issues and ensure clean navigation
        if (userInfo?.role === Role.ADMIN) {
          console.log('✅ Redirecting ADMIN to /learners');
          const { locale } = router;
          // Use window.location for hard redirect to ensure URL changes completely
          if (typeof window !== 'undefined') {
            const targetPath = locale ? `/${locale}/learners` : '/learners';
            window.location.href = targetPath;
          } else {
            if (locale) {
              router.replace('/learners', undefined, { locale: locale });
            } else {
              router.replace('/learners');
            }
          }
        } else if (
          userInfo?.role === Role.SCTA ||
          userInfo?.role === Role.CCTA || userInfo?.role === Role.TEACHER
        ) {
          console.log('✅ Redirecting SCTA/CCTA/TEACHER to /workspace');
          const { locale } = router;
          // Use window.location for hard redirect to ensure URL changes completely
          if (typeof window !== 'undefined') {
            const targetPath = locale ? `/${locale}/workspace` : '/workspace';
            window.location.href = targetPath;
          } else {
            if (locale) {
              router.replace('/workspace', undefined, { locale: locale });
            } else {
              router.replace('/workspace');
            }
          }
        }
        const getAcademicYearList = async () => {
          const academicYearList: AcademicYear[] = await getAcademicYear();
          if (academicYearList) {
            localStorage.setItem(
              'academicYearList',
              JSON.stringify(academicYearList)
            );
            const extractedAcademicYears = academicYearList?.map(
              ({ id, session, isActive }) => ({ id, session, isActive })
            );
            const activeSession = extractedAcademicYears?.find(
              (item) => item.isActive
            );
            const activeSessionId = activeSession ? activeSession.id : '';
            // Fetch academicYearId from tenant config
            try {
              const tenantConfig = await TenantService.getTenantConfig();
              if (tenantConfig?.academicYearId) {
                localStorage.setItem('academicYearId', tenantConfig.academicYearId);
              } else if (activeSessionId) {
                localStorage.setItem('academicYearId', activeSessionId);
              }
            } catch (error) {
              console.error('Error fetching tenant config for academicYearId:', error);
              if (activeSessionId) {
                localStorage.setItem('academicYearId', activeSessionId);
              }
            }
            if (activeSessionId) {
              setIsActiveYearSelected(true);
              // router.push("/centers");
              if (userInfo?.role === Role.ADMIN) {
                console.log('✅ Redirecting ADMIN to /learners (from academic year)');
                const { locale } = router;
                // Use window.location for hard redirect
                if (typeof window !== 'undefined') {
                  const targetPath = locale ? `/${locale}/learners` : '/learners';
                  window.location.href = targetPath;
                } else {
                  if (locale) {
                    router.replace('/learners', undefined, { locale: locale });
                  } else {
                    router.replace('/learners');
                  }
                }
              } else if (
                userInfo?.role === Role.SCTA ||
                userInfo?.role === Role.CCTA || userInfo?.role === Role.TEACHER
              ) {
                console.log('✅ Redirecting SCTA/CCTA/TEACHER to /workspace (from academic year)');
                const { locale } = router;
                // Use window.location for hard redirect
                if (typeof window !== 'undefined') {
                  const targetPath = locale ? `/${locale}/workspace` : '/workspace';
                  window.location.href = targetPath;
                } else {
                  if (locale) {
                    router.replace('/workspace', undefined, { locale: locale });
                  } else {
                    router.replace('/workspace');
                  }
                }
              } else {
                const { locale } = router;
                if (locale) {
                  if (
                    userInfo?.role === Role.CENTRAL_ADMIN &&
                    userInfo?.tenantData[0]?.tenantName ==
                      TenantName.SECOND_CHANCE_PROGRAM
                  ) {
                    router.push('/programs', undefined, { locale: locale });
                  }
                } else {
                  if (
                    userInfo?.role === Role.CENTRAL_ADMIN &&
                    userInfo?.tenantData[0]?.tenantName ==
                      TenantName.SECOND_CHANCE_PROGRAM
                  ) {
                    router.push('/programs');
                  }
                }
              }
            }
          }
        };
        // getAcademicYearList();
      }
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    fetchUserDetail();
  }, []);

  const handleFormSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    logEvent({
      action: 'login-button-clicked',
      category: 'Login Page',
      label: 'Login Button Clicked',
    });
    if (!usernameError && !passwordError) {
      setLoading(true);
      try {
        const response = await login({ username, password });
        if (response?.result?.access_token) {
          if (typeof window !== 'undefined' && window.localStorage) {
            const token = response.result.access_token;
            const refreshToken = response?.result?.refresh_token;
            localStorage.setItem('token', token);
            rememberMe
              ? localStorage.setItem('refreshToken', refreshToken)
              : localStorage.removeItem('refreshToken');

            const userResponse = await getUserId();

            if (userResponse) {
              localStorage.setItem('userId', userResponse?.userId);
              localStorage.setItem('userIdName', userResponse?.username);
              // Update Zustand store
              setUserId(userResponse?.userId || '');

              if (userResponse?.userId) {
                document.cookie = `authToken=${token}; path=/; secure; SameSite=Strict`;
                document.cookie = `userId=${userResponse.userId}; path=/; secure; SameSite=Strict`;
              }

              localStorage.setItem('name', userResponse?.firstName);
              localStorage.setItem(
                Storage.USER_DATA,
                JSON.stringify(userResponse)
              );
              console.log(userResponse, 'userResponse');
              const tenantId = userResponse?.tenantData?.[0]?.tenantId || null;

              if (tenantId) {
                TenantService.setTenantId(tenantId);
                localStorage.setItem('tenantId', tenantId);
                
                // Set academic year ID from tenant config
                try {
                  const tenantConfig = await TenantService.getTenantConfig();
                  if (tenantConfig?.academicYearId) {
                    localStorage.setItem('academicYearId', tenantConfig.academicYearId);
                    console.log('Academic Year ID set from tenant config:', tenantConfig.academicYearId);
                  } else {
                    console.log('Academic Year ID not found in tenant config');
                  }
                } catch (error) {
                  console.error('Error fetching tenant config for academicYearId:', error);
                }

                const response = await getTenant();
                console.log('response', response);
                const matchedTenant = response.result.find(
                  (item: { tenantId: any }) => item.tenantId === tenantId
                );
                console.log('matchedTenant', matchedTenant);
                if (matchedTenant) {
                  if (matchedTenant.channelId) {
                    localStorage.setItem('channelId', matchedTenant.channelId);
                  }
                  if (matchedTenant.collectionFramework) {
                    localStorage.setItem(
                      'frameworkId',
                      matchedTenant.collectionFramework
                    );
                  }
                }
              }
            }

            await fetchUserDetail();
          }
        } else {
          showToastMessage(
            t('LOGIN_PAGE.USERNAME_PASSWORD_NOT_CORRECT'),
            'error'
          );
        }
        setLoading(false);
        const telemetryInteract = {
          context: { env: 'sign-in', cdata: [] },
          edata: {
            id: 'login-success',
            type: 'CLICK',
            pageid: 'sign-in',
            uid: localStorage.getItem('userId') || 'Anonymous',
          },
        };
        telemetryFactory.interact(telemetryInteract);
      } catch (error: any) {
        setLoading(false);
        const errorMessage = t('LOGIN_PAGE.USERNAME_PASSWORD_NOT_CORRECT');
        showToastMessage(errorMessage, 'error');
      }
    }
  };

  const isButtonDisabled =
    !username || !password || usernameError || passwordError;

  const handleChange = (event: SelectChangeEvent) => {
    const newLocale = event.target.value;
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('preferredLanguage', newLocale);
      setLanguage(newLocale);
      ReactGA.event('select-language-login-page', {
        selectedLanguage: newLocale,
      });
      router.push('/login', undefined, { locale: newLocale });
    }
  };

  const handleForgotPasswordClick = () => {
    logEvent({
      action: 'forgot-password-link-clicked',
      category: 'Login Page',
      label: 'Forgot Password Link Clicked',
    });
  };

  // Get dynamic styles from tenant config
  const getDynamicStyles = () => {
    if (!tenantContentFilter?.theme) {
      return {
        primaryColor: theme.palette.primary.main,
        secondaryColor: theme.palette.secondary.main,
        backgroundColor: theme.palette.background.default,
        buttonTextColor: '#FFFFFF',
      };
    }
    
    return {
      primaryColor: tenantContentFilter.theme.primaryColor || theme.palette.primary.main,
      secondaryColor: tenantContentFilter.theme.secondaryColor || theme.palette.secondary.main,
      backgroundColor: tenantContentFilter.theme.backgroundColor || theme.palette.background.default,
      buttonTextColor: tenantContentFilter.theme.buttonTextColor || '#FFFFFF',
    };
  };

  const dynamicStyles = getDynamicStyles();
  const logoSrc = tenantContentFilter?.icon || '/images/appLogo.png';

  return (
    <>
      <Box
        display="flex"
        flexDirection="column"
        bgcolor={theme.palette.warning.A200}
        borderRadius={'10px'}
        sx={{
          '@media (min-width: 900px)': {
            display: 'none',
          },
        }}
      >
        {loading && (
          <Loader showBackdrop={true} loadingText={t('COMMON.LOADING')} />
        )}
        <Box
          display={'flex'}
          overflow="auto"
          alignItems={'center'}
          justifyContent={'center'}
          zIndex={99}
          sx={{ margin: '5px 10px 25px' }}
        >
          <Box
            sx={{ width: '55%', '@media (max-width: 400px)': { width: '95%' } }}
          >
                  {tenantContentFilter?.icon ? (
                    <img
                      src={logoSrc}
                      alt="Logo"
                      style={{ width: '100%', height: 'auto', maxHeight: '80px', objectFit: 'contain' }}
                    />
                  ) : (
                    <Image
                      src="/images/appLogo.png"
                      alt="Logo"
                      width={200}
                      height={80}
                      style={{ width: '100%', height: 'auto' }}
                    />
                  )}
          </Box>
        </Box>
      </Box>
      <Grid
        container
        spacing={2}
        justifyContent={'center'}
        px={'30px'}
        alignItems={'center'}
        width={'100% !important'}
      >
        {!(isMobile || isMedium) && ( // Render only on desktop view
          <Grid
            sx={{
              '@media (max-width: 900px)': {
                display: 'none',
              },
            }}
            item
            xs={12}
            sm={12}
            md={6}
          >
            <Image
              className="login-img"
              src={loginImg}
              alt="Login Image"
              layout="responsive"
            />
          </Grid>
        )}
        <Grid item xs={12} md={6} display="flex" alignItems="center">
          <Box
            flexGrow={1}
            // display={'flex'}
            bgcolor={theme.palette.warning['A400']}
            height="auto"
            zIndex={99}
            justifyContent={'center'}
            p={'2rem'}
            borderRadius={'2rem 2rem 0 0'}
            sx={{
              '@media (min-width: 900px)': {
                width: '100%',
                borderRadius: '16px',
                boxShadow: 'rgba(99, 99, 99, 0.2) 0px 2px 8px 0px',
                marginTop: '50px',
              },
              '@media (max-width: 900px)': {
                marginTop: '-25px',
              },
            }}
          >
            <Box
              display="flex"
              flexDirection="column"
              bgcolor={theme.palette.warning.A200}
              borderRadius={'10px'}
              sx={{
                '@media (max-width: 900px)': {
                  display: 'none',
                },
              }}
            >
              {loading && (
                <Loader showBackdrop={true} loadingText={t('COMMON.LOADING')} />
              )}
              <Box
                display={'flex'}
                overflow="auto"
                alignItems={'center'}
                justifyContent={'center'}
                zIndex={99}
                // sx={{ margin: '5px 10px 25px', }}
              >
                <Box
                  sx={{
                    width: '60%',
                    '@media (max-width: 700px)': { width: '95%' },
                  }}
                >
                  {tenantContentFilter?.icon ? (
                    <img
                      src={logoSrc}
                      alt="Logo"
                      style={{ width: '100%', height: 'auto', maxHeight: '80px', objectFit: 'contain' }}
                    />
                  ) : (
                    <Image
                      src="/images/appLogo.png"
                      alt="Logo"
                      width={200}
                      height={80}
                      style={{ width: '100%', height: 'auto' }}
                    />
                  )}
                </Box>
              </Box>
            </Box>
            <form onSubmit={handleFormSubmit}>
              {/* <Typography
              variant="h4"
              gutterBottom
              textAlign="center"
              sx={{ mt: 2 }}
            >
              {t("LOGIN_PAGE.LOGIN")}
            </Typography> */}
              <FormControl fullWidth margin="normal">
                <Select
                  className="SelectLanguages"
                  value={language}
                  onChange={handleChange}
                  displayEmpty
                  sx={{
                    borderRadius: '0.5rem',
                    color: theme.palette.warning.A200,
                    width: '117px',
                    height: '32px',
                    marginBottom: '0rem',
                    fontSize: '14px',
                  }}
                >
                  {/* For Swadhaar: Show only English. For others: Show all configured languages */}
                  {config.languages
                    .filter((lang) => 
                      availableLanguages.length === 0 || 
                      availableLanguages.includes(lang.code)
                    )
                    .map((lang) => (
                      <MenuItem value={lang.code} key={lang.code}>
                        {lang.label}
                      </MenuItem>
                    ))}
                </Select>
              </FormControl>
              <TextField
                fullWidth
                id="username"
                InputLabelProps={{ shrink: true }}
                label={t('LOGIN_PAGE.USERNAME')}
                placeholder={t('LOGIN_PAGE.USERNAME_PLACEHOLDER')}
                value={username}
                onChange={handleUsernameChange}
                error={usernameError}
                margin="normal"
              />
              <TextField
                fullWidth
                type={showPassword ? 'text' : 'password'}
                id="password"
                InputLabelProps={{ shrink: true }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={handleClickShowPassword}
                        onMouseDown={handleMouseDownPassword}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                label={t('LOGIN_PAGE.PASSWORD')}
                placeholder={t('LOGIN_PAGE.PASSWORD_PLACEHOLDER')}
                value={password}
                onChange={handlePasswordChange}
                error={passwordError}
                margin="normal"
                inputRef={passwordRef}
              />

              {/* <Box
                sx={{
                  fontSize: '14px',
                  fontWeight: '500',
                  color: theme.palette.secondary.main,
                  mt: 1,
                  cursor: 'pointer',
                }}
                onClick={() => {
                  window.open(
                    `${process.env.NEXT_PUBLIC_RESET_PASSWORD_URL}?redirectUrl=${window.location.origin}/login`,
                    '_self'
                  );
                }}
              >
                {t('LOGIN_PAGE.FORGOT_PASSWORD')}
              </Box> */}
              {/* {
                <Box
                  display="flex"
                  alignItems="center"
                  marginTop="1.2rem"
                  className="remember-me-checkbox"
                >
                  <Checkbox
                    onChange={(e) => setRememberMe(e.target.checked)}
                    checked={rememberMe}
                  />
                  <Typography
                    variant="body2"
                    onClick={() => {
                      setRememberMe(!rememberMe);
                      logEvent({
                        action: 'remember-me-button-clicked',
                        category: 'Login Page',
                        label: `Remember Me ${
                          rememberMe ? 'Checked' : 'Unchecked'
                        }`,
                      });
                    }}
                    sx={{
                      cursor: 'pointer',
                      marginTop: '15px',
                      color: theme.palette.warning[300],
                    }}
                  >
                    {t('LOGIN_PAGE.REMEMBER_ME')}
                  </Typography>
                </Box>
              } */}

              <Box marginTop="2rem" textAlign="center">
                <Button
                  variant="contained"
                  type="submit"
                  fullWidth
                  disabled={isButtonDisabled}
                  ref={loginButtonRef}
                  sx={{
                    backgroundColor: dynamicStyles.primaryColor,
                    color: dynamicStyles.buttonTextColor,
                    '&:hover': {
                      backgroundColor: dynamicStyles.secondaryColor,
                    },
                  }}
                >
                  {t('LOGIN_PAGE.LOGIN')}
                </Button>
              </Box>
            </form>
          </Box>
        </Grid>
      </Grid>
    </>
  );
};

export async function getStaticProps({ locale }: any) {
  return {
    props: {
      noLayout: true,
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
}

export default LoginPage;
