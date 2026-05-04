import { AuthService } from '../../../services/auth.service';
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-patient-dashboard',
  templateUrl: './patient-dashboard.component.html',
  styleUrls: ['./patient-dashboard.component.css']
})
export class PatientDashboardComponent implements OnInit {

  constructor(private auth: AuthService) {}

  patientName = 'Prakhar';
  patientId = 'P12345';
  greeting = '';

  appointments = [
    { nurseName: 'Nurse Emily Chen',     date: 'Oct 24, 2024', time: '10:00 AM', status: 'Scheduled' },
    { nurseName: 'Nurse Marcus Johnson', date: 'Oct 28, 2024', time: '02:00 PM', status: 'Scheduled' },
    { nurseName: 'Nurse Priya Sharma',   date: 'Sep 15, 2024', time: '09:00 AM', status: 'Completed' }
  ];

  records = [
    { fileName: 'Blood_Test_Results.pdf', date: 'Oct 15, 2024' },
    { fileName: 'Xray_Chest_Scan.jpg',    date: 'Oct 10, 2024' }
  ];

  notifications = [
    'Appointment confirmed with Nurse Emily',
    'Reminder: Upload recent lab reports'
  ];

  ngOnInit(): void {
    const hour = new Date().getHours();
    if (hour < 12) this.greeting = 'Good Morning';
    else if (hour < 18) this.greeting = 'Good Afternoon';
    else this.greeting = 'Good Evening';
  }

  countByStatus(status: string): number {
    return this.appointments.filter(a => a.status === status).length;
  }
  logout(): void { this.auth.logout(); }
}
