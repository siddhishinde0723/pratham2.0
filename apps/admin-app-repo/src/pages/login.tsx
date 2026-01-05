/* eslint-disable @typescript-eslint/no-unused-expressions */
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
  Card,
  alpha,
  CircularProgress,
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
        let role = null;

        // Parse storedUserData safely
        if (storedUserData) {
          try {
            role = JSON.parse(storedUserData);
          } catch (error) {
            console.error("Error parsing stored user data:", error);
            // If parsing fails, clear invalid data
            localStorage.removeItem('adminInfo');
          }
        }

        if (role) {
          if (role?.role === Role.ADMIN) {
            // Redirect ADMIN users to /learners (first Manage Users option)
            if (locale) {
              router.push('/learners', undefined, { locale: locale });
            } else {
              router.push('/learners');
            }
          } else if (role?.role === Role.SCTA || role?.role === Role.CCTA || role?.role === Role.TEACHER || role?.role === Role.STAFF || role?.role === Role.SUPERVISOR) {
            // Redirect SCTA and CCTA users to workspace
            if (locale) {
              router.push('/workspace', undefined, { locale: locale });
            } else {
              router.push('/workspace');
            }
          } else if (
            role?.role === Role.CENTRAL_ADMIN &&
            role?.tenantData?.[0]?.tenantName === TenantName.SECOND_CHANCE_PROGRAM
          ) {
            if (locale) {
              router.push('/programs', undefined, { locale: locale });
            } else {
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
          userInfo?.role === Role.CCTA || userInfo?.role === Role.TEACHER || userInfo?.role === Role.STAFF || userInfo?.role === Role.SUPERVISOR
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
                userInfo?.role === Role.CCTA || userInfo?.role === Role.TEACHER ||  userInfo?.role === Role.STAFF || userInfo?.role === Role.SUPERVISOR
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

  // Concentric Rings Background Component
  const ConcentricRingsBackground = () => {
    const left = {
      width: '82%',
      height: '140%',
      top: '4%',
      left: '-38%',
      ringAlpha: 0.06,
      ringThickness: 1.4,
      ringGap: 26,
      blur: 1.2,
      center: '36% 52%',
    };
    const right = {
      width: '56%',
      height: '116%',
      top: '2%',
      right: '-8%',
      ringAlpha: 0.115,
      ringThickness: 2,
      ringGap: 12,
      blur: 0.6,
      center: '78% 58%',
    };
    const bgColor = dynamicStyles.backgroundColor || '#ffffff';

    return (
      <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <Box
          sx={{
            position: 'absolute',
            width: left.width,
            height: left.height,
            top: left.top,
            left: left.left,
            borderRadius: '50%',
            overflow: 'hidden',
            backgroundImage: `
              repeating-radial-gradient(circle at ${left.center},
                ${alpha(dynamicStyles.primaryColor, left.ringAlpha)} 0px,
                ${alpha(dynamicStyles.primaryColor, left.ringAlpha)} ${left.ringThickness}px,
                transparent ${left.ringThickness + 0.6}px,
                transparent ${left.ringGap}px
              ),
              radial-gradient(circle at ${left.center}, ${alpha(dynamicStyles.primaryColor, 0.03)} 0%, transparent 36%),
              radial-gradient(circle at ${left.center}, ${bgColor} 0%, ${bgColor} 14%, transparent 15%)
            `,
            backgroundRepeat: 'no-repeat',
            backgroundSize: '100% 100%',
            filter: `blur(${left.blur}px)`,
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            width: right.width,
            height: right.height,
            top: right.top,
            right: right.right,
            borderRadius: '50%',
            overflow: 'hidden',
            backgroundImage: `
              repeating-radial-gradient(circle at ${right.center},
                ${alpha(dynamicStyles.secondaryColor, right.ringAlpha)} 0px,
                ${alpha(dynamicStyles.secondaryColor, right.ringAlpha)} ${right.ringThickness}px,
                transparent ${right.ringThickness + 0.4}px,
                transparent ${right.ringGap}px
              ),
              radial-gradient(circle at ${right.center}, ${alpha(dynamicStyles.secondaryColor, 0.05)} 0%, transparent 42%),
              radial-gradient(circle at ${right.center}, ${bgColor} 0%, ${bgColor} 10%, transparent 11%)
            `,
            backgroundRepeat: 'no-repeat',
            backgroundSize: '100% 100%',
            filter: `blur(${right.blur}px)`,
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            left: '28%',
            top: '16%',
            width: '46%',
            height: '58%',
            borderRadius: '50%',
            pointerEvents: 'none',
            zIndex: 0,
            background: `radial-gradient(circle at 50% 40%, ${alpha(bgColor, 0.98)} 0%, ${alpha(bgColor, 0.86)} 8%, transparent 48%)`,
            filter: 'blur(18px)',
            opacity: 0.98,
          }}
        />
      </Box>
    );
  };

  // Floating Icons Overlay Component
  const FloatingIconsOverlay = () => (
    <Box sx={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 10 }}>
      <Box sx={{ position: 'absolute', top: '12%', left: '46%', opacity: 0.16 }}>
        ✨
      </Box>
      <Box sx={{ position: 'absolute', bottom: '14%', right: '18%', opacity: 0.16 }}>
        📖
      </Box>
    </Box>
  );

  return (
    <Box sx={{ position: 'relative', height: '100vh', overflow: 'hidden', backgroundColor: dynamicStyles.backgroundColor || '#F5F5F5' }}>
      {loading && (
        <Loader showBackdrop={true} loadingText={t('COMMON.LOADING')} />
      )}
      <FloatingIconsOverlay />
      <ConcentricRingsBackground />
      
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          height: '100vh',
          overflow: 'hidden',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Left Column - Hidden on mobile, shown on desktop */}
        {!(isMobile || isMedium) && (
          <Box
            sx={{
              flex: { xs: 'none', lg: 1 },
              display: { xs: 'none', lg: 'flex' },
              alignItems: 'center',
              justifyContent: 'center',
              px: { xs: 3, sm: 6, md: 10, lg: 16 },
              py: { xs: 4, md: 4 },
              minHeight: '100vh',
              zIndex: 2,
            }}
          >
            <Image
              className="login-img"
              src={loginImg}
              alt="Login Image"
              layout="responsive"
              style={{ maxWidth: '100%', height: 'auto' }}
            />
          </Box>
        )}

        {/* Right Column - Login Form */}
        <Box
          sx={{
            flex: { xs: 'none', lg: 1 },
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            px: { xs: 2, sm: 4, md: 6, lg: 8 },
            minHeight: '100vh',
            zIndex: 3,
          }}
        >
          <Card
            sx={{
              width: '100%',
              maxWidth: '520px',
              mx: 'auto',
              borderRadius: '26px',
              background: '#ffffff',
              boxShadow: '0 14px 38px rgba(0,0,0,0.14)',
              p: { xs: 3, sm: 4 },
              minHeight: { xs: 'auto', sm: 730 },
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            {/* Logo */}
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              {tenantContentFilter?.icon ? (
                <img
                  src={logoSrc}
                  alt="Logo"
                  style={{ width: '70px', height: '70px', objectFit: 'contain' }}
                />
              ) : (
                <Image
                  src="/images/appLogo.png"
                  alt="Logo"
                  width={70}
                  height={70}
                  style={{ objectFit: 'contain' }}
                />
              )}
            </Box>

            <Typography
              sx={{
                fontWeight: 700,
                fontSize: { xs: '1.8rem', sm: '2rem' },
                color: '#E6873C',
                mb: 1,
                mt: 2,
                textAlign: 'center',
              }}
            >
              Welcome Back
            </Typography>

            <Typography
              sx={{
                color: 'rgba(0,0,0,0.65)',
                mb: 4,
                textAlign: 'center',
              }}
            >
              Log in to your Account
            </Typography>

            <form onSubmit={handleFormSubmit} style={{ width: '100%' }}>
        

              {/* Username Field */}
              <TextField
                fullWidth
                id="username"
                label={t('LOGIN_PAGE.USERNAME')}
                placeholder={t('LOGIN_PAGE.USERNAME_PLACEHOLDER')}
                value={username}
                onChange={handleUsernameChange}
                error={usernameError}
                variant="outlined"
                margin="normal"
                sx={{
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '10px',
                    backgroundColor: dynamicStyles.backgroundColor || '#F5F5F5',
                    '& fieldset': {
                      borderColor: dynamicStyles.secondaryColor,
                    },
                    '&:hover fieldset': {
                      borderColor: dynamicStyles.secondaryColor,
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: dynamicStyles.primaryColor,
                    },
                  },
                }}
              />

              {/* Password Field */}
              <TextField
                fullWidth
                type={showPassword ? 'text' : 'password'}
                id="password"
                label={t('LOGIN_PAGE.PASSWORD')}
                placeholder={t('LOGIN_PAGE.PASSWORD_PLACEHOLDER')}
                value={password}
                onChange={handlePasswordChange}
                error={passwordError}
                variant="outlined"
                margin="normal"
                inputRef={passwordRef}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={handleClickShowPassword}
                        onMouseDown={handleMouseDownPassword}
                        edge="end"
                        sx={{ color: dynamicStyles.secondaryColor }}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  mb: 3,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: '10px',
                    backgroundColor: dynamicStyles.backgroundColor || '#F5F5F5',
                    '& fieldset': {
                      borderColor: dynamicStyles.secondaryColor,
                    },
                    '&:hover fieldset': {
                      borderColor: dynamicStyles.primaryColor,
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: dynamicStyles.primaryColor,
                    },
                  },
                }}
              />

              {/* Login Button */}
              <Button
                variant="contained"
                type="submit"
                fullWidth
                ref={loginButtonRef}
                sx={{
                  py: 1.6,
                  backgroundColor: '#E6873C',
                  color: `${dynamicStyles.buttonTextColor} !important`,
                  borderRadius: '10px',
                  fontWeight: 600,
                  fontSize: '1rem',
                  boxShadow: `0 4px 14px ${alpha(dynamicStyles.primaryColor, 0.35)}`,
                  mb: 2,
                  textTransform: 'none',
                  '&:hover': {
                    backgroundColor: '#E6873C',
                    opacity: 0.9,
                  },
                  '&:disabled': {
                    backgroundColor: dynamicStyles.backgroundColor || '#F5F5F5',
                    color: dynamicStyles.secondaryColor,
                    opacity: 0.5,
                  },
                }}
              >
                {loading ? (
                  <Box display="flex" alignItems="center" gap={1} justifyContent="center">
                    <CircularProgress size={20} sx={{ color: dynamicStyles.buttonTextColor }} />
                    <span>{t('COMMON.LOADING')}</span>
                  </Box>
                ) : (
                  t('LOGIN_PAGE.LOGIN')
                )}
              </Button>
            </form>
          </Card>
        </Box>
      </Box>
    </Box>
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
