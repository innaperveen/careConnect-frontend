import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { AuthService } from '../../../services/auth.service';
import { AppointmentService } from '../../../services/appointment.service';
import { MessageService } from '../../../services/message.service';

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
  filters      = ['All', 'PENDING', 'CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
  filterLabels: Record<string, string> = {
    All: 'All', PENDING: 'Pending', CONFIRMED: 'Confirmed',
    IN_PROGRESS: 'In Progress', COMPLETED: 'Completed', CANCELLED: 'Cancelled'
  };

  // Chat state
  chatPatient: any   = null;
  messages:    any[] = [];
  newMessage   = '';
  isSending    = false;
  chatError    = '';
  unreadFrom   = new Set<number>(); // patientUserIds with unread messages
  private pollTimer?: any;
  private unreadTimer?: any;
  private shouldScroll = false;

  private myUserId!: number;
  private myName!:   string;

  constructor(
    private auth:       AuthService,
    private apptService:AppointmentService,
    private msgSvc:     MessageService
  ) {}

  ngOnInit(): void {
    const user    = this.auth.getUser();
    this.myUserId = this.auth.getUserId()!;
    this.myName   = user?.fullName || user?.email || 'Nurse';

    this.apptService.getByNurse(this.myUserId).subscribe({
      next: (data) => { this.appointments = data || []; this.isLoading = false; },
      error: ()     => { this.isLoading = false; }
    });

    this.refreshUnread();
    this.unreadTimer = setInterval(() => this.refreshUnread(), 10000);
  }

  ngOnDestroy(): void { this.stopPoll(); clearInterval(this.unreadTimer); }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) { this.scrollToBottom(); this.shouldScroll = false; }
  }

  // ── Patients list ──────────────────────────────────────────────────────────

  get assignedPatients(): any[] {
    const seen = new Set<number>();
    return this.appointments
      .filter(a => { if (seen.has(a.patientId)) return false; seen.add(a.patientId); return true; });
  }

  appointmentsFor(patientId: number): any[] {
    return this.appointments.filter(a =>
      a.patientId === patientId &&
      (this.activeFilter === 'All' || a.status === this.activeFilter)
    );
  }

  hasActiveAppointment(patientId: number): boolean {
    const ACTIVE = ['PENDING', 'CONFIRMED', 'IN_PROGRESS'];
    return this.appointments.some(a =>
      a.patientId === patientId && ACTIVE.includes((a.status || '').toUpperCase())
    );
  }

  get filteredPatients(): any[] {
    if (this.activeFilter === 'All') return this.assignedPatients;
    return this.assignedPatients.filter(p => this.appointmentsFor(p.patientId).length > 0);
  }

  // ── Chat ───────────────────────────────────────────────────────────────────

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

  closeChat(): void {
    this.chatPatient = null;
    this.stopPoll();
  }

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

    this.msgSvc.send(
      this.myUserId, this.myName, 'NURSE',
      this.chatPatient.patientUserId, 'PATIENT', text
    ).subscribe({
      next: (msg) => {
        this.messages.push(msg);
        this.newMessage   = '';
        this.isSending    = false;
        this.shouldScroll = true;
      },
      error: (err: Error) => {
        this.isSending = false;
        this.chatError = err.message;
      }
    });
  }

  onEnter(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  isMine(msg: any): boolean { return msg.senderId === this.myUserId; }

  private startPoll(): void {
    this.pollTimer = setInterval(() => this.loadMessages(), 4000);
  }

  private stopPoll(): void {
    if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = undefined; }
  }

  private scrollToBottom(): void {
    try { this.msgEnd?.nativeElement?.scrollIntoView({ behavior: 'smooth' }); } catch {}
  }

  getStatusClass(status: string): string {
    const s = (status ?? '').toUpperCase();
    return s === 'CONFIRMED'   ? 'badge-confirmed'
         : s === 'COMPLETED'   ? 'badge-completed'
         : s === 'CANCELLED'   ? 'badge-cancelled'
         : s === 'IN_PROGRESS' ? 'badge-inprogress'
         : 'badge-pending';
  }

  logout(): void { this.auth.logout(); }
}
