-- El CSM ve la parte de Alumnos de admin (solo lectura): progreso, deberes y quizzes de cada alumno.
create policy "progreso: CSM lee" on lesson_progress for select to authenticated using (is_csm());
create policy "deberes: CSM lee" on submissions for select to authenticated using (is_csm());
create policy "quizzes: CSM lee" on quiz_attempts for select to authenticated using (is_csm());
