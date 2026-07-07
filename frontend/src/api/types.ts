export type UserTuntas = {
  id: string;
  name: string;
  krastas: string;
  contactEmail: string;
  status: string;
};

export type TokenResponse = {
  token: string;
  refreshToken?: string | null;
  userId: string;
  email: string;
  name: string;
  type: string;
  tuntai?: UserTuntas[];
};

export type PermissionsResponse = {
  permissions: string[];
  leadershipUnitIds: string[];
};

export type LoginRequest = {
  email: string;
  password: string;
};

export type ApiErrorBody = {
  error?: string;
  message?: string;
};

export type Item = {
  id: string;
  qrToken: string;
  tuntasId: string;
  custodianId?: string | null;
  custodianName?: string | null;
  origin: string;
  name: string;
  description?: string | null;
  type: string;
  category: string;
  condition: string;
  quantity: number;
  isConsumable?: boolean;
  unitOfMeasure?: string;
  minimumQuantity?: number | null;
  isLowStock?: boolean;
  locationId?: string | null;
  locationName?: string | null;
  locationPath?: string | null;
  temporaryStorageLabel?: string | null;
  responsibleUserId?: string | null;
  responsibleUserName?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type ItemListResponse = {
  items: Item[];
  total: number;
  limit?: number | null;
  offset: number;
  hasMore: boolean;
};

export type ItemListFilters = {
  q?: string;
  status?: string;
  type?: string;
  category?: string;
  sharedOnly?: boolean;
  limit?: number;
  offset?: number;
};
