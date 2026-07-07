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
  kitId?: string | null;
  kitName?: string | null;
  sourceSharedItemId?: string | null;
  responsibleUserId?: string | null;
  responsibleUserName?: string | null;
  createdByUserId?: string | null;
  createdByUserName?: string | null;
  photoUrl?: string | null;
  purchaseDate?: string | null;
  purchasePrice?: number | null;
  notes?: string | null;
  customFields?: ItemCustomField[];
  quantityBreakdown?: ItemDistribution[];
  totalQuantityAcrossCustodians?: number;
  submittedByUserId?: string | null;
  submittedByUserName?: string | null;
  targetScope?: string | null;
  reviewedByUserId?: string | null;
  rejectionReason?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type ItemCustomField = {
  id: string;
  fieldName: string;
  fieldValue?: string | null;
};

export type ItemDistribution = {
  holderName: string;
  quantity: number;
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
