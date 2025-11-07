/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @nx/enforce-module-boundaries */
// @ts-nocheck
import React, { useState, useEffect } from 'react';
import DynamicForm from '@/components/DynamicForm/DynamicForm';
import Loader from '@/components/Loader';
import { useTranslation } from 'react-i18next';
import {
  ContentCreatorSearchSchema,
  ContentCreatorUISchema,
} from '../constant/Forms/ContentCreatorSearch';

import { RoleId, RoleName, Status, TenantName } from '@/utils/app.constant';
import { userList } from '@/services/UserList';
import { Box, Typography } from '@mui/material';
import PaginatedTable from '@/components/PaginatedTable/PaginatedTable';
import { Button } from '@mui/material';
import SimpleModal from '@/components/SimpleModal';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { deleteUser } from '@/services/UserService';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import Image from 'next/image';
import {
  extractMatchingKeys,
  fetchForm,
  searchListData,
} from '@/components/DynamicForm/DynamicFormCallback';
import { FormContext } from '@/components/DynamicForm/DynamicFormConstant';
import AddUserForm from '@/components/AddUserForm';
import TenantService from '@/services/TenantService';

const ContentCreator = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [schema, setSchema] = useState(ContentCreatorSearchSchema);
  const [uiSchema, setUiSchema] = useState(ContentCreatorUISchema);
  const [addSchema, setAddSchema] = useState(null);
  const [addUiSchema, setAddUiSchema] = useState(null);
  const [prefilledAddFormData, setPrefilledAddFormData] = useState({});
  const [pageLimit, setPageLimit] = useState<number>(10);
  const [pageOffset, setPageOffset] = useState<number>(0);
  const [prefilledFormData, setPrefilledFormData] = useState({});
  const [loading, setLoading] = useState<boolean>(false);
  const [response, setResponse] = useState({});
  const [currentPage, setCurrentPage] = useState(0);
  const [openModal, setOpenModal] = React.useState<boolean>(false);

  const { t, i18n } = useTranslation();

  const storedUserData = JSON.parse(localStorage.getItem('adminInfo') || '{}');

  useEffect(() => {
    if (response?.result?.totalCount !== 0) {
      searchData(prefilledFormData, 0);
    }
  }, [pageLimit]);
  useEffect(() => {
    // Fetch form schema from API and set it in state.
    const fetchData = async () => {
      const responseForm = await fetchForm([
        {
          fetchUrl: `${process.env.NEXT_PUBLIC_MIDDLEWARE_URL}/form/read?context=${FormContext.contentCreator.context}&contextType=${FormContext.contentCreator.contextType}`,
          header: {},
        },
        {
          fetchUrl: `${process.env.NEXT_PUBLIC_MIDDLEWARE_URL}/form/read?context=${FormContext.contentCreator.context}&contextType=${FormContext.contentCreator.contextType}`,
          header: {
            tenantid: localStorage.getItem('tenantId'),
          },
        },
      ]);
      console.log('responseForm', responseForm);
      setAddSchema(responseForm?.schema);
      setAddUiSchema(responseForm?.uiSchema);
    };

    fetchData();
  }, []);

  const updatedUiSchema = {
    ...uiSchema,
    'ui:submitButtonOptions': {
      norender: true, // Hide submit button if isHide is true
    },
  };

  const SubmitaFunction = async (formData: any) => {
    setPrefilledFormData(formData);
    await searchData(formData, 0);
  };

  const searchData = async (formData: any, newPage: any) => {
    // Get tenant ID from localStorage to filter users by tenant
    const tenantId = localStorage.getItem('tenantId');
    const staticFilter = {
      role: RoleName.CONTENT_CREATOR,
      tenantId: tenantId,
    };
    const { sortBy, firstName } = formData;
    const staticSort = ['firstName', sortBy || 'asc'];

    // Add firstName to formData if provided for search
    const searchFormData = firstName ? { ...formData, firstName } : formData;

    console.log('Content Creator searchData called with:', {
      formData,
      searchFormData,
      staticFilter,
      firstName,
    });

    await searchListData(
      searchFormData,
      newPage,
      staticFilter,
      pageLimit,
      setPageOffset,
      setCurrentPage,
      setResponse,
      userList,
      staticSort
    );
  };

  // Define table columns
  let columns = [
    {
      keys: ['firstName', 'middleName', 'lastName'],
      label: 'Content Creator Name',
      render: (row: any) =>
        `${row.firstName || ''} ${row.middleName || ''} ${
          row.lastName || ''
        }`.trim(),
    },
    {
      key: 'status',
      label: 'Status',
      getStyle: (row: any) => ({
        color: row.status === 'active' ? 'green' : 'red',
      }),
    },
    // State column removed for ADMIN users
  ];

  const scpCustomColumns = [
    {
      key: 'BOARD',
      label: 'Board',
      render: (row) => {
        const board =
          row.customFields.find((field) => field.label === 'BOARD')
            ?.selectedValues[0]?.value || '-';
        return `${board}`;
      },
    },
    {
      key: 'MEDIUM',
      label: 'Medium',
      render: (row) => {
        const medium =
          row.customFields.find((field) => field.label === 'MEDIUM')
            ?.selectedValues[0]?.value || '-';
        return `${medium}`;
      },
    },
    {
      key: 'GRADE',
      label: 'Grade',
      render: (row) => {
        const grade =
          row.customFields.find((field) => field.label === 'GRADE')
            ?.selectedValues[0]?.value || '-';
        return `${grade}`;
      },
    },
    {
      key: 'SUBJECT',
      label: 'subject',
      render: (row) => {
        const subject =
          row.customFields.find((field) => field.label === 'SUBJECT')
            ?.selectedValues[0]?.value || '-';
        return `${subject}`;
      },
    },
  ];

  const youthnetCustomColumns = [
    {
      key: 'DOMAIN',
      label: 'Domain',
      render: (row) => {
        const domain =
          row.customFields.find((field) => field.label === 'DOMAIN')
            ?.selectedValues[0]?.value || '-';
        return `${domain}`;
      },
    },
    {
      key: 'SUB-DOMAIN',
      label: 'Sub Domain',
      render: (row) => {
        const subDomain =
          row.customFields.find((field) => field.label === 'SUB-DOMAIN')
            ?.selectedValues[0]?.value || '-';
        return `${subDomain}`;
      },
    },
    {
      key: 'STREAM',
      label: 'Stream',
      render: (row) => {
        const stream =
          row.customFields.find((field) => field.label === 'STREAM')
            ?.selectedValues[0]?.value || '-';
        return `${stream}`;
      },
    },
  ];
  if (
    storedUserData.tenantData[0].tenantName === TenantName.SECOND_CHANCE_PROGRAM
  ) {
    columns = [...columns, ...scpCustomColumns];
  } else if (storedUserData.tenantData[0].tenantName === TenantName.YOUTHNET) {
    columns = [...columns, ...youthnetCustomColumns];
  }

  // Define actions
  const actions = [
    {
      icon: (row) => (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            cursor: 'pointer',
            backgroundColor:
              row.status === 'active'
                ? 'rgb(227, 234, 240)'
                : 'rgb(255, 235, 238)',
            padding: '10px',
            borderRadius: '4px',
          }}
        >
          {row.status === 'active' ? (
            <LockOpenIcon sx={{ color: 'green' }} />
          ) : (
            <LockIcon sx={{ color: 'red' }} />
          )}
        </Box>
      ),
      callback: async (row: any) => {
        console.log('row:', row);
        const userId = row?.userId;
        const newStatus = row.status === 'active' ? 'archived' : 'active';

        const response = await deleteUser(userId, {
          userData: {
            status: newStatus,
          },
        });

        if (response) {
          setPrefilledFormData({});
          searchData(prefilledFormData, currentPage);
          setOpenModal(false);
        }
      },
    },
  ];

  // Pagination handlers
  const handlePageChange = (newPage: any) => {
    console.log('Page changed to:', newPage);
    searchData(prefilledFormData, newPage);
  };

  const handleRowsPerPageChange = (newRowsPerPage: any) => {
    console.log('Rows per page changed to:', newRowsPerPage);
    setPageLimit(newRowsPerPage);
  };

  const handleOpenModal = () => setOpenModal(true);

  const handleCloseModal = () => {
    setOpenModal(false);
  };

  //Add Edit Props
  const extraFieldsUpdate = {};
  const extraFields = {
    tenantCohortRoleMapping: [
      {
        tenantId: TenantService.getTenantId(),
        roleId: RoleId.CONTENT_CREATOR,
      },
    ],
    password: Math.floor(10000 + Math.random() * 90000),
  };
  const successUpdateMessage =
    'CONTENT_CREATORS.CONTENT_CREATOR_UPDATED_SUCCESSFULLY';
  const telemetryUpdateKey = 'content-creator-updated-successfully';
  const failureUpdateMessage =
    'CONTENT_CREATORS.NOT_ABLE_UPDATE_CONTENT_CREATOR';
  const successCreateMessage =
    'CONTENT_CREATORS.CONTENT_CREATOR_CREATED_SUCCESSFULLY';
  const telemetryCreateKey = 'content-creator-created-successfully';
  const failureCreateMessage =
    'CONTENT_CREATORS.NOT_ABLE_CREATE_CONTENT_CREATOR';
  const notificationKey = 'onContentCreatorCreate';
  const notificationMessage =
    'CONTENT_CREATORS.USER_CREDENTIALS_WILL_BE_SEND_SOON';
  const notificationContext = 'USER';

  return (
    <>
      <Box display={'flex'} flexDirection={'column'} gap={2}>
        {isLoading ? (
          <Loader showBackdrop={false} loadingText={t('COMMON.LOADING')} />
        ) : (
          schema &&
          uiSchema && (
            <DynamicForm
              schema={schema}
              uiSchema={updatedUiSchema}
              SubmitaFunction={SubmitaFunction}
              isCallSubmitInHandle={true}
              prefilledFormData={prefilledFormData || {}}
            />
          )
        )}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }} mt={4}>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => {
              setPrefilledAddFormData({});
              handleOpenModal();
            }}
          >
            {t('COMMON.ADD_NEW')}{' '}
          </Button>
        </Box>

        <SimpleModal
          open={openModal}
          onClose={handleCloseModal}
          showFooter={false}
          modalTitle={t('CONTENT_CREATOR_REVIEWER.CREATE_CONTENT_CREATOR')}
        >
          <AddUserForm
            userType="content-creator"
            onSuccess={() => {
              setPrefilledFormData({});
              searchData({}, 0);
              setOpenModal(false);
            }}
            onCancel={() => {
              setOpenModal(false);
            }}
          />
        </SimpleModal>

        {response && response?.result?.getUserDetails ? (
          <Box sx={{ mt: 1 }}>
            <PaginatedTable
              count={response?.result?.totalCount}
              data={response?.result?.getUserDetails}
              columns={columns}
              actions={actions}
              onPageChange={handlePageChange}
              onRowsPerPageChange={handleRowsPerPageChange}
              defaultPage={currentPage}
              defaultRowsPerPage={pageLimit}
            />
          </Box>
        ) : (
          <Box
            display="flex"
            justifyContent="center"
            alignItems="center"
            height="20vh"
          >
            <Typography marginTop="10px" textAlign={'center'}>
              {t('COMMON.NO_CONTENT_CREATOR_FOUND')}
            </Typography>
          </Box>
        )}
      </Box>
    </>
  );
};
export async function getStaticProps({ locale }: any) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  };
}

export default ContentCreator;
