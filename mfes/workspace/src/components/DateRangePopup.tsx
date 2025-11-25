import {
  getDayAndMonthName,
  getTodayDate,
  formatSelectedDate,
} from '../utils/Helper';
import {
  Box,
  Button,
  Divider,
  FormControl,
  MenuItem,
  MenuList,
  Modal,
  Select,
  Typography,
} from '@mui/material';
import React, { useEffect, useState } from 'react';

import useStore from '../store/store';
import { Telemetry } from '../utils/app.constant';
import { telemetryFactory } from '../utils/telemetry';
import CloseIcon from '@mui/icons-material/Close';
import WestIcon from '@mui/icons-material/West';
import ListItemIcon from '@mui/material/ListItemIcon';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'next-i18next';
import Image from 'next/image';
import ReactGA from 'react-ga4';
import checkMark from '../assets/images/checkMark.svg';
import { useDirection } from '../hooks/useDirection';
import MonthCalender from './MonthCalender';

interface CustomSelectModalProps {
  menuItems: string[];
  selectedValue: string;
  setSelectedValue: (value: string) => void;
  onDateRangeSelected: any;
  dateRange?: string | Date | undefined;
}

const DateRangePopup: React.FC<CustomSelectModalProps> = ({
  menuItems,
  selectedValue,
  setSelectedValue,
  onDateRangeSelected,
  dateRange,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCalendarModalOpen, setIsCalenderModalOpen] = useState(false);
  const [selectedRangeArray, setSelectedRangeArray] = useState<Date[] | null>(
    null
  );
  const store = useStore();
  const [dateRangeArray, setDateRangeArray] = useState<any[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(0);
  const [displayCalendarFromDate, setDisplayCalendarFromDate] = React.useState(
    getDayAndMonthName(getTodayDate())
  );
  const [displayCalendarToDate, setDisplayCalendarToDate] = React.useState(
    getDayAndMonthName(getTodayDate())
  );
  const [cancelClicked, setCancelClicked] = React.useState(false);
  const [appliedOption, setAppliedOption] = React.useState<string>('');
  const [appliedIndex, setAppliedIndex] = React.useState<number | null>(0);

  const toggleModal = () => {
    setIsModalOpen(!isModalOpen);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedValue(appliedOption);
    setSelectedIndex(appliedIndex);
  };

  const toggleCalendarModal = () =>
    setIsCalenderModalOpen(!isCalendarModalOpen);

  const { t } = useTranslation();
  const theme = useTheme<any>();
  const { isRTL } = useDirection();

  // Function to calculate date ranges for different options
  const calculateDateRange = (index: number) => {
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of day

    let fromDate = new Date(today);

    switch (index) {
      case 0: // Last 7 days
        fromDate.setDate(today.getDate() - 6);
        fromDate.setHours(0, 0, 0, 0);
        break;

      case 1: // As of Today
        // For "As of Today", we want only today's date
        fromDate = new Date(today);
        fromDate.setHours(0, 0, 0, 0);
        break;

      case 2: // Last Month
        fromDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        fromDate.setHours(0, 0, 0, 0);
        // Set toDate to last day of previous month
        const lastDayOfLastMonth = new Date(
          today.getFullYear(),
          today.getMonth(),
          0
        );
        lastDayOfLastMonth.setHours(23, 59, 59, 999);
        return {
          fromDate: formatSelectedDate(fromDate),
          toDate: formatSelectedDate(lastDayOfLastMonth),
        };

      case 3: // Last 6 Months
        fromDate.setMonth(today.getMonth() - 6);
        fromDate.setHours(0, 0, 0, 0);
        break;

      case 4: // Custom Range - handled separately
        if (dateRangeArray.length === 2) {
          const customFromDate = new Date(dateRangeArray[0]);
          const customToDate = new Date(dateRangeArray[1]);
          customFromDate.setHours(0, 0, 0, 0);
          customToDate.setHours(23, 59, 59, 999);
          return {
            fromDate: formatSelectedDate(customFromDate),
            toDate: formatSelectedDate(customToDate),
          };
        }
        break;

      default:
        fromDate.setDate(today.getDate() - 6);
        fromDate.setHours(0, 0, 0, 0);
    }

    return {
      fromDate: formatSelectedDate(fromDate),
      toDate: formatSelectedDate(today),
    };
  };

  const handleMenuItemClick = (index: number, item: string) => {
    setSelectedIndex(index);
    setSelectedValue(item);

    if (index === 4) {
      // Custom Range
      // Load existing date range if available
      if (
        selectedRangeArray &&
        Array.isArray(selectedRangeArray) &&
        selectedRangeArray.length === 2
      ) {
        setDateRangeArray(selectedRangeArray);
        setDisplayCalendarFromDate(
          getDayAndMonthName(new Date(selectedRangeArray[0]))
        );
        setDisplayCalendarToDate(
          getDayAndMonthName(new Date(selectedRangeArray[1]))
        );
      }
      toggleCalendarModal();
    } else {
      // For all other options, immediately apply the date range
      const dateRange = calculateDateRange(index);
      setAppliedOption(item);
      setAppliedIndex(index);

      console.log(`Date Range for ${item}:`, dateRange);

      onDateRangeSelected({
        fromDate: dateRange.fromDate,
        toDate: dateRange.toDate,
      });

      // Track the selection
      ReactGA.event('date-range-pop-up-clicked', {
        dateRangeType: item,
      });

      const telemetryInteract = {
        context: {
          env: 'dashboard',
          cdata: [],
        },
        edata: {
          id: 'date-range-pop-up-clicked',
          type: Telemetry.SEARCH,
          subtype: '',
          pageid: 'dashboard',
        },
      };
      telemetryFactory.interact(telemetryInteract);

      setIsModalOpen(false);
    }
  };

  const handleCancelClicked = () => {
    toggleCalendarModal();
    setCancelClicked(true);
    setDisplayCalendarFromDate(getDayAndMonthName(getTodayDate()));
    setDisplayCalendarToDate(getDayAndMonthName(getTodayDate()));
    localStorage.removeItem('selectedRangeArray');
  };

  const onApply = () => {
    if (cancelClicked) {
      toggleModal();
      setSelectedValue('');
      setCancelClicked(false);
    } else {
      setAppliedOption(selectedValue);
      setAppliedIndex(selectedIndex);

      ReactGA.event('date-range-pop-up-clicked', {
        dateRangeType: selectedValue,
      });

      const telemetryInteract = {
        context: {
          env: 'dashboard',
          cdata: [],
        },
        edata: {
          id: 'date-range-pop-up-clicked',
          type: Telemetry.SEARCH,
          subtype: '',
          pageid: 'dashboard',
        },
      };
      telemetryFactory.interact(telemetryInteract);

      const dateRange = calculateDateRange(selectedIndex || 0);
      onDateRangeSelected({
        fromDate: dateRange.fromDate,
        toDate: dateRange.toDate,
      });

      toggleModal();
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      // Try to get from store first
      const storedDates = store.value;
      if (storedDates) {
        try {
          const dateArray = JSON.parse(storedDates);
          if (Array.isArray(dateArray) && dateArray.length === 2) {
            setSelectedRangeArray(dateArray.map((d: string) => new Date(d)));
          }
        } catch (error) {
          console.error('Failed to parse stored dates:', error);
        }
      }
      // Also try localStorage directly
      const localStoredDates = localStorage.getItem('selectedRangeArray');
      if (localStoredDates) {
        try {
          const dateArray = JSON.parse(localStoredDates);
          if (Array.isArray(dateArray) && dateArray.length === 2) {
            const parsedDates = dateArray.map((d: string) => new Date(d));
            setSelectedRangeArray(parsedDates);
            setDateRangeArray(parsedDates);
            setDisplayCalendarFromDate(getDayAndMonthName(parsedDates[0]));
            setDisplayCalendarToDate(getDayAndMonthName(parsedDates[1]));
          }
        } catch (error) {
          console.error('Failed to parse localStorage dates:', error);
        }
      }
    }
  }, []);

  const handleCalendarDateChange = (date: Date | Date[] | null) => {
    if (Array.isArray(date)) {
      setDateRangeArray(date);
      setDisplayCalendarFromDate(getDayAndMonthName(date[0]));
      setDisplayCalendarToDate(getDayAndMonthName(date[1]));
      // Store in localStorage for persistence
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('selectedRangeArray', JSON.stringify(date));
      }
    }
  };

  const handleActiveStartDateChange = (date: Date) => {
    // setActiveStartDate(date);
  };

  const modalStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '85%',
    bgcolor: 'background.paper',
    boxShadow: 24,
    '@media (min-width: 600px)': {
      width: '450px',
    },
  };

  return (
    <Box className="mt-md-16" sx={{ px: '2px' }}>
      <FormControl sx={{ width: '100%' }}>
        <Select
          className="bg-white"
          sx={{
            height: '32px',
            width: '100%',
            borderRadius: '8px',
            fontSize: '14px',
          }}
          value={selectedValue}
          displayEmpty
          onClick={toggleModal}
          inputProps={{ readOnly: true }}
        >
          <MenuItem value="" disabled>
            {selectedValue ||
              t('DASHBOARD.LAST_SEVEN_DAYS_RANGE', {
                date_range: dateRange,
              })}
          </MenuItem>
          <MenuItem value={selectedValue} style={{ display: 'none' }}>
            {selectedValue ||
              t('DASHBOARD.LAST_SEVEN_DAYS_RANGE', {
                date_range: dateRange,
              })}
          </MenuItem>
        </Select>
      </FormControl>

      <Modal
        open={isModalOpen}
        onClose={(event, reason) => {
          if (reason !== 'backdropClick') {
            handleModalClose();
          }
        }}
        aria-labelledby="edit-profile-modal"
        aria-describedby="edit-profile-description"
      >
        <Box
          sx={modalStyle}
          gap="10px"
          display="flex"
          flexDirection="column"
          borderRadius={'1rem'}
        >
          <Box>
            <Box
              sx={{
                padding: '20px 20px 5px',
                display: 'flex',
                justifyContent: 'space-between',
              }}
            >
              <Box>
                <Typography className="text-dark-grey">
                  {t('COMMON.DATE_RANGE')}
                </Typography>
              </Box>
              <Box>
                <CloseIcon
                  className="text-dark-grey"
                  onClick={handleModalClose}
                  sx={{ cursor: 'pointer' }}
                />
              </Box>
            </Box>
          </Box>
          <Divider />
          <MenuList className="customRange" sx={{ margin: '0 9px' }} dense>
            {menuItems.map((item, index) => (
              <MenuItem
                key={index}
                selected={selectedIndex === index}
                onClick={() => handleMenuItemClick(index, item)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  paddingLeft: '32px',
                  backgroundColor: 'transparent',
                  color: index === 4 ? theme.palette.secondary.main : '#4D4639',
                  '&:hover': {
                    backgroundColor: 'transparent',
                    color: '#0D599E',
                  },
                }}
              >
                {selectedIndex === index && (
                  <ListItemIcon
                    sx={{
                      position: 'absolute',
                      left: '8px',
                      minWidth: 'auto',
                    }}
                    className="text-dark-grey"
                  >
                    <Image
                      height={10}
                      width={12}
                      src={checkMark}
                      alt="logo"
                      style={{ cursor: 'pointer' }}
                    />
                  </ListItemIcon>
                )}
                {item}
              </MenuItem>
            ))}
          </MenuList>
          <Divider />
        </Box>
      </Modal>

      {/* Custom CalendarModal */}
      <Modal
        open={isCalendarModalOpen}
        onClose={toggleCalendarModal}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box sx={modalStyle} padding={'12px 0 12px 0'}>
          <Box
            sx={{
              padding: ' 0 15px 15px',
            }}
          >
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: '5px',
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  gap: '20px',
                }}
              >
                <Box>
                  <WestIcon
                    onClick={() => handleCancelClicked()}
                    style={{
                      cursor: 'pointer',
                      transform: isRTL ? ' rotate(180deg)' : 'unset',
                    }}
                  />
                </Box>
                <Box className="text-dark-grey">{t('COMMON.CUSTOM_RANGE')}</Box>
              </Box>
              <Box>
                <CloseIcon
                  onClick={() => handleCancelClicked()}
                  style={{ cursor: 'pointer' }}
                />
              </Box>
            </Box>
            <Box sx={{ paddingTop: '10px' }}>
              <Box className="fs-14 fw-500 text-dark-grey">
                {t('COMMON.FROM_TO_DATE')}
              </Box>
              <Box className="fs-22 fw-500 pt-10 text-1F">
                {displayCalendarFromDate} – {displayCalendarToDate}
              </Box>
            </Box>
          </Box>

          <Divider />

          <Box>
            <MonthCalender
              onChange={handleActiveStartDateChange}
              onDateChange={handleCalendarDateChange}
              selectionType="range"
              selectedRangeRetention={
                selectedRangeArray && selectedRangeArray.length === 2
                  ? [selectedRangeArray[0], selectedRangeArray[1]]
                  : dateRangeArray.length === 2
                  ? [dateRangeArray[0], dateRangeArray[1]]
                  : null
              }
            />
          </Box>
          <Box
            sx={{
              padding: '20px 18px 10px',
              display: 'flex',
              gap: '30px',
              justifyContent: 'end',
              cursor: 'pointer',
            }}
          >
            <Box
              className="text-0D fs-14 fw-500"
              onClick={() => handleCancelClicked()}
            >
              {t('COMMON.CANCEL')}
            </Box>
            <Box
              className="text-0D fs-14 fw-500"
              sx={{ cursor: 'pointer' }}
              onClick={() => {
                if (dateRangeArray.length === 2) {
                  const formatDate = (date: Date) => {
                    const localDate = new Date(
                      date.getTime() - date.getTimezoneOffset() * 60000
                    );
                    const year = localDate.getUTCFullYear();
                    const month = String(localDate.getUTCMonth() + 1).padStart(
                      2,
                      '0'
                    );
                    const day = String(localDate.getUTCDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                  };
                  const fromDate = formatDate(new Date(dateRangeArray[0]));
                  const toDate = formatDate(new Date(dateRangeArray[1]));

                  // Store the selected range
                  if (typeof window !== 'undefined' && window.localStorage) {
                    localStorage.setItem(
                      'selectedRangeArray',
                      JSON.stringify(dateRangeArray)
                    );
                  }

                  onDateRangeSelected({ fromDate, toDate });
                  setAppliedOption(selectedValue);
                  setAppliedIndex(selectedIndex);
                  setCancelClicked(false);
                  toggleCalendarModal();
                  setIsModalOpen(false);
                } else {
                  toggleCalendarModal();
                }
              }}
            >
              {t('COMMON.OK')}
            </Box>
          </Box>
        </Box>
      </Modal>
    </Box>
  );
};

export default DateRangePopup;
