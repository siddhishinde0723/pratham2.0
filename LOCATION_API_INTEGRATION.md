# Location API Integration

This document explains the integration of the location API into the create-groups page.

## Overview

The create-groups page now uses real API calls to fetch location data (states, districts, blocks, villages) instead of hardcoded data.

## API Endpoint

- **URL**: `https://shiksha-dev-interface.tekdinext.com/interface/v1/fields/options/read`
- **Method**: POST
- **Authentication**: Bearer token (stored in localStorage as 'token')

## API Request Format

```json
{
  "limit": 100,
  "offset": 0,
  "fieldName": "state|district|block|village",
  "controllingfieldfk": ["parent_id"], // Optional, only for dependent fields
  "optionName": "search_term" // Optional, for search functionality
}
```

### Examples:

**Fetch States:**
```json
{
  "limit": 100,
  "offset": 0,
  "fieldName": "state"
}
```

**Fetch Districts:**
```json
{
  "limit": 100,
  "offset": 0,
  "fieldName": "district",
  "controllingfieldfk": ["BR"]
}
```

**Fetch Blocks:**
```json
{
  "limit": 100,
  "offset": 0,
  "fieldName": "block",
  "controllingfieldfk": ["PAT"]
}
```

**Search by Name:**
```json
{
  "limit": 100,
  "offset": 0,
  "fieldName": "state",
  "optionName": "Bih"
}
```

## API Response Format

```json
{
  "id": "api.fieldValues.search",
  "ver": "1.0",
  "ts": "2025-09-24T12:47:31.402Z",
  "params": {
    "resmsgid": "99fd2306-c499-48cf-b2bb-60f54d4b61cb",
    "status": "successful",
    "err": null,
    "errmsg": null,
    "successmessage": "Field options fetched successfully."
  },
  "responseCode": 200,
  "result": {
    "totalCount": 4,
    "fieldId": "800265b1-9058-482a-94f4-726197e1dfe4",
    "values": [
      {
        "value": 1,
        "label": "Bihar",
        "state_id": 1,
        "state_name": "Bihar",
        "state_code": "BR",
        "is_active": 1
      }
    ]
  }
}
```

### Data Transformation

The service automatically transforms the API response to match the component's expected format:

```typescript
// API Response: { value: 1, label: "Bihar" }
// Transformed to: { id: "1", name: "Bihar" }
```

## Implementation Details

### LocationService

The `LocationService` class handles all API calls:

- `getStates()` - Fetches all states (no controlling field)
- `getDistricts(stateId)` - Fetches districts for a specific state
- `getBlocks(districtId)` - Fetches blocks for a specific district  
- `getVillages(blockId)` - Fetches villages for a specific block

### Component Updates

The create-groups component now:

1. **Loads states on mount** - Fetches states when the component loads
2. **Cascading dropdowns** - When a state is selected, it fetches districts; when a district is selected, it fetches blocks; etc.
3. **Loading states** - Shows loading indicators while fetching data
4. **Error handling** - Displays error messages if API calls fail
5. **Authentication** - Uses the token from localStorage for API authentication

### User Experience

- States dropdown loads automatically when the page loads
- Selecting a state enables the districts dropdown and loads district data
- Selecting a district enables the blocks dropdown and loads block data
- Selecting a block enables the villages dropdown and loads village data
- Loading indicators show while data is being fetched
- Error messages appear if API calls fail

## Authentication

The service automatically uses the authentication token stored in localStorage with the key 'token'. If no token is found, it will throw an authentication error.

## Error Handling

The integration includes comprehensive error handling:

- **No token**: "Authentication token not found. Please login again."
- **401 Unauthorized**: "Authentication failed. Please login again."
- **Other HTTP errors**: Shows the HTTP status code
- **Network errors**: Logs the error and shows a generic failure message

## Testing

To test the integration:

1. Ensure you're logged in and have a valid token in localStorage
2. Navigate to the create-groups page
3. Verify that states load automatically
4. Select a state and verify districts load
5. Select a district and verify blocks load
6. Select a block and verify villages load
7. Test error scenarios (invalid token, network issues)

## Future Enhancements

- Add caching for location data to reduce API calls
- Implement retry logic for failed requests
- Add offline support with cached data
- Add search/filter functionality for large location lists
