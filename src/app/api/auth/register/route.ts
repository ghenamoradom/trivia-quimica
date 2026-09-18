import { NextRequest, NextResponse } from "next/server";
import { COURSE_LIST, createUser, findUserByDocumentId, isValidDocumentId, setSessionCookie, ensureAdminSeeded } from "@/lib/auth";

export async function POST(req: NextRequest) {
  await ensureAdminSeeded();
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });

  const documentId = String(body.documentId || "").trim();
  const firstName = String(body.firstName || "").trim();
  const lastName1 = String(body.lastName1 || "").trim();
  const lastName2 = String(body.lastName2 || "").trim();
  const sex = String(body.sex || "").trim();
  const course = String(body.course || "").trim();

  if (!isValidDocumentId(documentId)) {
    return NextResponse.json({ error: "El documento de identidad debe contener solo números (4 a 15 dígitos)." }, { status: 400 });
  }
  if (!firstName) return NextResponse.json({ error: "El nombre es obligatorio." }, { status: 400 });
  if (!lastName1 || !lastName2) {
    return NextResponse.json({ error: "Debes indicar los dos apellidos." }, { status: 400 });
  }
  if (sex !== "M" && sex !== "F") {
    return NextResponse.json({ error: "Selecciona el sexo." }, { status: 400 });
  }
  if (!COURSE_LIST.includes(course)) {
    return NextResponse.json({ error: "Selecciona un curso válido." }, { status: 400 });
  }

  const existing = await findUserByDocumentId(documentId);
  if (existing) {
    return NextResponse.json(
      { error: "Ese documento ya está registrado. Si ya te registraste, usa 'Continuar mi partida' con tu documento y contraseña." },
      { status: 409 }
    );
  }

  const user = await createUser({ documentId, firstName, lastName1, lastName2, sex, course });
  await setSessionCookie(user);
  return NextResponse.json({ user });
}
