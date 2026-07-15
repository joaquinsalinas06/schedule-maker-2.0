-- Seed: UTEC university + CS-2021 curriculum (recovered from git backend/scripts/seed_cs2021_curriculum.py)
insert into public.universities (name, short_name)
values ('Universidad de Ingenieria y Tecnologia', 'UTEC')
on conflict (short_name) do nothing;

insert into public.curricula (university_id, name, code, year, total_credits, total_semesters)
select id, 'Ciencia de la Computación 2021', 'CS-2021', 2021, 176, 10
from public.universities where short_name = 'UTEC'
on conflict (code) do nothing;

insert into public.curriculum_courses (curriculum_id, course_name, semester, credits, is_elective, elective_group)
select c.id, v.course_name, v.semester, v.credits, v.is_elective, case when v.is_elective then 'ELECTIVE' end
from public.curricula c,
(values
  ('Cálculo de una variable', 1, 4, false),
  ('Introducción a la Ciencia de la Computación', 1, 2, false),
  ('Matemáticas Discretas I', 1, 4, false),
  ('Programación I', 1, 4, false),
  ('Laboratorio de Comunicación 1', 1, 3, false),
  ('Proyectos Interdisciplinarios 1', 1, 3, false),
  ('Álgebra Lineal', 2, 2, false),
  ('Cálculo Vectorial', 2, 3, false),
  ('Óptica y Ondas', 2, 4, false),
  ('Matemáticas Discretas II', 2, 4, false),
  ('Programación II', 2, 4, false),
  ('Laboratorio de Comunicación 2', 2, 3, false),
  ('Estadística y Probabilidades I', 3, 4, false),
  ('Ecuaciones Diferenciales', 3, 3, false),
  ('Programación III', 3, 4, false),
  ('Desarrollo Basado en Plataformas', 3, 4, false),
  ('Base de Datos I', 3, 4, false),
  ('Proyectos Interdisciplinarios 2', 3, 3, false),
  ('Métodos Numéricos', 4, 3, false),
  ('Algoritmos y Estructuras de Datos', 4, 4, false),
  ('Teoría de la Computación', 4, 4, false),
  ('Cloud Computing', 4, 3, false),
  ('Arquitectura de Computadoras', 4, 4, false),
  ('Empresa y Consumidor', 4, 3, false),
  ('Base de Datos II', 5, 3, false),
  ('Compiladores', 5, 4, false),
  ('Análisis y Diseño de Algoritmos', 5, 4, false),
  ('Ingeniería de Software', 5, 4, false),
  ('Perú: Temas de la sociedad contemporánea', 5, 3, false),
  ('Proyectos Interdisciplinarios 3', 5, 3, false),
  ('Estructura de Datos Avanzados', 6, 4, false),
  ('Sistemas Operativos', 6, 4, false),
  ('Programación Competitiva', 6, 4, false),
  ('Machine Learning', 6, 4, false),
  ('Finanzas Empresariales', 6, 3, false),
  ('Economía, Gobernanza y Relaciones de Poder', 6, 3, false),
  ('Computación Gráfica', 7, 4, false),
  ('Computación Paralela y Distribuida', 7, 4, false),
  ('Interacción Humano Computador', 7, 4, false),
  ('Redes y Comunicaciones', 7, 3, false),
  ('ELECTIVO1', 7, 0, true),
  ('Investigación en Computación', 8, 3, false),
  ('Arte y Tecnología', 8, 3, false),
  ('Proyecto Preprofesional', 8, 8, false),
  ('Internet de las Cosas', 9, 4, false),
  ('Proyecto Final de Ciencia de la Computación I', 9, 4, false),
  ('ELECTIVO2', 9, 0, true),
  ('ELECTIVO3', 9, 0, true),
  ('Evaluación Financiera de Proyectos', 9, 3, false),
  ('Ética y Tecnología', 9, 3, false),
  ('Proyecto Final de Ciencia de la Computación II', 10, 4, false),
  ('ELECTIVO4', 10, 0, true),
  ('ELECTIVO5', 10, 0, true),
  ('ELECTIVO6', 10, 0, true),
  ('Estrategia y Organizaciones', 10, 3, false)
) as v(course_name, semester, credits, is_elective)
where c.code = 'CS-2021'
  and not exists (select 1 from public.curriculum_courses cc where cc.curriculum_id = c.id and cc.course_name = v.course_name);

