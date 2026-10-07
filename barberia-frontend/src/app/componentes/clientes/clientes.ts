import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

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
  imports: [CommonModule, FormsModule],
  templateUrl: './clientes.html',
  styleUrl: './clientes.css'
})
export class Clientes implements OnInit {
  filtro: string = '';

  listaClientes: Cliente[] = [
    {
      id: 1,
      nombre: 'Carlos Mendoza',
      iniciales: 'CM',
      fechaIngreso: '2025-11-10',
      telefono: '+502 5412-8890',
      email: 'carlos.mendoza@gmail.com',
      nivel: 'MIEMBRO PLATA',
      claseNivel: 'level-plata',
      puntos: 75,
      visitas: 4
    },
    {
      id: 2,
      nombre: 'Alejandro Morales',
      iniciales: 'AM',
      fechaIngreso: '2026-01-15',
      telefono: '+502 4190-3321',
      email: 'amorales.gt@outlook.com',
      nivel: 'MIEMBRO TRADICIONAL',
      claseNivel: 'level-tradicional',
      puntos: 35,
      visitas: 2
    },
    {
      id: 3,
      nombre: 'Javier Ruiz',
      iniciales: 'JR',
      fechaIngreso: '2025-08-04',
      telefono: '+502 5831-7744',
      email: 'javi.ruiz92@gmail.com',
      nivel: 'CABALLERO VIP ORO',
      claseNivel: 'level-oro',
      puntos: 120,
      visitas: 6
    }
  ];

  clientesFiltrados: Cliente[] = [];

  constructor(private router: Router) {}

  ngOnInit() {
    this.clientesFiltrados = [...this.listaClientes];
  }

  filtrarClientes() {
    const term = this.filtro.toLowerCase().trim();
    if (!term) {
      this.clientesFiltrados = [...this.listaClientes];
      return;
    }

    this.clientesFiltrados = this.listaClientes.filter(c =>
      c.nombre.toLowerCase().includes(term) ||
      c.telefono.includes(term) ||
      c.email.toLowerCase().includes(term)
    );
  }

  navegarA(ruta: string) {
    this.router.navigate([ruta]);
  }

  cerrarSesion() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    this.router.navigate(['/login']);
  }

  abrirModalNuevoCliente() {
    alert('Formulario de registro de cliente.');
  }

  agendarParaCliente(cliente: Cliente) {
    this.router.navigate(['/citas'], { queryParams: { clienteId: cliente.id } });
  }
}