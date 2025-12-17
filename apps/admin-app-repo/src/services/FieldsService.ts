import axios from 'axios';

export interface FieldSearchRequest {
  limit?: number;
  offset?: number;
  filters?: Record<string, any>;
}

export interface Field {
  fieldId: string;
  name: string;
  label?: string;
  type?: string;
  [key: string]: any;
}

export interface FieldsSearchResponse {
  result: Field[]; // result is directly an array of fields
}

const FIELDS_SEARCH_URL = 'https://interface.tekdinext.com/interface/v1/fields/search';

/**
 * Search for fields using the fields/search API
 * @param request - Search request with limit, offset, and filters
 * @param tenantId - Tenant ID to pass in header
 * @returns Promise with fields array
 */
export const searchFields = async (
  request: FieldSearchRequest = { limit: 100, offset: 0, filters: {} },
  tenantId?: string
): Promise<Field[]> => {
  try {
    // Get tenantId from localStorage if not provided
    const finalTenantId = tenantId || (typeof window !== 'undefined' ? localStorage.getItem('tenantId') : null);
    
    // Get auth token from localStorage
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    
    // Prepare headers
    const headers: Record<string, string> = {
      'accept': '*/*',
      'Content-Type': 'application/json',
    };
    
    if (finalTenantId) {
      headers['tenantId'] = finalTenantId;
    }
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Make the API call directly (not through RestClient to avoid interceptor issues)
    const response = await axios.post(FIELDS_SEARCH_URL, request, { headers });
    
    // The API returns result as an array directly, not result.fields
    if (response?.data?.result && Array.isArray(response.data.result)) {
      return response.data.result;
    }
    
    return [];
  } catch (error) {
    console.error('Error searching fields:', error);
    throw error;
  }
};

/**
 * Get field IDs by field names (case-insensitive partial match)
 * @param fieldNames - Array of field names to search for (e.g., ['State', 'District', 'Block', 'Village'])
 * @param tenantId - Optional tenant ID
 * @returns Promise with object mapping field names to field IDs
 */
export const getFieldIdsByName = async (
  fieldNames: string[],
  tenantId?: string
): Promise<Record<string, string>> => {
  try {
    const fields = await searchFields({ limit: 100, offset: 0, filters: {} }, tenantId);
    
    console.log(`[FieldsService] Found ${fields.length} fields from API`);
    console.log('[FieldsService] Sample fields:', fields.slice(0, 5).map(f => ({ fieldId: f.fieldId, name: f.name, label: f.label })));
    
    const fieldMap: Record<string, string> = {};
    
    fieldNames.forEach((fieldName) => {
      // Try to find field by name (case-insensitive)
      // Priority: exact label match > exact name match > partial match
      // Note: API returns name in lowercase (e.g., "state") and label capitalized (e.g., "State")
      let field = fields.find(
        (f) => f.label?.toLowerCase() === fieldName.toLowerCase()
      );
      
      if (!field) {
        field = fields.find(
          (f) => f.name?.toLowerCase() === fieldName.toLowerCase()
        );
      }
      
      if (!field) {
        field = fields.find(
          (f) =>
            f.name?.toLowerCase().includes(fieldName.toLowerCase()) ||
            f.label?.toLowerCase().includes(fieldName.toLowerCase())
        );
      }
      
      if (field?.fieldId) {
        fieldMap[fieldName] = field.fieldId;
        console.log(`[FieldsService] Matched "${fieldName}" to field ID: ${field.fieldId} (name: ${field.name}, label: ${field.label})`);
      } else {
        console.warn(`[FieldsService] Could not find field matching "${fieldName}"`);
        // Log available field names for debugging
        const availableNames = fields.map(f => ({ name: f.name, label: f.label })).filter(f => f.name || f.label).slice(0, 10);
        console.log(`[FieldsService] Available field names (first 10):`, availableNames);
      }
    });
    
    console.log('[FieldsService] Final field map:', fieldMap);
    return fieldMap;
  } catch (error) {
    console.error('Error getting field IDs by name:', error);
    throw error;
  }
};

