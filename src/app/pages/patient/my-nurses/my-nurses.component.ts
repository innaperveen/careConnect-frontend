import { Component, OnInit, OnDestroy, ElementRef, ViewChild, AfterViewChecked } from '@angular/core';
import { AuthService } from '../../../services/auth.service';
import { AppointmentService } from '../../../services/appointment.service';
import { MessageService } from '../../../services/message.service';

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

  // Chat state
  chatNurse: any       = null;
  messages:  any[]     = [];
  newMessage = '';
  isSending  = false;
  chatError  = '';
  unreadFrom = new Set<number>(); // nurseUserIds with unread messages
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
    const user      = this.auth.getUser();
    this.myUserId   = this.auth.getUserId()!;
    this.myName     = user?.fullName || user?.email || 'Patient';

    this.apptService.getByPatient(this.myUserId).subscribe({
      next: (data) => { this.allAppointments = data || []; this.isLoading = false; },
      error: ()     => { this.isLoading = false; }
    });

    this.refreshUnread();
    this.unreadTimer = setInterval(() => this.refreshUnread(), 10000);
  }

  ngOnDestroy(): void { this.stopPoll(); clearInterval(this.unreadTimer); }

  ngAfterViewChecked(): void {
    if (this.shouldScroll) { this.scrollToBottom(); this.shouldScroll = false; }
  }

  // ── Nurses list ────────────────────────────────────────────────────────────

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

  // ── Chat ───────────────────────────────────────────────────────────────────

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

  closeChat(): void {
    this.chatNurse = null;
    this.stopPoll();
  }

  private loadMessages(): void {
    if (!this.chatNurse?.nurseUserId) return;
    this.msgSvc.getConversation(this.myUserId, this.chatNurse.nurseUserId).subscribe({
      next: (msgs) => {
        const prevLen = this.messages.length;
        this.messages = msgs;
        if (msgs.length > prevLen) this.shouldScroll = true;
        // Mark messages from nurse as read
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

    this.isSending  = true;
    this.chatError  = '';

    this.msgSvc.send(
      this.myUserId, this.myName, 'PATIENT',
      this.chatNurse.nurseUserId, 'NURSE', text
    ).subscribe({
      next: (msg) => {
        this.messages.push(msg);
        this.newMessage  = '';
        this.isSending   = false;
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

  statusClass(status: string): string {
    const s = (status ?? '').toUpperCase();
    if (s === 'CONFIRMED')   return 'badge-confirmed';
    if (s === 'COMPLETED')   return 'badge-completed';
    if (s === 'CANCELLED')   return 'badge-cancelled';
    if (s === 'IN_PROGRESS') return 'badge-inprogress';
    return 'badge-pending';
  }

  logout(): void { this.auth.logout(); }
}
