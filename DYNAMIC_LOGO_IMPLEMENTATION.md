# Dynamic Logo Implementation Guide

## Overview

This implementation provides a tenant-specific dynamic logo system that automatically loads the appropriate logo based on the current tenant configuration. The system supports different logo types (sidebar, login, favicon) and includes fallback mechanisms.

## Architecture

### 1. Tenant Configuration Extension

The `TenantConfig` interface has been extended to include logo configuration:

```typescript
export interface TenantConfig {
  CHANNEL_ID: string;
  CONTENT_FRAMEWORK: string;
  COLLECTION_FRAMEWORK: string;
  LOGO_CONFIG?: {
    sidebar?: string;
    login?: string;
    favicon?: string;
    alt?: string;
  };
}
```

### 2. DynamicLogo Component

A reusable `DynamicLogo` component has been created for each MFE that:
- Fetches tenant configuration dynamically
- Supports different logo types (sidebar, login, favicon)
- Includes loading states and error handling
- Provides fallback to default logos
- Supports custom styling and dimensions

### 3. Implementation Locations

The dynamic logo system has been implemented across:

#### Admin App Repository
- **File**: `apps/admin-app-repo/src/components/DynamicLogo.tsx`
- **Updated Components**:
  - `apps/admin-app-repo/src/components/layouts/logo/LogoIcon.tsx`
  - `apps/admin-app-repo/src/pages/login.tsx`

#### Workspace MFE
- **File**: `mfes/workspace/src/components/DynamicLogo.tsx`
- **Updated Components**:
  - `mfes/workspace/src/components/SideBar.tsx`

#### Authentication MFE
- **File**: `mfes/authentication/src/components/DynamicLogo.tsx`
- **Updated Components**:
  - `mfes/authentication/src/pages/login.tsx`

#### SCP Teacher Repository MFE
- **File**: `mfes/scp-teacher-repo/src/components/DynamicLogo.tsx`
- **Updated Components**:
  - `mfes/scp-teacher-repo/src/pages/login.tsx`

## Usage

### Basic Usage

```tsx
import DynamicLogo from '../components/DynamicLogo';

// Sidebar logo
<DynamicLogo 
  type="sidebar" 
  width={100} 
  height={100} 
  fallbackSrc="/images/Logo.svg"
/>

// Login logo
<DynamicLogo
  type="login"
  width={200}
  height={80}
  fallbackSrc="/images/appLogo.png"
  style={{ width: '100%', height: 'auto' }}
/>
```

### Component Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `type` | `'sidebar' \| 'login' \| 'favicon'` | - | **Required**. Logo type to display |
| `width` | `number` | `100` | Logo width in pixels |
| `height` | `number` | `100` | Logo height in pixels |
| `alt` | `string` | Auto-generated | Alt text for the image |
| `fallbackSrc` | `string` | Type-specific default | Fallback logo source |
| `className` | `string` | - | CSS class name |
| `style` | `React.CSSProperties` | - | Inline styles |

## Tenant Configuration

### Adding Logo Configuration

To add logo configuration for a tenant, update the mock data in the respective API file:

```typescript
// Example: mfes/workspace/src/pages/api/tenantConfig.ts
'your-tenant-id': {
  CHANNEL_ID: 'your-channel',
  CONTENT_FRAMEWORK: 'your-framework',
  COLLECTION_FRAMEWORK: 'your-framework',
  LOGO_CONFIG: {
    sidebar: '/images/tenants/your-sidebar-logo.png',
    login: '/images/tenants/your-login-logo.png',
    favicon: '/images/tenants/your-favicon.ico',
    alt: 'Your Organization Logo'
  }
}
```

### Logo File Structure

Organize tenant logos in the following structure:

```
public/
├── images/
│   ├── tenants/
│   │   ├── colab-logo.png
│   │   ├── colab-favicon.ico
│   │   ├── kef-logo.png
│   │   ├── kef-favicon.ico
│   │   └── ...
│   ├── Logo.svg (default sidebar)
│   └── appLogo.png (default login)
└── favicon.ico (default favicon)
```

## Features

### 1. Automatic Tenant Detection
- Uses existing `TenantService` to fetch tenant configuration
- Automatically detects tenant ID from cookies/localStorage
- Caches configuration for performance

### 2. Fallback Mechanism
- Falls back to default logos if tenant-specific logos are not available
- Graceful error handling with console warnings
- Loading states with skeleton placeholders

### 3. Type-Specific Logos
- **Sidebar**: Optimized for sidebar display
- **Login**: Optimized for login page display
- **Favicon**: Browser tab icon

### 4. Performance Optimizations
- Lazy loading with Next.js Image component
- Priority loading for above-the-fold logos
- Cached tenant configuration

## Error Handling

The system includes comprehensive error handling:

1. **Network Errors**: Falls back to default logos
2. **Missing Configuration**: Uses fallback sources
3. **Image Load Errors**: Logs warnings and shows fallback
4. **Loading States**: Shows skeleton placeholders during fetch

## Migration Guide

### For Existing Components

1. **Replace static logo imports**:
   ```tsx
   // Before
   import appLogo from '../../public/images/appLogo.png';
   <Image src={appLogo} alt="Logo" width={100} height={100} />
   
   // After
   import DynamicLogo from '../components/DynamicLogo';
   <DynamicLogo type="login" width={100} height={100} fallbackSrc="/images/appLogo.png" />
   ```

2. **Update sidebar logos**:
   ```tsx
   // Before
   <img src="/logo.png" alt="logo" height={60} />
   
   // After
   <DynamicLogo type="sidebar" width={60} height={60} fallbackSrc="/logo.png" />
   ```

### For New Components

Use the `DynamicLogo` component directly with appropriate props based on the context (sidebar, login, etc.).

## Testing

### Manual Testing

1. **Test with different tenants**:
   - Switch tenant IDs in localStorage/cookies
   - Verify correct logos load for each tenant
   - Test fallback behavior with invalid tenant IDs

2. **Test error scenarios**:
   - Network failures
   - Missing logo files
   - Invalid tenant configurations

### Automated Testing

Consider adding unit tests for:
- Logo source resolution logic
- Fallback mechanisms
- Error handling
- Loading states

## Future Enhancements

1. **Logo Upload Interface**: Admin interface for uploading tenant logos
2. **Logo Optimization**: Automatic image optimization and resizing
3. **Logo Caching**: Enhanced caching strategies
4. **A/B Testing**: Support for multiple logo variants per tenant
5. **Logo Analytics**: Track logo usage and performance

## Troubleshooting

### Common Issues

1. **Logo not loading**:
   - Check tenant ID is set correctly
   - Verify logo file paths in tenant configuration
   - Check browser console for errors

2. **Fallback not working**:
   - Ensure fallback files exist in public directory
   - Check fallback source paths

3. **Performance issues**:
   - Verify tenant configuration caching
   - Check for unnecessary re-renders
   - Monitor network requests

### Debug Mode

Enable debug logging by adding console logs in the `DynamicLogo` component to trace:
- Tenant ID resolution
- Configuration fetching
- Logo source resolution
- Error conditions
