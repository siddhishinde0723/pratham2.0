export const getTenantId = () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    return localStorage.getItem('tenantId') || '';
  }
  return '';
};

export const TENANT_ID = getTenantId();
if (!TENANT_ID) {
  console.warn(
    'NEXT_PUBLIC_TENANT_ID is not set in the environment variables.'
  );
}
export const TEMPLATE_ID = 'cm7nbogii000moc3gth63l863';

export const jotFormId = process.env.NEXT_PUBLIC_JOTFORM_ID || '';
if (!jotFormId) {
  console.warn(
    'NEXT_PUBLIC_JOTFORM_ID is not set in the environment variables.'
  );
}
