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

export type MyProfile = {
  userId: string;
  name: string;
  surname: string;
  email: string;
  phone?: string | null;
  createdAt: string;
  updatedAt: string;
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

export type ForgotPasswordRequest = {
  email: string;
};

export type ResetPasswordRequest = {
  token: string;
  newPassword: string;
};

export type UpdateMyProfileRequest = {
  name: string;
  surname: string;
  email: string;
  phone?: string | null;
};

export type ChangeMyPasswordRequest = {
  currentPassword: string;
  newPassword: string;
};

export type RequestAccountDeletionRequest = {
  password: string;
};

export type Notification = {
  id: string;
  tuntasId?: string | null;
  title: string;
  body: string;
  resource?: string | null;
  entityId?: string | null;
  data: Record<string, string>;
  readAt?: string | null;
  createdAt: string;
};

export type NotificationListResponse = {
  notifications: Notification[];
  total: number;
  unreadCount: number;
};

export type Location = {
  id: string;
  tuntasId: string;
  name: string;
  visibility: string;
  parentLocationId?: string | null;
  ownerUserId?: string | null;
  ownerUnitId?: string | null;
  ownerUnitName?: string | null;
  fullPath: string;
  hasChildren: boolean;
  isLeafSelectable: boolean;
  isEditable: boolean;
  address?: string | null;
  description?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  createdAt: string;
};

export type LocationListResponse = {
  locations: Location[];
  total: number;
};

export type CreateLocationRequest = {
  name: string;
  visibility: string;
  parentLocationId?: string | null;
  ownerUnitId?: string | null;
  address?: string | null;
  description?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

export type UpdateLocationRequest = Partial<CreateLocationRequest>;

export type AcceptInvitationRequest = {
  code: string;
};

export type InvitationResponse = {
  code: string;
  tuntasId: string;
  roleName: string;
  tuntasName: string;
  expiresAt: string;
  organizationalUnitId?: string | null;
  organizationalUnitName?: string | null;
};

export type CreateInvitationRequest = {
  roleId: string;
  organizationalUnitId?: string | null;
  expiresInHours?: number;
  expiresAt?: string | null;
};

export type Role = {
  id: string;
  name: string;
  roleType: string;
  isSystemRole: boolean;
};

export type RoleListResponse = {
  roles: Role[];
  total: number;
};

export type OrganizationalUnit = {
  id: string;
  tuntasId: string;
  name: string;
  type: string;
  subType?: string | null;
  acceptedRankId?: string | null;
  acceptedRankName?: string | null;
  memberCount: number;
  itemCount: number;
  createdAt: string;
};

export type OrganizationalUnitListResponse = {
  units: OrganizationalUnit[];
  total: number;
};

export type CreateOrganizationalUnitRequest = {
  name: string;
  type: string;
  subType?: string | null;
  acceptedRankId?: string | null;
};

export type UpdateOrganizationalUnitRequest = {
  name?: string | null;
  acceptedRankId?: string | null;
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
  personalOwnerUserId?: string;
  updatedAfter?: string;
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
  duplicateTargetItemId?: string | null;
};

export type ItemCustomFieldRequest = {
  fieldName: string;
  fieldValue?: string | null;
};

export type UpdateItemRequest = Partial<CreateItemRequest> & {
  status?: string | null;
  clearCustodianId?: boolean;
  clearLocationId?: boolean;
  clearSourceSharedItemId?: boolean;
  clearResponsibleUserId?: boolean;
  clearMinimumQuantity?: boolean;
};

export type TransferItemToUnitRequest = {
  targetUnitId: string;
  quantity: number;
  notes?: string | null;
};

export type ReturnItemToSharedRequest = {
  quantity: number;
  notes?: string | null;
};

export type DirectItemLoanRequest = {
  issuedToUserId: string;
  quantity: number;
  dueAt?: string | null;
  notes?: string | null;
};

export type ReturnDirectItemLoanRequest = {
  quantity: number;
  notes?: string | null;
};

export type RestockItemRequest = {
  quantity: number;
  purchaseDate?: string | null;
  purchasePrice?: number | null;
  notes?: string | null;
};

export type ConsumeItemRequest = {
  quantity: number;
  notes?: string | null;
};

export type WriteOffItemRequest = {
  reason: string;
};

export type ReviewItemAdditionRequest = {
  decision: string;
  rejectionReason?: string | null;
};

export type ItemAssignment = {
  id: string;
  itemId: string;
  assignedToUserId: string;
  assignedToUserName?: string | null;
  assignedByUserId?: string | null;
  assignedByUserName?: string | null;
  assignedAt: string;
  unassignedAt?: string | null;
  reason?: string | null;
  notes?: string | null;
};

export type ItemAssignmentListResponse = {
  assignments: ItemAssignment[];
  total: number;
};

export type DirectItemLoan = {
  id: string;
  itemId: string;
  itemName?: string | null;
  issuedToUserId: string;
  issuedToUserName?: string | null;
  issuedByUserId: string;
  issuedByUserName?: string | null;
  quantity: number;
  returnedQuantity: number;
  outstandingQuantity: number;
  status: string;
  issuedAt: string;
  returnedAt?: string | null;
  dueAt?: string | null;
  notes?: string | null;
};

export type DirectItemLoanListResponse = {
  loans: DirectItemLoan[];
  total: number;
  activeOutstandingQuantity: number;
};

export type ItemConditionLogEntry = {
  id: string;
  itemId: string;
  previousCondition?: string | null;
  newCondition: string;
  reportedByUserId?: string | null;
  reportedByUserName?: string | null;
  reportedAt: string;
  notes?: string | null;
};

export type ItemConditionLogListResponse = {
  entries: ItemConditionLogEntry[];
  total: number;
};

export type ItemTransfer = {
  id: string;
  itemId: string;
  fromCustodianId?: string | null;
  fromCustodianName?: string | null;
  toCustodianId?: string | null;
  toCustodianName?: string | null;
  initiatedByUserId?: string | null;
  initiatedByUserName?: string | null;
  approvedByUserId?: string | null;
  approvedByUserName?: string | null;
  notes?: string | null;
  status: string;
  createdAt: string;
  completedAt?: string | null;
};

export type ItemTransferListResponse = {
  transfers: ItemTransfer[];
  total: number;
};

export type ItemHistoryEntry = {
  id: string;
  itemId: string;
  eventType: string;
  quantityChange?: number | null;
  performedByUserId?: string | null;
  performedByUserName?: string | null;
  requisitionId?: string | null;
  notes?: string | null;
  createdAt: string;
};

export type ItemHistoryListResponse = {
  entries: ItemHistoryEntry[];
  total: number;
};

export type ItemQrResolveResponse = {
  itemId: string;
};

export type CreateStorageAuditSessionRequest = {
  custodianId?: string | null;
  type?: string | null;
  category?: string | null;
  sharedOnly?: boolean;
  personalOwnerUserId?: string | null;
  notes?: string | null;
};

export type UpsertStorageAuditCheckRequest = {
  itemId: string;
  result: string;
  actualQuantity?: number | null;
  actualLocationId?: string | null;
  actualLocationNote?: string | null;
  conditionAtCheck?: string | null;
  notes?: string | null;
};

export type UpsertStorageAuditChecksRequest = {
  checks: UpsertStorageAuditCheckRequest[];
};

export type ItemCheck = {
  id: string;
  sessionId: string;
  itemId?: string | null;
  eventInventoryItemId?: string | null;
  custodyId?: string | null;
  itemName?: string | null;
  qrToken?: string | null;
  result: string;
  quantity: number;
  expectedQuantity: number;
  actualQuantity: number;
  quantityDifference: number;
  quantityChangeDirection: string;
  actualLocationId?: string | null;
  actualLocationPath?: string | null;
  actualLocationNote?: string | null;
  conditionAtCheck?: string | null;
  checkedByUserId: string;
  checkedByUserName?: string | null;
  checkedAt: string;
  notes?: string | null;
};

export type ItemCheckSummary = {
  total: number;
  checked: number;
  unchecked: number;
  found: number;
  missing: number;
  misplaced: number;
  damaged: number;
  consumed: number;
  returned: number;
  matched: number;
  decreased: number;
  increased: number;
  expectedQuantityTotal: number;
  actualQuantityTotal: number;
  shortageQuantityTotal: number;
  overageQuantityTotal: number;
};

export type ItemCheckSession = {
  id: string;
  tuntasId: string;
  contextType: string;
  status: string;
  eventId?: string | null;
  scopeCustodianId?: string | null;
  scopeCustodianName?: string | null;
  scopeType?: string | null;
  scopeCategory?: string | null;
  scopeSharedOnly: boolean;
  scopePersonalOwnerUserId?: string | null;
  startedByUserId: string;
  startedByUserName?: string | null;
  completedByUserId?: string | null;
  completedByUserName?: string | null;
  notes?: string | null;
  createdAt: string;
  completedAt?: string | null;
  summary: ItemCheckSummary;
  checks: ItemCheck[];
};

export type ItemCheckSessionListResponse = {
  sessions: ItemCheckSession[];
  total: number;
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
  unitReviewedByUserId?: string | null;
  unitReviewedAt?: string | null;
  topLevelReviewStatus?: string;
  topLevelReviewedByUserId?: string | null;
  topLevelReviewedAt?: string | null;
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
  updatedAfter?: string;
  limit?: number;
  offset?: number;
};

export type CreateReservationItemRequest = {
  itemId: string;
  quantity: number;
};

export type CreateReservationRequest = {
  title: string;
  items: CreateReservationItemRequest[];
  startDate: string;
  endDate: string;
  requestingUnitId?: string | null;
  eventId?: string | null;
  pickupLocationId?: string | null;
  returnLocationId?: string | null;
  notes?: string | null;
};

export type ReservationAvailabilityItem = {
  itemId: string;
  totalQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
};

export type ReservationAvailabilityResponse = {
  startDate: string;
  endDate: string;
  items: ReservationAvailabilityItem[];
};

export type ReviewReservationRequest = {
  status: string;
  notes?: string | null;
};

export type ReservationMovementItemRequest = {
  itemId: string;
  quantity: number;
};

export type ReservationMovementRequest = {
  items: ReservationMovementItemRequest[];
  locationId?: string | null;
  notes?: string | null;
};

export type ReservationMovement = {
  id: string;
  reservationId: string;
  itemId: string;
  itemName?: string | null;
  locationId?: string | null;
  locationPath?: string | null;
  type: string;
  quantity: number;
  performedByUserId: string;
  notes?: string | null;
  createdAt: string;
};

export type ReservationMovementListResponse = {
  movements: ReservationMovement[];
  total: number;
};

export type UpdateReservationPickupRequest = {
  pickupAt?: string | null;
  pickupLocationId?: string | null;
  response?: string | null;
};

export type UpdateReservationReturnTimeRequest = {
  returnAt?: string | null;
  returnLocationId?: string | null;
  response?: string | null;
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

export type CreateRequisitionItemRequest = {
  itemName: string;
  itemDescription?: string | null;
  quantity?: number;
  notes?: string | null;
  requestType?: string;
  existingItemId?: string | null;
};

export type CreateRequisitionRequest = {
  requestingUnitId?: string | null;
  neededByDate?: string | null;
  notes?: string | null;
  items: CreateRequisitionItemRequest[];
};

export type RequisitionUnitReviewRequest = {
  action: string;
  rejectionReason?: string | null;
};

export type RequisitionTopLevelReviewRequest = {
  action: string;
  rejectionReason?: string | null;
};

export type RequisitionMarkPurchasedRequest = {
  notes?: string | null;
};

export type AddRequisitionItemToInventoryRequest = {
  requisitionItemId: string;
  action: string;
  existingItemId?: string | null;
  custodianId?: string | null;
  type?: string;
  category?: string;
  condition?: string;
  purchaseDate?: string | null;
  purchasePrice?: number | null;
  notes?: string | null;
};

export type AddRequisitionToInventoryRequest = {
  items: AddRequisitionItemToInventoryRequest[];
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

export type CreateSharedInventoryRequestItemRequest = {
  itemId: string;
  quantity?: number;
};

export type CreateSharedInventoryRequestRequest = {
  itemId?: string | null;
  itemDescription?: string | null;
  quantity?: number;
  neededByDate?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  requestingUnitId?: string | null;
  needsDraugininkasApproval?: boolean | null;
  notes?: string | null;
  items?: CreateSharedInventoryRequestItemRequest[];
};

export type SharedInventoryUnitReviewRequest = {
  action: string;
  rejectionReason?: string | null;
};

export type SharedInventoryTopLevelReviewRequest = {
  action: string;
  rejectionReason?: string | null;
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

export type AssignLeadershipRoleRequest = {
  roleId: string;
  organizationalUnitId?: string | null;
  startsAt?: string | null;
  expiresAt?: string | null;
  termNumber?: number;
};

export type UpdateLeadershipRoleRequest = {
  startsAt?: string | null;
  expiresAt?: string | null;
  termStatus?: string | null;
  organizationalUnitId?: string | null;
};

export type TransferTuntininkasRequest = {
  successorUserId: string;
};

export type CreateLeadershipChangeRequest = {
  reason?: string | null;
};

export type ReviewLeadershipChangeRequest = {
  action: string;
  successorUserId?: string | null;
  reviewNote?: string | null;
};

export type AssignRankRequest = {
  roleId: string;
};

export type LeadershipChangeRequest = {
  id: string;
  tuntasId: string;
  requesterUserId: string;
  requesterName: string;
  roleAssignmentId: string;
  roleId: string;
  roleName: string;
  organizationalUnitId: string;
  organizationalUnitName: string;
  status: string;
  reason?: string | null;
  reviewedByUserId?: string | null;
  successorUserId?: string | null;
  successorName?: string | null;
  reviewNote?: string | null;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string | null;
  resolvedAssignmentId?: string | null;
};

export type LeadershipChangeRequestListResponse = {
  requests: LeadershipChangeRequest[];
  total: number;
};

export type SeniorUnitAccessAudit = {
  id: string;
  actorUserId: string;
  actorUserName: string;
  action: string;
  accessMode: string;
  createdAt: string;
};

export type SeniorUnitAccessAuditListResponse = {
  entries: SeniorUnitAccessAudit[];
  total: number;
};

export type UnitMemberVisibilityRequest = {
  isPubliclyVisible: boolean;
};

export type UnitMemberMoveRequest = {
  targetOrganizationalUnitId: string;
};

export type InventoryKitItemRequest = {
  itemId: string;
  quantity?: number;
  notes?: string | null;
};

export type CreateInventoryKitRequest = {
  name: string;
  description?: string | null;
  custodianId?: string | null;
  locationId?: string | null;
  temporaryStorageLabel?: string | null;
  responsibleUserId?: string | null;
  items?: InventoryKitItemRequest[];
};

export type UpdateInventoryKitRequest = Partial<CreateInventoryKitRequest> & {
  status?: string | null;
  clearLocationId?: boolean;
  clearResponsibleUserId?: boolean;
};

export type InventoryKitItem = {
  id: string;
  itemId: string;
  itemName: string;
  itemCondition: string;
  itemStatus: string;
  availableQuantity: number;
  quantity: number;
  locationId?: string | null;
  locationName?: string | null;
  locationPath?: string | null;
  notes?: string | null;
};

export type InventoryKit = {
  id: string;
  tuntasId: string;
  custodianId?: string | null;
  custodianName?: string | null;
  name: string;
  description?: string | null;
  locationId?: string | null;
  locationName?: string | null;
  locationPath?: string | null;
  temporaryStorageLabel?: string | null;
  responsibleUserId?: string | null;
  responsibleUserName?: string | null;
  createdByUserId?: string | null;
  createdByUserName?: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
  items: InventoryKitItem[];
};

export type InventoryKitListResponse = {
  kits: InventoryKit[];
  total: number;
};

export type InventoryTemplateItemRequest = {
  itemId?: string | null;
  itemName: string;
  quantity?: number;
  category?: string | null;
  notes?: string | null;
};

export type CreateInventoryTemplateRequest = {
  name: string;
  eventType?: string | null;
  items?: InventoryTemplateItemRequest[];
};

export type UpdateInventoryTemplateRequest = Partial<CreateInventoryTemplateRequest>;

export type ApplyInventoryTemplateRequest = {
  templateId: string;
};

export type InventoryTemplateItem = {
  id: string;
  templateId: string;
  itemId?: string | null;
  itemName: string;
  quantity: number;
  category?: string | null;
  notes?: string | null;
};

export type InventoryTemplate = {
  id: string;
  tuntasId: string;
  name: string;
  eventType?: string | null;
  createdByUserId?: string | null;
  createdByUserName?: string | null;
  createdAt: string;
  items: InventoryTemplateItem[];
};

export type InventoryTemplateListResponse = {
  templates: InventoryTemplate[];
  total: number;
};

export type AppliedInventoryTemplateResponse = {
  reserved: Array<Record<string, unknown>>;
  toPurchase: Array<Record<string, unknown>>;
  sources: Array<Record<string, unknown>>;
  shortages: Array<Record<string, unknown>>;
  reservedTotal: number;
  toPurchaseTotal: number;
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

export type CreateEventRequest = {
  name: string;
  type: string;
  customTypeLabel?: string | null;
  startDate: string;
  endDate: string;
  locationId?: string | null;
  organizationalUnitId?: string | null;
  notes?: string | null;
};

export type UpdateEventRequest = Partial<CreateEventRequest> & {
  status?: string | null;
};

export type EventWorkspacePayload = Record<string, unknown>;

export type EventCandidateMembersResponse = {
  members: Member[];
  total: number;
};

export type UpdateEventFinanceBudgetRequest = {
  inventoryBudgetAmount?: number | null;
};

export type AssignEventRoleRequest = {
  userId: string;
  role: string;
  targetGroup?: string | null;
  pastovykleId?: string | null;
};

export type CreateEventInventoryBucketRequest = {
  name: string;
  type: string;
  pastovykleId?: string | null;
  locationId?: string | null;
  notes?: string | null;
};

export type UpdateEventInventoryBucketRequest = Partial<CreateEventInventoryBucketRequest>;

export type CreateEventInventoryItemRequest = {
  itemId?: string | null;
  name: string;
  plannedQuantity: number;
  bucketId?: string | null;
  responsibleUserId?: string | null;
  notes?: string | null;
};

export type CreateEventInventoryItemsBulkRequest = {
  items: CreateEventInventoryItemRequest[];
};

export type UpdateEventInventoryItemRequest = Partial<CreateEventInventoryItemRequest>;

export type CreateEventInventorySourceRequest = {
  itemId?: string | null;
  plannedQuantity: number;
  notes?: string | null;
};

export type UpdateEventInventorySourceRequest = {
  plannedQuantity?: number | null;
  notes?: string | null;
  sourceStatus?: string | null;
};

export type CreateEventInventoryAllocationRequest = {
  eventInventoryItemId: string;
  bucketId: string;
  quantity: number;
  notes?: string | null;
};

export type UpdateEventInventoryAllocationRequest = {
  quantity?: number | null;
  notes?: string | null;
};

export type CreateEventPurchaseItemRequest = {
  eventInventoryItemId: string;
  purchasedQuantity: number;
  unitPrice?: number | null;
  notes?: string | null;
};

export type CreateEventPurchaseRequest = {
  purchaseDate?: string | null;
  notes?: string | null;
  items: CreateEventPurchaseItemRequest[];
};

export type UpdateEventPurchaseRequest = {
  status?: string | null;
  purchaseDate?: string | null;
  totalAmount?: number | null;
  invoiceFileUrl?: string | null;
  notes?: string | null;
};

export type AttachEventPurchaseInvoiceRequest = {
  invoiceFileUrl: string;
};

export type CreateEventInventoryMovementRequest = {
  eventInventoryItemId: string;
  movementType: string;
  quantity: number;
  pastovykleId?: string | null;
  toUserId?: string | null;
  fromCustodyId?: string | null;
  requestId?: string | null;
  notes?: string | null;
};

export type CreateEventInventoryTransferRequest = {
  sourceCustodyId: string;
  quantity: number;
  notes?: string | null;
};

export type RespondEventInventoryTransferRequest = {
  approve: boolean;
  notes?: string | null;
};

export type ReconcileEventReturnsRequest = {
  returns: Array<Record<string, unknown>>;
};

export type ReconcileEventPurchasesRequest = {
  purchases: Array<Record<string, unknown>>;
};

export type UploadResponse = {
  url: string;
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
