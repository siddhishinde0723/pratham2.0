/* eslint-disable @nx/enforce-module-boundaries */
import { useTranslation } from 'next-i18next';
import React, { useEffect, useState } from 'react';
import SimpleModal from '../SimpleModal';
import KaTableComponent from '../KaTableComponent';
import {
  Box,
  Pagination,
  Paper,
  Typography,
  useMediaQuery,
} from '@mui/material';
import { Theme } from '@mui/system';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { getCoursesTableData } from '@/data/tableColumns';
import PageSizeSelector from '../PageSelector';
import HeaderComponent from '../HeaderComponent';
import { SelectChangeEvent } from '@mui/material/Select';
import {
  courseWiseLernerList,
  getCourseName,
  issueCertificate,
  renderCertificate,
} from '@/services/CertificateService/coursesCertificates';
import { getUserDetailsInfo } from '@/services/UserList';
import TenantService from '@/services/TenantService';
import { showToastMessage } from '../Toastify';
import CustomModal from '../CustomModal';
import { firstLetterInUpperCase, formatDate } from '@/utils/Helper';
import { Numbers, Status } from '@/utils/app.constant';
import { TEMPLATE_ID } from '../../../app.config';

type FilterDetails = {
  status?: string[];
  tenantId?: string;
  userId?: string;
};
const CourseTable: React.FC = () => {
  const [alertIssueModal, setAlertIssueModal] = useState<boolean>(false);
  const [selectedRowData, setSelectedRowData] = useState<any>({});

  const [showCertificate, setShowCertificate] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('All');
  const [pageOffset, setPageOffset] = useState(0);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [pageLimit, setPageLimit] = useState(10);
  const [pageCount, setPageCount] = useState(1);
  const [pageSize, setPageSize] = React.useState<string | number>(10);
  const [pageSizeArray, setPageSizeArray] = React.useState<number[]>([]);
  const [pagination, setPagination] = useState(true);
  const [certificateHtml, setCertificateHtml] = React.useState<string>('');

  const [filters, setFilters] = useState<FilterDetails>({
    status: ['completed', 'viewCertificate'],
    tenantId: typeof window !== 'undefined' ? TenantService.getTenantId() : '',
  });
  const isMobile: boolean = useMediaQuery((theme: Theme) =>
    theme.breakpoints.down('sm')
  );

  const [data, setData] = useState<any[]>([]);

  const { t, i18n } = useTranslation();

  const handleIssueCertificateModal = (rowData: any) => {
    setSelectedRowData(rowData);
    setAlertIssueModal(true);
  };
  const handleIssueCertificate = async () => {
    try {
      const payload = {
        issuanceDate: new Date().toISOString(),
        expirationDate: new Date(
          new Date().setFullYear(new Date().getFullYear() + 1)
        ).toISOString(),
        firstName: firstLetterInUpperCase(selectedRowData?.firstName),
        middleName: firstLetterInUpperCase(selectedRowData?.middleName),
        lastName: firstLetterInUpperCase(selectedRowData?.lastName),
        userId: selectedRowData?.userId,
        courseId: selectedRowData?.courseId,
        courseName: selectedRowData?.courseName,
      };

      const response = await issueCertificate(payload);
      setData((prevData) =>
        prevData.map((course) =>
          course.courseId === selectedRowData?.courseId
            ? {
                ...course,
                courseStatus: Status.ISSUED,
                certificateId: response?.credential?.id,
              }
            : course
        )
      );
      if (selectedRowData.courseStatus === Status.ISSUED) {
        showToastMessage(
          t('CERTIFICATES.REISSUED_CERTIFICATE_SUCCESSFULLY'),
          'success'
        );
      } else
        showToastMessage(
          t('CERTIFICATES.ISSUED_CERTIFICATE_SUCCESSFULLY'),
          'success'
        );
    } catch (e) {
      if (selectedRowData.courseStatus === Status.ISSUED) {
        showToastMessage(
          t('CERTIFICATES.REISSUED_CERTIFICATE_FAILED'),
          'error'
        );
      } else
        showToastMessage(t('CERTIFICATES.ISSUED_CERTIFICATE_FAILED'), 'error');
    } finally {
      setAlertIssueModal(false);
    }
  };

  const handleCloseCertificate = async () => {
    setShowCertificate(false);
    setAlertIssueModal(false);
  };

  const handleViewCertificate = async (rowData: any) => {
    try {
      const response = await renderCertificate({
        credentialId: rowData.certificateId,
        templateId: TEMPLATE_ID,
      });
      setCertificateHtml(response);
      setShowCertificate(true);
    } catch (e) {
      if (selectedRowData.courseStatus === Status.ISSUED) {
        showToastMessage(t('CERTIFICATES.RENDER_CERTIFICATE_FAILED'), 'error');
      }
    }
  };

  const CertificatePage: React.FC<{ htmlContent: string }> = ({
    htmlContent,
  }) => {
    const encodedHtml = encodeURIComponent(htmlContent);
    const dataUri = `data:text/html;charset=utf-8,${encodedHtml}`;

    return (
      <Box sx={{ width: '100%', height: '100%', display: 'flex' }}>
        <iframe
          src={dataUri}
          style={{
            width: '100%',
            height: '100vh',
            minHeight: '800px',
            border: 'none',
          }}
        />
      </Box>
    );
  };

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const limit = pageLimit;
        const offset = pageOffset * limit;
        let response;
        if (searchKeyword !== '')
          response = await courseWiseLernerList({ limit, offset, filters });
        else response = await courseWiseLernerList({ offset, filters });
        const totalCount = response.count;
        setPageCount(Math.ceil(totalCount / pageLimit));

        if (totalCount >= 15) {
          setPagination(true);

          setPageSizeArray([5, 10, 15]);
        } else if (totalCount >= 10) {
          setPagination(true);

          setPageSizeArray([5, 10]);
        } else if (totalCount > 5) {
          setPagination(false);

          setPageSizeArray([5]);
        } else if (totalCount <= 5) {
          setPagination(false);
        }

        const data = response.data;
        const courseIds: string[] = Array.from(
          new Set(data.map((item: any) => item?.courseId))
        );
        const userIds: string[] = Array.from(
          new Set(data.map((item: any) => item?.userId))
        );

        const userMap: any = {};
        for (const userId of userIds) {
          const userDetail = await getUserDetailsInfo(userId);

          userMap[userDetail.userData.userId] = {
            firstName: userDetail.userData.firstName || '',
            middleName: userDetail.userData.middleName || '',
            lastName: userDetail.userData.lastName || '',
            name:
              userDetail?.userData?.firstName +
              (userDetail?.userData?.lastName
                ? ' ' + userDetail?.userData?.lastName
                : ''),
          };
        }
        const r = await getCourseName(courseIds);
        const courseMap = r?.content?.reduce?.((acc: any, course: any) => {
          acc[course.identifier] = course.name;
          return acc;
        }, {});
        console.log('courseMap', courseMap);
        const newData = data.map((item: any) => ({
          ...item,
          courseName: courseMap[item.courseId] || 'Unknown Course',
          name: userMap[item.userId]?.name || 'Unknown Learner',
          firstName: userMap[item.userId]?.firstName || '',
          middleName: userMap[item.userId]?.middleName || '',
          lastName: userMap[item.userId]?.lastName || '',
        }));
        const finalResult = newData
          ?.filter(
            (course: any) =>
              course?.status === 'completed' ||
              course?.status === 'viewCertificate'
          )
          .map((course: any) => {
            return {
              courseId: course?.courseId,
              username: course?.username,
              courseStatus:
                course?.status === 'viewCertificate'
                  ? Status.ISSUED
                  : Status.NOT_ISSUED,
              courseName: course?.courseName,
              issuedDate:
                course?.status === 'completed'
                  ? '-'
                  : formatDate(course?.issuedOn),
              userId: course?.userId,
              firstName: course?.firstName,
              middleName: course?.middleName,

              lastName: course?.lastName,

              name: course?.name,
              certificateId: course?.certificateId,
            };
          });
        const filteredData = finalResult.filter((item: any) =>
          item.name.toLowerCase().includes(searchKeyword.toLowerCase())
        );
        setData(filteredData);
      } catch (e) {
        console.log(e);
      }
    };
    fetchCourses();
  }, [pageLimit, pageOffset, filters, searchKeyword]);
  const handleSearch = (keyword: string) => {
    setPageOffset(Numbers.ZERO);
    setPageCount(Numbers.ONE);
    setSearchKeyword(keyword);
  };
  const handlePaginationChange = (
    event: React.ChangeEvent<unknown>,
    value: number
  ) => {
    setPageOffset(value - 1);
    const windowUrl = window.location.pathname;
    const cleanedUrl = windowUrl.replace(/^\//, '');
    const env = cleanedUrl.split('/')[0];
  };

  const PagesSelector = () => (
    <>
      <Box sx={{ display: { xs: 'block' } }}>
        <Pagination
          // size="small"
          color="primary"
          count={pageCount}
          page={pageOffset + 1}
          onChange={handlePaginationChange}
          siblingCount={0}
          boundaryCount={1}
          sx={{ marginTop: '10px' }}
        />
      </Box>
    </>
  );
  const handlePageChange = (event: SelectChangeEvent<typeof pageSize>) => {
    setPageSize(event.target.value);
    setPageLimit(Number(event.target.value));
  };
  const PageSizeSelectorFunction = () => (
    <PageSizeSelector
      handleChange={handlePageChange}
      pageSize={pageSize}
      options={pageSizeArray}
    />
  );
  const learnerCoursesProps = {
    selectedFilter,
    handleSearch: handleSearch,
    showStateDropdown: false,
    userType: t('SIDEBAR.CERTIFICATE_ISSUANCE'),
    searchPlaceHolder: t('CERTIFICATES.SEARCHBAR_PLACEHOLDER'),
    showFilter: false,
    showSort: false,
    showAddNew: false,
  };
  return (
    <>
      <HeaderComponent {...learnerCoursesProps}>
        <KaTableComponent
          columns={getCoursesTableData(t, isMobile)}
          data={data}
          pagination={pagination}
          // reassignCohort={reassignCohort}
          noDataMessage={data?.length === 0 ? t('COMMON.NO_USER_FOUND') : ''}
          onViewCertificate={handleViewCertificate}
          onIssueCertificate={handleIssueCertificateModal}
          limit={pageLimit}
          offset={pageOffset}
          PagesSelector={PagesSelector}
          PageSizeSelector={PageSizeSelectorFunction}
          pageSizes={pageSizeArray}
        />
        {showCertificate && (
          <SimpleModal
            open={true}
            onClose={handleCloseCertificate}
            showFooter={true}
            modalTitle={t('CERTIFICATES.COURSE_CERTIFICATE')}
            isFullwidth={showCertificate ? true : false}
          >
            <CertificatePage htmlContent={certificateHtml} />
          </SimpleModal>
        )}
        <CustomModal
          width="30%"
          open={alertIssueModal}
          handleClose={handleCloseCertificate}
          primaryBtnText={t('COMMON.YES')}
          primaryBtnClick={handleIssueCertificate}
          primaryBtnDisabled={false}
          secondaryBtnText={t('COMMON.CANCEL')}
          secondaryBtnClick={handleCloseCertificate}
          title={
            selectedRowData.courseStatus === Status.ISSUED
              ? t('CERTIFICATES.REISSUE_CERTIFICATE_CONFIRMATION')
              : t('CERTIFICATES.ISSUE_CERTIFICATE_CONFIRMATION')
          }
        >
          {selectedRowData.courseStatus === Status.ISSUED ? (
            <Typography variant="body1" align="center" gutterBottom>
              {t('CERTIFICATES.REISSUE_CERTIFICATE_ALERT')}
            </Typography>
          ) : (
            <Typography variant="body1" align="center" gutterBottom>
              {t('CERTIFICATES.ISSUE_CERTIFICATE_ALERT')}
            </Typography>
          )}

          <Paper
            elevation={3}
            sx={{
              backgroundColor: '#f5f5f5',
              padding: '16px',
              borderRadius: '8px',
              marginTop: '10px',
            }}
          >
            <Box sx={{ mb: 1 }}>
              <Typography variant="body2">
                <strong>{t('CERTIFICATES.FIRST_NAME')}</strong>{' '}
                {selectedRowData.firstName || '-'}
              </Typography>
            </Box>
            <Box sx={{ mb: 1 }}>
              <Typography variant="body2">
                <strong>{t('CERTIFICATES.MIDDLE_NAME')}</strong>{' '}
                {selectedRowData.middleName || '-'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2">
                <strong>{t('CERTIFICATES.LAST_NAME')}</strong>{' '}
                {selectedRowData.lastName || '-'}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2">
                <strong>{t('CERTIFICATES.COURSE_NAME')}</strong>{' '}
                {selectedRowData.courseName || '-'}
              </Typography>
            </Box>
          </Paper>
        </CustomModal>
      </HeaderComponent>
    </>
  );
};

export default CourseTable;
