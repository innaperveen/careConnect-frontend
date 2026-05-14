import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { AppointmentService } from '../../../services/appointment.service';
import { MessageService } from '../../../services/message.service';
import { ShiftService } from '../../../services/shift.service';
import { NotificationService } from '../../../services/notification.service';

@Component({
  selector: 'app-my-patients',
  templateUrl: './my-patients.component.html',
  styleUrls: ['./my-patients.component.css']
})
export class MyPatientsComponent implements OnInit, OnDestroy, AfterViewChecked {

  @ViewChild('msgEnd') msgEnd!: ElementRef;

  appointments: any[] = [];
  isLoading    = true;
  activeFilter = 'All';
  filters      = ['All', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED'];
  filterLabels: Record<string, string> = {
    All: 'All', CONFIRMED: 'Confirmed', IN_PROGRESS: 'In Progress', COMPLETED: 'Completed'
  };

  // Shifts — keyed by appointmentId
  shiftsMap:    Record<number, any[]> = {};
  loadingShifts = new Set<number>();

  // Pending count badge
  totalPending = 0;
  unreadCount  = 0;

  // Confirm/reject state
  confirmingShiftId: number | null = null;
  rejectingShiftId:  number | null = null;
  shiftActionError   = '';

  // Chat state
  chatPatient: any   = null;
  messages:    any[] = [];
  newMessage   = '';
  isSending    = false;
  chatError    = '';
  unreadFrom   = new Set<number>();
  private pollTimer?: any;
  private unreadTimer?: any;
  private shouldScroll = false;

  private myUserId!: number;
  private myName!:   string;
  private notifSub!: Subscription;

  constructor(
    private auth:       AuthService,
    private apptService:AppointmentService,
    private msgSvc:     MessageService,
    private shiftSvc:   ShiftService,
    private notifSvc:   NotificationService
  ) {}

  ngOnInit(): void {
    const user    = this.auth.getUser();
    this.myUserId = this.auth.getUserId()!;
    this.myName   = user?.fullName || user?.email || 'Nurse';
    this.notifSvc.initSSE(this.myUserId);
    this.notifSub = this.notifSvc.unreadCount$.subscribe(c => this.unreadCount = c);

    this.apptService.getByNurse(this.myUserId).subscribe({
      next: (data) => {
        this.appointments = data || [];
        this.activeAppointments.forEach(a => this.loadShiftsFor(a.id));
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });

    this.refreshUnread();
    this.unreadTimer = setInterval(() => this.refreshUnread(), 10000);
  }

  ngOnDestroy(): void { this.stopPoll(); clearInterval(this.unreadTimer); this.notifSub?.unsubscribe(); }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) { this.scrollToBottom(); this.shouldScroll = false; }
  }

  // ── Appointments ─────────────────────────────────────────────────────────

  get activeAppointments(): any[] {
    const ACTIVE = ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'];
    return this.appointments.filter(a => ACTIVE.includes((a.status || '').toUpperCase()));
  }

  get filteredAppointments(): any[] {
    if (this.activeFilter === 'All') return this.activeAppointments;
    return this.activeAppointments.filter(a => a.status === this.activeFilter);
  }

  get assignedPatients(): any[] {
    const seen = new Set<number>();
    return this.appointments.filter(a => {
      if (seen.has(a.patientId)) return false;
      seen.add(a.patientId);
      return true;
    });
  }

  appointmentsFor(patientId: number): any[] {
    return this.appointments.filter(a =>
      a.patientId === patientId &&
      (this.activeFilter === 'All' || a.status === this.activeFilter)
    );
  }

  hasActiveAppointment(patientId: number): boolean {
    const ACTIVE = ['CONFIRMED', 'IN_PROGRESS'];
    return this.appointments.some(a =>
      a.patientId === patientId && ACTIVE.includes((a.status || '').toUpperCase())
    );
  }

  get filteredPatients(): any[] {
    if (this.activeFilter === 'All') return this.assignedPatients;
    return this.assignedPatients.filter(p => this.appointmentsFor(p.patientId).length > 0);
  }

  // ── Shift Loading ─────────────────────────────────────────────────────────

  loadShiftsFor(appointmentId: number): void {
    this.loadingShifts.add(appointmentId);
    this.shiftSvc.getByAppointment(appointmentId).subscribe({
      next: (shifts) => {
        this.shiftsMap[appointmentId] = shifts || [];
        this.loadingShifts.delete(appointmentId);
        this.recalcPending();
      },
      error: () => { this.loadingShifts.delete(appointmentId); }
    });
  }

  private recalcPending(): void {
    let count = 0;
    Object.values(this.shiftsMap).forEach(shifts =>
      shifts.forEach(s => { if (s.status === 'PENDING_CONFIRMATION') count++; })
    );
    this.totalPending = count;
  }

  shiftsFor(appointmentId: number): any[] {
    return this.shiftsMap[appointmentId] || [];
  }

  pendingShiftsFor(appointmentId: number): any[] {
    return this.shiftsFor(appointmentId).filter(s => s.status === 'PENDING_CONFIRMATION');
  }

