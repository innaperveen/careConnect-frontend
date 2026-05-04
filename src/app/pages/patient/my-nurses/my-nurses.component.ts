import { Component, OnInit } from '@angular/core';
import { AuthService } from '../../../services/auth.service';
import { AppointmentService } from '../../../services/appointment.service';

@Component({
  selector: 'app-my-nurses',
  templateUrl: './my-nurses.component.html',
  styleUrls: ['./my-nurses.component.css']
})
export class MyNursesComponent implements OnInit {

  appointments: any[] = [];
  isLoading = true;

  // Unique nurses derived from appointments that have a nurse assigned
  get assignedNurses(): any[] {
    const seen = new Set<number>();
    return this.appointments
      .filter(a => a.nurseId != null)
      .filter(a => { if (seen.has(a.nurseId)) return false; seen.add(a.nurseId); return true; });
  }

  // Appointments for a specific nurse
  appointmentsForNurse(nurseId: number): any[] {
    return this.appointments.filter(a => a.nurseId === nurseId);
  }

  constructor(private auth: AuthService, private apptService: AppointmentService) {}

  ngOnInit(): void {
    const userId = this.auth.getUserId();
    if (!userId) return;

    this.apptService.getByPatient(userId).subscribe({
      next: (data) => { this.appointments = data || []; this.isLoading = false; },
      error: ()     => { this.isLoading = false; }
    });
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
