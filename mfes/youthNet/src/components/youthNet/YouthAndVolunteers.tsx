import React, { useEffect, useState } from 'react';
import {
  MenuItem,
  Select,
  FormControl,
  Typography,
  SelectChangeEvent,
  Grid,
  Box,
} from '@mui/material';
import RegistrationStatistics from './RegistrationStatistics';
import {  getVillages, getYouthDataByDate } from '../../services/youthNet/Dashboard/UserServices';
import { useTranslation } from 'next-i18next';

interface Props {
  selectOptions: { label: string; value: string }[];
  data?: string;
  userId:string
}

const YouthAndVolunteers: React.FC<Props> = ({ selectOptions, data , userId}) => {
  const [selectedValue, setSelectedValue] = useState<string>(
    selectOptions[0]?.value || ''
  );
  const { t } = useTranslation();
 const [youthCount, setYouthCount] = useState<number>(0);
  const handleChange = (event: SelectChangeEvent<string>) => {
    setSelectedValue(event.target.value);
  };
  useEffect(() => {
    const getYouthData = async () => {
      try {
        let fromDate;
            const villages=await getVillages(userId)
            const villageIds=villages?.map((item: any) => item.id) || []
       const toDate = new Date();
        if (selectedValue === 'today') {
         fromDate = new Date(2024, 3, 1)
        }
        if(selectedValue === 'month') {
         fromDate = new Date(toDate.getFullYear(), toDate.getMonth() - 1, toDate.getDate())
        }
        if(selectedValue==='year') {
           fromDate = new Date(toDate.getFullYear() - 1, toDate.getMonth(), toDate.getDate())

        }
        if(fromDate && toDate)
         {const response = await getYouthDataByDate(
          fromDate,
          toDate,
          villageIds
        );
        console.log(response?.getUserDetails);
        setYouthCount(response?.totalCount);

      }

      } catch (error) {
        console.log(error);
      }
      // setUserData(data);
    };
if(userId && userId!=="")
    getYouthData();
  }, [selectedValue, userId]);
  return (
    <div style={{ padding: '16px' }}>
      {data && (
        <Typography
          variant="h2"
          sx={{ fontSize: '16px', color: 'black' }}
          gutterBottom
        >
            {t('YOUTHNET_DASHBOARD.TOTAL_YOUTH')}
        </Typography>
      )}
      <FormControl style={{ marginBottom: '8px', width: '100%' }}>
        <Select
          value={selectedValue}
          onChange={handleChange}
          style={{
            borderRadius: '8px',

            fontSize: '16px',
          }}
          displayEmpty
        >
          {selectOptions.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Typography variant="body1" style={{ fontWeight: 300, color: 'black' }}>
        {t('YOUTHNET_DASHBOARD.YOUTH_COUNT', {count: youthCount})}

      </Typography>
      {data && (
        <Box p={2}>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <RegistrationStatistics
                avatar={true}
                statistic={youthCount}
                subtile={'Youth'}
              />
            </Grid>
            {/* <Grid item xs={6}>
              <RegistrationStatistics
                avatar={true}
                statistic={4}
                subtile={'Volunteer'}
              />
            </Grid> */}
          </Grid>
        </Box>
      )}
    </div>
  );
};

export default YouthAndVolunteers;
