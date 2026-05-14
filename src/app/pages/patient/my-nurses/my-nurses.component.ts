import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { AuthService } from '../../../services/auth.service';
import { AppointmentService } from '../../../services/appointment.service';
import { MessageService } from '../../../services/message.service';
import { ShiftService } from '../../../services/shift.service';
import { PaymentService } from '../../../services/payment.service';

@Component({
  selector: 'app-my-nurses',
  templateUrl: './my-nurses.component.html',
  styleUrls: ['./my-nurses.component.css']
})
export class MyNursesComponent implements OnInit, OnDestroy, AfterViewChecked {

  @ViewChild('msgEnd') msgEnd!: ElementRef;

  isLoading        = true;
  allAppointments: any[] = [];
  selectedNurse: any = null;

  // Shifts — keyed by appointmentId
  shiftsMap:   Record<number, any[]> = {};
  loadingShifts = new Set<number>();

  // Mark shift modal
  shiftModal: any  = null;   // appointment being marked
  shiftDate        = '';
  shiftNotes       = '';
  shiftDateError   = '';
  isMarkingShift   = false;
  shiftSuccess     = '';

  // Negotiation within mark-shift modal
  wantsToNegotiate = false;
  negotiatedRate   = '';
  negotiateError   = '';

  // Pay modal (for confirmed shifts)
  payModal: any          = null;
  selectedPayMethod      = 'UPI';
  isProcessingPayment    = false;
  paySuccess             = '';
  payError               = '';

  // Chat state
  chatNurse: any       = null;
  messages:  any[]     = [];
  newMessage = '';
  isSending  = false;
  chatError  = '';
  unreadFrom = new Set<number>();
  private pollTimer?: any;
  private unreadTimer?: any;
  private shouldScroll = false;

  private myUserId!: number;
  private myName!:   string;

  readonly today = new Date().toISOString().split('T')[0];

  constructor(
    private auth:        AuthService,
    private apptService: AppointmentService,
    private msgSvc:      MessageService,
    private shiftSvc:    ShiftService,
    private paymentSvc:  PaymentService
  ) {}

