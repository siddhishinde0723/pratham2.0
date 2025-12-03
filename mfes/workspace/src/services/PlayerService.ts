import { URL_CONFIG } from "../utils/url.config";
import axios from "axios";

export const fetchContent = async (identifier: any, req?: any) => {
    try {
        const FIELDS = URL_CONFIG.PARAMS.CONTENT_GET;
        const LICENSE_DETAILS = URL_CONFIG.PARAMS.LICENSE_DETAILS;
        const MODE = "edit"; // Edit mode is required to get versionKey
        
        // Determine base URL - use absolute URL on server, relative on client
        const isServer = typeof window === 'undefined';
        let baseUrl = '';
        
        if (isServer) {
            // Server-side: use middleware URL (from curl: https://interface.tekdinext.com/interface/v1)
            baseUrl = (
                process.env.NEXT_PUBLIC_BASE_URL ||
                process.env.NEXT_PUBLIC_MIDDLEWARE_URL ||
                'https://interface.tekdinext.com/interface/v1'
            );
        }
        
        // Use the correct API endpoint: /action/content/v3/read/ (not /api/content/v1/read/)
        const API_PATH = isServer 
            ? `/action/content/v3/read/${identifier}`  // Server uses action endpoint
            : URL_CONFIG.API.CONTENT_READ + identifier; // Client uses relative path (will be proxied)
        
        const url = isServer 
            ? `${baseUrl}${API_PATH}?mode=${MODE}&fields=${FIELDS}&licenseDetails=${LICENSE_DETAILS}`
            : `${API_PATH}?fields=${FIELDS}&mode=${MODE}&licenseDetails=${LICENSE_DETAILS}`;
        
        console.log('[fetchContent] Fetching content in edit mode:', {
            identifier,
            url,
            mode: MODE,
            isServer,
            baseUrl: isServer ? baseUrl : 'client-side (relative)',
        });
        
        // On server, we need to add authentication headers and cookies
        const config: any = {};
        if (isServer) {
            // Get auth token from environment or request
            const authToken = process.env.AUTH_API_TOKEN;
            if (authToken) {
                config.headers = {
                    'Authorization': `Bearer ${authToken}`,
                };
            }
            
            // If request object is provided, forward cookies
            if (req && req.headers && req.headers.cookie) {
                config.headers = {
                    ...config.headers,
                    'Cookie': req.headers.cookie,
                };
            }
        }
        
        const response = await axios.get(url, config);
        
        const content = response.data.result.content;
        console.log('[fetchContent] Content fetched successfully:', {
            identifier: content?.identifier,
            versionKey: content?.versionKey,
            status: content?.status,
            hasVersionKey: !!content?.versionKey,
        });
        
        return content;
    } catch (error: any) {
        console.error('[fetchContent] Error fetching content:', error);
        console.error('[fetchContent] Error details:', {
            message: error?.message,
            url: error?.config?.url,
            status: error?.response?.status,
            response: error?.response?.data,
        });
        throw error;
    }
};