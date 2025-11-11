/* eslint-disable react/no-unescaped-entities */
"use client";

import React, { useState, useEffect } from "react";
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
  // Link,
  styled,
} from "@mui/material";
import Link from "next/link";
import { useRouter } from "next/router";
import { format, isAfter, isValid, parse, startOfDay } from "date-fns";
import { useTheme } from "@mui/material/styles";
import ArrowForwardSharpIcon from "@mui/icons-material/ArrowForwardSharp";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import PeopleIcon from "@mui/icons-material/People";
import {
  classesMissedAttendancePercentList,
  getAllCenterAttendance,
  getCohortAttendance,
} from "../services/AttendanceService";
import { getCohortList } from "../services/CohortServices";
import { getMyCohortMemberList } from "../services/MyClassDetailsService";
import { getUserDetails } from "../services/ProfileService";
import {
  AttendancePercentageProps,
  CohortAttendancePercentParam,
  CohortMemberList,
  CustomField,
  ICohort,
} from "../utils/interfaces";
import { getTodayDate, shortDateFormat } from "../utils/Helper";
import ModalComponent from "../components/Modal";
import MarkBulkAttendance from "../components/MarkBulkAttendance"; // ADD THIS IMPORT
import { showToastMessage } from "../components/Toastify"; // ADD THIS IMPORT
import { fetchAttendanceDetails } from "../components/AttendanceDetails";
// Styled components
const DashboardContainer = styled(Box)({
  minHeight: "100vh",
  backgroundColor: "#f5f5f5",
  marginRight: "20px",
});

const HeaderBox = styled(Box)({
  display: "flex",
  justifyContent: "center",
});

const HeaderContent = styled(Box)(({ theme }) => ({
  display: "flex",
  width: "100%",
  justifyContent: "space-between",
  alignItems: "center",
  backgroundColor: theme.palette.warning.main,
  padding: "1rem 1.5rem",
}));

const MainContent = styled(Box)({
  display: "flex",
  justifyContent: "center",
});

const ContentWrapper = styled(Box)({
  paddingBottom: "25px",
  width: "100%",
  background: "linear-gradient(180deg, #fffdf7 0%, #f8efda 100%)",
  borderRadius: "8px",
});

const StatusCard = styled(Card)(({ theme }) => ({
  height: "100%",
  borderRadius: "8px",
  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  border: "1px solid #e0e0e0",
  "& .MuiCardContent-root": {
    padding: "16px",
  },
}));

const CardHeader = styled(Box)({
  display: "flex",
  alignItems: "center",
  marginBottom: "16px",
});

const CardIcon = styled(Box)({
  fontSize: "18px",
  marginRight: "8px",
  padding: "6px",
  borderRadius: "4px",
});

const CalendarContainer = styled(Box)({
  marginTop: "16px",
});

const HorizontalCalendarScroll = styled(Box)({
  display: "flex",
  overflowX: "auto",
  gap: "8px",
  padding: "8px 0",
  "&::-webkit-scrollbar": {
    height: "4px",
  },
  "&::-webkit-scrollbar-track": {
    background: "#f1f1f1",
    borderRadius: "2px",
  },
  "&::-webkit-scrollbar-thumb": {
    background: "#c1c1c1",
    borderRadius: "2px",
  },
  "&::-webkit-scrollbar-thumb:hover": {
    background: "#a8a8a8",
  },
});

const CalendarCell = styled(Box)(({ theme }) => ({
  position: "relative",
  height: "3rem",
  width: "3rem",
  minWidth: "3rem",
  padding: "6px",
  overflow: "hidden",
  fontSize: "0.875em",
  border: `1px solid ${theme.palette.warning.main}`,
  borderRadius: "4px",
  cursor: "pointer",
  transition: "0.25s ease-out",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: "#fff",
  "&:hover": {
    backgroundColor: "#f5f5f5",
  },
}));

const DayHeader = styled(Typography)({
  fontSize: "0.75em",
  fontWeight: "600",
  color: "#666",
  lineHeight: 1,
});

const DateNumber = styled(Typography)({
  fontSize: "0.875em",
  fontWeight: "500",
  lineHeight: 1,
  marginTop: "2px",
});

const LearnerTag = styled(Box)({
  display: "inline-block",
  backgroundColor: "#fffbe6",
  border: "1px solid #ffe58f",
  color: "#faad14",
  borderRadius: "4px",
  padding: "4px 8px",
  fontSize: "12px",
  margin: "2px",
});