  ngOnInit(): void {
    const user      = this.auth.getUser();
    this.myUserId   = this.auth.getUserId()!;
    this.myName     = user?.fullName || user?.email || 'Patient';

    this.apptService.getByPatient(this.myUserId).subscribe({
      next: (data) => {
        this.allAppointments = data || [];
        // Load shifts for each active appointment
        this.activeAppointments.forEach(a => this.loadShiftsFor(a.id));
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });

    this.refreshUnread();
    this.unreadTimer = setInterval(() => this.refreshUnread(), 10000);
  }

  ngOnDestroy(): void { this.stopPoll(); clearInterval(this.unreadTimer); }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) { this.scrollToBottom(); this.shouldScroll = false; }
  }

  // ── Appointments with assigned nurse ──────────────────────────────────────

  get activeAppointments(): any[] {
    const ACTIVE = ['CONFIRMED', 'IN_PROGRESS', 'COMPLETED'];
    return this.allAppointments.filter(a =>
      a.nurseId != null && ACTIVE.includes((a.status || '').toUpperCase())
    );
  }

  get assignedNurses(): any[] {
    const seen = new Map<number, any>();
    this.allAppointments
      .filter(a => a.nurseId != null)
      .forEach(a => {
        if (!seen.has(a.nurseId)) {
          seen.set(a.nurseId, {
            nurseId:             a.nurseId,
            nurseUserId:         a.nurseUserId,
            nurseName:           a.nurseName,
            nursePhone:          a.nursePhone,
            nurseEmail:          a.nurseEmail,
            nurseSpecialization: a.nurseSpecialization,
            nurseExperience:     a.nurseExperience,
            nurseEducation:      a.nurseEducation,
            nurseExpertise:      a.nurseExpertise,
            nurseLicenseNumber:  a.nurseLicenseNumber,
            nurseAvailability:   a.nurseAvailability,
            nurseRating:         a.nurseRating,
            nurseUpiId:          a.nurseUpiId,
            nurseBankAccount:    a.nurseBankAccount,
            nurseIfsc:           a.nurseIfsc,
            nurseBankName:       a.nurseBankName,
            nursePreferredPaymentMode: a.nursePreferredPaymentMode,
          });
        }
      });
    return Array.from(seen.values());
  }

  appointmentsFor(nurseId: number): any[] {
    return this.allAppointments
      .filter(a => a.nurseId === nurseId)
      .sort((a, b) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime());
  }

  hasActiveAppointment(nurseId: number): boolean {
    const ACTIVE = ['PENDING', 'CONFIRMED', 'IN_PROGRESS'];
    return this.allAppointments.some(a =>
      a.nurseId === nurseId && ACTIVE.includes((a.status || '').toUpperCase())
    );
  }

  openDetail(nurse: any): void  { this.selectedNurse = nurse; }
  closeDetail(): void           { this.selectedNurse = null; }

  // ── Shift Loading ─────────────────────────────────────────────────────────

  loadShiftsFor(appointmentId: number): void {
    this.loadingShifts.add(appointmentId);
    this.shiftSvc.getByAppointment(appointmentId).subscribe({
      next: (shifts) => {
        this.shiftsMap[appointmentId] = shifts || [];
        this.loadingShifts.delete(appointmentId);
      },
      error: () => { this.loadingShifts.delete(appointmentId); }
    });
  }

  shiftsFor(appointmentId: number): any[] {
    return this.shiftsMap[appointmentId] || [];
  }

  confirmedShiftsFor(appointmentId: number): any[] {
    return this.shiftsFor(appointmentId).filter(s => s.status === 'CONFIRMED');
  }

  pendingShiftsFor(appointmentId: number): any[] {
    return this.shiftsFor(appointmentId).filter(s => s.status === 'PENDING_CONFIRMATION');
  }

  totalConfirmedAmount(appointmentId: number): number {
    return this.confirmedShiftsFor(appointmentId)
      .reduce((sum, s) => sum + (s.finalRate || s.originalRate || 0), 0);
  }

  // ── Mark Shift Modal ──────────────────────────────────────────────────────

  openShiftModal(appt: any): void {
    this.shiftModal       = appt;
    this.shiftDate        = this.today;
    this.shiftNotes       = '';
    this.shiftDateError   = '';
    this.shiftSuccess     = '';
    this.wantsToNegotiate = false;
    this.negotiatedRate   = '';
    this.negotiateError   = '';
  }

  closeShiftModal(): void { this.shiftModal = null; }

  // Agreed rate from nurse's bid (auto-filled)
  get agreedRate(): number { return this.shiftModal?.agreedRatePerShift ?? 0; }

  submitShift(): void {
    this.shiftDateError = '';
    this.negotiateError = '';

    if (!this.shiftDate) { this.shiftDateError = 'Please select a shift date.'; return; }
    if (this.shiftDate > this.today) {
      this.shiftDateError = 'Shift date cannot be in the future.'; return;
    }

    let negotiatedRateVal: number | undefined;
    let successMsg = '';

    if (this.agreedRate <= 0) {
      // Direct booking — no pre-agreed rate; patient MUST enter one
      const n = parseFloat(this.negotiatedRate);
      if (!this.negotiatedRate || isNaN(n) || n < 1) {
        this.negotiateError = 'Please enter a valid rate (min ₹1).'; return;
      }
      negotiatedRateVal = n;
      successMsg = `Shift marked at ₹${n}. Waiting for nurse confirmation.`;

    } else if (this.wantsToNegotiate) {
      // Bid-based — patient wants a different rate
      const n = parseFloat(this.negotiatedRate);
      if (!this.negotiatedRate || isNaN(n) || n < 1) {
        this.negotiateError = 'Please enter a valid proposed rate (min ₹1).'; return;
      }
      negotiatedRateVal = n === this.agreedRate ? undefined : n;
      successMsg = negotiatedRateVal
        ? `Negotiation sent (₹${n}). Nurse will accept or keep ₹${this.agreedRate}.`
        : `Shift marked at ₹${this.agreedRate}. Waiting for nurse confirmation.`;

    } else {
      // Bid-based — no negotiation; use agreed rate
      successMsg = `Shift marked at ₹${this.agreedRate}. Waiting for nurse confirmation.`;
    }

    this.isMarkingShift = true;
    this.shiftSvc.markShift(this.myUserId, {
      appointmentId:  this.shiftModal.id,
      shiftDate:      this.shiftDate,
      negotiatedRate: negotiatedRateVal,
      notes:          this.shiftNotes
    }).subscribe({
      next: (newShift) => {
        this.isMarkingShift  = false;
        this.shiftSuccess    = successMsg;
        if (!this.shiftsMap[this.shiftModal.id]) this.shiftsMap[this.shiftModal.id] = [];
        this.shiftsMap[this.shiftModal.id].unshift(newShift);
        setTimeout(() => this.closeShiftModal(), 2500);
      },
      error: (err: Error) => {
        this.negotiateError = err.message;
        this.isMarkingShift = false;
      }
    });
  }

  // ── Pay Modal (pay confirmed shifts) ──────────────────────────────────────

  openPayModal(appt: any): void {
    // Check if nurse has bank/UPI details available from appointment
    const nurse = this.assignedNurses.find(n => n.nurseId === appt.nurseId);
    this.payModal          = { appt, nurse };
    this.selectedPayMethod = nurse?.nursePreferredPaymentMode || 'UPI';
    this.paySuccess        = '';
    this.payError          = '';
  }

  closePayModal(): void { this.payModal = null; }

  confirmPayment(): void {
    if (!this.payModal) return;
    this.isProcessingPayment = true;
    this.payError            = '';

    this.paymentSvc.processPatientPayment(
      this.myUserId,
      this.payModal.appt.id,
      this.selectedPayMethod
    ).subscribe({
      next: () => {
        this.isProcessingPayment = false;
        this.paySuccess          = 'Payment done! Nurse has been notified.';
        // Reload shifts
        this.loadShiftsFor(this.payModal.appt.id);
        setTimeout(() => this.closePayModal(), 2000);
      },
      error: (err: Error) => {
        this.payError            = err.message;
        this.isProcessingPayment = false;
      }
    });
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  formatAmount(n: number): string {
    return '₹' + Number(n).toLocaleString('en-IN');
  }

  formatDate(d: string): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
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
      case 'PENDING_CONFIRMATION': return '⏳ Awaiting nurse';
      case 'REJECTED':             return '✗ Rejected';
      default:                     return status;
    }
  }

  statusClass(status: string): string {
    const s = (status ?? '').toUpperCase();
    if (s === 'CONFIRMED')   return 'badge-confirmed';
    if (s === 'COMPLETED')   return 'badge-completed';
    if (s === 'CANCELLED')   return 'badge-cancelled';
    if (s === 'IN_PROGRESS') return 'badge-inprogress';
    return 'badge-pending';
  }

  minDate(appt: any): string {
    if (!appt?.appointmentDate) return '';
    return new Date(appt.appointmentDate).toISOString().split('T')[0];
  }

  // ── Chat ─────────────────────────────────────────────────────────────────

  private refreshUnread(): void {
    this.msgSvc.getUnreadSenders(this.myUserId).subscribe({
      next: (ids) => { this.unreadFrom = new Set(ids); },
      error: () => {}
    });
  }

  openChat(nurse: any): void {
    this.unreadFrom.delete(nurse.nurseUserId);
    this.chatNurse  = nurse;
    this.messages   = [];
    this.newMessage = '';
    this.chatError  = '';
    this.loadMessages();
    this.startPoll();
  }

  closeChat(): void { this.chatNurse = null; this.stopPoll(); }

  private loadMessages(): void {
    if (!this.chatNurse?.nurseUserId) return;
    this.msgSvc.getConversation(this.myUserId, this.chatNurse.nurseUserId).subscribe({
      next: (msgs) => {
        const prevLen = this.messages.length;
        this.messages = msgs;
        if (msgs.length > prevLen) this.shouldScroll = true;
        this.msgSvc.markRead(this.myUserId, this.chatNurse.nurseUserId).subscribe({
          next: () => this.unreadFrom.delete(this.chatNurse.nurseUserId)
        });
      },
      error: () => {}
    });
  }

  sendMessage(): void {
    const text = this.newMessage.trim();
    if (!text || !this.chatNurse?.nurseUserId) return;
    this.isSending = true;
    this.chatError = '';
    this.msgSvc.send(this.myUserId, this.myName, 'PATIENT', this.chatNurse.nurseUserId, 'NURSE', text).subscribe({
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
