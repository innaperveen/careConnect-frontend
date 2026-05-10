import { AuthService } from '../../../services/auth.service';
import { NurseService } from '../../../services/nurse.service';
import { AppointmentService } from '../../../services/appointment.service';
import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-nurse-dashboard',
  templateUrl: './nurse-dashboard.component.html',
  styleUrls: ['./nurse-dashboard.component.css']
})
export class NurseDashboardComponent implements OnInit {

  isLoading = true;

  nurseName        = 'Nurse';
  nurseSpecialty   = '—';
  nurseExperience  = '—';
  profileCompletion = 0;
  avatarLetter     = 'N';

  upcomingShifts  = 0;
  monthlyEarnings = '—';
  applicationsCount = 0;

  quickActions = [
    { icon: 'bi-briefcase-fill',       label: 'Browse Jobs',    route: '/nurse-available-jobs', bgColor: '#e3f6ef', color: '#1aa37a' },
    { icon: 'bi-journal-bookmark-fill', label: 'Applications',   route: '/nurse-applications',   bgColor: '#e8f0fe', color: '#1a73e8' },
    { icon: 'bi-calendar3',            label: 'My Schedule',    route: '/nurse-schedule',        bgColor: '#fef3e2', color: '#d68910' },
    { icon: 'bi-person-badge',         label: 'My Profile',     route: '/nurse-profile',         bgColor: '#fde8e8', color: '#c0392b' },
  ];

  isAvailable     = true;
  notificationsOpen = false;
  notifications = [
    { message: 'Welcome to CareConnect!', time: 'just now', read: false }
  ];

  // Recent items from backend
  recentAppointments: any[] = [];
  recentApplications: any[] = [];

  // Jobs (still hardcoded — job listings module pending)
  jobs = [
    { title: 'ICU Nurse',       location: 'Delhi',     shift: 'Night', salary: '₹30,000' },
    { title: 'Emergency Nurse', location: 'Bangalore', shift: 'Day',   salary: '₹28,000' }
  ];

  selectedJob: any = null;

  constructor(
    private auth:        AuthService,
    private nurseSvc:    NurseService,
    private apptService: AppointmentService
  ) {}

  ngOnInit(): void {
    const userId = this.auth.getUserId();
    if (!userId) { this.isLoading = false; return; }

    forkJoin({
      profile:      this.nurseSvc.getProfile(userId),
      appointments: this.apptService.getByNurse(userId),
      applications: this.nurseSvc.getApplications(userId)
    }).subscribe({
      next: ({ profile, appointments, applications }) => {
        // Profile
        this.nurseName        = profile.fullName || 'Nurse';
        this.nurseSpecialty   = profile.specialization || '—';
        this.nurseExperience  = profile.experienceYears != null ? profile.experienceYears + ' Yrs Exp' : '—';
        this.avatarLetter     = (profile.fullName || 'N')[0].toUpperCase();
        this.profileCompletion = this.calcCompletion(profile);

        // Appointments — upcoming = future dates
        const now = new Date();
        const upcoming = (appointments || []).filter((a: any) => {
          const d = new Date(a.appointmentDate);
          return d > now && (a.status === 'PENDING' || a.status === 'CONFIRMED');
        });
        this.upcomingShifts = upcoming.length;
        this.recentAppointments = upcoming.slice(0, 3);

        // Applications
        this.applicationsCount = (applications || []).length;
        this.recentApplications = (applications || []).slice(0, 3).map((a: any) => ({
          jobTitle: a.jobTitle,
          status:   a.status
        }));

        this.isLoading = false;
      },
      error: () => { this.isLoading = false; }
    });
  }

  private calcCompletion(profile: any): number {
    const fields = ['fullName', 'licenseNumber', 'phone', 'specialization',
                    'education', 'availability', 'expertise', 'address'];
    const filled = fields.filter(f => profile[f] && String(profile[f]).trim() !== '').length;
    return Math.round((filled / fields.length) * 100);
  }

  toggleAvailability() { this.isAvailable = !this.isAvailable; }
  toggleNotifications() { this.notificationsOpen = !this.notificationsOpen; }
  hasUnreadNotifications(): boolean { return this.notifications.some(n => !n.read); }

  openDetails(job: any) { this.selectedJob = job; }
  closeModal()          { this.selectedJob = null; }
  apply(job: any)       { alert('Applied for ' + job.title); }

  getStatusClass(status: string): string {
    const s = (status ?? '').toUpperCase();
    return s === 'APPROVED' ? 's-accepted'
         : s === 'REJECTED' ? 's-rejected'
         : s === 'PENDING'  ? 's-applied'
         : 's-default';
  }

  displayStatus(s: string): string {
    const m: Record<string,string> = { PENDING: 'Pending', APPROVED: 'Approved', REJECTED: 'Rejected' };
    return m[(s||'').toUpperCase()] || s;
  }

  logout(): void { this.auth.logout(); }
}