  confirmedShiftsFor(appointmentId: number): any[] {
    return this.shiftsFor(appointmentId).filter(s => s.status === 'CONFIRMED');
  }

  // ── Confirm / Reject ──────────────────────────────────────────────────────

  // acceptNegotiation: true = patient's proposed rate, false = keep original
  confirmShift(shift: any, acceptNegotiation = false): void {
    this.confirmingShiftId = shift.id;
    this.shiftActionError  = '';
    this.shiftSvc.confirmShift(this.myUserId, shift.id, acceptNegotiation).subscribe({
      next: (updated) => {
        this.updateShiftInMap(shift.appointmentId, updated);
        this.confirmingShiftId = null;
        this.recalcPending();
      },
      error: (err: Error) => {
        this.shiftActionError  = err.message;
        this.confirmingShiftId = null;
      }
    });
  }

  rejectShift(shift: any): void {
    this.rejectingShiftId = shift.id;
    this.shiftActionError = '';
    this.shiftSvc.rejectShift(this.myUserId, shift.id).subscribe({
      next: (updated) => {
        this.updateShiftInMap(shift.appointmentId, updated);
        this.rejectingShiftId = null;
        this.recalcPending();
      },
      error: (err: Error) => {
        this.shiftActionError = err.message;
        this.rejectingShiftId = null;
      }
    });
  }

  private updateShiftInMap(appointmentId: number, updated: any): void {
    const list = this.shiftsMap[appointmentId];
    if (!list) return;
    const idx = list.findIndex(s => s.id === updated.id);
    if (idx !== -1) list[idx] = updated;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  formatAmount(n: number): string {
    return '₹' + Number(n).toLocaleString('en-IN');
  }

  totalConfirmedAmount(appointmentId: number): number {
    return this.confirmedShiftsFor(appointmentId)
      .reduce((sum, s) => sum + (s.finalRate || s.originalRate || 0), 0);
  }

  shiftStatusClass(status: string): string {
    switch (status) {
      case 'CONFIRMED':            return 'sc-confirmed';
      case 'PENDING_CONFIRMATION': return 'sc-pending';
      case 'REJECTED':             return 'sc-rejected';
      default:                     return 'sc-pending';
    }
  }

  shiftStatusLabel(status: string): string {
    switch (status) {
      case 'CONFIRMED':            return '✓ Confirmed';
      case 'PENDING_CONFIRMATION': return '⏳ Your confirmation needed';
      case 'REJECTED':             return '✗ Rejected';
      default:                     return status;
    }
  }

  getStatusClass(status: string): string {
    const s = (status ?? '').toUpperCase();
    return s === 'CONFIRMED'   ? 'badge-confirmed'
         : s === 'COMPLETED'   ? 'badge-completed'
         : s === 'CANCELLED'   ? 'badge-cancelled'
         : s === 'IN_PROGRESS' ? 'badge-inprogress'
         : 'badge-pending';
  }

  // ── Chat ─────────────────────────────────────────────────────────────────

  private refreshUnread(): void {
    this.msgSvc.getUnreadSenders(this.myUserId).subscribe({
      next: (ids) => { this.unreadFrom = new Set(ids); },
      error: () => {}
    });
  }

  openChat(patient: any, event: Event): void {
    event.stopPropagation();
    this.unreadFrom.delete(patient.patientUserId);
    this.chatPatient = patient;
    this.messages    = [];
    this.newMessage  = '';
    this.chatError   = '';
    this.loadMessages();
    this.startPoll();
  }

  closeChat(): void { this.chatPatient = null; this.stopPoll(); }

  private loadMessages(): void {
    if (!this.chatPatient?.patientUserId) return;
    this.msgSvc.getConversation(this.myUserId, this.chatPatient.patientUserId).subscribe({
      next: (msgs) => {
        const prevLen = this.messages.length;
        this.messages = msgs;
        if (msgs.length > prevLen) this.shouldScroll = true;
        this.msgSvc.markRead(this.myUserId, this.chatPatient.patientUserId).subscribe({
          next: () => this.unreadFrom.delete(this.chatPatient.patientUserId)
        });
      },
      error: () => {}
    });
  }

  sendMessage(): void {
    const text = this.newMessage.trim();
    if (!text || !this.chatPatient?.patientUserId) return;
    this.isSending = true;
    this.chatError = '';
    this.msgSvc.send(this.myUserId, this.myName, 'NURSE', this.chatPatient.patientUserId, 'PATIENT', text).subscribe({
      next: (msg) => {
        this.messages.push(msg);
        this.newMessage   = '';
        this.isSending    = false;
        this.shouldScroll = true;
      },
      error: (err: Error) => { this.isSending = false; this.chatError = err.message; }
    });
  }

  onEnter(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); this.sendMessage(); }
  }

  isMine(msg: any): boolean { return msg.senderId === this.myUserId; }

  private startPoll(): void { this.pollTimer = setInterval(() => this.loadMessages(), 4000); }
  private stopPoll(): void  { if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = undefined; } }
  private scrollToBottom(): void {
    try { this.msgEnd?.nativeElement?.scrollIntoView({ behavior: 'smooth' }); } catch {}
  }

  logout(): void { this.auth.logout(); }
}