-- course-type prerequisites
insert into public.curriculum_prerequisites (curriculum_course_id, prerequisite_course_id, prerequisite_type)
select cc.id, pc.id, 'course'
from public.curricula c
join public.curriculum_courses cc on cc.curriculum_id = c.id
join public.curriculum_courses pc on pc.curriculum_id = c.id
join (values
  ('Álgebra Lineal', 'Cálculo de una variable'),
  ('Cálculo Vectorial', 'Cálculo de una variable'),
  ('Óptica y Ondas', 'Cálculo de una variable'),
  ('Matemáticas Discretas II', 'Matemáticas Discretas I'),
  ('Programación II', 'Programación I'),
  ('Laboratorio de Comunicación 2', 'Laboratorio de Comunicación 1'),
  ('Estadística y Probabilidades I', 'Cálculo de una variable'),
  ('Estadística y Probabilidades I', 'Programación I'),
  ('Ecuaciones Diferenciales', 'Cálculo Vectorial'),
  ('Programación III', 'Programación II'),
  ('Desarrollo Basado en Plataformas', 'Programación II'),
  ('Base de Datos I', 'Programación II'),
  ('Proyectos Interdisciplinarios 2', 'Proyectos Interdisciplinarios 1'),
  ('Métodos Numéricos', 'Programación I'),
  ('Métodos Numéricos', 'Álgebra Lineal'),
  ('Métodos Numéricos', 'Ecuaciones Diferenciales'),
  ('Algoritmos y Estructuras de Datos', 'Programación III'),
  ('Teoría de la Computación', 'Matemáticas Discretas II'),
  ('Teoría de la Computación', 'Programación III'),
  ('Cloud Computing', 'Desarrollo Basado en Plataformas'),
  ('Arquitectura de Computadoras', 'Matemáticas Discretas II'),
  ('Base de Datos II', 'Algoritmos y Estructuras de Datos'),
  ('Base de Datos II', 'Base de Datos I'),
  ('Compiladores', 'Teoría de la Computación'),
  ('Análisis y Diseño de Algoritmos', 'Algoritmos y Estructuras de Datos'),
  ('Ingeniería de Software', 'Cloud Computing'),
  ('Proyectos Interdisciplinarios 3', 'Proyectos Interdisciplinarios 2'),
  ('Estructura de Datos Avanzados', 'Análisis y Diseño de Algoritmos'),
  ('Sistemas Operativos', 'Arquitectura de Computadoras'),
  ('Programación Competitiva', 'Análisis y Diseño de Algoritmos'),
  ('Machine Learning', 'Programación II'),
  ('Machine Learning', 'Estadística y Probabilidades I'),
  ('Finanzas Empresariales', 'Empresa y Consumidor'),
  ('Computación Gráfica', 'Análisis y Diseño de Algoritmos'),
  ('Computación Gráfica', 'Óptica y Ondas'),
  ('Computación Paralela y Distribuida', 'Análisis y Diseño de Algoritmos'),
  ('Interacción Humano Computador', 'Programación II'),
  ('Interacción Humano Computador', 'Óptica y Ondas'),
  ('Redes y Comunicaciones', 'Sistemas Operativos'),
  ('Investigación en Computación', 'Análisis y Diseño de Algoritmos'),
  ('Internet de las Cosas', 'Programación II'),
  ('Internet de las Cosas', 'Arquitectura de Computadoras'),
  ('Evaluación Financiera de Proyectos', 'Finanzas Empresariales'),
  ('Proyecto Final de Ciencia de la Computación II', 'Proyecto Final de Ciencia de la Computación I'),
  ('Estrategia y Organizaciones', 'Evaluación Financiera de Proyectos')
) as v(course_name, prereq_name) on v.course_name = cc.course_name and v.prereq_name = pc.course_name
where c.code = 'CS-2021'
  and not exists (select 1 from public.curriculum_prerequisites x where x.curriculum_course_id = cc.id and x.prerequisite_course_id = pc.id);

-- credits-type prerequisites
insert into public.curriculum_prerequisites (curriculum_course_id, prerequisite_type, required_credits)
select cc.id, 'credits', v.req
from public.curricula c
join public.curriculum_courses cc on cc.curriculum_id = c.id
join (values
  ('Proyecto Preprofesional', 100),
  ('Proyecto Final de Ciencia de la Computación I', 130)
) as v(course_name, req) on v.course_name = cc.course_name
where c.code = 'CS-2021'
  and not exists (select 1 from public.curriculum_prerequisites x where x.curriculum_course_id = cc.id and x.prerequisite_type = 'credits');
