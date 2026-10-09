"use client";

import { createNotice } from "@/app/notification-actions";
import { ActionForm, Field } from "./ActionForm";

export function NoticeForm() {
  return (
    <ActionForm action={createNotice} submit="Publicar aviso" resetOnOk>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field label="Título"><input name="title" className="input" required maxLength={140} placeholder="Ej: Esta semana sesión especial de objeciones" /></Field>
        <Field label="Enlace (opcional)" hint="Una ruta de la plataforma (/eventos) o una URL completa"><input name="link" className="input" placeholder="/eventos" /></Field>
        <div className="sm:col-span-2"><Field label="Texto (opcional)"><textarea name="body" className="input min-h-20" maxLength={1000} /></Field></div>
      </div>
    </ActionForm>
  );
}
