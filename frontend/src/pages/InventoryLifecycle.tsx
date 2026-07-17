import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, CheckCircle2, ClipboardCheck, Edit3, History, PackageMinus, PackagePlus, Repeat2, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { DirectItemLoan, Item, ItemAssignment, ItemConditionLogEntry, ItemHistoryEntry, ItemTransfer, Member, OrganizationalUnit } from "../api/types";
import { useAuth } from "../auth/AuthProvider";
import { SkautaiEmptyState, SkautaiStatusPill } from "../components/ui/Skautai";
import { itemConditionLabel, statusLabel } from "../utils/display";

type LifecycleTab = "actions" | "loans" | "history";
type ActionPanel = "stock" | "transfer" | "return" | "loan" | "writeoff" | null;

export function InventoryLifecycle({ item, onItemUpdated }: { item: Item; onItemUpdated: (item: Item) => void }) {
  const { auth } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<LifecycleTab>("actions");
  const [actionPanel, setActionPanel] = useState<ActionPanel>(null);
  const [assignments, setAssignments] = useState<ItemAssignment[]>([]);
  const [conditionLog, setConditionLog] = useState<ItemConditionLogEntry[]>([]);
  const [transfers, setTransfers] = useState<ItemTransfer[]>([]);
  const [history, setHistory] = useState<ItemHistoryEntry[]>([]);
  const [loans, setLoans] = useState<DirectItemLoan[]>([]);
  const [activeLoanQuantity, setActiveLoanQuantity] = useState(0);
  const [units, setUnits] = useState<OrganizationalUnit[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [targetUnitId, setTargetUnitId] = useState("");
  const [loanUserId, setLoanUserId] = useState("");
  const [loanDueAt, setLoanDueAt] = useState("");
  const [writeOffReason, setWriteOffReason] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [returnQuantities, setReturnQuantities] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const permissions = auth?.permissions ?? [];
  const canManageShared = hasScoped(permissions, "items.transfer", "ALL") || permissions.includes("items.transfer");
  const canManageAll = hasScoped(permissions, "items.update", "ALL") || hasScoped(permissions, "items.delete", "ALL") || canManageShared;
  const canManageOwnUnit = hasScoped(permissions, "items.update", "OWN_UNIT") && Boolean(item.custodianId && auth?.leadershipUnitIds.includes(item.custodianId));
  const canEdit = item.custodianId == null ? canManageAll : canManageAll || canManageOwnUnit;
  const transferredFromShared = item.origin === "TRANSFERRED_FROM_TUNTAS";
  const canDelete = canEdit && item.status !== "INACTIVE" && (!transferredFromShared || canManageShared);
  const canRestock = canEdit && item.status === "ACTIVE";
  const canConsume = canEdit && item.isConsumable === true && item.status === "ACTIVE" && item.quantity > 0;
  const availableToLoan = Math.max(0, item.quantity - activeLoanQuantity);
  const canLoan = canEdit && item.status === "ACTIVE" && item.type !== "INDIVIDUAL" && availableToLoan > 0 && (!transferredFromShared || canManageShared);
  const canTransfer = canManageShared && item.custodianId == null && item.status === "ACTIVE" && item.quantity > 0 && item.type !== "INDIVIDUAL";
  const canReturnToShared = transferredFromShared && item.status === "ACTIVE" && item.quantity > 0 && (canManageShared || canManageOwnUnit);
  const canReview = item.status === "PENDING_APPROVAL" && (
    item.targetScope === "UNIT"
      ? hasScoped(permissions, "items.review", "OWN_UNIT") && Boolean(item.custodianId && auth?.leadershipUnitIds.includes(item.custodianId))
      : hasScoped(permissions, "items.review", "ALL")
  );

  const refreshSupporting = useCallback(async () => {
    if (!auth?.token || !auth.activeTuntasId) return;
    setIsLoading(true);
    const token = auth.token;
    const tuntasId = auth.activeTuntasId;
    const [assignmentResult, conditionResult, transferResult, historyResult, loanResult, unitResult, memberResult] = await Promise.all([
      api.listItemAssignments(token, tuntasId, item.id).catch(() => ({ assignments: [], total: 0 })),
      api.listItemConditionLog(token, tuntasId, item.id).catch(() => ({ entries: [], total: 0 })),
      api.listItemTransfers(token, tuntasId, item.id).catch(() => ({ transfers: [], total: 0 })),
      api.listItemHistory(token, tuntasId, item.id).catch(() => ({ entries: [], total: 0 })),
      api.listDirectItemLoans(token, tuntasId, item.id).catch(() => ({ loans: [], total: 0, activeOutstandingQuantity: 0 })),
      api.listOrganizationalUnits(token, tuntasId).catch(() => ({ units: [], total: 0 })),
      canEdit ? api.listMembers(token, tuntasId).catch(() => ({ members: [], total: 0 })) : Promise.resolve({ members: [], total: 0 })
    ]);
    setAssignments(assignmentResult.assignments);
    setConditionLog(conditionResult.entries);
    setTransfers(transferResult.transfers);
    setHistory(historyResult.entries);
    setLoans(loanResult.loans);
    setActiveLoanQuantity(loanResult.activeOutstandingQuantity);
    setUnits(unitResult.units);
    setMembers(memberResult.members);
    setReturnQuantities(Object.fromEntries(loanResult.loans.filter((loan) => loan.outstandingQuantity > 0).map((loan) => [loan.id, String(loan.outstandingQuantity)])));
    setIsLoading(false);
  }, [auth?.activeTuntasId, auth?.token, canEdit, item.id]);

  useEffect(() => { void refreshSupporting(); }, [refreshSupporting]);

  const activeLoans = useMemo(() => loans.filter((loan) => loan.outstandingQuantity > 0 && loan.status === "ACTIVE"), [loans]);

  async function runAction(action: string, success: string, operation: () => Promise<unknown>, closePanel = true) {
    if (busyAction) return;
    setBusyAction(action);
    setError(null);
    setMessage(null);
    try {
      const result = await operation();
      if (isItem(result)) onItemUpdated(result);
      await refreshSupporting();
      setMessage(success);
      if (closePanel) {
        setActionPanel(null);
        setQuantity("1");
        setNotes("");
        setPurchaseDate("");
        setPurchasePrice("");
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Veiksmo atlikti nepavyko.");
    } finally {
      setBusyAction(null);
    }
  }

  function submitStock(event: FormEvent<HTMLFormElement>, kind: "restock" | "consume") {
    event.preventDefault();
    if (!auth?.token || !auth.activeTuntasId) return;
    const value = positiveInteger(quantity);
    if (!value || (kind === "consume" && value > item.quantity)) {
      setError("Nurodykite leistiną teigiamą kiekį.");
      return;
    }
    const operation = kind === "restock"
      ? () => api.restockItem(auth.token, auth.activeTuntasId!, item.id, { quantity: value, purchaseDate: optional(purchaseDate), purchasePrice: optionalNumber(purchasePrice), notes: optional(notes) })
      : () => api.consumeItem(auth.token, auth.activeTuntasId!, item.id, { quantity: value, notes: optional(notes) });
    void runAction(kind, kind === "restock" ? "Atsargos papildytos." : "Sunaudotas kiekis užregistruotas.", operation);
  }

  function submitTransfer(event: FormEvent<HTMLFormElement>, kind: "transfer" | "return") {
    event.preventDefault();
    if (!auth?.token || !auth.activeTuntasId) return;
    const value = positiveInteger(quantity);
    if (!value || value > item.quantity || (kind === "transfer" && !targetUnitId)) {
      setError("Pasirinkite vienetą ir nurodykite leistiną kiekį.");
      return;
    }
    const operation = kind === "transfer"
      ? () => api.transferItemToUnit(auth.token, auth.activeTuntasId!, item.id, { targetUnitId, quantity: value, notes: optional(notes) })
      : () => api.returnItemToShared(auth.token, auth.activeTuntasId!, item.id, { quantity: value, notes: optional(notes) });
    void runAction(kind, kind === "transfer" ? "Inventorius perduotas vienetui." : "Inventorius grąžintas į bendrą sandėlį.", operation);
  }

  function submitLoan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth?.token || !auth.activeTuntasId || !loanUserId) return;
    const value = positiveInteger(quantity);
    if (!value || value > availableToLoan) {
      setError("Nurodykite kiekį, neviršijantį laisvo likučio.");
      return;
    }
    void runAction("loan", "Inventorius išduotas nariui.", () => api.createDirectItemLoan(auth.token, auth.activeTuntasId!, item.id, {
      issuedToUserId: loanUserId,
      quantity: value,
      dueAt: toInstant(loanDueAt),
      notes: optional(notes)
    }));
  }

  function returnLoan(loan: DirectItemLoan) {
    if (!auth?.token || !auth.activeTuntasId) return;
    const value = positiveInteger(returnQuantities[loan.id] ?? "");
    if (!value || value > loan.outstandingQuantity) {
      setError("Grąžinamas kiekis viršija negrąžintą likutį.");
      return;
    }
    void runAction(`return-loan-${loan.id}`, "Grąžinimas užregistruotas.", () => api.returnDirectItemLoan(auth.token, auth.activeTuntasId!, item.id, loan.id, { quantity: value }), false);
  }

  function review(decision: "APPROVED" | "REJECTED") {
    if (!auth?.token || !auth.activeTuntasId) return;
    if (decision === "REJECTED" && !rejectionReason.trim()) {
      setError("Atmetant įrašą nurodykite priežastį.");
      return;
    }
    void runAction(`review-${decision}`, decision === "APPROVED" ? "Inventoriaus įrašas patvirtintas." : "Inventoriaus įrašas atmestas.", () => api.reviewItemAddition(auth.token, auth.activeTuntasId!, item.id, { decision, rejectionReason: decision === "REJECTED" ? rejectionReason.trim() : null }), false);
  }

  function updateStatus(status: string) {
    if (!auth?.token || !auth.activeTuntasId) return;
    void runAction(`status-${status}`, "Būsena atnaujinta.", () => api.updateItem(auth.token, auth.activeTuntasId!, item.id, { status }), false);
  }

  function writeOff(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth?.token || !auth.activeTuntasId || !writeOffReason.trim()) return;
    if (!window.confirm("Nurašyti šį inventoriaus įrašą?")) return;
    void runAction("writeoff", "Inventorius nurašytas.", () => api.writeOffItem(auth.token, auth.activeTuntasId!, item.id, { reason: writeOffReason.trim() }));
  }

  function deleteItem() {
    if (!auth?.token || !auth.activeTuntasId || !window.confirm("Ištrinti šį inventoriaus įrašą?")) return;
    setBusyAction("delete");
    api.deleteItem(auth.token, auth.activeTuntasId, item.id)
      .then(() => navigate("/inventory"))
      .catch((cause) => { setError(cause instanceof Error ? cause.message : "Įrašo ištrinti nepavyko."); setBusyAction(null); });
  }

  return (
    <section className="inventory-lifecycle">
      {error && <p className="inline-alert" role="alert">{error}</p>}
      {message && <p className="inline-success" role="status">{message}</p>}

      <div className="segmented-tabs inventory-detail-tabs" role="tablist" aria-label="Inventoriaus informacija">
        <TabButton active={tab === "actions"} onClick={() => setTab("actions")} icon={ShieldCheck} label="Valdymas" />
        <TabButton active={tab === "loans"} onClick={() => setTab("loans")} icon={ClipboardCheck} label="Išdavimai" count={activeLoans.length} />
        <TabButton active={tab === "history"} onClick={() => setTab("history")} icon={History} label="Istorija" count={history.length} />
      </div>

      {tab === "actions" && (
        <div className="inventory-lifecycle-content">
          {canReview && <section className="form-panel lifecycle-review"><div className="form-section-heading"><CheckCircle2 aria-hidden="true" /><div><h3>Laukiantis inventoriaus įrašas</h3><span>Patikrinkite duomenis ir priimkite sprendimą.</span></div></div><label className="form-field"><span>Atmetimo priežastis</span><textarea rows={2} value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} /></label><div className="form-actions"><button className="secondary-button" type="button" disabled={Boolean(busyAction)} onClick={() => review("REJECTED")}>Atmesti</button><button className="primary-button compact-primary-button" type="button" disabled={Boolean(busyAction)} onClick={() => review("APPROVED")}>Patvirtinti</button></div></section>}

          {canEdit ? <>
            <div className="inventory-action-grid">
              <Link className="inventory-action-card" to={`/inventory/${item.id}/edit`}><Edit3 /><strong>Redaguoti</strong><span>Pagrindiniai duomenys, vieta ir atsakingas asmuo</span></Link>
              {canRestock && <ActionCard icon={PackagePlus} title="Papildyti" description="Pridėti gautą arba nupirktą kiekį" active={actionPanel === "stock"} onClick={() => setActionPanel("stock")} />}
              {canConsume && <ActionCard icon={PackageMinus} title="Sunaudoti" description="Užregistruoti sunaudotą kiekį" active={actionPanel === "stock"} onClick={() => setActionPanel("stock")} />}
              {canTransfer && <ActionCard icon={ArrowUpFromLine} title="Perduoti vienetui" description="Perkelti dalį bendro inventoriaus" active={actionPanel === "transfer"} onClick={() => setActionPanel("transfer")} />}
              {canReturnToShared && <ActionCard icon={ArrowDownToLine} title="Grąžinti bendram" description="Grąžinti perduotą inventorių į tunto sandėlį" active={actionPanel === "return"} onClick={() => setActionPanel("return")} />}
              {canLoan && <ActionCard icon={UserPlus} title="Išduoti nariui" description={`Laisvas likutis: ${availableToLoan}`} active={actionPanel === "loan"} onClick={() => setActionPanel("loan")} />}
              {canDelete && <ActionCard icon={Trash2} title="Nurašyti" description="Uždaryti įrašą su nurašymo priežastimi" active={actionPanel === "writeoff"} onClick={() => setActionPanel("writeoff")} danger />}
            </div>

            {actionPanel === "stock" && <StockForm canRestock={canRestock} canConsume={canConsume} quantity={quantity} notes={notes} purchaseDate={purchaseDate} purchasePrice={purchasePrice} disabled={Boolean(busyAction)} onQuantityChange={setQuantity} onNotesChange={setNotes} onPurchaseDateChange={setPurchaseDate} onPurchasePriceChange={setPurchasePrice} onSubmit={submitStock} />}
            {actionPanel === "transfer" && <TransferForm kind="transfer" units={units.filter((unit) => unit.id !== item.custodianId)} targetUnitId={targetUnitId} quantity={quantity} notes={notes} maximum={item.quantity} disabled={Boolean(busyAction)} onTargetChange={setTargetUnitId} onQuantityChange={setQuantity} onNotesChange={setNotes} onSubmit={submitTransfer} />}
            {actionPanel === "return" && <TransferForm kind="return" units={[]} targetUnitId="" quantity={quantity} notes={notes} maximum={item.quantity} disabled={Boolean(busyAction)} onTargetChange={() => undefined} onQuantityChange={setQuantity} onNotesChange={setNotes} onSubmit={submitTransfer} />}
            {actionPanel === "loan" && <LoanForm members={members} userId={loanUserId} quantity={quantity} maximum={availableToLoan} dueAt={loanDueAt} notes={notes} disabled={Boolean(busyAction)} onUserChange={setLoanUserId} onQuantityChange={setQuantity} onDueAtChange={setLoanDueAt} onNotesChange={setNotes} onSubmit={submitLoan} />}
            {actionPanel === "writeoff" && <form className="form-panel" onSubmit={writeOff}><h3>Nurašyti inventorių</h3><label className="form-field"><span>Priežastis *</span><textarea rows={3} required value={writeOffReason} onChange={(event) => setWriteOffReason(event.target.value)} /></label><div className="form-actions"><button className="primary-button compact-primary-button tone-danger" type="submit" disabled={Boolean(busyAction)}>Nurašyti</button></div></form>}

            <section className="form-panel lifecycle-status-panel"><div><h3>Įrašo būsena</h3><p>Dabartinė būsena: <strong>{statusLabel(item.status)}</strong></p></div><div className="form-actions">{item.status !== "ACTIVE" && <button className="secondary-button" type="button" onClick={() => updateStatus("ACTIVE")} disabled={Boolean(busyAction)}>Aktyvuoti</button>}{item.status !== "INACTIVE" && <button className="secondary-button" type="button" onClick={() => updateStatus("INACTIVE")} disabled={Boolean(busyAction)}>Pažymėti neaktyviu</button>}{canDelete && <button className="secondary-button tone-danger" type="button" onClick={deleteItem} disabled={Boolean(busyAction)}>Ištrinti įrašą</button>}</div></section>
          </> : <SkautaiEmptyState compact icon={ShieldCheck} title="Įrašas skirtas peržiūrai" description="Valdymo veiksmai rodomi inventoriaus valdytojams arba atsakingo vieneto vadovams." />}
        </div>
      )}

      {tab === "loans" && <LoansTab loans={loans} assignments={assignments} returnQuantities={returnQuantities} isLoading={isLoading} canReturn={canEdit} busyAction={busyAction} onQuantityChange={(id, value) => setReturnQuantities((current) => ({ ...current, [id]: value }))} onReturn={returnLoan} />}
      {tab === "history" && <HistoryTab history={history} transfers={transfers} conditionLog={conditionLog} isLoading={isLoading} />}
    </section>
  );
}

