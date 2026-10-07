import { PrismaClient, Role } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 0. Limpiar tablas secundarias para evitar errores de Foreign Key
  await prisma.chatLog.deleteMany();
  await prisma.facialAnalysis.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.service.deleteMany();
  await prisma.user.deleteMany();

  // 1. Crear Barberos
  const barber1 = await prisma.user.create({
    data: {
      email: 'carlos.barbero@gmail.com',
      name: 'Carlos López',
      role: Role.BARBER,
    },
  });

  const barber2 = await prisma.user.create({
    data: {
      email: 'mario.barbero@gmail.com',
      name: 'Mario Santos',
      role: Role.BARBER,
    },
  });

  // 2. Crear Cliente de prueba
  const client = await prisma.user.create({
    data: {
      email: 'cliente.prueba@gmail.com',
      name: 'Juan Pérez',
      role: Role.CLIENT,
      points: 120,
    },
  });

  // 3. Crear Servicios de la Barbería
  await prisma.service.createMany({
    data: [
      {
        name: 'Corte Tradicional',
        description: 'Corte clásico a máquina y tijera',
        price: 45.0,
        durationMinutes: 25,
        requiredPoints: 350,
      },
      {
        name: 'Corte Fade + Arreglo de Barba',
        description: 'Degradado al ras, toalla caliente y perfilado de barba',
        price: 65.0,
        durationMinutes: 35,
        requiredPoints: 400,
      },
      {
        name: 'Arreglo de Barba',
        description: 'Perfilado con navaja y bálsamo hidratante',
        price: 30.0,
        durationMinutes: 20,
        requiredPoints: 250,
      },
    ],
  });

  console.log('--- SEED COMPLETADO EXITOSAMENTE ---');
  console.log(`Barberos creados: ${barber1.name} (ID: ${barber1.id}), ${barber2.name} (ID: ${barber2.id})`);
  console.log(`Cliente creado: ${client.name} (ID: ${client.id})`);
}

main()
  .catch((e) => {
    console.error('Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });