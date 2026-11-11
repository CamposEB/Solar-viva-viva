import { json, adminAtual } from '../_utils.js';

export async function onRequestGet({ request, env }) {
  const admin = await adminAtual(request, env);
  if (!admin) return json({ autenticado: false }, 401);
  return json({ autenticado: true, usuario: admin.usuario });
}