function ActionCard({ icon: Icon, title, description, active, onClick, danger = false }: { icon: typeof Edit3; title: string; description: string; active: boolean; onClick: () => void; danger?: boolean }) {
  return <button className={`inventory-action-card${active ? " is-active" : ""}${danger ? " is-danger" : ""}`} type="button" onClick={onClick}><Icon /><strong>{title}</strong><span>{description}</span></button>;
}

function TabButton({ active, onClick, icon: Icon, label, count }: { active: boolean; onClick: () => void; icon: typeof History; label: string; count?: number }) {
  return <button className={active ? "active" : ""} type="button" role="tab" aria-selected={active} onClick={onClick}><Icon size={16} />{label}{count != null && <span>{count}</span>}</button>;
}

function StockForm({ canRestock, canConsume, quantity, notes, purchaseDate, purchasePrice, disabled, onQuantityChange, onNotesChange, onPurchaseDateChange, onPurchasePriceChange, onSubmit }: { canRestock: boolean; canConsume: boolean; quantity: string; notes: string; purchaseDate: string; purchasePrice: string; disabled: boolean; onQuantityChange: (value: string) => void; onNotesChange: (value: string) => void; onPurchaseDateChange: (value: string) => void; onPurchasePriceChange: (value: string) => void; onSubmit: (event: FormEvent<HTMLFormElement>, kind: "restock" | "consume") => void }) {
  const [kind, setKind] = useState<"restock" | "consume">(canRestock ? "restock" : "consume");
  return <form className="form-panel lifecycle-action-form" onSubmit={(event) => onSubmit(event, kind)}><h3>Atsargų pakeitimas</h3><div className="form-grid"><label className="form-field"><span>Veiksmas</span><select value={kind} onChange={(event) => setKind(event.target.value as "restock" | "consume")} disabled={disabled}>{canRestock && <option value="restock">Papildyti</option>}{canConsume && <option value="consume">Sunaudoti</option>}</select></label><label className="form-field"><span>Kiekis *</span><input type="number" min="1" step="1" required value={quantity} onChange={(event) => onQuantityChange(event.target.value)} disabled={disabled} /></label>{kind === "restock" && <><label className="form-field"><span>Pirkimo data</span><input type="date" value={purchaseDate} onChange={(event) => onPurchaseDateChange(event.target.value)} disabled={disabled} /></label><label className="form-field"><span>Pirkimo kaina</span><input type="number" min="0" step="0.01" value={purchasePrice} onChange={(event) => onPurchasePriceChange(event.target.value)} disabled={disabled} /></label></>}<label className="form-field wide"><span>Pastabos</span><textarea rows={2} value={notes} onChange={(event) => onNotesChange(event.target.value)} disabled={disabled} /></label></div><div className="form-actions"><button className="primary-button compact-primary-button" type="submit" disabled={disabled}>Išsaugoti</button></div></form>;
}

