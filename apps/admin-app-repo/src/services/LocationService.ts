interface LocationOption {
  id: string;
  name: string;
}

interface LocationApiResponse {
  id: string;
  ver: string;
  ts: string;
  params: {
    resmsgid: string;
    status: string;
    err: any;
    errmsg: any;
    successmessage: string;
  };
  responseCode: number;
  result: {
    totalCount: number;
    fieldId: string;
    values: Array<{
      value: number;
      label: string;
      state_id?: number;
      state_name?: string;
      state_code?: string;
      [key: string]: any;
    }>;
  };
}

interface LocationApiRequest {
  limit: number;
  offset: number;
  fieldName: string;
  controllingfieldfk?: string[];
  optionName?: string; // For search functionality
}

class LocationService {
  private baseUrl = `${process.env.NEXT_PUBLIC_MIDDLEWARE_URL}/fields/options/read`;

  private getAuthToken(): string {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('token') || '';
    }
    return '';
  }

  private getTenantId(): string {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('tenantId') || '';
    }
    return '';
  }

  private toProperCase(str: string): string {
    if (!str) return str;

    // Convert to proper case: "BLOCK NAME" -> "Block name"
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private async makeRequest(requestData: LocationApiRequest): Promise<LocationApiResponse> {
    try {
      const token = this.getAuthToken();
      const tenantId = this.getTenantId();

      if (!token) {
        throw new Error('Authentication token not found. Please login again.');
      }

      if (!tenantId) {
        console.warn('Tenant ID not found in localStorage.');
      }

      console.log('📡 Location API Request:', {
        url: this.baseUrl,
        method: 'POST',
        headers: {
          accept: '*/*',
          Authorization: `Bearer ${token.substring(0, 20)}...`,
          'Content-Type': 'application/json',
          tenantId,
        },
        body: requestData,
      });

      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          accept: '*/*',
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          tenantId: tenantId,
        },
        body: JSON.stringify(requestData),
      });

      console.log('📨 Location API Response Status:', response.status);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed. Please login again.');
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Location API Response Data:', data);

      if (data && data.result && data.result.values) {
        return data;
      } else {
        console.warn('⚠️ Unexpected response format:', data);
        return {
          id: '',
          ver: '',
          ts: '',
          params: {
            resmsgid: '',
            status: 'failed',
            err: null,
            errmsg: null,
            successmessage: '',
          },
          responseCode: 500,
          result: { totalCount: 0, fieldId: '', values: [] },
        };
      }
    } catch (error) {
      console.error('❌ Location API request failed:', error);
      throw error;
    }
  }

  async getStates(): Promise<LocationOption[]> {
    try {
      const response = await this.makeRequest({
        limit: 100,
        offset: 0,
        fieldName: 'state',
      });

      if (response && response.result && response.result.values) {
        return response.result.values.map(item => ({
          id: item.value.toString(),
          name: item.label,
        }));
      }

      return [];
    } catch (error) {
      console.error('Failed to fetch states:', error);
      return [];
    }
  }

  async getDistricts(stateId: string): Promise<LocationOption[]> {
    try {
      const response = await this.makeRequest({
        limit: 100,
        offset: 0,
        fieldName: 'district',
        controllingfieldfk: [stateId],
      });

      if (response && response.result && response.result.values) {
        return response.result.values.map(item => ({
          id: item.value.toString(),
          name: item.label,
        }));
      }

      return [];
    } catch (error) {
      console.error('Failed to fetch districts:', error);
      return [];
    }
  }

  async getBlocks(districtId: string): Promise<LocationOption[]> {
    try {
      const response = await this.makeRequest({
        limit: 100,
        offset: 0,
        fieldName: 'block',
        controllingfieldfk: [districtId],
      });

      if (response && response.result && response.result.values) {
        return response.result.values.map(item => ({
          id: item.value.toString(),
          name: this.toProperCase(item.label),
        }));
      }

      return [];
    } catch (error) {
      console.error('Failed to fetch blocks:', error);
      return [];
    }
  }

  async getVillages(blockId: string): Promise<LocationOption[]> {
    try {
      const response = await this.makeRequest({
        limit: 100,
        offset: 0,
        fieldName: 'village',
        controllingfieldfk: [blockId],
      });

      if (response && response.result && response.result.values) {
        return response.result.values.map(item => ({
          id: item.value.toString(),
          name: this.toProperCase(item.label),
        }));
      }

      return [];
    } catch (error) {
      console.error('Failed to fetch villages:', error);
      return [];
    }
  }

  async searchLocations(
    fieldName: string,
    searchTerm: string,
    controllingfieldfk?: string[],
  ): Promise<LocationOption[]> {
    try {
      const response = await this.makeRequest({
        limit: 100,
        offset: 0,
        fieldName,
        controllingfieldfk,
        optionName: searchTerm,
      });

      if (response && response.result && response.result.values) {
        return response.result.values.map(item => ({
          id: item.value.toString(),
          name:
            fieldName === 'block' || fieldName === 'village'
              ? this.toProperCase(item.label)
              : item.label,
        }));
      }

      return [];
    } catch (error) {
      console.error(`Failed to search ${fieldName}:`, error);
      return [];
    }
  }
}

export default new LocationService();
