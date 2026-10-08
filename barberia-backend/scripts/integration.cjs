// Run against the local development backend only: node scripts/integration.cjs
require('dotenv').config({ quiet: true });
const assert = require('node:assert/strict');
const { PrismaClient } = require('@prisma/client');
const { JwtService } = require('@nestjs/jwt');
const db = new PrismaClient();
const jwt = new JwtService({ secret: process.env.JWT_SECRET });
const stamp = `qa-${Date.now()}`;
const ids = [],
  serviceIds = [];
const token = (u) =>
  jwt.sign({ sub: u.id, email: u.email, role: u.role }, { expiresIn: '10m' });
async function request(path, user, method = 'GET', body, expected = 200) {
  const r = await fetch('http://localhost:3000' + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(user ? { Authorization: 'Bearer ' + token(user) } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await r.json();
  assert.equal(
    r.status,
    expected,
    `${method} ${path}: ${JSON.stringify(data)}`,
  );
  return data;
}
async function person(role, points = 0) {
  const p = await db.user.create({
    data: {
      name: stamp + ' ' + role,
      email: `${stamp}-${ids.length}@example.test`,
      role,
      points,
    },
  });
  ids.push(p.id);
  return p;
}
(async () => {
  try {
    const admin = await person('ADMIN'),
      barber = await person('BARBER'),
      client = await person('CLIENT', 500),
      other = await person('CLIENT');
    await request('/users/me', null, 'GET', null, 401);
    assert.equal((await request('/users/me', client)).id, client.id);
    assert.equal((await request('/users', client)).length, 1);
    await request('/auth/login', null, 'POST', { email: admin.email }, 401);
    const added = await request(
      '/users',
      admin,
      'POST',
      { name: stamp + ' registered', email: stamp + '-new@example.test' },
      201,
    );
    ids.push(added.id);
    await request(
      '/users',
      client,
      'POST',
      { name: 'Forbidden', email: stamp + '-forbidden@example.test' },
      403,
    );
    const created = await request(
      '/services',
      admin,
      'POST',
      { name: stamp, price: 40, durationMinutes: 30, requiredPoints: 100 },
      201,
    );
    serviceIds.push(created.id);
    await request(
      '/services/' + created.id,
      client,
      'PATCH',
      { name: stamp, price: 1, durationMinutes: 30 },
      403,
    );
    await request(
      '/services',
      admin,
      'POST',
      { name: stamp, price: -1, durationMinutes: 0 },
      400,
    );
    const date = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
    const slots = await request(
      `/appointments/available?barberId=${barber.id}&serviceId=${created.id}&date=${date}`,
      client,
    );
    assert.ok(slots.length > 0);
    await request(
      `/appointments/available?barberId=${barber.id}&serviceId=${created.id}&date=2026-02-31`,
      client,
      'GET',
      null,
      400,
    );
    const booking = {
      clientId: client.id,
      barberId: barber.id,
      serviceId: created.id,
      date,
      time: slots[0].time,
      paidWithPoints: true,
    };
    const a = await request('/appointments', client, 'POST', booking, 201);
    assert.equal(a.redeemedPoints, 100);
    assert.equal(Number(a.chargedPrice), 0);
    assert.equal(
      (await db.user.findUnique({ where: { id: client.id } })).points,
      400,
    );
    await request('/appointments', other, 'POST', booking, 403);
    await request('/appointments', client, 'POST', booking, 400);
    await request('/appointments/' + a.id + '/cancel', other, 'PATCH', {}, 403);
    await request(
      '/appointments/' + a.id + '/status',
      client,
      'PATCH',
      { status: 'COMPLETED' },
      403,
    );
    await db.service.update({
      where: { id: created.id },
      data: { requiredPoints: 200 },
    });
    await request('/appointments/' + a.id + '/cancel', client, 'PATCH', {});
    await request('/appointments/' + a.id + '/cancel', client, 'PATCH', {});
    assert.equal(
      (await db.user.findUnique({ where: { id: client.id } })).points,
      500,
    );
    await request(
      '/appointments/' + a.id + '/status',
      admin,
      'PATCH',
      { status: 'COMPLETED' },
      400,
    );
    const concurrent = await Promise.all(
      [client, other].map((u) =>
        fetch('http://localhost:3000/appointments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: 'Bearer ' + token(u),
          },
          body: JSON.stringify({
            ...booking,
            clientId: u.id,
            paidWithPoints: false,
          }),
        }),
      ),
    );
    assert.deepEqual(concurrent.map((r) => r.status).sort(), [201, 400]);
    const upcoming = await db.appointment.findFirst({
      where: { barberId: barber.id, status: 'PENDING' },
    });
    await db.appointment.update({
      where: { id: upcoming.id },
      data: {
        startTime: new Date(Date.now() - 3600000),
        endTime: new Date(Date.now() - 1800000),
      },
    });
    const before = await db.user.findUnique({
      where: { id: upcoming.clientId },
    });
    await Promise.all([
      request('/appointments/' + upcoming.id + '/status', admin, 'PATCH', {
        status: 'COMPLETED',
      }),
      request('/appointments/' + upcoming.id + '/status', admin, 'PATCH', {
        status: 'COMPLETED',
      }),
    ]);
    assert.equal(
      (await db.user.findUnique({ where: { id: upcoming.clientId } })).points,
      before.points + 40,
    );
    await request(
      '/appointments/' + upcoming.id + '/status',
      admin,
      'PATCH',
      { status: 'NO_SHOW' },
      400,
    );
    for (let i = 0; i < 3; i++) {
      const missed = await db.appointment.create({
        data: {
          clientId: client.id,
          barberId: barber.id,
          serviceId: created.id,
          startTime: new Date(Date.now() - (i + 2) * 86400000),
          endTime: new Date(Date.now() - (i + 2) * 86400000 + 1800000),
          chargedPrice: 40,
          earnedPoints: 40,
        },
      });
      await request('/appointments/' + missed.id + '/status', barber, 'PATCH', {
        status: 'NO_SHOW',
      });
      await request('/appointments/' + missed.id + '/status', barber, 'PATCH', {
        status: 'NO_SHOW',
      });
    }
    const blocked = await db.user.findUnique({ where: { id: client.id } });
    assert.equal(blocked.strikes, 3);
    assert.equal(blocked.accountStatus, 'BLOCKED');
    await request('/appointments', client, 'POST', booking, 403);
    await request(
      '/users/' + client.id + '/reactivate',
      other,
      'PATCH',
      {},
      403,
    );
    await request('/users/' + client.id + '/reactivate', admin, 'PATCH', {});
    assert.equal(
      (await db.user.findUnique({ where: { id: client.id } })).strikes,
      0,
    );
    const hidden = await request('/appointments', other);
    assert.ok(hidden.every((a) => a.clientId === other.id));
    await request('/chatbot/message', null, 'POST', { message: 'test' }, 401);
    await request('/chatbot/message', client, 'POST', { message: '' }, 400);
    console.log(
      'PASS: authentication, role permissions, client/service CRUD, validation, reservations, ownership, cancellation refunds, concurrency and points idempotency.',
    );
  } finally {
    await db.appointment.deleteMany({
      where: { OR: [{ clientId: { in: ids } }, { barberId: { in: ids } }] },
    });
    await db.service.deleteMany({ where: { id: { in: serviceIds } } });
    await db.user.deleteMany({ where: { id: { in: ids } } });
    await db.$disconnect();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