function TransferForm({ kind, units, targetUnitId, quantity, notes, maximum, disabled, onTargetChange, onQuantityChange, onNotesChange, onSubmit }: { kind: "transfer" | "return"; units: OrganizationalUnit[]; targetUnitId: string; quantity: string; notes: string; maximum: number; disabled: boolean; onTargetChange: (value: string) => void; onQuantityChange: (value: string) => void; onNotesChange: (value: string) => void; onSubmit: (event: FormEvent<HTMLFormElement>, kind: "transfer" | "return") => void }) {
  return <form className="form-panel lifecycle-action-form" onSubmit={(event) => onSubmit(event, kind)}><h3>{kind === "transfer" ? "Perduoti vienetui" : "Grąžinti į bendrą sandėlį"}</h3><div className="form-grid">{kind === "transfer" && <label className="form-field wide"><span>Vienetas *</span><select value={targetUnitId} onChange={(event) => onTargetChange(event.target.value)} required disabled={disabled}><option value="">Pasirinkite vienetą</option>{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}</select></label>}<label className="form-field"><span>Kiekis (iki {maximum}) *</span><input type="number" min="1" max={maximum} step="1" required value={quantity} onChange={(event) => onQuantityChange(event.target.value)} disabled={disabled} /></label><label className="form-field wide"><span>Pastabos</span><textarea rows={2} value={notes} onChange={(event) => onNotesChange(event.target.value)} disabled={disabled} /></label></div><div className="form-actions"><button className="primary-button compact-primary-button" type="submit" disabled={disabled}>{kind === "transfer" ? "Perduoti" : "Grąžinti"}</button></div></form>;
}

function LoanForm({ members, userId, quantity, maximum, dueAt, notes, disabled, onUserChange, onQuantityChange, onDueAtChange, onNotesChange, onSubmit }: { members: Member[]; userId: string; quantity: string; maximum: number; dueAt: string; notes: string; disabled: boolean; onUserChange: (value: string) => void; onQuantityChange: (value: string) => void; onDueAtChange: (value: string) => void; onNotesChange: (value: string) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <form className="form-panel lifecycle-action-form" onSubmit={onSubmit}><h3>Išduoti inventorių nariui</h3><div className="form-grid"><label className="form-field wide"><span>Narys *</span><select value={userId} onChange={(event) => onUserChange(event.target.value)} required disabled={disabled}><option value="">Pasirinkite narį</option>{members.map((member) => <option key={member.userId} value={member.userId}>{memberName(member)} · {member.email}</option>)}</select></label><label className="form-field"><span>Kiekis (iki {maximum}) *</span><input type="number" min="1" max={maximum} step="1" required value={quantity} onChange={(event) => onQuantityChange(event.target.value)} disabled={disabled} /></label><label className="form-field"><span>Grąžinti iki</span><input type="datetime-local" value={dueAt} onChange={(event) => onDueAtChange(event.target.value)} disabled={disabled} /></label><label className="form-field wide"><span>Pastabos</span><textarea rows={2} value={notes} onChange={(event) => onNotesChange(event.target.value)} disabled={disabled} /></label></div><div className="form-actions"><button className="primary-button compact-primary-button" type="submit" disabled={disabled}>Išduoti</button></div></form>;
}

function LoansTab({ loans, assignments, returnQuantities, isLoading, canReturn, busyAction, onQuantityChange, onReturn }: { loans: DirectItemLoan[]; assignments: ItemAssignment[]; returnQuantities: Record<string, string>; isLoading: boolean; canReturn: boolean; busyAction: string | null; onQuantityChange: (id: string, value: string) => void; onReturn: (loan: DirectItemLoan) => void }) {
  if (isLoading) return <div className="table-state">Kraunami išdavimai...</div>;
  return <div className="inventory-history-stack"><section className="detail-section"><h3>Tiesioginiai išdavimai</h3>{loans.length === 0 ? <p>Išdavimų dar nėra.</p> : <div className="table-wrap"><table className="data-table compact-data-table"><thead><tr><th>Narys</th><th>Išduota</th><th>Negrąžinta</th><th>Terminas</th><th>Būsena</th><th /></tr></thead><tbody>{loans.map((loan) => <tr key={loan.id}><td><strong>{loan.issuedToUserName ?? loan.issuedToUserId}</strong><span>{loan.notes ?? ""}</span></td><td>{loan.quantity}</td><td>{loan.outstandingQuantity}</td><td>{formatDateTime(loan.dueAt)}</td><td><SkautaiStatusPill status={loan.status}>{statusLabel(loan.status)}</SkautaiStatusPill></td><td>{canReturn && loan.outstandingQuantity > 0 && <div className="inline-quantity-action"><input aria-label="Grąžinamas kiekis" type="number" min="1" max={loan.outstandingQuantity} value={returnQuantities[loan.id] ?? ""} onChange={(event) => onQuantityChange(loan.id, event.target.value)} /><button className="secondary-button" type="button" disabled={Boolean(busyAction)} onClick={() => onReturn(loan)}>Grąžinti</button></div>}</td></tr>)}</tbody></table></div>}</section><section className="detail-section"><h3>Priskyrimų istorija</h3>{assignments.length === 0 ? <p>Priskyrimų dar nėra.</p> : <div className="timeline-list">{assignments.map((assignment) => <article key={assignment.id}><Repeat2 size={16} /><div><strong>{assignment.assignedToUserName ?? assignment.assignedToUserId}</strong><span>{formatDateTime(assignment.assignedAt)}{assignment.unassignedAt ? ` – ${formatDateTime(assignment.unassignedAt)}` : " · aktyvus"}</span><small>{assignment.reason ?? assignment.notes ?? ""}</small></div></article>)}</div>}</section></div>;
}

function HistoryTab({ history, transfers, conditionLog, isLoading }: { history: ItemHistoryEntry[]; transfers: ItemTransfer[]; conditionLog: ItemConditionLogEntry[]; isLoading: boolean }) {
  if (isLoading) return <div className="table-state">Kraunama istorija...</div>;
  return <div className="inventory-history-stack"><section className="detail-section"><h3>Veiksmų istorija</h3>{history.length === 0 ? <p>Istorijos įrašų dar nėra.</p> : <div className="timeline-list">{history.map((entry) => <article key={entry.id}><History size={16} /><div><strong>{historyEventLabel(entry.eventType)}{entry.quantityChange != null ? ` · ${entry.quantityChange > 0 ? "+" : ""}${entry.quantityChange}` : ""}</strong><span>{formatDateTime(entry.createdAt)} · {entry.performedByUserName ?? "Sistema"}</span><small>{entry.notes ?? ""}</small></div></article>)}</div>}</section><section className="detail-section"><h3>Perdavimai</h3>{transfers.length === 0 ? <p>Perdavimų dar nėra.</p> : <div className="timeline-list">{transfers.map((transfer) => <article key={transfer.id}><Repeat2 size={16} /><div><strong>{transfer.fromCustodianName ?? "Bendras tuntas"} → {transfer.toCustodianName ?? "Bendras tuntas"}</strong><span>{formatDateTime(transfer.createdAt)} · {statusLabel(transfer.status)}</span><small>{transfer.notes ?? ""}</small></div></article>)}</div>}</section><section className="detail-section"><h3>Būklės žurnalas</h3>{conditionLog.length === 0 ? <p>Būklės pakeitimų dar nėra.</p> : <div className="timeline-list">{conditionLog.map((entry) => <article key={entry.id}><CheckCircle2 size={16} /><div><strong>{entry.previousCondition ? `${itemConditionLabel(entry.previousCondition)} → ` : ""}{itemConditionLabel(entry.newCondition)}</strong><span>{formatDateTime(entry.reportedAt)} · {entry.reportedByUserName ?? "Sistema"}</span><small>{entry.notes ?? ""}</small></div></article>)}</div>}</section></div>;
}

function hasScoped(permissions: string[], permission: string, scope: string) { return permissions.includes(`${permission}:${scope}`); }
function positiveInteger(value: string) { const number = Number(value); return Number.isInteger(number) && number > 0 ? number : null; }
function optional(value: string) { const trimmed = value.trim(); return trimmed ? trimmed : null; }
function optionalNumber(value: string) { if (!value.trim()) return null; const number = Number(value); return Number.isFinite(number) && number >= 0 ? number : null; }
function toInstant(value: string) { if (!value) return null; const date = new Date(value); return Number.isNaN(date.getTime()) ? null : date.toISOString(); }
function isItem(value: unknown): value is Item { return Boolean(value && typeof value === "object" && "qrToken" in value && "quantity" in value); }
function memberName(member: Member) { return [member.name, member.surname].filter(Boolean).join(" ") || member.email; }
function formatDateTime(value?: string | null) { if (!value) return "–"; const date = new Date(value); return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("lt-LT", { dateStyle: "medium", timeStyle: "short" }).format(date); }
function historyEventLabel(value: string) { return ({ CREATED: "Sukurta", UPDATED: "Atnaujinta", RESTOCKED: "Papildyta", CONSUMED: "Sunaudota", TRANSFERRED: "Perduota", RETURNED_TO_SHARED: "Grąžinta bendram", WRITTEN_OFF: "Nurašyta", ASSIGNED: "Priskirta", UNASSIGNED: "Priskyrimas baigtas", REVIEWED: "Peržiūrėta" } as Record<string, string>)[value] ?? value.replaceAll("_", " "); }
