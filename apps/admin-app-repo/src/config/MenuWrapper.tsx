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
    const storedRole = localStorage.getItem('roleName');
    const storedProgram = localStorage.getItem('program');

    if (storedRole && storedProgram) {
      setUser({ role: storedRole, program: storedProgram });
    } else if (!PUBLIC_ROUTES.includes(router.pathname)) {
      // Redirect only if the route is NOT public
      router.replace('/login');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user) return;

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
      router.replace('/unauthorized');
    }
  }, [user, router.pathname]);

  if (loading) return <div>Loading...</div>;

  return <>{children}</>;
};

export default MenuWrapper;
