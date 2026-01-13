/* eslint-disable react/no-unescaped-entities */
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import {
  Box,
  Typography,
  Grid,
  Button,
  Stack,
  Divider,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Radio,
  TextField,
  Autocomplete,
  // Link,
  styled,
} from '@mui/material';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { format, isAfter, isValid, parse, startOfDay, differenceInMinutes } from 'date-fns';
import { useTheme } from '@mui/material/styles';
import ArrowForwardSharpIcon from '@mui/icons-material/ArrowForwardSharp';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import PeopleIcon from '@mui/icons-material/People';
import {
  classesMissedAttendancePercentList,
  getAllCenterAttendance,
  getCohortAttendance,
  markAttendance,
  getLearnerAttendanceStatus,
} from '../services/AttendanceService';
import { getAcademicYear } from '../services/AcademicYearService';
import { ShowSelfAttendance, absentReasonOptions, workLocationOptions, attendanceCommentOptions } from '../../app.config';
import { getCohortList, getCohortDetails, cohortList } from '../services/CohortServices';
import { getMyCohortMemberList } from '../services/MyClassDetailsService';
import { getUserDetails } from '../services/ProfileService';
import {
  AttendancePercentageProps,
  CohortAttendancePercentParam,
  CohortMemberList,
  CustomField,
  ICohort,
} from '../utils/interfaces';
import {
  getTodayDate,
  shortDateFormat,
  ATTENDANCE_ENUM,
  filterMembersExcludingCurrentUser,
  getDayDifferenceFromToday,
  isDateWithinPastDays,
  isTodayDate,
} from '../utils/Helper';
import ModalComponent from '../components/Modal';
import MarkBulkAttendance from '../components/MarkBulkAttendance';
import { showToastMessage } from '../components/Toastify';
import { fetchAttendanceDetails } from '../components/AttendanceDetails';
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import LocationModal from './LocationModal';
import useGeolocation from './useGeoLocation';

// Styled components
const DashboardContainer = styled(Box)({
  minHeight: '100vh',
  backgroundColor: '#f5f5f5',
  marginRight: '20px',
});

const HeaderBox = styled(Box)({
  display: 'flex',
  justifyContent: 'center',
});

const HeaderContent = styled(Box)(({ theme }) => ({
  display: 'flex',
  width: '100%',
  justifyContent: 'space-between',
  alignItems: 'center',
  backgroundColor: (theme.palette.warning as any).A400,
  padding: '1rem 1.5rem',
}));

const MainContent = styled(Box)({
  display: 'flex',
  justifyContent: 'center',
});

const ContentWrapper = styled(Box)({
  paddingBottom: '25px',
  width: '100%',
  background: 'linear-gradient(180deg, #fffdf7 0%, #f8efda 100%)',
  borderRadius: '8px',
});

const StatusCard = styled(Card)(({ theme }) => ({
  height: '100%',
  borderRadius: '8px',
  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  border: '1px solid #e0e0e0',
  '& .MuiCardContent-root': {
    padding: '16px',
  },
}));

const CardHeader = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  marginBottom: '16px',
});

const CardIcon = styled(Box)({
  fontSize: '18px',
  marginRight: '8px',
  padding: '6px',
  borderRadius: '4px',
});

const CalendarContainer = styled(Box)({
  marginTop: '16px',
});

const HorizontalCalendarScroll = styled(Box)({
  display: 'flex',
  overflowX: 'auto',
  gap: '8px',
  padding: '8px 0',
  '&::-webkit-scrollbar': {
    height: '4px',
  },
  '&::-webkit-scrollbar-track': {
    background: '#f1f1f1',
    borderRadius: '2px',
  },
  '&::-webkit-scrollbar-thumb': {
    background: '#c1c1c1',
    borderRadius: '2px',
  },
  '&::-webkit-scrollbar-thumb:hover': {
    background: '#a8a8a8',
  },
});

const CalendarCell = styled(Box)(({ theme }) => ({
  position: 'relative',
  height: '3.5rem',
  width: '3rem',
  minWidth: '3rem',
  padding: '4px',
  overflow: 'hidden',
  fontSize: '0.875em',
  border: `1px solid ${(theme.palette.warning as any).A100}`,
  borderRadius: '4px',
  cursor: 'pointer',
  transition: '0.25s ease-out',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-start',
  alignItems: 'center',
  backgroundColor: '#fff',
  '&:hover': {
    backgroundColor: '#f5f5f5',
  },
}));

const DayHeader = styled(Typography)({
  fontSize: '0.7em',
  fontWeight: '600',
  color: '#666',
  lineHeight: 1,
  marginBottom: '2px',
});

const DateNumber = styled(Typography)({
  fontSize: '0.875em',
  fontWeight: '500',
  lineHeight: 1,
  marginTop: '2px',
});

const LearnerTag = styled(Box)({
  display: 'inline-block',
  backgroundColor: '#fffbe6',
  border: '1px solid #ffe58f',
  color: '#faad14',
  borderRadius: '4px',
  padding: '4px 8px',
  fontSize: '12px',
  margin: '2px',
});

const getDistanceInMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371000; // Earth radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Helper function to extract time slot from cohort data
const getTimeSlotFromCohort = (cohort: any): string => {
  try {
    const customFields = cohort?.cohortMemberCustomField || [];
    const slotsField = customFields.find(
      (field: any) => field?.label?.toUpperCase() === 'SLOTS'
    );
    if (slotsField && Array.isArray(slotsField.selectedValues) && slotsField.selectedValues.length > 0) {
      return slotsField.selectedValues[0];
    }
  } catch (error) {
    console.error('Error extracting time slot:', error);
  }
  return '';
};

