import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { Api, Person, Appointment, errorMessage } from '../../core/services/api';
import { Navigation } from '../../shared/navigation';
interface Cliente {
  id: number;
  nombre: string;
  iniciales: string;
  fechaIngreso: string;
  telefono: string;
  email: string;
  nivel: string;
  claseNivel: string;
  puntos: number;
  visitas: number;
}
@Component({
  selector: 'app-clientes',
  standalone: true,
  imports: [CommonModule, FormsModule, Navigation],
  templateUrl: './clientes.html',
  styleUrls: ['./clientes.css', '../../shared/forms.css'],
})
export class Clientes implements OnInit {
  filtro = '';
  listaClientes: Cliente[] = [];
  clientesFiltrados: Cliente[] = [];
  me!: Person;
  error = '';
  loading = true;
  saving = false;
  showForm = false;
  editing: number | null = null;
  message = '';
  history: Appointment[] | null = null;
  person = { name: '', email: '', phone: '' };
  constructor(
    private router: Router,
    private api: Api,
    private route: ActivatedRoute,
  ) {}
  get staff() {
    return this.me?.role === 'ADMIN' || this.me?.role === 'BARBER';
  }
  get totalPoints() {
    return this.listaClientes.reduce((sum, c) => sum + c.puntos, 0);
  }
  ngOnInit() {
    this.api.get<Person>('/users/me').subscribe({
      next: (p) => {
        this.me = p;
        if (this.staff && this.route.snapshot.queryParamMap.has('nuevo'))
          this.abrirModalNuevoCliente();
      },
      error: (e) => (this.error = errorMessage(e)),
    });
    this.load();
  }
  load() {
    this.loading = true;
    this.api.get<Person[]>('/users').subscribe({
      next: (rows) => {
        this.listaClientes = rows.map((p) => ({
          id: p.id,
          nombre: p.name,
          iniciales: p.name
            .split(' ')
            .map((n) => n[0])
            .slice(0, 2)
            .join(''),
          fechaIngreso: new Date(p.createdAt).toLocaleDateString('es-GT'),
          telefono: p.phone || 'Sin teléfono',
          email: p.email,
          nivel: p.accountStatus === 'ACTIVE' ? 'ACTIVO' : 'BLOQUEADO',
          claseNivel: 'level-tradicional',
          puntos: p.points,
          visitas: p.clientAppointments?.length || 0,
        }));
        this.filtrarClientes();
        this.loading = false;
      },
      error: (e) => {
        this.error = errorMessage(e);
        this.loading = false;
      },
    });
  }
  filtrarClientes() {
    const t = this.filtro.toLowerCase().trim();
    this.clientesFiltrados = this.listaClientes.filter((c) =>
      (c.nombre + ' ' + c.telefono + ' ' + c.email).toLowerCase().includes(t),
    );
  }
  navegarA(ruta: string) {
    this.router.navigate([ruta]);
  }
  abrirModalNuevoCliente() {
    this.editing = null;
    this.person = { name: '', email: '', phone: '' };
    this.showForm = true;
    this.error = '';
  }
  editar(c: Cliente) {
    this.editing = c.id;
    this.person = {
      name: c.nombre,
      email: c.email,
      phone: c.telefono === 'Sin teléfono' ? '' : c.telefono,
    };
    this.showForm = true;
    this.error = '';
  }
  guardar() {
    if (this.saving) return;
    this.saving = true;
    this.error = '';
    const req = this.editing
      ? this.api.patch('/users/' + this.editing, this.person)
      : this.api.post('/users', this.person);
    req.subscribe({
      next: () => {
        this.saving = false;
        this.showForm = false;
        this.message = 'Cliente guardado';
        this.load();
      },
      error: (e) => {
        this.error = errorMessage(e);
        this.saving = false;
      },
    });
  }
  historial(c: Cliente) {
    this.error = '';
    this.api
      .get<Appointment[]>('/appointments?clientId=' + c.id)
      .subscribe({ next: (r) => (this.history = r), error: (e) => (this.error = errorMessage(e)) });
  }
  agendarParaCliente(c: Cliente) {
    this.router.navigate(['/citas'], { queryParams: { clienteId: c.id } });
  }
  estado(s: string) {
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
}
