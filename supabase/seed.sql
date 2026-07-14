-- Données de démonstration facultatives pour Nantes.
-- À exécuter après 001_initial_schema.sql si vous souhaitez tester avec quelques lieux.

do $$
declare
  p1 uuid;
  p2 uuid;
  p3 uuid;
begin
  if exists (select 1 from public.places where slug = 'demo-beaulieu-nantes') then
    return;
  end if;

  insert into public.places (
    slug, name, address_line, postal_code, city, latitude, longitude,
    description, publication_status, source_type, verification_status,
    availability_mode, current_status
  ) values (
    'demo-beaulieu-nantes', 'Centre commercial Beaulieu', 'Boulevard Général-de-Gaulle', '44200', 'Nantes',
    47.20565, -1.53462,
    'Une escale facilement accessible depuis l’entrée principale. L’accueil peut vous orienter vers les zones assises les plus fraîches.',
    'published', 'admin', 'verified', 'always', 'open'
  ) returning id into p1;

  insert into public.places (
    slug, name, address_line, postal_code, city, latitude, longitude,
    publication_status, source_type, verification_status,
    availability_mode, current_status
  ) values (
    'demo-graslin-nantes', 'Galerie Graslin', 'Place Graslin', '44000', 'Nantes',
    47.21364, -1.56257,
    'published', 'community', 'community', 'heatwave', 'conditional'
  ) returning id into p2;

  insert into public.places (
    slug, name, address_line, postal_code, city, latitude, longitude,
    publication_status, source_type, verification_status,
    availability_mode, current_status
  ) values (
    'demo-paridis-nantes', 'Centre commercial Paridis', '14 route de Paris', '44300', 'Nantes',
    47.24464, -1.51532,
    'published', 'community', 'community', 'manual', 'unconfirmed'
  ) returning id into p3;

  insert into public.place_amenities(place_id, amenity_code)
  select p1, code from public.amenities where code in ('cooled_space','seating','drinking_water','staff_help','accessible');
  insert into public.place_amenities(place_id, amenity_code)
  select p2, code from public.amenities where code in ('cooled_space','seating','drinking_water');
  insert into public.place_amenities(place_id, amenity_code)
  select p3, code from public.amenities where code in ('cooled_space','seating','staff_help','accessible');

  insert into public.opening_periods(place_id, weekday, opens, closes)
  select p1, d, '09:30'::time, case when d = 6 then '19:30'::time else '20:00'::time end from generate_series(1,6) d;
  insert into public.opening_periods(place_id, weekday, opens, closes)
  select p2, d, '09:30'::time, case when d = 6 then '19:30'::time else '20:00'::time end from generate_series(1,6) d;
  insert into public.opening_periods(place_id, weekday, opens, closes)
  select p3, d, '09:30'::time, case when d = 6 then '19:30'::time else '20:00'::time end from generate_series(1,6) d;

  insert into public.place_posts(place_id, title, body)
  values (p1, null, 'L’espace est accessible aujourd’hui aux horaires habituels. Des assises sont disponibles près de l’accueil principal.');
end $$;
