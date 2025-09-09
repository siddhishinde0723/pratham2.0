interface SidebarProps {
  selectedKey: string;
  onSelect: any;
}

interface DashboardContentProps {
  selectedKey: any;
}

interface content {
  resource: any;
  url: any;
  access: any;
  appicon: string;
  posterImage: string;
  author?: any;
  creator?: any;
  name: string;
  status: string;
  lastUpdatedOn: string;
  appIcon: string;
  contentType: string;
  description?: string;
  identifier?: string;
  mimeType?: string;
  primaryCategory: string;
  mode?: string;
  state?:string
}
