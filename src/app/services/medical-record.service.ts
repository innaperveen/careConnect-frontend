import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class MedicalRecordService {

  private readonly API = 'http://localhost:8080/api/medical-records';

  constructor(private http: HttpClient) {}

  getByPatient(patientUserId: number): Observable<any[]> {
    return this.http.get<any>(`${this.API}/patient/${patientUserId}`)
      .pipe(map((r: any) => r.data || []), catchError(this.handleError));
  }

  upload(patientUserId: number, uploaderUserId: number,
         recordType: string, title: string, description?: string): Observable<any> {
    let params = new HttpParams()
      .set('recordType', recordType)
      .set('title', title);
    if (description) params = params.set('description', description);
    return this.http.post<any>(
      `${this.API}/patient/${patientUserId}/uploader/${uploaderUserId}`, null, { params }
    ).pipe(map((r: any) => r.data), catchError(this.handleError));
  }

  delete(id: number): Observable<any> {
    return this.http.delete<any>(`${this.API}/${id}`)
      .pipe(catchError(this.handleError));
  }

  private handleError(err: HttpErrorResponse): Observable<never> {
    const msg = err.error?.message ?? 'Something went wrong.';
    return throwError(() => new Error(msg));
  }
}
