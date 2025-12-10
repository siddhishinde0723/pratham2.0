import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { getMenuConfigForTenant } from '../config/menuConfig';
import { PUBLIC_ROUTES, ROLE_BASED_ROUTES, getRoleBasedRoutes } from '../config/routesConfig';

const MenuWrapper = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const [user, setUser] = useState<{ role: string; program: string } | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUserData = () => {
      const storedRole = localStorage.getItem('roleName');
      const storedProgram = localStorage.getItem('program');
      const token = localStorage.getItem('token');
      const adminInfo = localStorage.getItem('adminInfo');

      // If we have roleName and program, set user immediately
      if (storedRole && storedProgram) {
        setUser({ role: storedRole, program: storedProgram });
        setLoading(false);
        return;
      }

      // If user has token/adminInfo but roleName/program not set yet (race condition after login)
      // Try to extract from adminInfo or wait a bit for them to be set
      if (token || adminInfo) {
        if (adminInfo) {
          try {
            const parsedAdminInfo = JSON.parse(adminInfo);
            const roleName = parsedAdminInfo?.tenantData?.[0]?.roleName || '';
            const program = parsedAdminInfo?.tenantData?.[0]?.tenantName || '';
            
            if (roleName && program) {
              // Set them in localStorage if they're in adminInfo but not in separate keys
              localStorage.setItem('roleName', roleName);
              localStorage.setItem('program', program);
              setUser({ role: roleName, program: program });
              setLoading(false);
              return;
            }
          } catch (e) {
            console.error('Error parsing adminInfo:', e);
          }
        }

        // If we have token but roleName/program aren't set yet, wait a bit and retry
        // This handles the race condition where login sets these values asynchronously
        const retryTimeout = setTimeout(() => {
          const retryRole = localStorage.getItem('roleName');
          const retryProgram = localStorage.getItem('program');
          if (retryRole && retryProgram) {
            setUser({ role: retryRole, program: retryProgram });
            setLoading(false);
          } else if (!PUBLIC_ROUTES.includes(router.pathname)) {
            // If still not set after retry and not on public route, redirect to login
            console.warn('roleName/program not found after retry, redirecting to login');
            router.replace('/login');
            setLoading(false);
          } else {
            setLoading(false);
          }
        }, 200); // Wait 200ms for localStorage to be updated

        return () => clearTimeout(retryTimeout);
      }

      // No token and not on public route - redirect to login
      if (!PUBLIC_ROUTES.includes(router.pathname)) {
        router.replace('/login');
      }
      setLoading(false);
    };

    checkUserData();
  }, [router.pathname]);

  useEffect(() => {
    if (!user) return;

    // ✅ 0. Special case: If ADMIN user is on /workspace, redirect to /learners
    // This handles the case where user logged out from workspace and logged back in as admin
    // Check both roleName and actual role from adminInfo to handle different formats
    const adminInfo = localStorage.getItem('adminInfo');
    let actualRole = user.role;
    if (adminInfo) {
      try {
        const parsed = JSON.parse(adminInfo);
        actualRole = parsed?.role || user.role;
      } catch (e) {
        // Ignore parse errors
      }
    }
    
    // Check if user is ADMIN (case-insensitive) and on workspace route
    const isAdmin = actualRole?.toLowerCase() === 'admin' || 
                    user.role?.toLowerCase() === 'admin' ||
                    actualRole === 'State Admin';
    
    if (isAdmin && router.pathname === '/workspace') {
      console.log('⚠️ ADMIN user detected on /workspace, redirecting to /learners');
      console.log('   Role from roleName:', user.role, 'Role from adminInfo:', actualRole);
      if (typeof window !== 'undefined') {
        window.location.href = '/learners';
      } else {
        router.replace('/learners');
      }
      return;
    }

    // ✅ 1. Get all allowed menu routes using dynamic function
    const menuConfig = getMenuConfigForTenant(user.program);
    const allowedMenuRoutes = Object.values(menuConfig || {})
      .filter((item: any) => item.roles.includes(user.role))
      .flatMap((item: any) => [
        item.link,
        ...(item.subMenu?.map((sub: any) => sub.link) || []),
      ]);

    // ✅ 2. Get program-specific routes using dynamic function
    const programSpecificRoutes = getRoleBasedRoutes(user.program, user.role);

    // ✅ 3. Handle dynamic routes like /course-hierarchy/[identifier]
    const isDynamicAllowed = programSpecificRoutes.some((route) =>
      router.pathname.startsWith(route.replace('[identifier]', ''))
    );

    // ✅ 4. Check if it's a public route
    const isPublicRoute = PUBLIC_ROUTES.includes(router.pathname);

    // ✅ 5. Check if the route exists in menuConfig or role-based routes
    const isAllowedRoute =
      allowedMenuRoutes.includes(router.pathname) ||
      programSpecificRoutes.includes(router.pathname);

    // console.log('router.pathname', router.pathname);
    // console.log(
    //   'router.pathname allowedMenuRoutes',
    //   JSON.stringify(allowedMenuRoutes)
    // );
    // console.log('router.pathname user', user);
    // console.log('router.pathname isPublicRoute', isPublicRoute);
    // console.log('router.pathname isAllowedRoute', isAllowedRoute);
    // console.log('router.pathname isDynamicAllowed', isDynamicAllowed);

    // Debug logging
    console.log('MenuWrapper Debug:', {
      pathname: router.pathname,
      user,
      allowedMenuRoutes,
      programSpecificRoutes,
      isPublicRoute,
      isAllowedRoute,
      isDynamicAllowed
    });

    // ✅ 6. Final route validation - only redirect if not already on unauthorized page
    if (!isPublicRoute && !isAllowedRoute && !isDynamicAllowed && router.pathname !== '/unauthorized') {
      console.warn('⚠️ Access denied for route:', router.pathname, 'User role:', user.role);
      router.replace('/unauthorized');
    }
  }, [user, router.pathname]);

  if (loading) return <div>Loading...</div>;

  return <>{children}</>;
};

export default MenuWrapper;
