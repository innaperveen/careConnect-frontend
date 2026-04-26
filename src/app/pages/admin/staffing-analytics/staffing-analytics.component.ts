import { Component } from '@angular/core';

@Component({
  selector: 'app-staffing-analytics',
  templateUrl: './staffing-analytics.component.html',
  styleUrls: ['./staffing-analytics.component.css']
})
export class StaffingAnalyticsComponent {

  monthlyHires = [
    { month: 'Nov', count: 4 }, { month: 'Dec', count: 6 }, { month: 'Jan', count: 3 },
    { month: 'Feb', count: 8 }, { month: 'Mar', count: 5 }, { month: 'Apr', count: 7 }
  ];

  maxHires = 10;

  specializations = [
    { name: 'ICU / Critical Care', count: 15, pct: 31 },
    { name: 'Home Care',           count: 12, pct: 25 },
    { name: 'Pediatrics',          count: 8,  pct: 17 },
    { name: 'Geriatrics',          count: 7,  pct: 15 },
    { name: 'Wound Care',          count: 4,  pct: 8  },
    { name: 'General Nursing',     count: 2,  pct: 4  }
  ];

  topNurses = [
    { name: 'Anika Joshi',   jobs: 12, rating: '4.9', specialty: 'Pediatrics' },
    { name: 'Deepa Nair',    jobs: 10, rating: '4.8', specialty: 'Wound Care' },
    { name: 'Amit Verma',    jobs: 9,  rating: '4.7', specialty: 'Critical Care' },
    { name: 'Sunita Patel',  jobs: 8,  rating: '4.6', specialty: 'Geriatrics' },
    { name: 'Priya Sharma',  jobs: 7,  rating: '4.5', specialty: 'ICU' }
  ];

  getBarHeight(count: number): number {
    return Math.round((count / this.maxHires) * 100);
  }
}
