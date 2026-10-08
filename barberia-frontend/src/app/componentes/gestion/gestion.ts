import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, Subscription } from 'rxjs';
import { Api, Person, Service, Appointment, errorMessage, canManage } from '../../core/services/api';
import { Navigation } from '../../shared/navigation';
import { ProfilePhoto } from '../../shared/profile-photo';
@Component({
  selector: 'app-gestion',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, Navigation, ProfilePhoto],
  templateUrl: './gestion.html',
  styleUrls: ['../dashboard/dashboard.css', '../../shared/forms.css'],
})
export class Gestion implements OnInit, OnDestroy {
  page = '';
  me!: Person;
  people: Person[] = [];
  services: Service[] = [];
  barbers: { id: number; name: string; profilePhoto?: string | null }[] = [];
  appointments: Appointment[] = [];
  loading = true;
  saving = false;
  error = '';
  message = '';
  filter = '';
  slots: { time: string }[] = [];
  slotLoading = false;
  slotVersion = 0;
  loadVersion = 0;
  subscription?: Subscription;
  titles: Record<string, string> = {
    barberos: 'Equipo de Barberos',
    servicios: 'Catálogo de Servicios',
    citas: 'Libro de Citas',
    fidelizacion: 'Club de Fidelización',
  };
  person = { name: '', email: '', phone: '', profilePhoto: null as string | null };
  photoBusy = false;
  editingPerson: number | null = null;
  showPerson = false;
  service = {
    name: '',
    description: '',
    price: 0,
    durationMinutes: 30,
    requiredPoints: null as number | null,
    isActive: true,
  };
  editingService: number | null = null;
  showService = false;
  booking = { clientId: 0, barberId: 0, serviceId: 0, date: '', time: '', paidWithPoints: false };
  chatText = '';
  chatting = false;
  messages: { who: string; text: string }[] = [];
  constructor(
    private api: Api,
    private route: ActivatedRoute,
  ) {}
  get admin() {
    return canManage(this.me, this.page === 'barberos' ? 'BARBERS' : this.page === 'servicios' ? 'SERVICES' : 'LOYALTY');
  }
  get staff() {
    return canManage(this.me, this.page === 'fidelizacion' ? 'LOYALTY' : 'APPOINTMENTS') || this.me?.role === 'BARBER';
  }
  get today() {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Guatemala',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }
  get selectedClient() {
    return this.people.find((p) => p.id === Number(this.booking.clientId)) || this.me;
  }
  get selectedService() {
    return this.services.find((s) => s.id === Number(this.booking.serviceId));
  }
  get canRedeem() {
    return (
      !!this.selectedService?.requiredPoints &&
      this.selectedClient?.points >= this.selectedService.requiredPoints
    );
  }
  get filtered() {
    const term = this.filter.toLowerCase();
    return this.appointments.filter((a) =>
      (a.client.name + ' ' + a.barber.name + ' ' + a.service.name + ' ' + this.status(a.status))
        .toLowerCase()
        .includes(term),
    );
  }
  ngOnInit() {
    this.subscription = this.route.data.subscribe((d) => {
      this.page = d['page'];
      this.error = '';
      this.message = '';
      this.filter = '';
      this.showPerson = false;
      this.showService = false;
      this.booking.clientId = 0;
      this.booking.barberId = Number(this.route.snapshot.queryParamMap.get('barberoId')) || 0;
      this.booking.serviceId = Number(this.route.snapshot.queryParamMap.get('servicioId')) || 0;
      this.booking.time = '';
      this.slots = [];
      this.slotVersion++;
      this.slotLoading = false;
      this.booking.paidWithPoints = false;
      this.load();
    });
  }
  ngOnDestroy() {
    this.subscription?.unsubscribe();
    this.slotVersion++;
    this.loadVersion++;
  }
  load() {
    const version = ++this.loadVersion;
    this.loading = true;
    forkJoin({
      me: this.api.get<Person>('/users/me'),
      people: this.api.get<Person[]>(this.page === 'barberos' ? '/users?role=BARBER' : '/users'),
      services: this.api.get<Service[]>('/services'),
      barbers: this.api.get<{ id: number; name: string }[]>('/users/barbers'),
      appointments: this.api.get<Appointment[]>('/appointments'),
    }).subscribe({
      next: (r) => {
        if (version !== this.loadVersion) return;
        Object.assign(this, r);
        this.loading = false;
        if (this.page === 'citas' && !this.booking.clientId)
          this.booking.clientId = this.staff
            ? Number(this.route.snapshot.queryParamMap.get('clienteId')) ||
              this.people[0]?.id ||
              this.me.id
            : this.me.id;
        if (!this.booking.date) this.booking.date = this.today;
        if (this.page === 'citas' && this.booking.barberId && this.booking.serviceId)
          this.availability();
      },
      error: (e) => {
        if (version !== this.loadVersion) return;
        this.loading = false;
        this.fail(e);
      },
    });
  }
  fail(e: any) {
    this.error = errorMessage(e);
    this.saving = false;
  }
  editPerson(p?: Person) {
    this.editingPerson = p?.id || null;
    this.photoBusy = false;
    this.person = { name: p?.name || '', email: p?.email || '', phone: p?.phone || '', profilePhoto: p?.profilePhoto || null };
    this.showPerson = true;
    this.error = '';
  }
  savePerson() {
    if (this.saving || this.photoBusy) return;
    this.saving = true;
    this.error = '';
    const req = this.editingPerson
      ? this.api.patch('/users/' + this.editingPerson + '?role=BARBER', this.person)
      : this.api.post('/users?role=BARBER', this.person);
    req.subscribe({
      next: () => {
        this.saving = false;
        this.showPerson = false;
        this.message = 'Barbero guardado';
        this.load();
      },
      error: (e) => this.fail(e),
    });
  }
  editService(s?: Service) {
    this.editingService = s?.id || null;
    this.service = {
      name: s?.name || '',
      description: s?.description || '',
      price: Number(s?.price || 0),
      durationMinutes: s?.durationMinutes || 30,
      requiredPoints: s?.requiredPoints || null,
      isActive: s?.isActive ?? true,
    };
    this.showService = true;
    this.error = '';
  }
  saveService() {
    if (this.saving) return;
    this.saving = true;
    this.error = '';
    const req = this.editingService
      ? this.api.patch('/services/' + this.editingService, this.service)
      : this.api.post('/services', this.service);
    req.subscribe({
      next: () => {
        this.saving = false;
        this.showService = false;
        this.message = 'Servicio guardado';
        this.load();
      },
      error: (e) => this.fail(e),
    });
  }
  availability() {
    const version = ++this.slotVersion;
    this.booking.time = '';
    this.slots = [];
    this.error = '';
    if (!this.booking.barberId || !this.booking.serviceId || !this.booking.date) return;
    this.slotLoading = true;
    this.api
      .get<{ time: string }[]>(
        `/appointments/available?barberId=${this.booking.barberId}&serviceId=${this.booking.serviceId}&date=${this.booking.date}`,
      )
      .subscribe({
        next: (r) => {
          if (version === this.slotVersion) {
            this.slots = r;
            this.slotLoading = false;
          }
        },
        error: (e) => {
          if (version === this.slotVersion) {
            this.slotLoading = false;
            this.fail(e);
          }
        },
      });
  }
  book() {
    if (this.saving) return;
    this.saving = true;
    this.error = '';
    this.api.post('/appointments', this.booking).subscribe({
      next: () => {
        this.saving = false;
        this.message = 'Cita reservada correctamente';
        this.booking.paidWithPoints = false;
        this.load();
        this.availability();
      },
      error: (e) => this.fail(e),
    });
  }
  change(a: Appointment, status: string) {
    if (status === 'CANCELLED' && !confirm('¿Cancelar esta cita?')) return;
    this.saving = true;
    this.error = '';
    this.api.patch('/appointments/' + a.id + '/status', { status }).subscribe({
      next: () => {
        this.saving = false;
        this.message = 'Cita actualizada';
        this.load();
        this.availability();
      },
      error: (e) => this.fail(e),
    });
  }
  reactivate(p: Person) {
    this.saving = true;
    this.api.patch('/users/' + p.id + '/reactivate', {}).subscribe({
      next: () => {
        this.saving = false;
        this.message = 'Cuenta reactivada';
        this.load();
      },
      error: (e) => this.fail(e),
    });
  }
  status(s: string) {
    return (
      (
        {
          PENDING: 'Pendiente',
          CONFIRMED: 'Confirmada',
          COMPLETED: 'Completada',
          CANCELLED: 'Cancelada',
          NO_SHOW: 'No asistió',
        } as Record<string, string>
      )[s] || s
    );
  }
  active(a: Appointment) {
    return ['PENDING', 'CONFIRMED'].includes(a.status);
  }
  started(a: Appointment) {
    return new Date(a.startTime).getTime() <= Date.now();
  }
  send() {
    if (!this.chatText.trim() || this.chatting) return;
    const text = this.chatText.trim();
    this.chatText = '';
    this.chatting = true;
    this.messages.push({ who: 'Tú', text });
    this.api.post<{ reply: string }>('/chatbot/message', { message: text }).subscribe({
      next: (r) => {
        this.messages.push({ who: 'Asistente', text: r.reply });
        this.chatting = false;
      },
      error: (e) => {
        this.messages.push({ who: 'Asistente', text: errorMessage(e) });
        this.chatting = false;
      },
    });
  }
}
