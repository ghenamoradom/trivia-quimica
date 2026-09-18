import { NextRequest, NextResponse } from "next/server";
import { verifyLogin, setSessionCookie } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  const documentId = String(body.documentId || "").trim();
  const password = String(body.password || "");
  if (!documentId || !password) {
    return NextResponse.json({ error: "Ingresa tu usuario y contraseña." }, { status: 400 });
  }
  const user = await verifyLogin(documentId, password);
  if (!user) {
    return NextResponse.json({ error: "Usuario o contraseña incorrectos." }, { status: 401 });
  }
  await setSessionCookie(user);
  return NextResponse.json({ user });
}
