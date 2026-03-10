-- Agencies de démo
INSERT INTO agencies (name, city) VALUES
  ('Ynov Immo Bordeaux', 'Bordeaux'),
  ('Ynov Immo Paris', 'Paris'),
  ('Ynov Immo Lyon', 'Lyon'),
  ('Ynov Immo Marseille', 'Marseille');

-- Utilisateurs de démo
-- admin: admin@yplaza.test / Admin123!
-- agent: agent@yplaza.test / Agent123!
-- client: client@yplaza.test / Client123!
INSERT INTO users (name, email, password_hash, role) VALUES
  ('Admin Y-Plaza', 'admin@yplaza.test', '$2b$10$0nazkd1eUiyuuQfD9DrmNuZLS54bL3JHkqj7QsrnWPzXWjQx/pWB.', 'admin'),
  ('Agent Y-Plaza', 'agent@yplaza.test', '$2b$10$H9e11DcMcaZrc9NYEHxE.u81EVzDm7VRa6TaJCmObrUADIQo/NfLi', 'agent'),
  ('Client Y-Plaza', 'client@yplaza.test', '$2b$10$nd/Qee8zHJN4Q0madB7PLue8WFZ/9N3eI9wV39UIFJHuIm6I9nFV6', 'client');

-- Propriétés de démo
INSERT INTO properties (
  title, description, price, city, surface, rooms, type, status, agency_id, created_by, views_count
) VALUES
  (
    'Appartement T2 moderne centre-ville',
    'Bel appartement lumineux proche des commerces et du tram.',
    220000, 'Bordeaux', 45, 2, 'appartement', 'available', 1, 2, 5
  ),
  (
    'Maison familiale avec jardin',
    'Grande maison idéale pour une famille, quartier calme.',
    450000, 'Bordeaux', 120, 5, 'maison', 'available', 1, 2, 12
  ),
  (
    'Studio étudiant proche campus',
    'Studio fonctionnel pour étudiant, petite copropriété.',
    140000, 'Lyon', 22, 1, 'appartement', 'available', 3, 2, 3
  ),
  (
    'Loft industriel rénové',
    'Superbe loft style industriel, grande hauteur sous plafond.',
    520000, 'Paris', 80, 3, 'loft', 'sold', 2, 2, 30
  ),
  (
    'Villa avec piscine',
    'Villa contemporaine avec piscine et vue dégagée.',
    780000, 'Marseille', 160, 6, 'maison', 'available', 4, 2, 20
  );

-- Favoris de démo pour le client
INSERT INTO favorites (user_id, property_id) VALUES
  (3, 1),
  (3, 3),
  (3, 5);

