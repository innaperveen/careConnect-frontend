import { AuthService } from '../../../services/auth.service';
import { Component } from '@angular/core';

interface Appointment {
  id: number;
  nurseName: string;
  specialty: string;
  date: string;
  time: string;
  careType: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
  priority: 'Normal' | 'Urgent' | 'Emergency';
}

@Component({
  selector: 'app-my-appointments',
  templateUrl: './my-appointments.component.html',
  styleUrls: ['./my-appointments.component.css']
})
export class MyAppointmentsComponent {

  constructor(private auth: AuthService) {}


  activeTab = 'All';
  tabs = ['All', 'Scheduled', 'Completed', 'Cancelled'];

  appointments: Appointment[] = [
    { id: 1, nurseName: 'Nurse Emily Chen',    specialty: 'ICU Specialist', date: 'Nov 5, 2025',  time: '10:00 AM', careType: 'ICU Support',    status: 'Scheduled', priority: 'Normal'    },
    { id: 2, nurseName: 'Nurse Marcus Johnson', specialty: 'General Nurse',  date: 'Oct 20, 2025', time: '02:00 PM', careType: 'General Care',   status: 'Completed', priority: 'Normal'    },
    { id: 3, nurseName: 'Nurse Priya Sharma',  specialty: 'Pediatric',      date: 'Oct 15, 2025', time: '09:00 AM', careType: 'Pediatric Care', status: 'Cancelled', priority: 'Urgent'    },
    { id: 4, nurseName: 'Nurse Rahul Gupta',   specialty: 'Orthopedic',     date: 'Nov 12, 2025', time: '11:00 AM', careType: 'Post-Surgery',   status: 'Scheduled', priority: 'Normal'    },
    { id: 5, nurseName: 'Nurse Anita Mishra',  specialty: 'Geriatric',      date: 'Oct 5, 2025',  time: '08:00 AM', careType: 'Elderly Care',   status: 'Completed', priority: 'Normal'    },
  ];

  get filteredAppointments(): Appointment[] {
    if (this.activeTab === 'All') return this.appointments;
    return this.appointments.filter(a => a.status === this.activeTab);
  }

  countByStatus(status: string): number {
    return this.appointments.filter(a => a.status === status).length;
  }

  cancelAppointment(id: number): void {
    const appt = this.appointments.find(a => a.id === id);
    if (appt && appt.status === 'Scheduled') appt.status = 'Cancelled';
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Scheduled': return 'badge-scheduled';
      case 'Completed': return 'badge-completed';
      case 'Cancelled': return 'badge-cancelled';
      default: return '';
    }
  }

  getPriorityClass(priority: string): string {
    switch (priority) {
      case 'Urgent':    return 'pri-urgent';
      case 'Emergency': return 'pri-emergency';
      default:          return 'pri-normal';
    }
  }
  logout(): void { this.auth.logout(); }
}
