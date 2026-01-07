import React, { useEffect } from 'react';
import { useState } from 'react';
import CreatePage from './workspace/content/create';
import AttendancePage from './workspace/content/attendance';
import { Role } from '../utils/app.constant';
import { getLocalStoredUserRole } from '../services/LocalStorageService';
function IndexPage() {
  const [selectedKey, setSelectedKey] = useState('create');
  const [userRole, setUserRole] = useState<Role | null>(null);
  useEffect(() => {
    const role = getLocalStoredUserRole();
    setUserRole(role);
  }, []);

  // Show loading while checking user role
  if (userRole === null) {
    return <div>Loading...</div>;
  }

  return <>{userRole === Role.TEACHER || userRole === Role.STAFF || userRole === Role.SUPERVISOR ? <AttendancePage /> : <CreatePage />}</>;
}

export default IndexPage;
