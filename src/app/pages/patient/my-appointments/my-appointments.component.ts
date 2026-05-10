import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../../services/auth.service';
import { AppointmentService } from '../../../services/appointment.service';

@Component({
  selector: 'app-my-appointments',
  templateUrl: './my-appointments.component.html',
  styleUrls: ['./my-appointments.component.css']
})
export class MyAppointmentsComponent implements OnInit {

  isLoading    = true;
  cancellingId: number | null = null;
  activeTab    = 'All';
  tabs         = ['All', 'PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'];
  tabLabels: Record<string, string> = {
    All: 'All', PENDING: 'Pending', CONFIRMED: 'Confirmed', COMPLETED: 'Completed', CANCELLED: 'Cancelled'
  };
  appointments: any[] = [];    // stores full raw backend objects
  rawAppointments: any[] = []; // kept for reference

  // Applicants panel
  applicantsTarget: any   = null;
  applicants:       any[] = [];
  loadingApplicants       = false;
  acceptingApplicationId: number | null = null;
  applicantsError         = '';

  // Nurse detail view (inside applicants panel)
  selectedApplicant: any = null;

  // Reschedule modal state
  rescheduleTarget: any = null;
  rescheduleDate   = '';
  rescheduleHour   = '09';
  rescheduleMinute = '00';
  rescheduleAmPm   = 'AM';
  isRescheduling   = false;
  rescheduleError  = '';
  today = new Date().toISOString().split('T')[0];
  hours   = ['12','01','02','03','04','05','06','07','08','09','10','11'];
  minutes = ['00','15','30','45'];

  constructor(private auth: AuthService, private apptService: AppointmentService) {}

  ngOnInit(): void {
    const userId = this.auth.getUserId();
    if (!userId) { this.isLoading = false; return; }

    this.apptService.getByPatient(userId).subscribe({
      next: (data) => {
        this.rawAppointments = data || [];
        this.appointments    = this.rawAppointments.map((a: any) => this.mapAppointment(a));
        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  private mapAppointment(a: any): any {
    const dt = new Date(a.appointmentDate);
    return {
      id:             a.id,
      nurseName:      a.nurseName || null,
      careType:       a.careNeeds || '—',
      duration:       a.duration  || '—',
      date: dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      status:         (a.status || 'PENDING').toUpperCase(),
      applicantCount: a.applicantCount ?? 0
    };
  }

  get filteredAppointments(): any[] {
    if (this.activeTab === 'All') return this.appointments;
    return this.appointments.filter(a => a.status === this.activeTab);
  }

  get scheduledCount(): number {
    return this.appointments.filter(a => a.status === 'PENDING' || a.status === 'CONFIRMED').length;
  }
  get completedCount(): number { return this.appointments.filter(a => a.status === 'COMPLETED').length; }
  get cancelledCount(): number { return this.appointments.filter(a => a.status === 'CANCELLED').length; }

  countByStatus(status: string): number {
    if (status === 'All') return this.appointments.length;
    return this.appointments.filter(a => a.status === status).length;
  }

  openReschedule(appt: any): void {
    this.rescheduleTarget = appt;
    this.rescheduleDate   = '';
    this.rescheduleHour   = '09';
    this.rescheduleMinute = '00';
    this.rescheduleAmPm   = 'AM';
    this.rescheduleError  = '';
  }

  closeReschedule(): void { this.rescheduleTarget = null; }

  confirmReschedule(): void {
    if (!this.rescheduleTarget || !this.rescheduleDate) {
      this.rescheduleError = 'Please select a new date.';
      return;
    }
    let h = parseInt(this.rescheduleHour, 10);
    if (this.rescheduleAmPm === 'PM' && h !== 12) h += 12;
    if (this.rescheduleAmPm === 'AM' && h === 12) h = 0;
    const time = `${h.toString().padStart(2, '0')}:${this.rescheduleMinute}`;
    const newDate = new Date(`${this.rescheduleDate}T${time}:00`).toISOString();

    this.isRescheduling = true;
    this.rescheduleError = '';
    this.apptService.reschedule(this.rescheduleTarget.id, newDate).subscribe({
      next: (updated) => {
        const appt = this.appointments.find(a => a.id === this.rescheduleTarget!.id);
        if (appt && updated) {
          const dt = new Date(updated.appointmentDate);
          appt.date = dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          appt.time = dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        }
        this.isRescheduling  = false;
        this.rescheduleTarget = null;
      },
      error: (err: Error) => {
        this.rescheduleError = err.message;
        this.isRescheduling  = false;
      }
    });
  }

  cancelAppointment(id: number): void {
    this.cancellingId = id;
    this.apptService.cancel(id).subscribe({
      next: () => {
        const appt = this.appointments.find(a => a.id === id);
        if (appt) appt.status = 'CANCELLED';
        this.cancellingId = null;
      },
      error: () => { this.cancellingId = null; }
    });
  }

  getStatusClass(status: string): string {
    switch ((status || '').toUpperCase()) {
      case 'CONFIRMED':   return 'badge-scheduled';
      case 'PENDING':     return 'badge-scheduled';
      case 'COMPLETED':   return 'badge-completed';
      case 'CANCELLED':   return 'badge-cancelled';
      case 'IN_PROGRESS': return 'badge-inprogress';
      default:            return 'badge-scheduled';
    }
  }

  // ── Applicants panel ─────────────────────────────────────────────
  viewApplicants(appt: any): void {
    this.applicantsTarget = appt;
    this.applicants       = [];
    this.applicantsError  = '';
    this.loadingApplicants = true;

    this.apptService.getAppointmentApplications(appt.id).subscribe({
      next: (data) => { this.applicants = data || []; this.loadingApplicants = false; },
      error: ()    => { this.applicantsError = 'Failed to load applicants.'; this.loadingApplicants = false; }
    });
  }

  closeApplicants(): void { this.applicantsTarget = null; this.applicants = []; this.selectedApplicant = null; }

  viewNurseDetail(app: any): void  { this.selectedApplicant = app; }
  closeNurseDetail(): void         { this.selectedApplicant = null; }

  selectNurse(applicationId: number): void {
    this.acceptingApplicationId = applicationId;
    this.applicantsError        = '';

    this.apptService.acceptAppointmentApplication(applicationId).subscribe({
      next: (updated) => {
        // Update the appointment card in the list
        const appt = this.appointments.find(a => a.id === this.applicantsTarget?.id);
        if (appt && updated) {
          appt.nurseName = updated.nurseName;
          appt.status    = 'CONFIRMED';
          appt.applicantCount = 0;
        }
        this.acceptingApplicationId = null;
        this.selectedApplicant = null;
        this.closeApplicants();
      },
      error: (err: Error) => {
        this.applicantsError        = err.message;
        this.acceptingApplicationId = null;
      }
    });
  }

  logout(): void { this.auth.logout(); }
}
