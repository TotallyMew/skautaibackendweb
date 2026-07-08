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

export type RegisterTuntininkasRequest = {
  name: string;
  surname: string;
  email: string;
  password: string;
  phone?: string | null;
  tuntasName: string;
  tuntasKrastas?: string | null;
  tuntasContactEmail?: string | null;
};

export type RegisterWithInviteRequest = {
  name: string;
  surname: string;
  email: string;
  password: string;
  phone?: string | null;
  inviteCode: string;
};

export type MessageResponse = {
  message: string;
};

export type ApiErrorBody = {
  error?: string;
  message?: string;
};

export type AdminTuntas = {
  id: string;
  name: string;
  krastas: string;
  status: string;
  contactEmail: string;
};

export type SuperAdminNotificationRequest = {
  title: string;
  body: string;
  tuntasId?: string | null;
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

export type CreateItemRequest = {
  name: string;
  description?: string | null;
  type: string;
  category: string;
  custodianId?: string | null;
  origin?: string;
  quantity: number;
  isConsumable?: boolean;
  unitOfMeasure?: string;
  minimumQuantity?: number | null;
  condition?: string;
  locationId?: string | null;
  temporaryStorageLabel?: string | null;
  responsibleUserId?: string | null;
  purchaseDate?: string | null;
  purchasePrice?: number | null;
  notes?: string | null;
  customFields?: ItemCustomFieldRequest[];
  duplicateHandling?: string;
};

export type ItemCustomFieldRequest = {
  fieldName: string;
  fieldValue?: string | null;
};

export type ReservationItem = {
  itemId: string;
  itemName: string;
  quantity: number;
  custodianId?: string | null;
  custodianName?: string | null;
  remainingAfterReservation?: number | null;
  issuedQuantity?: number;
  returnedQuantity?: number;
  markedReturnedQuantity?: number;
  remainingToIssue?: number;
  remainingToReturn?: number;
  remainingToMarkReturned?: number;
  remainingToReceive?: number;
};

export type Reservation = {
  id: string;
  title: string;
  tuntasId: string;
  reservedByUserId: string;
  reservedByName?: string | null;
  approvedByUserId?: string | null;
  requestingUnitId?: string | null;
  requestingUnitName?: string | null;
  eventId?: string | null;
  totalItems: number;
  totalQuantity: number;
  startDate: string;
  endDate: string;
  status: string;
  unitReviewStatus?: string;
  topLevelReviewStatus?: string;
  pickupAt?: string | null;
  pickupLocationId?: string | null;
  pickupLocationPath?: string | null;
  pickupProposalStatus?: string;
  returnAt?: string | null;
  returnLocationId?: string | null;
  returnLocationPath?: string | null;
  returnProposalStatus?: string;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  items: ReservationItem[];
};

export type ReservationListResponse = {
  reservations: Reservation[];
  total: number;
  limit?: number | null;
  offset: number;
  hasMore: boolean;
};

export type ReservationListFilters = {
  status?: string;
  itemId?: string;
  limit?: number;
  offset?: number;
};

export type RequisitionItem = {
  id: string;
  itemId?: string | null;
  requestType: string;
  existingItemId?: string | null;
  itemName: string;
  itemDescription?: string | null;
  quantityRequested: number;
  quantityApproved?: number | null;
  rejectionReason?: string | null;
  notes?: string | null;
};

export type Requisition = {
  id: string;
  tuntasId: string;
  createdByUserId: string;
  requestingUnitId?: string | null;
  requestingUnitName?: string | null;
  status: string;
  unitReviewStatus: string;
  topLevelReviewStatus: string;
  purchasedAt?: string | null;
  addedToInventoryAt?: string | null;
  reviewLevel: string;
  lastAction: string;
  neededByDate?: string | null;
  notes?: string | null;
  items: RequisitionItem[];
  createdAt: string;
  updatedAt: string;
};

export type RequisitionListResponse = {
  requests: Requisition[];
  total: number;
};

export type SharedInventoryRequestItem = {
  id: string;
  itemId: string;
  itemName: string;
  quantity: number;
};

export type SharedInventoryRequest = {
  id: string;
  tuntasId: string;
  requestedByUserId: string;
  requestedByUserName?: string | null;
  itemId?: string | null;
  itemName: string;
  itemDescription?: string | null;
  quantity: number;
  neededByDate?: string | null;
  eventId?: string | null;
  requestingUnitId?: string | null;
  requestingUnitName?: string | null;
  needsDraugininkasApproval: boolean;
  draugininkasStatus?: string | null;
  topLevelStatus: string;
  notes?: string | null;
  items: SharedInventoryRequestItem[];
  createdAt: string;
  updatedAt: string;
};

export type SharedInventoryRequestListResponse = {
  requests: SharedInventoryRequest[];
  total: number;
};

export type MemberLeadershipRole = {
  id: string;
  roleId: string;
  roleName: string;
  organizationalUnitId?: string | null;
  organizationalUnitName?: string | null;
  assignedByUserId?: string | null;
  assignedAt: string;
  startsAt?: string | null;
  expiresAt?: string | null;
  leftAt?: string | null;
  termNumber: number;
  termStatus: string;
};

export type MemberRank = {
  id: string;
  roleId: string;
  roleName: string;
  assignedByUserId?: string | null;
  assignedAt: string;
};

export type MemberUnitAssignment = {
  id: string;
  organizationalUnitId: string;
  organizationalUnitName: string;
  assignmentType: string;
  isPubliclyVisible?: boolean;
  joinedAt: string;
};

export type Member = {
  userId: string;
  name: string;
  surname: string;
  email: string;
  phone?: string | null;
  joinedAt: string;
  unitAssignments?: MemberUnitAssignment[] | null;
  leadershipRoles?: MemberLeadershipRole[] | null;
  leadershipRoleHistory?: MemberLeadershipRole[] | null;
  ranks?: MemberRank[] | null;
  isIdentityHidden?: boolean;
};

export type MemberListResponse = {
  members: Member[];
  total: number;
};

export type EventRole = {
  id: string;
  userId: string;
  userName?: string | null;
  role: string;
  targetGroup?: string | null;
  pastovykleId?: string | null;
  assignedByUserId?: string | null;
  assignedAt: string;
};

export type EventInventorySummary = {
  totalPlannedQuantity: number;
  totalAvailableQuantity: number;
  totalShortageQuantity: number;
  totalAllocatedQuantity: number;
  itemsNeedingPurchase: number;
};

export type EventFinanceSummary = {
  inventoryBudgetAmount?: number | null;
  purchaseTotal: number;
  extraCostTotal: number;
  spentTotal: number;
  remainingAmount?: number | null;
  overBudget: boolean;
};

export type Event = {
  id: string;
  tuntasId: string;
  name: string;
  type: string;
  customTypeLabel?: string | null;
  startDate: string;
  endDate: string;
  locationId?: string | null;
  organizationalUnitId?: string | null;
  createdByUserId?: string | null;
  status: string;
  inventoryBudgetAmount?: number | null;
  notes?: string | null;
  createdAt: string;
  eventRoles: EventRole[];
  inventorySummary?: EventInventorySummary | null;
  financeSummary?: EventFinanceSummary | null;
};

export type EventListResponse = {
  events: Event[];
  total: number;
  limit?: number | null;
  offset: number;
  hasMore: boolean;
};

export type EventListFilters = {
  type?: string;
  status?: string;
  limit?: number;
  offset?: number;
};

export type MyTask = {
  id: string;
  type: string;
  title: string;
  subtitle: string;
  count?: number | null;
  priority: number;
  urgency: string;
  bucket: string;
  routeTarget: string;
  createdAt: string;
  dueAt?: string | null;
  entityId?: string | null;
};

export type MyTaskListResponse = {
  tasks: MyTask[];
  total: number;
};