const SimpleTeacherDashboard = () => {
  const theme = useTheme();
  const [classId, setClassId] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [yearSelect, setYearSelect] = useState('2025-2026');
  const [academicYearsList, setAcademicYearsList] = useState<Array<any>>([]);
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<any>(null);
  const [cohortsData, setCohortsData] = useState<Array<ICohort>>([]);
  const [centersData, setCentersData] = useState<Array<any>>([]);
  const [batchesData, setBatchesData] = useState<Array<any>>([]);
  const [selectedCenterId, setSelectedCenterId] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [open, setOpen] = useState(false);
  const [isRemoteCohort, setIsRemoteCohort] = useState(false);
   const [role, setRole] = useState<string | null>(null);
  const [cohortPresentPercentage, setCohortPresentPercentage] =
    useState('No Attendance');
  const [lowAttendanceLearnerList, setLowAttendanceLearnerList] = useState<any>(
    'No Learners with Low Attendance'
  );
  const [allCenterAttendanceData, setAllCenterAttendanceData] = useState<any>(
    []
  );
  const [attendanceStats, setAttendanceStats] = useState<any>(null);
  const [startDateRange, setStartDateRange] = useState('');
  const [endDateRange, setEndDateRange] = useState('');
  const [dateRange, setDateRange] = useState('');
  const [selectedDate, setSelectedDate] = React.useState<string>(
    getTodayDate()
  );
  const [attendanceData, setAttendanceData] = useState({
    cohortMemberList: [],
    presentCount: 0,
    absentCount: 0,
    numberOfCohortMembers: 0,
    dropoutMemberList: [],
    dropoutCount: 0,
    bulkAttendanceStatus: '',
  });

  const [selfAttendanceData, setSelfAttendanceData] = useState<any[]>([]);
  const [selectedSelfAttendance, setSelectedSelfAttendance] = useState<
    string | null
  >(null);
  const [absentReason, setAbsentReason] = useState("");
  const [workLocation, setWorkLocation] = useState("");
  const [attendanceComment, setAttendanceComment] = useState("");
  const [isSelfAttendanceModalOpen, setIsSelfAttendanceModalOpen] =
    useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [attendanceLocation, setAttendanceLocation] =
    useState<GeolocationPosition | null>(null);
  const [handleSaveHasRun, setHandleSaveHasRun] = useState(false);
// ...
  const [academicYearId, setAcademicYearId] = useState<string | null>(null);
  const [dayWiseAttendanceData, setDayWiseAttendanceData] = useState<{
    [date: string]: {
      presentCount: number;
      absentCount: number;
      totalCount: number;
      percentage: number;
    };
  }>({});
  const router = useRouter();
  const { getLocation } = useGeolocation();
  // Get current month and year for display (showing last 30 days)
  const today = new Date();
  const currentMonth = today.toLocaleString('default', {
    month: 'long',
  });
  const currentYear = today.getFullYear();
  const handleModalToggle = () => {
    setOpen(!open);
    // Add telemetry if needed
    // telemetryFactory.interact(telemetryInteract);
  };
  const handleClose = () => {
    setOpen(false);
    setIsRemoteCohort(false);
  };
  // ADD THIS FUNCTION TO HANDLE ATTENDANCE DATA UPDATE
  const handleAttendanceDataUpdate = (data: any) => {
    setAttendanceData(data);
  };
const MAX_BACKDATED_MARK_DAYS = 7;
    const selectedDateDiffFromToday = useMemo(
    () => getDayDifferenceFromToday(selectedDate),
    [selectedDate]
  );
  const isSelectedDateWithinAllowedWindow = useMemo(
    () => isDateWithinPastDays(selectedDate, MAX_BACKDATED_MARK_DAYS),
    [selectedDate]
  );
  const isSelectedDateTodayValue = useMemo(
    () => isTodayDate(selectedDate),
    [selectedDate]
  );
  const [oblfCoords, setOblfCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  useEffect(() => {
    const storedRole = localStorage.getItem('roleName');
    setRole(storedRole);
  }, []);

  useEffect(() => {
    const fetchOBLFLocation = async () => {
      if (role === 'Staff') {
        try {
          const filters = { type: 'SCHOOL', status: ['active'] } as any;
          const response = await cohortList({ limit: 0, offset: 0, filters });
          const cohorts = response?.results?.cohortDetails || [];
          const oblfEntity = cohorts.find(
            (c: any) =>
              c.name?.toLowerCase().includes('oblf office') ||
              c.cohortName?.toLowerCase().includes('oblf office')
          );

          if (oblfEntity) {
            const customFields =
              oblfEntity.customFields || oblfEntity.customField || [];
            const latField = customFields.find(
              (f: any) => f.label?.toLowerCase() === 'latitude'
            );
            const lonField = customFields.find(
              (f: any) => f.label?.toLowerCase() === 'longitude'
            );

            if (latField && lonField) {
              const lat = parseFloat(latField.selectedValues?.[0]);
              const lon = parseFloat(lonField.selectedValues?.[0]);
              if (Number.isFinite(lat) && Number.isFinite(lon)) {
                setOblfCoords({ latitude: lat, longitude: lon });
              }
            }
          }
        } catch (error) {
          console.error('Error fetching OBLF location:', error);
        }
      }
    };
    fetchOBLFLocation();
  }, [role]);

  const handleRemoteSession = () => {
    try {
      // Check if it's a remote cohort (you might need to adjust this logic based on your data)
      const teacherApp = JSON.parse(
        localStorage.getItem('teacherApp') ?? 'null'
      );
      const cohort = teacherApp?.state?.cohorts?.find?.(
        (c: any) => c.cohortId === classId
      );
      const REMOTE_COHORT_TYPE = 'REMOTE' as const;

      if (cohort?.cohortType === REMOTE_COHORT_TYPE) {
        // if (true) {
        setIsRemoteCohort(true);
        // ReactGA.event('mark/modify-attendance-button-clicked-dashboard', {
        //   teacherId: userId,
        // });
      } else {
        handleModalToggle();
      }
    } catch (error) {
      console.error('Error parsing teacher app data:', error);
      handleModalToggle();
    }
  };
  // Fetch academic years
  // Fetch academic years
  // Fetch academic years
  const fetchAcademicYears = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token available for academic years request');
        throw new Error('No authentication token');
      }
      const response = await getAcademicYear();
      if (response && Array.isArray(response)) {
        setAcademicYearsList(response);

        // Find the current active academic year
        const currentDate = new Date();
        let activeAcademicYear = response.find((year: any) => {
          const startDate = new Date(year.startDate);
          const endDate = new Date(year.endDate);
          return currentDate >= startDate && currentDate <= endDate;
        });

        // If no active year found, use the first one or the one with latest start date
        if (!activeAcademicYear) {
          activeAcademicYear = response.reduce((latest: any, current: any) => {
            if (!latest) return current;
            return new Date(current.startDate) > new Date(latest.startDate)
              ? current
              : latest;
          }, null);
        }

        if (activeAcademicYear) {
          // Set the display name for the year selection
          const yearDisplayName =
            activeAcademicYear.session ||
            `${new Date(activeAcademicYear.startDate).getFullYear()}-${new Date(
              activeAcademicYear.endDate
            ).getFullYear()}`;

          setYearSelect(yearDisplayName);
          setSelectedAcademicYear(activeAcademicYear);

          // Store the academic year ID in localStorage
          localStorage.setItem('academicYearId', activeAcademicYear.id);
          setAcademicYearId(activeAcademicYear.id);
        } else if (response.length > 0) {
          // Fallback to first academic year
          const firstYear = response[0];
          const yearDisplayName =
            firstYear.session ||
            `${new Date(firstYear.startDate).getFullYear()}-${new Date(
              firstYear.endDate
            ).getFullYear()}`;

          setYearSelect(yearDisplayName);
          setSelectedAcademicYear(firstYear);
          localStorage.setItem('academicYearId', firstYear.id);
          setAcademicYearId(firstYear.id);
        }
      }
    } catch (error) {
      console.error('Error fetching academic years:', error);
      throw error; // Re-throw to handle in calling function
    }
  };
  // Initialize user and data
  useEffect(() => {
    const initializeDashboard = async () => {
      if (typeof window !== 'undefined' && window.localStorage) {
        const token = localStorage.getItem('token');
        const storedUserId = localStorage.getItem('userId');
        if (!token) {
          router.push('/login');
          return;
        }

        // Validate token by making a simple API call
        try {
          setIsAuthenticated(true);
          setUserId(storedUserId);

          // Try to fetch academic years to validate token
          await fetchAcademicYears();

          // If successful, fetch user cohorts
          await fetchUserCohorts(storedUserId);
        } catch (error: any) {
          console.error('Authentication failed:', error);

          // If token is invalid, clear storage and redirect
          if (error?.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('userId');
            localStorage.removeItem('academicYearId');
            showToastMessage('Session expired. Please login again.', 'error');
            router.push('/login');
            return;
          }
        }
      }
    };

    initializeDashboard();
  }, []);

  // Fetch user cohorts
  // Fetch user cohorts
  // Fetch user cohorts
  const fetchUserCohorts = async (userId: string | null) => {
    if (!userId) return;

    try {
      setLoading(true);
      const response = await getCohortList(userId, {
        customField: 'true',
        children: 'true',
      });
      await getUserDetails(userId, true);
      if (response && response.length > 0) {
        setCohortsData(response);

        // Extract unique parent IDs from the cohorts
        const uniqueParentIds = [
          ...new Set(
            response
              .map((item: any) => {
                if (item.type === 'COHORT' && item.parentId) return item.parentId;
                if (item.type !== 'COHORT') return item.cohortId;
                return null;
              })
              .filter((id:any) => id)
          ),
        ];
        // Fetch hierarchy data for each unique parent ID
        const centersWithHierarchy = await Promise.all(
          uniqueParentIds.map(async (parentId: any) => {
            try {
              // Call cohortHierarchy API with the parent ID
              const hierarchyData = await getCohortDetails(parentId, {
                children: 'true',
                customField: 'true',
              });
              const centerData = Array.isArray(hierarchyData)
                ? hierarchyData[0]
                : hierarchyData;

              return {
                centerId: centerData?.cohortId || parentId,
                centerName:
                  centerData?.cohortName || centerData?.name || 'Unknown Center',
                childData: centerData?.childData || [],
                hierarchyData: centerData,
                customField: centerData?.customField || [],
              };
            } catch (error) {
              console.error(`Error fetching hierarchy for ${parentId}:`, error);
              return null;
            }
          })
        );

        // Filter out null values (failed requests)
        const validCenters = centersWithHierarchy.filter(
          (center) => center !== null
        );
        setCentersData(validCenters);

        if (validCenters.length > 0) {
          const defaultCenter = validCenters[0];
          setSelectedCenterId(defaultCenter.centerId);

          // Batches/classes should come ONLY from myCohorts response
          const batches = response
            .filter(
              (item: any) =>
                item.type === 'COHORT' &&
                item.parentId === defaultCenter.centerId &&
                item.cohortStatus === 'active'
            )
            .map((item: any) => {
              const timeSlot = getTimeSlotFromCohort(item);
              return {
                batchId: item.cohortId,
                batchName: item.cohortName,
                parentId: item.parentId,
                timeSlot: timeSlot,
              };
            });
          setBatchesData(batches);

          // Set default batch if available
          if (batches.length > 0) {
            setClassId(batches[0].batchId);
          } else {
            setClassId('');
          }
        } else {
          // If no hierarchy data, use direct cohorts from response
          const directCohorts = response.filter(
            (item: any) => item.type === 'COHORT'
          );
          if (directCohorts.length > 0) {
            // Group cohorts by parentId
            const cohortsByParent: any = {};
            directCohorts.forEach((cohort: any) => {
              if (!cohortsByParent[cohort.parentId]) {
                cohortsByParent[cohort.parentId] = [];
              }
              cohortsByParent[cohort.parentId].push(cohort);
            });

            // Create centers from parent IDs
            const fallbackCenters = Object.keys(cohortsByParent).map(
              (parentId) => ({
                centerId: parentId,
                centerName: `Center ${parentId.substring(0, 8)}`,
                childData: cohortsByParent[parentId],
                hierarchyData: null,
                customField: [],
              })
            );

            setCentersData(fallbackCenters);

            if (fallbackCenters.length > 0) {
              const defaultCenter = fallbackCenters[0];
              setSelectedCenterId(defaultCenter.centerId);

              const batches = defaultCenter.childData.map((batch: any) => {
                const timeSlot = getTimeSlotFromCohort(batch);
                return {
                  batchId: batch.cohortId,
                  batchName: batch.cohortName,
                  parentId: batch.parentId,
                  timeSlot: timeSlot,
                };
              });
              
              setBatchesData(batches);

              if (batches.length > 0) {
                setClassId(batches[0].batchId);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error fetching cohorts:', error);
    } finally {
      setLoading(false);
    }
  };
  // Handle center selection change
  const handleCenterChange = (event: any) => {
    const centerId = event.target.value;
    setSelectedCenterId(centerId);
    // Save to localStorage for synchronization with other pages
    localStorage.setItem('selectedCenterId', centerId);

    // Find the selected center and get its batches
    const selectedCenter = centersData.find(
      (center) => center.centerId === centerId
    );
    if (selectedCenter) {
      const batches = cohortsData
        .filter(
          (item: any) =>
            item.type === 'COHORT' &&
            item.parentId === centerId &&
            item.cohortStatus === 'active'
        )
        .map((item: any) => {
          const timeSlot = getTimeSlotFromCohort(item);
          return {
            batchId: item.cohortId,
            batchName: item.cohortName,
            parentId: item.parentId,
            timeSlot: timeSlot,
          };
        });
      setBatchesData(batches);

      // Reset batch selection
      if (batches.length > 0) {
        const defaultBatchId = batches[0].batchId;
        setClassId(defaultBatchId);
        localStorage.setItem('classId', defaultBatchId);
        localStorage.setItem('cohortId', defaultBatchId);
      } else {
        setClassId('');
        localStorage.removeItem('classId');
        localStorage.removeItem('cohortId');
      }
    }
  };

  // Handle batch selection change
  const handleBatchChange = (event: any) => {
    const batchId = event.target.value;
    setClassId(batchId);
    // Save to localStorage for synchronization with other pages
    localStorage.setItem('classId', batchId);
    localStorage.setItem('cohortId', batchId);
  };
  // Calculate date range for last 7 days
  useEffect(() => {
    const calculateDateRange = () => {
      const endRangeDate = new Date();
      endRangeDate.setHours(23, 59, 59, 999);
      const startRangeDate = new Date(endRangeDate);
      startRangeDate.setDate(startRangeDate.getDate() - 6);
      startRangeDate.setHours(0, 0, 0, 0);

      const startDay = startRangeDate.getDate();
      const startDayMonth = startRangeDate.toLocaleString('default', {
        month: 'long',
      });
      const endDay = endRangeDate.getDate();
      const endDayMonth = endRangeDate.toLocaleString('default', {
        month: 'long',
      });

      if (startDayMonth === endDayMonth) {
        setDateRange(`(${startDay}-${endDay} ${endDayMonth})`);
      } else {
        setDateRange(`(${startDay} ${startDayMonth}-${endDay} ${endDayMonth})`);
      }

      const formattedStartDate = shortDateFormat(startRangeDate);
      const formattedEndDate = shortDateFormat(endRangeDate);
      setStartDateRange(formattedStartDate);
      setEndDateRange(formattedEndDate);
    };

    calculateDateRange();
  }, []);
  const todayDate = getTodayDate();

  // Get current attendance status based on attendanceData
  const getCurrentAttendanceStatusValue = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selected = new Date(selectedDate);
    selected.setHours(0, 0, 0, 0);

    // Check if selected date is in the future
    if (selected > today) {
      return 'futureDate';
    }

    // Check if attendance is marked for the selected date
    const isAttendanceMarked =
      attendanceData.presentCount > 0 || attendanceData.absentCount > 0;
    return isAttendanceMarked ? 'marked' : 'notMarked';
  };

  const currentAttendance = getCurrentAttendanceStatusValue();
  // const pathColor = determinePathColor(presentPercentage);

  // Fetch self attendance data
  const fetchSelfAttendance = async () => {
    if (!classId || classId === 'all') return;

    try {
      const userId = localStorage.getItem('userId');
      if (!userId) return;

      const limit = 300;
      const page = 0;

      // Try with "self" scope first
      let filters = {
        contextId: classId,
        userId: userId,
        scope: 'self',
        toDate: selectedDate,
        fromDate: selectedDate,
      };

      let response = await getLearnerAttendanceStatus({
        limit,
        page,
        filters,
      });

      // If no results with "self" scope, try with "student" scope (as API might return student scope)
      if (
        !response?.data?.attendanceList ||
        response.data.attendanceList.length === 0
      ) {
        filters = {
          ...filters,
          scope: 'student',
        };
        response = await getLearnerAttendanceStatus({
          limit,
          page,
          filters,
        });
      }

      if (response?.data?.attendanceList) {
        if (response.data.attendanceList.length > 0) {
          setSelfAttendanceData(response.data.attendanceList);
          const attendanceValue = response.data.attendanceList[0]?.attendance;
          setSelectedSelfAttendance(
            attendanceValue ? attendanceValue.toLowerCase() : null
          );
        } else {
          setSelfAttendanceData([]);
          setSelectedSelfAttendance(null);
        }
      }
    } catch (error) {
      console.error('Error fetching self attendance:', error);
      setSelfAttendanceData([]);
      setSelectedSelfAttendance(null);
    }
  };

  const showSelfAttendanceRestrictionMessage = () => {
    showToastMessage(
      "Self attendance can only be marked for today's date.",
      'warning'
    );
  };

  const handleSelfAttendanceButtonClick = () => {
    if (!isSelectedDateTodayValue) {
      showSelfAttendanceRestrictionMessage();
      return;
    }
    setIsLocationModalOpen(true);
  };

  // Request location permission
  const requestLocationPermission = () => {
    if (!isSelectedDateTodayValue) {
      showSelfAttendanceRestrictionMessage();
      return;
    }

    if (!navigator.geolocation) {
      showToastMessage('Geolocation is not supported by your browser', 'error');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setAttendanceLocation(position);
        setIsLocationModalOpen(false);
        const currentAttendance = selfAttendanceData?.[0]?.attendance;
        setSelectedSelfAttendance(
          currentAttendance ? currentAttendance.toLowerCase() : null
        );
        setIsSelfAttendanceModalOpen(true);
      },
      (error) => {
        console.error('Error getting location:', error);
        showToastMessage(
          'Failed to get location. Please enable location services.',
          'error'
        );
        setIsLocationModalOpen(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const getSelectedCenterCoordinates = () => {
    const center = centersData.find((c) => c.centerId === selectedCenterId);
    const customFields: any[] = center?.customField || [];
    const latitudeField = customFields.find(
      (field) =>
        field?.label?.toLowerCase() === 'latitude' &&
        Array.isArray(field?.selectedValues) &&
        field.selectedValues.length > 0
    );
    const longitudeField = customFields.find(
      (field) =>
        field?.label?.toLowerCase() === 'longitude' &&
        Array.isArray(field?.selectedValues) &&
        field.selectedValues.length > 0
    );

    const lat = parseFloat(latitudeField?.selectedValues?.[0]);
    const lon = parseFloat(longitudeField?.selectedValues?.[0]);
    if (Number.isFinite(lat) && Number.isFinite(lon)) {
      return { latitude: lat, longitude: lon };
    }
    return null;
  };



  const isLocationValid = (
    locationData: { latitude: number; longitude: number } | null,
    targetCoordsOverride?: { latitude: number; longitude: number } | null
  ): { valid: boolean; distance?: number } => {
    const centerCoords = targetCoordsOverride || getSelectedCenterCoordinates();
    if (!centerCoords) {
      return { valid: true };
    }
    if (!locationData) {
      return { valid: false };
    }
    const distance = getDistanceInMeters(
      centerCoords.latitude,
      centerCoords.longitude,
      locationData.latitude,
      locationData.longitude
    );
    const allowedRadiusMeters = 50; // within 50m of center
    return { valid: distance <= allowedRadiusMeters, distance };
  };

  // Handle marking self attendance
  const handleMarkSelfAttendance = async () => {
    if (!selectedSelfAttendance) return;
    // Check if selected date is today
    if (!isTodayDate(selectedDate)) {
      showSelfAttendanceRestrictionMessage();
      return;
    }

    if (selectedSelfAttendance === ATTENDANCE_ENUM.ABSENT && !absentReason) {
      showToastMessage('Please select an absent reason', 'error');
      return;
    }

    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        showToastMessage('User ID not found', 'error');
        return;
      }

      // Get location using useGeolocation hook
      const locationData = await getLocation(true);
     

      // Time Slot Validation
      let isLate = false;
      const currentBatch = batchesData.find((b) => b.batchId === classId);
      let timeSlot = currentBatch?.timeSlot;
      if (role === 'Staff') {
        timeSlot = '09:30 AM - 05:30 PM';
      }
      if (timeSlot) {
        try {
          // Expected format: "10:15 AM - 11:15 AM"
          const [startTimeStr] = timeSlot.split(' - ');
         
          if (startTimeStr) {
            const currentTime = new Date();
            const startTime = parse(startTimeStr, 'hh:mm a', new Date());
            
            // If parse fails or results in invalid date, skip validation
            if (isValid(startTime)) {
              const diffInMinutes = differenceInMinutes(currentTime, startTime);
              
              // If current time is more than 5 minutes BEFORE start time
              // diffInMinutes will be negative (e.g. -6)
              if (diffInMinutes < -5) {
                if (role !== 'Staff') {
                  showToastMessage(
                    'You can mark self attendance only within 5 minutes before the slot start time.',
                    'error'
                  );
                  return;
                }
              }

              // If current time is more than 5 minutes AFTER start time
              if (diffInMinutes > 5) {
                isLate = true;
              }
            }
          }
        } catch (error) {
          console.error('Error parsing time slot:', error);
        }
      }
      
// const role = localStorage.getItem('roleName');
      const data: any = {
        userId: userId,
        attendance: selectedSelfAttendance?.toLowerCase(),
        attendanceDate: selectedDate,
        contextId: role === 'Supervisor' ? selectedCenterId : classId,
        scope:'self',
        // scope: role === 'Teacher' ? 'self' : role === 'Staff'?'staff':'center',
        context: 'cohort',
        lateMark: isLate,
        // reason:isLate?'late':'present',
        validLocation: false,
        metaData: {}
      };

      // Add attendance-specific fields based on role
      if (selectedSelfAttendance === ATTENDANCE_ENUM.ABSENT) {
        // For absent: only include absentReason
        data.absentReason = absentReason;
        data.workLocation = '';
        // data.comment = '';
        data.metaData.workLocation = '';
        data.remark = '';
      } else {
        // For present: include fields based on role
        data.absentReason = '';
        
        // Work Location - only for Staff and Supervisor
        if (role === 'Staff' || role === 'Supervisor') {
          data.metaData.workLocation = workLocation || '';

        } else {
          data.metaData.workLocation = '';
        }
        
        // Comment - for Teacher and Supervisor
        if (role === 'Teacher' || role === 'Supervisor') {
          data.remark = attendanceComment || '';
        } else {
          data.remark = '';
        }
      }

      // Add location data if available from useGeolocation hook
      if (locationData) {
        data.latitude = locationData.latitude;
        data.longitude = locationData.longitude;

        let targetCoords = null;
        if (role === 'Staff' && workLocation === 'work_from_office') {
          targetCoords = oblfCoords;
        }

        const validationResult = isLocationValid(locationData, targetCoords);
        data.validLocation = validationResult.valid;

        // Validation Enforcement Logic
        let shouldEnforceLocation = true; 

        // For Staff, only enforce if "Work from Office" AND Present
        if (role === 'Staff') {
          const isPresent = selectedSelfAttendance?.toLowerCase() === ATTENDANCE_ENUM.PRESENT;
          if (isPresent && workLocation === 'work_from_office') {
            shouldEnforceLocation = true;
          } else {
            shouldEnforceLocation = false;
          }
        }
        
        // For Supervisor, only enforce if Present
        if (role === 'Supervisor') {
           const isPresent = selectedSelfAttendance?.toLowerCase() === ATTENDANCE_ENUM.PRESENT;
           shouldEnforceLocation = isPresent;
        }

        if (shouldEnforceLocation && !validationResult.valid) {
          const distanceMsg =
            validationResult.distance !== undefined
              ? `Distance from center: ${validationResult.distance.toFixed(2)}m`
              : 'Distance could not be computed.';
          showToastMessage(
            `${distanceMsg} You must be within 50 meters of the center to mark self attendance.`,
            'warning'
          );
          setIsSelfAttendanceModalOpen(false);
          return;
        }
      }
      const response = await markAttendance(data);
      // Check both responseCode and params.status for success
      if (
        (response?.responseCode === 200 || response?.responseCode === 201) &&
        response?.params?.status === 'successful'
      ) {
        const successMessage =
          response?.params?.successmessage || 'Attendance marked successfully';
        showToastMessage(successMessage, 'success');
        setIsSelfAttendanceModalOpen(false);
        setSelectedSelfAttendance(null);
        setAbsentReason('');
        setWorkLocation('');
        setAttendanceComment('');

        // Update self attendance state directly from response if available
        if (response?.data?.attendance) {
          const attendanceValue = response.data.attendance.toLowerCase();
          setSelectedSelfAttendance(attendanceValue);

          // Update selfAttendanceData with response data
          const updatedSelfAttendance = [
            {
              attendance: response.data.attendance,
              attendanceDate: response.data.attendanceDate,
              ...response.data,
            },
          ];
          setSelfAttendanceData(updatedSelfAttendance);
        }

        // Refresh attendance data to show updated status
        await fetchSelfAttendance();
        fetchAttendanceData();
        fetchDayWiseAttendanceData();
        setHandleSaveHasRun(!handleSaveHasRun);
      } else if (response?.responseCode === 400 || response?.params?.err) {
        const errorMessage =
          response?.params?.errmsg ||
          response?.params?.err ||
          'Something went wrong';
        showToastMessage(errorMessage, 'error');
      } else {
        showToastMessage('Something went wrong', 'error');
      }
    } catch (error) {
      console.error('Error marking self attendance:', error);
      showToastMessage('Something went wrong', 'error');
    }
  };

  // Fetch attendance data when classId changes
  useEffect(() => {
   
    if (classId && classId !== 'all') {
      fetchAttendanceData();
      fetchDayWiseAttendanceData();
      if (ShowSelfAttendance) {
        fetchSelfAttendance();
      }
    }
  }, [classId, selectedDate, startDateRange, endDateRange, handleSaveHasRun]);

  // Fetch attendance data for all 30 days
  const fetchDayWiseAttendanceData = async () => {
    const isStaffOrSupervisor = role === 'Staff' || role === 'Supervisor';

    if (!isStaffOrSupervisor && (!classId || classId === 'all')) return;

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!isStaffOrSupervisor && !uuidRegex.test(classId)) {
      console.warn(
        'fetchDayWiseAttendanceData: Invalid UUID format for classId:',
        classId
      );
      return;
    }

    try {
      const calendarDays = generateCalendarData();
      if (calendarDays.length === 0) return;

      const firstDate = calendarDays[calendarDays.length - 1].dateString;
      const lastDate = calendarDays[0].dateString;

      // Handle Staff and Supervisor roles (Self Attendance History)
      if (isStaffOrSupervisor) {
        const userId = localStorage.getItem('userId');
        if (!userId) return;

        const contextId = role === 'Supervisor' ? selectedCenterId : undefined;

        const filters = {
          contextId: contextId,
          userId: userId,
          scope: 'self',
          fromDate: firstDate,
          toDate: lastDate,
        };

        const limit = 300; // Sufficient for 30 days
        const page = 0;

        const response = await getLearnerAttendanceStatus({
          limit,
          page,
          filters,
        });

        const attendanceList = response?.data?.attendanceList || [];
        const processedData: { [date: string]: any } = {};

        attendanceList.forEach((item: any) => {
          if (item.attendanceDate) {
            const isPresent = item.attendance === 'present';
            processedData[item.attendanceDate] = {
              presentCount: isPresent ? 1 : 0,
              absentCount: isPresent ? 0 : 1,
              totalCount: 1,
              percentage: isPresent ? 100 : 0,
            };
          }
        });
        setDayWiseAttendanceData(processedData);
        return;
      }

      const cohortAttendanceData: CohortAttendancePercentParam = {
        limit: 1000,
        page: 0,
        filters: {
          scope: 'student',
          fromDate: firstDate,
          toDate: lastDate,
          contextId: classId,
        },
        facets: ['attendanceDate'],
        sort: ['present_percentage', 'asc'],
      };

      const response = await getCohortAttendance(cohortAttendanceData);
      const attendanceDateData = response?.data?.result?.attendanceDate || {};

      // Process the data
      const processedData: {
        [date: string]: {
          presentCount: number;
          absentCount: number;
          totalCount: number;
          percentage: number;
        };
      } = {};

      // Get total members count
      const limit = 300;
      const page = 0;
      const filters = { cohortId: classId };
      const memberResponse = await getMyCohortMemberList({
        limit,
        page,
        filters,
        includeArchived: true,
      });
      const members = memberResponse?.result?.userDetails || [];
      // Filter to only include members with role "Student" (case-insensitive)
      const studentMembers = members.filter(
        (member: any) => member?.role?.toLowerCase() === 'student'
      );
      const filteredMembers = filterMembersExcludingCurrentUser(studentMembers);
      const totalMembers = studentMembers.length;

      // Process each date
      Object.keys(attendanceDateData).forEach((dateStr) => {
        const dateData = attendanceDateData[dateStr];
        const present = dateData.present || 0;
        const absent = dateData.absent || 0;
        const total = present + absent;
        const percentage =
          totalMembers > 0 ? (present / totalMembers) * 100 : 0;

        processedData[dateStr] = {
          presentCount: present,
          absentCount: absent,
          totalCount: total,
          percentage: Math.round(percentage),
        };
      });

      setDayWiseAttendanceData(processedData);
    } catch (error) {
      console.error('Error fetching day-wise attendance data:', error);
    }
  };

  // Main function to fetch attendance data
  const fetchAttendanceData = async () => {
    if (!classId) return;

    setLoading(true);
    try {
      if (classId !== 'all') {
        await fetchSingleCenterAttendance();
      } else {
        await fetchAllCentersAttendance();
      }
    } catch (error) {
      console.error('Error fetching attendance data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch attendance for single center also past date list of students who have missed attendance
  const fetchSingleCenterAttendance = async () => {
    try {
      // Fetch cohort member list
      // Validate UUID format before making API call
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(classId)) {
        console.warn(
          'fetchAttendanceData: Invalid UUID format for classId:',
          classId
        );
        return;
      }

      const limit = 300;
      const page = 0;
      const filters = { cohortId: classId };
      const response = await getMyCohortMemberList({
        limit,
        page,
        filters,
        includeArchived: true,
      });

      const resp = response?.result?.userDetails;
      if (resp) {
        // Filter to only include members with role "Student" (case-insensitive)
        const studentMembers = resp.filter((entry: any) => 
          entry?.role?.toLowerCase() === 'student' && entry?.status?.toLowerCase() === 'active'
        );
        const nameUserIdArray = studentMembers
          ?.map((entry: any) => ({
            userId: entry.userId,
            name: entry.firstName + ' ' + entry.lastName,
            memberStatus: entry.status,
            createdAt: entry.createdAt,
            updatedAt: entry.updatedAt,
            userName: entry.username,
          }))
          .filter((member: any) => {
            const updatedAt = new Date(member.updatedAt);
            updatedAt.setHours(0, 0, 0, 0);
            const currentDate = new Date(selectedDate);
            currentDate.setHours(0, 0, 0, 0);
            
            // For past dates, show all active members
            // Only filter out archived members who were archived before the selected date
            if (member.memberStatus === 'ARCHIVED') {
              // Only exclude if archived before the selected date
              return updatedAt > currentDate;
            }
            // Show all active and dropout members regardless of creation date
            return true;
          });
        // Fetch actual attendance details
        if (nameUserIdArray && selectedDate && classId) {
          await fetchAttendanceDetails(
            nameUserIdArray,
            selectedDate,
            classId,
            handleAttendanceDataUpdate
          );
        }
        // Get low attendance learners
        const fromDate = startDateRange;
        const toDate = endDateRange;
        const attendanceFilters = {
          contextId: classId,
          fromDate,
          toDate,
          scope: 'student',
        };

        const attendanceResponse = await classesMissedAttendancePercentList({
          filters: attendanceFilters,
          facets: ['userId'],
          sort: ['absent_percentage', 'asc'],
        });
        const attendanceData = attendanceResponse?.data?.result?.userId;
        if (attendanceData) {
          const filteredData = Object.keys(attendanceData).map((userId) => ({
            userId,
            absent: attendanceData[userId].absent,
            present_percent: attendanceData[userId].present_percentage,
          }));

          let mergedArray = filteredData.map((attendance) => {
            const user = nameUserIdArray.find(
              (user: { userId: string }) => user.userId === attendance.userId
            );
            return Object.assign({}, attendance, {
              name: user ? user.name : 'Unknown',
            });
          });

          mergedArray = mergedArray.filter((item) => item.name !== 'Unknown');
        

          // Consider students with less than 75% attendance as "low attendance"
          const LOW_ATTENDANCE_THRESHOLD = 75;
          const studentsWithLowestAttendance = mergedArray.filter((user) => {
            const hasAbsence = user.absent && user.absent > 0;
            const percentNum = parseFloat(user.present_percent || '0');
            const isLowAttendance = percentNum < LOW_ATTENDANCE_THRESHOLD;
           
            return (
              hasAbsence &&
              (isLowAttendance || user.present_percent === undefined)
            );
          });

          if (studentsWithLowestAttendance.length) {
            const namesOfLowestAttendance = studentsWithLowestAttendance.map(
              (student) => student.name
            );
          
            setLowAttendanceLearnerList(namesOfLowestAttendance);
          } else {
            setLowAttendanceLearnerList([]);
          }
        } else {
          console.log('No attendance data received from API');
        }

        // Get cohort attendance percentage
        const cohortAttendanceData: CohortAttendancePercentParam = {
          limit: 1000,
          page: 0,
          filters: {
            scope: 'student',
            fromDate: startDateRange,
            toDate: endDateRange,
            contextId: classId,
          },
          facets: ['contextId'],
          sort: ['present_percentage', 'asc'],
        };
        const cohortRes = await getCohortAttendance(cohortAttendanceData);
        const cohortResponse = cohortRes?.data?.result;
        const contextData = cohortResponse?.contextId?.[classId];

        if (contextData?.present_percentage) {
          // present_percentage comes as a string from API, so parse it first
          const presentPercent = parseFloat(contextData.present_percentage);
          const percentageString = presentPercent.toFixed(1);
          setCohortPresentPercentage(percentageString);
        } else if (contextData?.absent_percentage) {
          setCohortPresentPercentage('0');
        } else {
          setCohortPresentPercentage('No Attendance');
        }
      }
    } catch (error) {
      console.error('Error fetching single center attendance:', error);
    }
  };

  // Fetch attendance for all centers
  const fetchAllCentersAttendance = async () => {
    try {
      const cohortIds = cohortsData.map((cohort) => cohort.cohortId);
      const limit = 300;
      const page = 0;
      const facets = ['contextId'];

      const fetchPromises = cohortIds.map(async (cohortId) => {
        const filters = {
          fromDate: startDateRange,
          toDate: endDateRange,
          scope: 'student',
          contextId: cohortId,
        };

        try {
          const response = await getAllCenterAttendance({
            limit,
            page,
            filters,
            facets,
          });
          return { cohortId, data: response?.data?.result };
        } catch (error) {
          console.error(`Error fetching data for cohortId ${cohortId}:`, error);
          return { cohortId, error };
        }
      });

      const results = await Promise.all(fetchPromises);
      const nameIDAttendanceArray = results
        .filter((result) => !result?.error && result?.data?.contextId)
        .map((result) => {
          const cohortId = result?.cohortId;
          const contextData = result?.data?.contextId[cohortId] || {};
          const presentPercentage = contextData.present_percentage || null;
          const absentPercentage = contextData?.absent_percentage
            ? 100 - contextData?.absent_percentage
            : null;
          const percentage = presentPercentage || absentPercentage;

          const cohortItem = cohortsData.find(
            (cohort) => cohort?.cohortId === cohortId
          );

          return {
            userId: cohortId,
            name: cohortItem ? cohortItem.name : null,
            presentPercentage: percentage ? percentage.toFixed(1) : null,
          };
        })
        .filter((item) => item.presentPercentage !== null);

      setAllCenterAttendanceData(nameIDAttendanceArray);
    } catch (error) {
      console.error('Error fetching all centers attendance:', error);
    }
  };
  // Generate calendar data based on selected academic year
  const generateCalendarData = (academicYear?: any) => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const days = [];
    const yearToUse = academicYear || selectedAcademicYear;

    // If academic year is selected, use its date range
    if (yearToUse && yearToUse.startDate && yearToUse.endDate) {
      const startDate = new Date(yearToUse.startDate);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(yearToUse.endDate);
      endDate.setHours(23, 59, 59, 999);

      // Use today as the end date if it's before the academic year end date
      const effectiveEndDate = today < endDate ? today : endDate;

      // Generate dates from effective end date backwards (up to 30 days or to start date)
      const maxDays = 30;
      let daysGenerated = 0;

      for (let i = 0; i < maxDays && daysGenerated < maxDays; i++) {
        const date = new Date(effectiveEndDate);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);

        // Only include dates within academic year range and not in the future
        if (date >= startDate && date <= today) {
          const dayName = ['S', 'M', 'T', 'W', 'T', 'F', 'S'][date.getDay()];
          const dateStr = shortDateFormat(date);
          days.push({
            date: date.getDate(),
            day: dayName,
            fullDate: date,
            dateString: dateStr,
            isToday: i === 0,
          });
          daysGenerated++;
        }
      }
    } else {
      // Fallback: Generate last 30 days from today backwards
      for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);

        // Only include dates that are not in the future
        if (date <= today) {
          const dayName = ['S', 'M', 'T', 'W', 'T', 'F', 'S'][date.getDay()];
          const dateStr = shortDateFormat(date);
          days.push({
            date: date.getDate(),
            day: dayName,
            fullDate: date,
            dateString: dateStr,
            isToday: i === 0,
          });
        }
      }
    }

    return days;
  };

  const calendarDays = useMemo(
    () => generateCalendarData(),
    [selectedAcademicYear]
  );


  // Handle date click
  const handleDateClick = (dateString: string) => {
    setSelectedDate(dateString);
  };

  // Handle calendar icon/month click to navigate to attendance-history
  const handleCalendarClick = () => {
    if (classId && classId !== 'all') {
      router.push(`/attendance-history?classId=${classId}`);
    } else {
      router.push('/attendance-history');
    }
  };

  const handlePreviousMonth = () => {
    // Navigate to attendance-history instead
    handleCalendarClick();
  };

  const handleNextMonth = () => {
    // Navigate to attendance-history instead
    handleCalendarClick();
  };
  const handleChangeYear = (event: any) => {
    const selectedYearDisplayName = event.target.value;

    // Find the selected academic year object by matching display name
    const selectedYear = academicYearsList.find((year: any) => {
      const yearDisplayName =
        year.session ||
        `${new Date(year.startDate).getFullYear()}-${new Date(
          year.endDate
        ).getFullYear()}`;
      return yearDisplayName === selectedYearDisplayName;
    });

    if (selectedYear) {
      // Set the display name
      const yearDisplayName =
        selectedYear.session ||
        `${new Date(selectedYear.startDate).getFullYear()}-${new Date(
          selectedYear.endDate
        ).getFullYear()}`;

      setYearSelect(yearDisplayName);
      setSelectedAcademicYear(selectedYear);

      // Store the academic year ID
      localStorage.setItem('academicYearId', selectedYear.id);
      setAcademicYearId(selectedYear.id);

      // Refresh cohorts data with new academic year
      const userId = localStorage.getItem('userId');
      if (userId) {
        fetchUserCohorts(userId);
      }
    }
  };
  // Handle class selection change
  const handleClassChange = (event: any) => {
    const selectedClassId = event.target.value;
    setClassId(selectedClassId);
  };
  // ADD THIS FUNCTION TO HANDLE SAVE SUCCESS
  const handleSaveSuccess = (isModified?: boolean) => {
    if (isModified) {
      showToastMessage('Attendance modified successfully', 'success');
    } else {
      showToastMessage('Attendance marked successfully', 'success');
    }
    setHandleSaveHasRun(!handleSaveHasRun);
    handleClose();
  };
  // Get current attendance status

  // const currentAttendance = getCurrentAttendanceStatus();
  // Translation function placeholder (replace with your actual t function)
  const t = (key: string) => {
    const translations: { [key: string]: string } = {
      'COMMON.MARK_CENTER_ATTENDANCE': 'Mark Center Attendance',
      'COMMON.CANCEL': 'Cancel',
      'COMMON.YES_MANUALLY': 'Yes, Manually',
      'COMMON.ARE_YOU_SURE_MANUALLY':
        'Are you sure you want to manually mark attendance?',
      'COMMON.ATTENDANCE_IS_USUALLY':
        'Attendance is usually marked automatically for remote cohorts.',
      'COMMON.USE_MANUAL':
        'Use manual marking only if automatic attendance failed.',
      'COMMON.NOTE_MANUALLY':
        'Note: Manual attendance will override automatic attendance.',
    };
    return translations[key] || key;
  };
  const clickAttendanceOverview = () => {
    if (classId && classId !== 'all') {
      router.push(`/attendance-overview?classId=${classId}`);
    } else {
      router.push('/attendance-overview');
    }
  };
  return (
    <DashboardContainer>
      {/* Header Section */}
      <HeaderBox>
        <HeaderContent>
          <Typography
            textAlign={'left'}
            fontSize={'22px'}
            m={'1.5rem 1.2rem 0.8rem'}
            color={(theme?.palette?.warning as any)?.['300']}
          >
            Dashboard
          </Typography>
          <Select
            value={yearSelect}
            onChange={handleChangeYear}
            size="small"
            disabled={loading || academicYearsList.length === 0}
            sx={{
              backgroundColor: 'white',
              borderRadius: '8px',
              fontWeight: 500,
              '& .MuiSelect-select': {
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              },
            }}
          >
            {academicYearsList.length > 0 ? (
              academicYearsList.map((year: any) => {
                const displayName =
                  year.session ||
                  `${new Date(year.startDate).getFullYear()}-${new Date(
                    year.endDate
                  ).getFullYear()}`;

                return (
                  <MenuItem key={year.id} value={displayName}>
                    {displayName}
                    {/* {year.isActive && (
                      <span style={{ color: 'green', marginLeft: '6px' }}>
                        (Active)
                      </span>
                    )} */}
                  </MenuItem>
                );
              })
            ) : (
              <MenuItem value={yearSelect}>{yearSelect}</MenuItem>
            )}
          </Select>
        </HeaderContent>
      </HeaderBox>

      {/* Main Content */}
      <MainContent>
        <ContentWrapper>
          {/* Day-wise Attendance Section */}
          <Box>
            <Box
              display={'flex'}
              flexDirection={'column'}
              padding={'1.5rem 2.2rem 1rem 1.2rem'}
            >
              <Box
                display={'flex'}
                justifyContent={'space-between'}
                alignItems={'center'}
                marginBottom={'16px'}
                marginRight={'25px'}
              >
                <Typography
                  variant="h2"
                  sx={{ fontSize: '14px' }}
                  color={(theme.palette.warning as any)['300']}
                  fontWeight={'500'}
                >
                  Day-Wise Attendance
                </Typography>

                {/* Center Selection */}
                {centersData.length > 0 && role?.toLowerCase() !== 'staff' && (
                  <Box sx={{ padding: '1rem 1.2rem 1rem' }}>
                    <FormControl
                      fullWidth
                      size="small"
                      sx={{ maxWidth: '200px' }}
                    >
                      <InputLabel>Center</InputLabel>
                      <Select
                        value={selectedCenterId}
                        label="Center"
                        onChange={handleCenterChange}
                        disabled={loading}
                      >
                        {centersData.map((center) => (
                          <MenuItem
                            key={center.centerId}
                            value={center.centerId}
                          >
                            {center.centerName}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                )}

                {/* Batch Selection */}
                {batchesData.length > 0 && role?.toLowerCase() !== 'supervisor' && role?.toLowerCase() !== 'staff' && (
                  <Box sx={{ padding: '1rem 1.2rem 1rem' }}>
                    <FormControl
                      fullWidth
                      size="small"
                      sx={{ maxWidth: '200px' }}
                    >
                      <InputLabel>Batch</InputLabel>
                      <Select
                        value={classId}
                        label="Batch"
                        onChange={handleBatchChange}
                        disabled={loading || !selectedCenterId}
                      >
                        {batchesData.map((batch) => (
                          <MenuItem key={batch.batchId} value={batch.batchId}>
                            {batch.batchName}{batch.timeSlot ? ` (${batch.timeSlot})` : ''}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                )}

                {/* Month Navigation */}
                <Box
                  display={'flex'}
                  sx={{
                    cursor: role?.toLowerCase() === 'supervisor' || role?.toLowerCase() === 'staff' ? 'default' : 'pointer',
                    color: theme.palette.secondary.main,
                    gap: '4px',
                    alignItems: 'center',
                    boxShadow: '0px 4px 8px 3px #00000026',
                    padding: '4px 8px',
                  }}
                  onClick={role?.toLowerCase() === 'supervisor' || role?.toLowerCase() === 'staff' ? undefined : handleCalendarClick}
                >
                  {/* <Button
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePreviousMonth();
                    }}
                    sx={{ minWidth: 'auto', padding: '4px' }}
                  >
                    ‹
                  </Button> */}
                  <Typography
                    style={{
                      fontWeight: '500',
                      minWidth: '100px',
                      textAlign: 'center',
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (role?.toLowerCase() !== 'supervisor' && role?.toLowerCase() !== 'staff') {
                         handleCalendarClick();
                      }
                    }}
                  >
                    {currentMonth} {currentYear}
                  </Typography>
                  {/* <Button
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNextMonth();
                    }}
                    sx={{ minWidth: 'auto', padding: '4px' }}
                  >
                    ›
                  </Button> */}
                  <CalendarMonthIcon
                    sx={{ fontSize: '12px', ml: 0.5, cursor: 'pointer' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCalendarClick();
                    }}
                  />
                </Box>
              </Box>
              <Box>
                <Typography variant="caption" color="#666">
                  Last 30 Days
                </Typography>
              </Box>
              {/* Horizontal Calendar Section */}
              <CalendarContainer>
                {/* Horizontal Scroll Calendar */}
                <HorizontalCalendarScroll>
                  {calendarDays.map((dayData, index) => {
                    const dateAttendance =
                      dayWiseAttendanceData[dayData.dateString] || null;
                    const isSelected = dayData.dateString === selectedDate;
                    const isMarked =
                      dateAttendance && dateAttendance.totalCount > 0;
                    const attendancePercentage =
                      dateAttendance?.percentage || 0;

                    // Check if this date is today
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const dayDate = new Date(dayData.fullDate);
                    dayDate.setHours(0, 0, 0, 0);
                    const isToday = dayDate.getTime() === today.getTime();

                    return (
                      <Box
                        key={index}
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '2px',
                        }}
                      >
                        {/* Day character or "Today" text above box */}
                        <Typography
                          sx={{
                            fontSize: '0.7em',
                            fontWeight: '600',
                            color: '#666',

                            // color: isToday ? "#ff9800" : "#666",
                            lineHeight: 1,
                            marginBottom: '2px',
                          }}
                        >
                          {isToday ? 'Today' : dayData.day}
                        </Typography>
                        {/* Calendar Cell with date and circular progress inside */}
                        <CalendarCell
                          onClick={() => handleDateClick(dayData.dateString)}
                          sx={{
                            backgroundColor: isSelected
                              ? theme.palette.primary.light
                              : '#fff',
                          }}
                        >
                          {/* Date number at top */}
                          <DateNumber variant="body2">
                            {dayData.date}
                          </DateNumber>
                          {/* Circular Progress inside box below date when marked, or "Not marked" for selected date when not marked */}
                          {isMarked ? (
                            <Box
                              sx={{
                                position: 'relative',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '20px',
                                height: '20px',
                                marginTop: '2px',
                              }}
                            >
                              <CircularProgress
                                variant="determinate"
                                value={
                                  (role === 'Staff' || role === 'Supervisor') &&
                                  dateAttendance?.absentCount > 0 &&
                                  attendancePercentage === 0
                                    ? 100
                                    : attendancePercentage
                                }
                                size={20}
                                thickness={10}
                                sx={{
                                  color:
                                    (role === 'Staff' ||
                                      role === 'Supervisor') &&
                                    dateAttendance?.absentCount > 0 &&
                                    attendancePercentage === 0
                                      ? '#f44336'
                                      : '#4caf50',
                                  position: 'absolute',
                                  '& .MuiCircularProgress-circle': {
                                    strokeLinecap: 'round',
                                  },
                                }}
                              />
                            </Box>
                          ) : null}
                          {/* // ) : isSelected ? (
                          //   // Show "Not marked" text only for selected date when not marked
                          //   <Typography
                          //     sx={{
                          //       fontSize: "0.55em",
                          //       fontWeight: "400",
                          //       color: "#999",
                          //       marginTop: "2px",
                          //       textAlign: "center",
                          //       minHeight: "20px",
                          //       display: "flex",
                          //       alignItems: "center",
                          //       justifyContent: "center",
                          //     }}
                          //   >
                          //     Not marked
                          //   </Typography>
                          // ) : null} */}
                        </CalendarCell>
                      </Box>
                    );
                  })}
                </HorizontalCalendarScroll>
              </CalendarContainer>
            </Box>

            <Box sx={{ padding: '0 20px' }}>
              <Divider sx={{ borderBottomWidth: '0.1rem' }} />
            </Box>
          </Box>
          {/* Student Attendance Mark Button - Hidden for Staff and Supervisor */}
          {(() => {
            // const role = localStorage.getItem('roleName');
            if (role === 'Staff' || role === 'Supervisor') {
              return null;
            }
            return (
              <Box
                height={'auto'}
                width={'auto'}
                padding={'1rem'}
                borderRadius={'1rem'}
                bgcolor={'#4A4640'}
                textAlign={'left'}
                margin={'15px 35px 15px 25px'}
                sx={{ opacity: classId === 'all' ? 0.5 : 1 }}
                justifyContent={'space-between'}
                display={'flex'}
                alignItems={'center'}
              >
                <Box display="flex" alignItems="center" gap="12px">
                  {currentAttendance !== 'notMarked' &&
                    currentAttendance !== 'futureDate' && (
                      <>
                        {/* CircularProgressbar */}
                        <Box sx={{ width: '30px', height: '30px' }}>
                          <CircularProgressbar
                            value={
                              attendanceData?.numberOfCohortMembers &&
                              attendanceData.numberOfCohortMembers !== 0
                                ? (attendanceData.presentCount /
                                    attendanceData.numberOfCohortMembers) *
                                  100
                                : 0
                            }
                            styles={buildStyles({
                              pathColor: '#4caf50',
                              trailColor: '#E6E6E6',
                              strokeLinecap: 'round',
                              backgroundColor: '#fff',
                            })}
                            strokeWidth={20}
                            background
                            backgroundPadding={6}
                          />
                        </Box>
                        {/* Attendance Text */}
                        <Box>
                          <Typography
                            sx={{
                              fontSize: '12px',
                              fontWeight: '600',
                              color: '#F4F4F4',
                            }}
                            variant="h6"
                          >
                            {attendanceData?.numberOfCohortMembers &&
                            attendanceData.numberOfCohortMembers !== 0
                              ? (
                                  (attendanceData.presentCount /
                                    attendanceData.numberOfCohortMembers) *
                                  100
                                ).toFixed(2)
                              : '0'}
                            % Attendance
                          </Typography>
                          <Typography
                            sx={{
                              fontSize: '12px',
                              fontWeight: '600',
                              color: '#F4F4F4',
                            }}
                            variant="h6"
                          >
                            ({attendanceData.presentCount}/
                            {attendanceData.numberOfCohortMembers} present)
                          </Typography>
                        </Box>
                      </>
                    )}
                  {currentAttendance === 'notMarked' && (
                    <Typography
                      sx={{
                        color: (theme.palette.warning as any).A400,
                      }}
                      fontSize={'0.8rem'}
                    >
                      Not started
                    </Typography>
                  )}
                  {currentAttendance === 'futureDate' && (
                    <Typography
                      sx={{
                        color: (theme.palette.warning as any)['300'],
                      }}
                      fontSize={'0.8rem'}
                      fontStyle={'italic'}
                      fontWeight={'500'}
                    >
                      Future date - can't mark
                    </Typography>
                  )}
                </Box>
                <Button
                  className="btn-mark-width"
                  variant="contained"
                  color="primary"
                  sx={{
                    minWidth: '84px',
                    height: '2.5rem',
                    padding: theme.spacing(1),
                    fontWeight: '500',
                  }}
                  disabled={classId === 'all' || !isSelectedDateWithinAllowedWindow}
                  onClick={handleRemoteSession}
                >
                  {currentAttendance === 'notMarked' ? 'Mark' : 'Modify'}
                </Button>
              </Box>
            );
          })()}
          {/* Self Attendance Card */}
          {ShowSelfAttendance && (
            <Box
              height={'auto'}
              width={'auto'}
              padding={'1rem'}
              borderRadius={'1rem'}
              bgcolor={'#4A4640'}
              textAlign={'left'}
              margin={'15px 35px 15px 25px'}
              sx={{ opacity: classId === 'all' ? 0.5 : 1 }}
              justifyContent={'space-between'}
              display={'flex'}
              alignItems={'center'}
            >
              <Box display="flex" alignItems="center" gap="12px">
                {selfAttendanceData?.length > 0 ? (
                  <Box display={'flex'} alignItems={'center'}>
                    <Typography
                      sx={{
                        color: (theme.palette.warning as any).A400,
                      }}
                      fontSize={'0.9rem'}
                    >
                      {selfAttendanceData[0]?.attendance?.toLowerCase() ===
                      ATTENDANCE_ENUM.PRESENT
                        ? 'Present'
                        : selfAttendanceData[0]?.attendance?.toLowerCase() ===
                          ATTENDANCE_ENUM.ABSENT
                        ? 'Absent'
                        : selfAttendanceData[0]?.attendance}
                    </Typography>
                    {selfAttendanceData[0]?.attendance?.toLowerCase() ===
                    ATTENDANCE_ENUM.PRESENT ? (
                      <CheckCircleOutlineIcon
                        fontSize="small"
                        sx={{
                          color: theme.palette.success.main,
                          marginLeft: '4px',
                        }}
                      />
                    ) : selfAttendanceData[0]?.attendance?.toLowerCase() ===
                      ATTENDANCE_ENUM.ABSENT ? (
                      <WarningAmberIcon
                        fontSize="small"
                        sx={{
                          color: theme.palette.error.main,
                          marginLeft: '4px',
                        }}
                      />
                    ) : null}
                  </Box>
                ) : (
                  <Typography
                    sx={{
                      color: (theme.palette.warning as any).A400,
                    }}
                    fontSize={'0.8rem'}
                  >
                    Not Marked For Self
                  </Typography>
                )}
              </Box>
              <Button
                className="btn-mark-width"
                variant="contained"
                color="primary"
                sx={{
                  minWidth: '84px',
                  height: '2.5rem',
                  padding: theme.spacing(1),
                  fontWeight: '500',
                }}
                disabled={classId === 'all'}
                onClick={handleSelfAttendanceButtonClick}
              >
                {selfAttendanceData?.length > 0 &&
                (selfAttendanceData[0]?.attendance?.toLowerCase() ===
                  ATTENDANCE_ENUM.PRESENT ||
                  selfAttendanceData[0]?.attendance?.toLowerCase() ===
                    ATTENDANCE_ENUM.ABSENT)
                  ? 'Modify For Self'
                  : 'Mark For Self'}
              </Button>
            </Box>
          )}
          {/* Status Cards Section - Hidden for Staff and Supervisor */}
          {(() => {
            // const role = localStorage.getItem('roleName');
            if (role === 'Staff' || role === 'Supervisor') {
              return null;
            }
            return (
              <Box
                sx={{
                  padding: '1rem 1.2rem',
                }}
              >
                <Box
                  mb={2}
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  {/* Left Section (Overview + Last 7 Days) */}
                  <Box>
                    <Typography variant="body2" fontWeight="600" color="#333">
                      Overview
                    </Typography>
                    <Typography variant="caption" color="#666">
                      Last 7 Days {dateRange}
                    </Typography>
                  </Box>

                  {/* Right Section (More Details link) */}
                  <Link href="/attendance-overview" legacyBehavior>
                    <a
                      onClick={(e) => {
                        e.preventDefault();
                        clickAttendanceOverview();
                      }}
                      style={{
                        color: '#1890ff',
                        textDecoration: 'none',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'pointer',
                      }}
                    >
                      More Details
                    </a>
                  </Link>
                </Box>
                {loading ? (
                  <Typography>Loading...</Typography>
                ) : (
                  <Grid container spacing={2}>
                    {classId && classId !== 'all' ? (
                      <>
                        {/* Single Center View */}
                        <Grid item xs={12} md={4}>
                          <StatusCard>
                            <CardContent sx={{ pt: 0 }}>
                              <Box textAlign="center" mb={2} p={2}>
                                <Typography fontSize={'13px'} color="#000000">
                                  Center Attendance
                                </Typography>
                                <Typography
                                  fontWeight="500"
                                  color="rgb(124, 118, 111)"
                                  sx={{ fontSize: '16px', lineHeight: 1 }}
                                >
                                  {cohortPresentPercentage === 'No Attendance'
                                    ? cohortPresentPercentage
                                    : `${cohortPresentPercentage}%`}
                                </Typography>
                              </Box>
                            </CardContent>
                          </StatusCard>
                        </Grid>

                        <Grid item xs={12} md={8}>
                          <StatusCard>
                            <CardContent sx={{ pt: 0 }}>
                              <Box textAlign="center" mb={2} p={2}>
                                <Typography fontSize={'13px'} color="#000000">
                                  Low Attendance Learners
                                </Typography>
                                <Typography
                                  fontWeight="500"
                                  color="rgb(124, 118, 111)"
                                  sx={{ fontSize: '16px', lineHeight: 1 }}
                                >
                                  {Array.isArray(lowAttendanceLearnerList) &&
                                  lowAttendanceLearnerList.length > 0 ? (
                                    <>
                                      {lowAttendanceLearnerList
                                        .slice(0, 2)
                                        .join(', ')}
                                      {lowAttendanceLearnerList.length > 2 && (
                                        <>
                                          {' '}
                                          and{' '}
                                          <Link
                                            href="/attendance-overview"
                                            legacyBehavior
                                          >
                                            <a
                                              onClick={(e) => {
                                                e.preventDefault();
                                                clickAttendanceOverview();
                                              }}
                                              style={{
                                                color: '#1890ff',
                                                textDecoration: 'none',
                                                fontWeight: '500',
                                                cursor: 'pointer',
                                              }}
                                            >
                                              more
                                            </a>
                                          </Link>
                                        </>
                                      )}
                                    </>
                                  ) : (
                                    'No Learners with Low Attendance'
                                  )}
                                </Typography>
                              </Box>
                            </CardContent>
                          </StatusCard>
                        </Grid>
                      </>
                    ) : (
                      /* All Centers View */
                      allCenterAttendanceData.map((item: any) => (
                        <Grid item xs={12} md={6} key={item.userId}>
                          <StatusCard>
                            <CardContent sx={{ pt: 0 }}>
                              <Box textAlign="center" mb={2} p={2}>
                                <Typography
                                  fontSize={'11px'}
                                  color="rgb(124, 118, 111)"
                                >
                                  {item.name}
                                </Typography>
                                <Typography
                                  fontWeight="700"
                                  color="#000000"
                                  sx={{ fontSize: '16px', lineHeight: 1 }}
                                >
                                  {item.presentPercentage}%
                                </Typography>
                              </Box>
                            </CardContent>
                          </StatusCard>
                        </Grid>
                      ))
                    )}
                  </Grid>
                )}
              </Box>
            );
          })()}
        </ContentWrapper>
      </MainContent>
      {open && (
        <MarkBulkAttendance
          open={open}
          onClose={handleClose}
          classId={classId}
          selectedDate={new Date(selectedDate)}
          onSaveSuccess={handleSaveSuccess}
          memberList={attendanceData?.cohortMemberList}
          presentCount={attendanceData?.presentCount}
          absentCount={attendanceData?.absentCount}
          numberOfCohortMembers={attendanceData?.numberOfCohortMembers}
          dropoutMemberList={attendanceData?.dropoutMemberList}
          dropoutCount={attendanceData?.dropoutCount}
          bulkStatus={attendanceData?.bulkAttendanceStatus}
        />
      )}
      {/* Modal Components */}
      {isRemoteCohort && (
        <ModalComponent
          open={isRemoteCohort}
          heading={t('COMMON.MARK_CENTER_ATTENDANCE')}
          secondaryBtnText={t('COMMON.CANCEL')}
          btnText={t('COMMON.YES_MANUALLY')}
          selectedDate={selectedDate ? new Date(selectedDate) : undefined}
          onClose={handleClose}
          handlePrimaryAction={() => handleModalToggle()}
        >
          <Box sx={{ padding: '0 16px' }}>
            <Box
              sx={{
                color: (theme?.palette?.warning as any)?.['300'],
                fontSize: '16px',
                fontWeight: '500',
              }}
            >
              {t('COMMON.ARE_YOU_SURE_MANUALLY')}
            </Box>
            <Box
              sx={{
                color: (theme?.palette?.warning as any)?.['300'],
                fontSize: '14px',
                fontWeight: '400',
                mt: '10px',
              }}
            >
              {t('COMMON.ATTENDANCE_IS_USUALLY')}
            </Box>
            <Box
              sx={{
                color: (theme?.palette?.warning as any)?.['300'],
                fontSize: '14px',
                fontWeight: '400',
                mt: '10px',
              }}
            >
              {t('COMMON.USE_MANUAL')}
            </Box>
            <Box
              sx={{
                color: (theme?.palette?.warning as any)?.['300'],
                fontSize: '14px',
                fontWeight: '500',
                mt: '10px',
              }}
            >
              {t('COMMON.NOTE_MANUALLY')}
            </Box>
          </Box>
        </ModalComponent>
      )}
      {/* Location Permission Modal */}
      {isLocationModalOpen && (
        <LocationModal
          isOpen={isLocationModalOpen}
          onClose={() => setIsLocationModalOpen(false)}
          onConfirm={requestLocationPermission}
        />
        // <ModalComponent
        //   open={isLocationModalOpen}
        //   heading="Device location is needed to mark your attendance"
        //   secondaryBtnText="No, go back"
        //   btnText="Turn On"
        //   onClose={() => {
        //     setIsLocationModalOpen(false);
        //   }}
        //   handlePrimaryAction={requestLocationPermission}
        //   handleSecondaryAction={() => {
        //     setIsLocationModalOpen(false);
        //   }}
        // >
        //   <Box sx={{ padding: "0 16px" }}>
        //     <Typography
        //       sx={{
        //         color: (theme?.palette?.warning as any)?.["300"],
        //         fontSize: "14px",
        //         fontWeight: "400",
        //       }}
        //     >
        //       We need your device location to verify your attendance. Please
        //       allow location access when prompted.
        //     </Typography>
        //   </Box>
        // </ModalComponent>
      )}
      {/* Self Attendance Modal */}
      {isSelfAttendanceModalOpen && (
        <ModalComponent
          open={isSelfAttendanceModalOpen}
          heading="Mark Self Attendance"
          secondaryBtnText="Cancel"
          btnText="Mark"
          selectedDate={selectedDate ? new Date(selectedDate) : undefined}
          onClose={() => {
            setIsSelfAttendanceModalOpen(false);
            const currentAttendance = selfAttendanceData?.[0]?.attendance;
            setSelectedSelfAttendance(
              currentAttendance ? currentAttendance.toLowerCase() : null
            );
            setAbsentReason('');
            setWorkLocation('');
            setAttendanceComment('');
          }}
          primaryBtnDisabled={
            (() => {
              if (!selectedSelfAttendance) return true;
              if (selectedSelfAttendance === ATTENDANCE_ENUM.ABSENT && !absentReason) return true;
              if (selectedSelfAttendance === ATTENDANCE_ENUM.PRESENT) {
                if (role === 'Staff' && !workLocation) return true;
                if ((role === 'Teacher' || role === 'Supervisor') && !attendanceComment) return true;
              }
              return false;
            })()
          }
          handlePrimaryAction={() => {
            if (selectedSelfAttendance) {
              handleMarkSelfAttendance();
            }
          }}
        >
          <Box sx={{ py: 2 }}>
            {/* Present Option */}
            <Box
              onClick={() => setSelectedSelfAttendance(ATTENDANCE_ENUM.PRESENT)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 2.5,
                mb: 2,
                // borderRadius: '12px',
                // border: `2px solid ${
                //   selectedSelfAttendance === ATTENDANCE_ENUM.PRESENT
                //     ? (theme.palette.warning as any).A200
                //     : '#e0e0e0'
                // }`,
                // backgroundColor:
                //   selectedSelfAttendance === ATTENDANCE_ENUM.PRESENT
                //     ? '#fffbe6' // Light warning background
                //     : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': {
                  borderColor: (theme.palette.warning as any).A200,
                  backgroundColor: '#fffdf0',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <CheckCircleOutlineIcon
                  sx={{
                    fontSize: 28,
                    color:
                      selectedSelfAttendance === ATTENDANCE_ENUM.PRESENT
                        ? '#fdbe16'
                        : (theme.palette.warning as any).A200,
                  }}
                />
                <Typography
                  component="div"
                  sx={{
                    fontSize: '16px',
                    fontWeight: 600,
                    color:
                      selectedSelfAttendance === ATTENDANCE_ENUM.PRESENT
                        ? (theme.palette.warning as any).A200
                        : '#424242',
                  }}
                >
                  Present
                </Typography>
              </Box>
              <Radio
                onChange={() =>
                  setSelectedSelfAttendance(ATTENDANCE_ENUM.PRESENT)
                }
                value={ATTENDANCE_ENUM.PRESENT}
                checked={selectedSelfAttendance === ATTENDANCE_ENUM.PRESENT}
                // sx={{
                //   color: (theme.palette.warning as any).A200,
                //   '&.Mui-checked': {
                //     color: (theme.palette.warning as any).A200,
                //   },
                // }}
              />
            </Box>

            {/* Absent Option */}
            <Box
              onClick={() => setSelectedSelfAttendance(ATTENDANCE_ENUM.ABSENT)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                p: 2.5,
                // borderRadius: '12px',
                // border: `2px solid ${
                //   selectedSelfAttendance === ATTENDANCE_ENUM.ABSENT
                //     ? theme.palette.error.main
                //     : '#e0e0e0'
                // }`,
                // backgroundColor:
                //   selectedSelfAttendance === ATTENDANCE_ENUM.ABSENT
                //     ? '#ffebee' // Light error background
                //     : 'transparent',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                // '&:hover': {
                //   borderColor: theme.palette.error.main,
                //   backgroundColor: '#fff5f5',
                // },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <WarningAmberIcon
                  sx={{
                    fontSize: 28,
                    color:
                      selectedSelfAttendance === ATTENDANCE_ENUM.ABSENT
                        ? theme.palette.error.main
                        : '#9e9e9e',
                  }}
                />
                <Typography
                  component="div"
                  sx={{
                    fontSize: '16px',
                    fontWeight: 600,
                    color:
                      selectedSelfAttendance === ATTENDANCE_ENUM.ABSENT
                        ? (theme.palette.warning as any).A200
                        : '#424242',
                  }}
                >
                  Absent
                </Typography>
              </Box>
              <Radio
                onChange={() =>
                  setSelectedSelfAttendance(ATTENDANCE_ENUM.ABSENT)
                }
                value={ATTENDANCE_ENUM.ABSENT}
                checked={selectedSelfAttendance === ATTENDANCE_ENUM.ABSENT}
                sx={{
                  color: (theme.palette.warning as any).A200,
                  '&.Mui-checked': {
                    color: theme.palette.error.main,
                  },
                }}
              />
            </Box>
            {selectedSelfAttendance === ATTENDANCE_ENUM.ABSENT && (
              <Box sx={{ p: 2.5, pt: 0 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Absent Reason</InputLabel>
                  <Select
                    value={absentReason}
                    label="Absent Reason"
                    onChange={(e) => setAbsentReason(e.target.value)}
                  >
                    {absentReasonOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            )}

            {/* Work Location and Comment - Only for Present */}
            {selectedSelfAttendance === ATTENDANCE_ENUM.PRESENT && (() => {
              // const role = localStorage.getItem('roleName');
              return (
                <>
                  {/* Work Location Dropdown - Only for Staff */}
                  {role === 'Staff' && (
                    <Box sx={{ p: 2.5, pt: 2.5 }}>
                      <FormControl fullWidth size="small">
                        <InputLabel>Work Location</InputLabel>
                        <Select
                          value={workLocation}
                          label="Work Location"
                          onChange={(e) => setWorkLocation(e.target.value)}
                        >
                          {workLocationOptions.map((option) => (
                            <MenuItem key={option.value} value={option.value}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Box>
                  )}

                  {/* Comment Autocomplete Field - Only for Teacher */}
                  {role === 'Teacher' && (
                    <Box sx={{ p: 2.5, pt: 2.5 }}>
                      <Autocomplete
                        freeSolo
                        fullWidth
                        options={attendanceCommentOptions}
                        value={attendanceComment}
                        onChange={(event, newValue) => {
                          setAttendanceComment(newValue || '');
                        }}
                        onInputChange={(event, newInputValue) => {
                          setAttendanceComment(newInputValue);
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            size="small"
                            label="Comment"
                            multiline
                            rows={3}
                            placeholder="Type to search or add custom comment..."
                          />
                        )}
                      />
                    </Box>
                  )}

                  {/* Plain Comment Field - For Supervisor */}
                  {role === 'Supervisor' && (
                    <Box sx={{ p: 2.5, pt: 2.5 }}>
                      <TextField
                        fullWidth
                        size="small"
                        label="Comment"
                        multiline
                        rows={3}
                        value={attendanceComment}
                        onChange={(e) => setAttendanceComment(e.target.value)}
                        placeholder="Add a comment..."
                      />
                    </Box>
                  )}
                </>
              );
            })()}
          </Box>
        </ModalComponent>
      )}
      <ToastContainer />
    </DashboardContainer>
  );
};

export default SimpleTeacherDashboard;