const SimpleTeacherDashboard = () => {
  const theme = useTheme();
  const [classId, setClassId] = useState("1");
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [yearSelect, setYearSelect] = useState("2024-2025 (Active)");
  const [cohortsData, setCohortsData] = useState<Array<ICohort>>([]);
  const [centersData, setCentersData] = useState<Array<any>>([]);
  const [batchesData, setBatchesData] = useState<Array<any>>([]);
  const [selectedCenterId, setSelectedCenterId] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [open, setOpen] = useState(false);
  const [isRemoteCohort, setIsRemoteCohort] = useState(false);
  const [cohortPresentPercentage, setCohortPresentPercentage] =
    useState("No Attendance");
  const [lowAttendanceLearnerList, setLowAttendanceLearnerList] = useState<any>(
    "No Learners with Low Attendance"
  );
  const [allCenterAttendanceData, setAllCenterAttendanceData] = useState<any>(
    []
  );
  const [attendanceStats, setAttendanceStats] = useState<any>(null);
  const [startDateRange, setStartDateRange] = useState("");
  const [endDateRange, setEndDateRange] = useState("");
  const [dateRange, setDateRange] = useState("");
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
    bulkAttendanceStatus: "",
  });
  const [handleSaveHasRun, setHandleSaveHasRun] = useState(false);
  const [academicYearId, setAcademicYearId] = useState<string | null>(null);
  const router = useRouter();
  // Get current month and year
  const currentMonth = selectedMonth.toLocaleString("default", {
    month: "long",
  });
  const currentYear = selectedMonth.getFullYear();
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
    console.log("Updating attendance data:", data);
    setAttendanceData(data);
  };
  const handleRemoteSession = () => {
    try {
      // Check if it's a remote cohort (you might need to adjust this logic based on your data)
      const teacherApp = JSON.parse(
        localStorage.getItem("teacherApp") ?? "null"
      );
      const cohort = teacherApp?.state?.cohorts?.find?.(
        (c: any) => c.cohortId === classId
      );
      const REMOTE_COHORT_TYPE = "REMOTE" as const;

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
      console.error("Error parsing teacher app data:", error);
      handleModalToggle();
    }
  };
  // Initialize user and data
  useEffect(() => {
    const initializeDashboard = async () => {
      if (typeof window !== "undefined" && window.localStorage) {
        const token = localStorage.getItem("token");
        const storedUserId = localStorage.getItem("userId");
        const storedAcademicYearId = localStorage.getItem("academicYearId");
        if (token) {
          setIsAuthenticated(true);
          setUserId(storedUserId);
          setAcademicYearId(storedAcademicYearId);
          await fetchUserCohorts(storedUserId);
        } else {
          router.push("/login");
        }
      }
    };

    initializeDashboard();
  }, []);


  // Fetch user cohorts
  const fetchUserCohorts = async (userId: string | null) => {
    if (!userId) return;

    try {
      setLoading(true);
      const headers: { [key: string]: string } = {};
      if (academicYearId) {
        headers["academicYearId"] = academicYearId;
      }
      const response = await getCohortList(userId, {
        customField: "true",
        children: "true",
      });
      const userDetails = await getUserDetails(userId, true);
      console.log("getCohortList==", response);
      if (response && response.length > 0) {
        setCohortsData(response);
        setClassId(response[0]?.cohortId || "");
        // Extract centers (parent cohorts)
        const centers = response.map((center: any) => ({
          centerId: center.cohortId,
          centerName: center.cohortName,
          childData: center.childData || [],
        }));
        setCentersData(centers);
        if (centers.length > 0) {
          const defaultCenter = centers[0];
          setSelectedCenterId(defaultCenter.centerId);

          // Extract batches for the default center
          const batches = defaultCenter.childData.map((batch: any) => ({
            batchId: batch.cohortId,
            batchName: batch.name,
            parentId: batch.parentId,
          }));
          setBatchesData(batches);

          // Set default batch if available
          if (batches.length > 0) {
            setClassId(batches[0].batchId);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching cohorts:", error);
    } finally {
      setLoading(false);
    }
  };
  // Handle center selection change
  const handleCenterChange = (event: any) => {
    const centerId = event.target.value;
    setSelectedCenterId(centerId);

    // Find the selected center and get its batches
    const selectedCenter = centersData.find(
      (center) => center.centerId === centerId
    );
    if (selectedCenter) {
      const batches = selectedCenter.childData.map((batch: any) => ({
        batchId: batch.cohortId,
        batchName: batch.name,
        parentId: batch.parentId,
      }));
      setBatchesData(batches);

      // Reset batch selection
      if (batches.length > 0) {
        setClassId(batches[0].batchId);
      } else {
        setClassId("");
      }
    }
  };

  // Handle batch selection change
  const handleBatchChange = (event: any) => {
    const batchId = event.target.value;
    setClassId(batchId);
    console.log("Selected batch ID:", batchId); // This will be passed to cohortmember/list API
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
      const startDayMonth = startRangeDate.toLocaleString("default", {
        month: "long",
      });
      const endDay = endRangeDate.getDate();
      const endDayMonth = endRangeDate.toLocaleString("default", {
        month: "long",
      });

      if (startDayMonth === endDayMonth) {
        setDateRange(`(${startDay}-${endDay} ${endDayMonth})`);
      } else {
        setDateRange(`(${startDay} ${startDayMonth}-${endDay} ${endDayMonth})`);
      }

      const formattedStartDate = shortDateFormat(startRangeDate);
      const formattedEndDate = shortDateFormat(endRangeDate);
      console.log("Setting date range:", {
        startDate: formattedStartDate,
        endDate: formattedEndDate,
        startRangeDate,
        endRangeDate,
      });
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
      return "futureDate";
    }

    // Check if attendance is marked for the selected date
    const isAttendanceMarked =
      attendanceData.presentCount > 0 || attendanceData.absentCount > 0;

    console.log("Attendance Check:", {
      selectedDate,
      presentCount: attendanceData.presentCount,
      absentCount: attendanceData.absentCount,
      isAttendanceMarked,
    });

    return isAttendanceMarked ? "marked" : "notMarked";
  };

  const currentAttendance = getCurrentAttendanceStatusValue();
  // const pathColor = determinePathColor(presentPercentage);

  // Fetch attendance data when classId changes
  useEffect(() => {
    console.log("useEffect triggered - fetching attendance data", {
      classId,
      selectedDate,
      handleSaveHasRun,
    });
    if (classId && classId !== "all") {
      fetchAttendanceData();
    }
  }, [classId, selectedDate, startDateRange, endDateRange, handleSaveHasRun]);

  // Main function to fetch attendance data
  const fetchAttendanceData = async () => {
    if (!classId) return;

    setLoading(true);
    try {
      if (classId !== "all") {
        await fetchSingleCenterAttendance();
      } else {
        await fetchAllCentersAttendance();
      }
    } catch (error) {
      console.error("Error fetching attendance data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch attendance for single center
  const fetchSingleCenterAttendance = async () => {
    console.log("Class id---", classId);
    try {
      // Fetch cohort member list
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
      console.log("Cohort member response:", resp);
      if (resp) {
        const nameUserIdArray = resp
          ?.map((entry: any) => ({
            userId: entry.userId,
            name: entry.firstName,
            memberStatus: entry.status,
            createdAt: entry.createdAt,
            updatedAt: entry.updatedAt,
            userName: entry.username,
          }))
          .filter((member: any) => {
            const createdAt = new Date(member.createdAt);
            createdAt.setHours(0, 0, 0, 0);
            const updatedAt = new Date(member.updatedAt);
            updatedAt.setHours(0, 0, 0, 0);
            const currentDate = new Date(selectedDate);
            currentDate.setHours(0, 0, 0, 0);

            if (
              member.memberStatus === "ARCHIVED" &&
              updatedAt <= currentDate
            ) {
              return false;
            }
            return createdAt <= new Date(selectedDate);
          });
        console.log("Filtered members:", nameUserIdArray);
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
        console.log("Fetching low attendance learners with date range:", {
          fromDate,
          toDate,
          startDateRange,
          endDateRange,
        });
        const attendanceFilters = {
          contextId: classId,
          fromDate,
          toDate,
          scope: "student",
        };

        const attendanceResponse = await classesMissedAttendancePercentList({
          filters: attendanceFilters,
          facets: ["userId"],
          sort: ["absent_percentage", "asc"],
        });

        console.log("Low Attendance API Response:", attendanceResponse);
        console.log("Low Attendance Structure Check:", {
          hasData: !!attendanceResponse?.data,
          hasResult: !!attendanceResponse?.data?.result,
          hasUserId: !!attendanceResponse?.data?.result?.userId,
          userIdKeys: attendanceResponse?.data?.result?.userId
            ? Object.keys(attendanceResponse.data.result.userId).length
            : 0,
        });
        const attendanceData = attendanceResponse?.data?.result?.userId;
        if (attendanceData) {
          console.log("Processing low attendance data:", attendanceData);
          console.log(
            "Number of students in attendance data:",
            Object.keys(attendanceData).length
          );
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
              name: user ? user.name : "Unknown",
            });
          });

          mergedArray = mergedArray.filter((item) => item.name !== "Unknown");
          console.log(
            "Merged attendance data for threshold check:",
            mergedArray
          );

          // Consider students with less than 75% attendance as "low attendance"
          const LOW_ATTENDANCE_THRESHOLD = 75;
          const studentsWithLowestAttendance = mergedArray.filter((user) => {
            const hasAbsence = user.absent && user.absent > 0;
            const percentNum = parseFloat(user.present_percent || "0");
            const isLowAttendance = percentNum < LOW_ATTENDANCE_THRESHOLD;
            console.log(
              `${user.name}: ${user.present_percent}% (${
                isLowAttendance ? "LOW" : "OK"
              })`
            );
            return (
              hasAbsence &&
              (isLowAttendance || user.present_percent === undefined)
            );
          });

          console.log(
            "Students with low attendance:",
            studentsWithLowestAttendance
          );
          if (studentsWithLowestAttendance.length) {
            const namesOfLowestAttendance = studentsWithLowestAttendance.map(
              (student) => student.name
            );
            console.log(
              "Setting low attendance learners:",
              namesOfLowestAttendance
            );
            setLowAttendanceLearnerList(namesOfLowestAttendance);
          } else {
            console.log("No students with low attendance");
            setLowAttendanceLearnerList([]);
          }
        } else {
          console.log("No attendance data received from API");
        }

        // Get cohort attendance percentage
        const cohortAttendanceData: CohortAttendancePercentParam = {
          limit: 1000,
          page: 0,
          filters: {
            scope: "student",
            fromDate: startDateRange,
            toDate: endDateRange,
            contextId: classId,
          },
          facets: ["contextId"],
          sort: ["present_percentage", "asc"],
        };

        console.log(
          "Fetching cohort attendance with params:",
          cohortAttendanceData
        );
        const cohortRes = await getCohortAttendance(cohortAttendanceData);
        console.log("Cohort Attendance API Response:", cohortRes);
        const cohortResponse = cohortRes?.data?.result;
        console.log("Cohort response:", cohortResponse);
        const contextData = cohortResponse?.contextId?.[classId];

        console.log("Context data for classId:", classId, contextData);

        if (contextData?.present_percentage) {
          // present_percentage comes as a string from API, so parse it first
          const presentPercent = parseFloat(contextData.present_percentage);
          const percentageString = presentPercent.toFixed(1);
          console.log(
            "Setting cohort present percentage:",
            percentageString,
            "from",
            contextData.present_percentage
          );
          setCohortPresentPercentage(percentageString);
        } else if (contextData?.absent_percentage) {
          console.log("Only absent percentage available, setting to 0");
          setCohortPresentPercentage("0");
        } else {
          console.log("No attendance data, setting to 'No Attendance'");
          setCohortPresentPercentage("No Attendance");
        }
      }
    } catch (error) {
      console.error("Error fetching single center attendance:", error);
    }
  };

  // Fetch attendance for all centers
  const fetchAllCentersAttendance = async () => {
    try {
      const cohortIds = cohortsData.map((cohort) => cohort.cohortId);
      const limit = 300;
      const page = 0;
      const facets = ["contextId"];

      const fetchPromises = cohortIds.map(async (cohortId) => {
        const filters = {
          fromDate: startDateRange,
          toDate: endDateRange,
          scope: "student",
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
      console.error("Error fetching all centers attendance:", error);
    }
  };
  // Generate calendar data for the selected month - only dates that exist
  const generateCalendarData = () => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();

    // Get first day of month and total days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];

    // Only add days of the month (no empty cells)
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      const dayName = ["S", "M", "T", "W", "T", "F", "S"][date.getDay()];
      days.push({
        date: i,
        day: dayName,
      });
    }

    return days;
  };

  const calendarDays = generateCalendarData();
  const weekDays = ["S", "M", "T", "W", "T", "F", "S"];

  // Mock data matching the screenshot
  const handleDateClick = (date: number) => {
    const selected = new Date(
      selectedMonth.getFullYear(),
      selectedMonth.getMonth(),
      date
    );
    setSelectedDate(shortDateFormat(selected));
  };

  const handlePreviousMonth = () => {
    setSelectedMonth(
      new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1)
    );
  };

  const handleNextMonth = () => {
    setSelectedMonth(
      new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1)
    );
  };
  const handleChangeYear = (event: any) => {
    setYearSelect(event.target.value);
  };
  // Handle class selection change
  const handleClassChange = (event: any) => {
    const selectedClassId = event.target.value;
    setClassId(selectedClassId);
    console.log("Selected class:", selectedClassId); // Debug log
  };
  // ADD THIS FUNCTION TO HANDLE SAVE SUCCESS
  const handleSaveSuccess = (isModified?: boolean) => {
    console.log("handleSaveSuccess called, isModified:", isModified);
    if (isModified) {
      showToastMessage("Attendance modified successfully", "success");
    } else {
      showToastMessage("Attendance marked successfully", "success");
    }
    console.log(
      "Toggling handleSaveHasRun from",
      handleSaveHasRun,
      "to",
      !handleSaveHasRun
    );
    setHandleSaveHasRun(!handleSaveHasRun);
    handleClose();
  };
  // Get current attendance status

  // const currentAttendance = getCurrentAttendanceStatus();
  // Translation function placeholder (replace with your actual t function)
  const t = (key: string) => {
    const translations: { [key: string]: string } = {
      "COMMON.MARK_CENTER_ATTENDANCE": "Mark Center Attendance",
      "COMMON.CANCEL": "Cancel",
      "COMMON.YES_MANUALLY": "Yes, Manually",
      "COMMON.ARE_YOU_SURE_MANUALLY":
        "Are you sure you want to manually mark attendance?",
      "COMMON.ATTENDANCE_IS_USUALLY":
        "Attendance is usually marked automatically for remote cohorts.",
      "COMMON.USE_MANUAL":
        "Use manual marking only if automatic attendance failed.",
      "COMMON.NOTE_MANUALLY":
        "Note: Manual attendance will override automatic attendance.",
    };
    return translations[key] || key;
  };
  const clickAttendanceOverview = () => {
    console.log("Navigating to attendance-overview");
    console.log("Current router:", {
      pathname: router.pathname,
      asPath: router.asPath,
      basePath: router.basePath,
    });

    // File is at /pages/attendance-overview.tsx, so route is /attendance-overview
    const targetPath = "/attendance-overview";
    console.log("Target path:", targetPath);
    console.log(
      "Full URL will be:",
      router.basePath ? `${router.basePath}${targetPath}` : targetPath
    );

    // Use router.push (handles basePath automatically)
    router.push(targetPath).catch((err) => {
      console.error("Navigation error:", err);
      // Fallback: use window.location
      const fullPath = router.basePath
        ? `${router.basePath}${targetPath}`
        : targetPath;
      window.location.href = fullPath;
    });
  };
  return (
    <DashboardContainer>
      {/* Header Section */}
      <HeaderBox>
        <HeaderContent>
          <Typography
            textAlign={"left"}
            fontSize={"22px"}
            m={"1.5rem 1.2rem 0.8rem"}
            // color={theme?.palette?.warning["300"]}
          >
            Dashboard
          </Typography>
          <Select
            value={yearSelect}
            onChange={handleChangeYear}
            size="small"
            sx={{
              backgroundColor: "white",
              borderRadius: "8px",
              fontWeight: 500,
              "& .MuiSelect-select": {
                display: "flex",
                alignItems: "center",
                gap: "4px",
              },
            }}
          >
            <MenuItem value="2023-2024">2023-2024</MenuItem>
            <MenuItem value="2024-2025 (Active)">
              2024-2025{" "}
              <span style={{ color: "green", marginLeft: "6px" }}>
                (Active)
              </span>
            </MenuItem>
            <MenuItem value="2024-2025 Demo">2024-2025 Demo</MenuItem>
          </Select>
        </HeaderContent>
      </HeaderBox>

      {/* Main Content */}
      <MainContent>
        <ContentWrapper>
          {/* Day-wise Attendance Section */}
          <Box>
            <Box
              display={"flex"}
              flexDirection={"column"}
              padding={"1.5rem 2.2rem 1rem 1.2rem"}
            >
              <Box
                display={"flex"}
                justifyContent={"space-between"}
                alignItems={"center"}
                marginBottom={"16px"}
                marginRight={"25px"}
              >
                <Typography
                  variant="h2"
                  sx={{ fontSize: "14px" }}
                  // color={theme.palette.warning["300"]}
                  fontWeight={"500"}
                >
                  Day-Wise Attendance
                </Typography>
                {/* Center Selection */}
                {centersData.length > 0 && (
                  <Box sx={{ padding: "0 1.2rem 1rem" }}>
                    <FormControl
                      fullWidth
                      size="small"
                      sx={{ maxWidth: "200px" }}
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
                {batchesData.length > 0 && (
                  <Box sx={{ padding: "0 1.2rem 1rem" }}>
                    <FormControl
                      fullWidth
                      size="small"
                      sx={{ maxWidth: "200px" }}
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
                            {batch.batchName}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                )}

                {/* Month Navigation */}
                <Box
                  display={"flex"}
                  sx={{
                    cursor: "pointer",
                    color: theme.palette.secondary.main,
                    gap: "4px",
                    alignItems: "center",
                  }}
                >
                  <Button
                    size="small"
                    onClick={handlePreviousMonth}
                    sx={{ minWidth: "auto", padding: "4px" }}
                  >
                    ‹
                  </Button>
                  <Typography
                    style={{
                      fontWeight: "500",
                      minWidth: "100px",
                      textAlign: "center",
                    }}
                  >
                    {currentMonth} {currentYear}
                  </Typography>
                  <Button
                    size="small"
                    onClick={handleNextMonth}
                    sx={{ minWidth: "auto", padding: "4px" }}
                  >
                    ›
                  </Button>
                  <CalendarMonthIcon sx={{ fontSize: "12px", ml: 0.5 }} />
                </Box>
              </Box>

              {/* Horizontal Calendar Section */}
              <CalendarContainer>
                {/* Horizontal Scroll Calendar */}
                <HorizontalCalendarScroll>
                  {calendarDays.map((dayData, index) => (
                    <CalendarCell
                      key={index}
                      onClick={() => handleDateClick(dayData.date)}
                      sx={{
                        backgroundColor:
                          new Date(
                            selectedMonth.getFullYear(),
                            selectedMonth.getMonth(),
                            dayData.date
                          ).toDateString() ===
                          new Date(selectedDate).toDateString()
                            ? theme.palette.primary.light
                            : "#fff",
                      }}
                    >
                      <DayHeader variant="caption">{dayData.day}</DayHeader>
                      <DateNumber variant="body2">{dayData.date}</DateNumber>
                    </CalendarCell>
                  ))}
                </HorizontalCalendarScroll>
              </CalendarContainer>
            </Box>

            <Box sx={{ padding: "0 20px" }}>
              <Divider sx={{ borderBottomWidth: "0.1rem" }} />
            </Box>
          </Box>
          <Box
            height={"auto"}
            width={"auto"}
            padding={"1rem"}
            borderRadius={"1rem"}
            bgcolor={"#4A4640"}
            textAlign={"left"}
            margin={"15px 35px 15px 25px"}
            sx={{ opacity: classId === "all" ? 0.5 : 1 }}
            justifyContent={"space-between"}
            display={"flex"}
            alignItems={"center"}
          >
            <Box>
              {currentAttendance !== "notMarked" &&
                currentAttendance !== "futureDate" && (
                  <>
                    <Typography
                      sx={{
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#F4F4F4",
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
                        : "0"}
                      % Attendance
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: "12px",
                        fontWeight: "600",
                        color: "#F4F4F4",
                      }}
                      variant="h6"
                    >
                      ({attendanceData.presentCount}/
                      {attendanceData.numberOfCohortMembers} present)
                    </Typography>
                  </>
                )}
          {(currentAttendance === "notMarked" || currentAttendance === "futureDate") && (
  <Typography fontSize={"0.8rem"}>
    Not started
  </Typography>
)}

              {currentAttendance === "futureDate" && (
                <Typography
                  sx={{
                    // color: theme.palette.warning["300"],
                  }}
                  fontSize={"0.8rem"}
                  fontStyle={"italic"}
                  fontWeight={"500"}
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
                minWidth: "84px",
                height: "2.5rem",
                padding: theme.spacing(1),
                fontWeight: "500",
              }}
              disabled={classId === "all"}
              onClick={handleRemoteSession}
            >
              {currentAttendance === "notMarked" ? "Mark" : "Modify"}
            </Button>
          </Box>
          {/* Status Cards Section */}
          <Box
            sx={{
              padding: "1rem 1.2rem",
            }}
          >
            <Box
              mb={2}
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
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
                    color: "#1890ff",
                    textDecoration: "none",
                    fontWeight: "500",
                    display: "flex",
                    alignItems: "center",
                    cursor: "pointer",
                  }}
                >
                  More Details →
                </a>
              </Link>
            </Box>
            {loading ? (
              <Typography>Loading...</Typography>
            ) : (
              <Grid container spacing={2}>
                {classId && classId !== "all" ? (
                  <>
                    {/* Single Center View */}
                    <Grid item xs={12} md={4}>
                      <StatusCard>
                        <CardContent sx={{ pt: 0 }}>
                          <Box textAlign="center" mb={2} p={2}>
                            <Typography
                              fontSize={"11px"}
                              color="rgb(124, 118, 111)"
                            >
                              Center Attendance
                            </Typography>
                            <Typography
                              fontWeight="700"
                              color="#000000"
                              sx={{ fontSize: "16px", lineHeight: 1 }}
                            >
                              {cohortPresentPercentage === "No Attendance"
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
                            <Typography
                              fontSize={"11px"}
                              color="rgb(124, 118, 111)"
                            >
                              Low Attendance Learners
                            </Typography>
                            <Typography
                              fontWeight="700"
                              color="#000000"
                              sx={{ fontSize: "16px", lineHeight: 1 }}
                            >
                              {Array.isArray(lowAttendanceLearnerList) &&
                              lowAttendanceLearnerList.length > 0
                                ? lowAttendanceLearnerList
                                    .slice(0, 2)
                                    .join(", ") +
                                  (lowAttendanceLearnerList.length > 2
                                    ? ` and ${
                                        lowAttendanceLearnerList.length - 2
                                      } more`
                                    : "")
                                : "No Learners with Low Attendance"}
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
                              fontSize={"11px"}
                              color="rgb(124, 118, 111)"
                            >
                              {item.name}
                            </Typography>
                            <Typography
                              fontWeight="700"
                              color="#000000"
                              sx={{ fontSize: "16px", lineHeight: 1 }}
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
          heading={t("COMMON.MARK_CENTER_ATTENDANCE")}
          secondaryBtnText={t("COMMON.CANCEL")}
          btnText={t("COMMON.YES_MANUALLY")}
          selectedDate={selectedDate ? new Date(selectedDate) : undefined}
          onClose={handleClose}
          handlePrimaryAction={() => handleModalToggle()}
        >
          <Box sx={{ padding: "0 16px" }}>
            <Box
              sx={{
                // color: theme?.palette?.warning["300"],
                fontSize: "16px",
                fontWeight: "500",
              }}
            >
              {t("COMMON.ARE_YOU_SURE_MANUALLY")}
            </Box>
            <Box
              sx={{
                // color: theme?.palette?.warning["300"],
                fontSize: "14px",
                fontWeight: "400",
                mt: "10px",
              }}
            >
              {t("COMMON.ATTENDANCE_IS_USUALLY")}
            </Box>
            <Box
              sx={{
                // color: theme?.palette?.warning["300"],
                fontSize: "14px",
                fontWeight: "400",
                mt: "10px",
              }}
            >
              {t("COMMON.USE_MANUAL")}
            </Box>
            <Box
              sx={{
                // color: theme?.palette?.action?.activeChannel,
                fontSize: "14px",
                fontWeight: "500",
                mt: "10px",
              }}
            >
              {t("COMMON.NOTE_MANUALLY")}
            </Box>
          </Box>
        </ModalComponent>
      )}
    </DashboardContainer>
  );
};

export default SimpleTeacherDashboard;
