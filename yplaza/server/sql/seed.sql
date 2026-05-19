-- Agencies de démo
INSERT INTO agencies (name, city, email, phone, address) VALUES
  ('Ynov Immo Bordeaux', 'Bordeaux', 'bordeaux@yplaza.test', '05 56 00 00 01', '12 cours de l’Intendance'),
  ('Ynov Immo Paris', 'Paris', 'paris@yplaza.test', '01 42 00 00 02', '18 avenue de la République'),
  ('Ynov Immo Lyon', 'Lyon', 'lyon@yplaza.test', '04 72 00 00 03', '7 place Bellecour'),
  ('Ynov Immo Marseille', 'Marseille', 'marseille@yplaza.test', '04 91 00 00 04', '22 rue Paradis');

-- Utilisateurs de démo
-- admin: admin@yplaza.test / Admin123!
-- agent: agent@yplaza.test / Agent123!
-- client: client@yplaza.test / Client123!
INSERT INTO users (name, email, password_hash, role, agency_id) VALUES
  ('Admin Y-Plaza', 'admin@yplaza.test', '$2b$10$0nazkd1eUiyuuQfD9DrmNuZLS54bL3JHkqj7QsrnWPzXWjQx/pWB.', 'admin', NULL),
  ('Agent Y-Plaza', 'agent@yplaza.test', '$2b$10$H9e11DcMcaZrc9NYEHxE.u81EVzDm7VRa6TaJCmObrUADIQo/NfLi', 'agent', 1),
  ('Client Y-Plaza', 'client@yplaza.test', '$2b$10$nd/Qee8zHJN4Q0madB7PLue8WFZ/9N3eI9wV39UIFJHuIm6I9nFV6', 'client', NULL);

-- Propriétés de démo
INSERT INTO properties (
  title, description, price, city, surface, rooms, type, status, agency_id, created_by, views_count
) VALUES
  (
    'Appartement T2 moderne centre-ville',
    'Bel appartement lumineux proche des commerces et du tram.',
    220000, 'Bordeaux', 45, 2, 'appartement', 'published', 1, 2, 5
  ),
  (
    'Maison familiale avec jardin',
    'Grande maison idéale pour une famille, quartier calme.',
    450000, 'Bordeaux', 120, 5, 'maison', 'published', 1, 2, 12
  ),
  (
    'Studio étudiant proche campus',
    'Studio fonctionnel pour étudiant, petite copropriété.',
    140000, 'Lyon', 22, 1, 'appartement', 'published', 3, 2, 3
  ),
  (
    'Loft industriel rénové',
    'Superbe loft style industriel, grande hauteur sous plafond.',
    520000, 'Paris', 80, 3, 'loft', 'sold', 2, 2, 30
  ),
  (
    'Villa avec piscine',
    'Villa contemporaine avec piscine et vue dégagée.',
    780000, 'Marseille', 160, 6, 'maison', 'published', 4, 2, 20
  );

INSERT INTO property_images (property_id, image_url, is_main, sort_order) VALUES
  (1, '/assets/properties/p1.jpg', TRUE, 0),
  (1, '/assets/properties/p2.jpg', FALSE, 1),
  (1, '/assets/properties/p5.jpg', FALSE, 2),
  (2, '/assets/properties/p8.jpg', TRUE, 0),
  (2, '/assets/properties/p3.jpg', FALSE, 1),
  (3, '/assets/properties/p2.jpg', TRUE, 0),
  (3, '/assets/properties/p1.jpg', FALSE, 1),
  (4, '/assets/properties/p4.jpg', TRUE, 0),
  (4, '/assets/properties/p5.jpg', FALSE, 1),
  (5, '/assets/properties/p6.jpg', TRUE, 0),
  (5, '/assets/properties/p9.jpg', FALSE, 1);

-- Favoris de démo pour le client
INSERT INTO favorites (user_id, property_id) VALUES
  (3, 1),
  (3, 3),
  (3, 5);
