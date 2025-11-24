import { Box, Grid, Stack, Typography } from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';

import { LearListHeaderProps } from '../utils/interfaces';
import React from 'react';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'next-i18next';

const LearnerListHeader: React.FC<LearListHeaderProps> = ({
  numberOfColumns,
  firstColumnName,
  secondColumnName,
  sortName,
  sortAttendance,
  sortClassesMissed,
  onSortName,
  onSortAttendance,
  onSortClassesMissed,
}) => {
  const { t } = useTranslation();
  const theme = useTheme<any>();

  return (
    <Stack>
      {numberOfColumns == 3 ? (
        <Box
          borderBottom={`1px solid ${theme.palette.warning['A100']}`}
          margin="0"
          alignItems={'center'}
          bgcolor={'#E6E6E6'}
          maxHeight={'auto'}
          className="br-md-tlr-8"
        >
          <Grid
            container
            alignItems="center"
            textAlign={'center'}
            justifyContent="space-between"
            p={'5px'}
          >
            <Grid item xs={6}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  cursor: onSortName ? 'pointer' : 'default',
                  paddingLeft: '12px',
                }}
                onClick={onSortName}
              >
                <Typography
                  textAlign={'left'}
                  sx={{
                    fontSize: '11px',
                    fontWeight: '500',
                  }}
                  className="one-line-text"
                >
                  {t('COMMON.LEARNER_NAME')}
                </Typography>
                {onSortName && (
                  <>
                    {sortName === 'asc' ? (
                      <ArrowUpwardIcon
                        sx={{
                          fontSize: '14px',
                          marginLeft: '4px',
                          color: theme.palette.primary.main,
                        }}
                      />
                    ) : sortName === 'desc' ? (
                      <ArrowDownwardIcon
                        sx={{
                          fontSize: '14px',
                          marginLeft: '4px',
                          color: theme.palette.primary.main,
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0px',
                          marginLeft: '4px',
                        }}
                      >
                        <ArrowUpwardIcon
                          sx={{
                            fontSize: '10px',
                            color: theme.palette.text.secondary,
                            lineHeight: 0.5,
                          }}
                        />
                        <ArrowDownwardIcon
                          sx={{
                            fontSize: '10px',
                            color: theme.palette.text.secondary,
                            lineHeight: 0.5,
                            marginTop: '-4px',
                          }}
                        />
                      </Box>
                    )}
                  </>
                )}
              </Box>
            </Grid>
            <Grid item xs={3}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: onSortAttendance ? 'pointer' : 'default',
                }}
                onClick={onSortAttendance}
              >
                <Typography
                  className="one-line-text"
                  sx={{ fontSize: '11px', fontWeight: '500' }}
                >
                  {firstColumnName}
                </Typography>
                {onSortAttendance && (
                  <>
                    {sortAttendance === 'asc' ? (
                      <ArrowUpwardIcon
                        sx={{
                          fontSize: '14px',
                          marginLeft: '4px',
                          color: theme.palette.primary.main,
                        }}
                      />
                    ) : sortAttendance === 'desc' ? (
                      <ArrowDownwardIcon
                        sx={{
                          fontSize: '14px',
                          marginLeft: '4px',
                          color: theme.palette.primary.main,
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0px',
                          marginLeft: '4px',
                        }}
                      >
                        <ArrowUpwardIcon
                          sx={{
                            fontSize: '10px',
                            color: theme.palette.text.secondary,
                            lineHeight: 0.5,
                          }}
                        />
                        <ArrowDownwardIcon
                          sx={{
                            fontSize: '10px',
                            color: theme.palette.text.secondary,
                            lineHeight: 0.5,
                            marginTop: '-4px',
                          }}
                        />
                      </Box>
                    )}
                  </>
                )}
              </Box>
            </Grid>
            <Grid item xs={3}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: onSortClassesMissed ? 'pointer' : 'default',
                }}
                onClick={onSortClassesMissed}
              >
                <Typography
                  className="one-line-text"
                  sx={{ fontSize: '11px', fontWeight: '500' }}
                >
                  {secondColumnName}
                </Typography>
                {onSortClassesMissed && (
                  <>
                    {sortClassesMissed === 'asc' ? (
                      <ArrowUpwardIcon
                        sx={{
                          fontSize: '14px',
                          marginLeft: '4px',
                          color: theme.palette.primary.main,
                        }}
                      />
                    ) : sortClassesMissed === 'desc' ? (
                      <ArrowDownwardIcon
                        sx={{
                          fontSize: '14px',
                          marginLeft: '4px',
                          color: theme.palette.primary.main,
                        }}
                      />
                    ) : (
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0px',
                          marginLeft: '4px',
                        }}
                      >
                        <ArrowUpwardIcon
                          sx={{
                            fontSize: '10px',
                            color: theme.palette.text.secondary,
                            lineHeight: 0.5,
                          }}
                        />
                        <ArrowDownwardIcon
                          sx={{
                            fontSize: '10px',
                            color: theme.palette.text.secondary,
                            lineHeight: 0.5,
                            marginTop: '-4px',
                          }}
                        />
                      </Box>
                    )}
                  </>
                )}
              </Box>
            </Grid>
          </Grid>
        </Box>
      ) : (
        <Box
          borderBottom={`1px solid ${theme.palette.warning['A100']}`}
          margin="0"
          alignItems={'center'}
          bgcolor={'#E6E6E6'}
          maxHeight={'auto'}
        >
          <Grid
            container
            alignItems="center"
            textAlign={'center'}
            justifyContent="space-between"
            p={'5px'}
          >
            <Grid item xs={9}>
              <Typography
                textAlign={'left'}
                sx={{ fontSize: '11px', fontWeight: '500' }}
              >
                {t('ATTENDANCE.CENTER_NAME')}
              </Typography>
            </Grid>
            <Grid item xs={3}>
              <Typography sx={{ fontSize: '11px', fontWeight: '500' }}>
                {firstColumnName}
              </Typography>
            </Grid>
          </Grid>
        </Box>
      )}
    </Stack>
  );
};

export default LearnerListHeader;
